import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireYoutubeOwner } from "@/lib/youtube/access";

export type YoutubeNewsItem = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  published_at: string | null;
  collected_at: string;
  is_new: boolean;
  category: string;
  source_name: string;
  summary_pt_br: string | null;
  why_it_matters: string | null;
  reliability: string | null;
  opportunity_score: number | null;
  confidence_score: number | null;
  evidence_type: string | null;
  source_origin: "primary" | "market" | "mixed";
};

export type YoutubeTrend = {
  id: string;
  topic: string;
  state: string;
  current_score: number;
  confidence_score: number;
  first_identified_at: string;
  last_evaluated_at: string;
  current_position: number | null;
  best_position: number | null;
  latest_evidence: Array<{ label?: string; url?: string; note?: string }>;
  source_origin: "primary" | "market" | "mixed";
};

export type YoutubeIdea = {
  id: string;
  title: string;
  alternate_titles: string[];
  summary: string;
  rationale: string;
  angle: string;
  format: string;
  outline: string[];
  hook: string;
  priority: string;
  score: number;
  confidence_score: number;
  status: string;
  editorial_state: string;
  current_rank: number | null;
  best_rank: number | null;
  last_evaluated_at: string | null;
  updated_at: string;
  source_origin: "primary" | "market" | "mixed";
  rank_delta: number | null;
  change_kind: "nova" | "subiu" | "caiu" | "estavel" | "reavaliar" | null;
  is_new: boolean;
};

export type YoutubeIdeaYoutubeReference = {
  id: string;
  title: string;
  channel_name: string;
  video_url: string;
  published_on: string;
  view_count: number;
  selection_reason: string;
  observed_at: string;
};

type Relation<T> = T | T[] | null;
const firstRelation = <T>(value: Relation<T>) => Array.isArray(value) ? (value[0] ?? null) : value;

function requireData<T>(data: T | null, error: { message: string } | null, fallback: T): T {
  if (error) throw new Error(error.message);
  return data ?? fallback;
}

function mapNewsRow(row: Record<string, unknown>, isNew = false): YoutubeNewsItem {
  const source = firstRelation(row.source as Relation<{ name: string }>);
  const analysis = firstRelation(row.analysis as Relation<{
    summary_pt_br: string;
    why_it_matters: string;
    reliability: string;
    opportunity_score: number;
    confidence_score: number;
    evidence_type: string;
  }>);
  const sourceOrigin = row.source_origin === "primary" || row.source_origin === "mixed" ? row.source_origin : "market";
  return {
    id: String(row.id),
    title: String(row.title),
    summary: typeof row.summary === "string" ? row.summary : null,
    url: String(row.url),
    published_at: typeof row.published_at === "string" ? row.published_at : null,
    collected_at: String(row.collected_at),
    is_new: isNew,
    category: String(row.category),
    source_name: source?.name ?? "Fonte desconhecida",
    summary_pt_br: analysis?.summary_pt_br ?? null,
    why_it_matters: analysis?.why_it_matters ?? null,
    reliability: analysis?.reliability ?? null,
    opportunity_score: analysis?.opportunity_score ?? null,
    confidence_score: analysis?.confidence_score ?? null,
    evidence_type: analysis?.evidence_type ?? null,
    source_origin: sourceOrigin,
  };
}

const feedSelect = `
  id, title, summary, url, published_at, collected_at, category, source_origin,
  source:yt_sources!inner(name),
  analysis:yt_analyses!inner(provider, summary_pt_br, why_it_matters, reliability, opportunity_score, confidence_score, evidence_type)
`;

const BRIEFING_LIMIT = 6;
const BRIEFING_MAX_AGE_DAYS = 14;
const BRIEFING_MIN_OPPORTUNITY = 75;
const BRIEFING_MIN_CONFIDENCE = 70;

export async function getYoutubeDashboardData() {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [newsCount, signalsCount, opportunitiesCount, urgentCount, latestRun, feed, settings, topIdea, recentChanges] = await Promise.all([
    supabase.from("yt_content_items").select("id", { count: "exact", head: true }).gte("collected_at", since),
    supabase.from("yt_trends").select("id", { count: "exact", head: true }).in("state", ["em_alta", "emergente"]),
    supabase.from("yt_ideas").select("id", { count: "exact", head: true }).not("current_rank", "is", null).not("status", "in", "(published,discarded)"),
    supabase.from("yt_ideas").select("id", { count: "exact", head: true }).gte("score", 85).eq("priority", "agora").not("status", "in", "(published,discarded)"),
    supabase.from("yt_research_runs").select("status, trigger, started_at, finished_at, inserted_count, found_count, analysed_count, failed_sources_count").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("yt_content_items").select(feedSelect).eq("analysis.provider", "codex").order("collected_at", { ascending: false }).limit(50),
    supabase.from("yt_app_settings").select("research_times, timezone, ai_provider").eq("id", 1).maybeSingle(),
    supabase.from("yt_ideas").select("id, title, score, current_rank, rationale, hook, format").not("current_rank", "is", null).order("current_rank").limit(1).maybeSingle(),
    supabase.from("yt_research_run_changes").select("entity_type, change_kind, current_position").order("created_at", { ascending: false }).limit(20),
  ]);

  const error = [newsCount, signalsCount, opportunitiesCount, urgentCount, latestRun, feed, settings, topIdea, recentChanges]
    .map((result) => result.error)
    .find(Boolean);
  if (error) throw new Error(error.message);

  const briefingSince = Date.now() - BRIEFING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const latestRunStartedAt = latestRun.data?.started_at ? Date.parse(latestRun.data.started_at) : NaN;
  const news = ((feed.data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => mapNewsRow(row, Number.isFinite(latestRunStartedAt) && Date.parse(String(row.collected_at)) >= latestRunStartedAt))
    .filter((item) => {
      const date = Date.parse(item.published_at ?? item.collected_at);
      return (item.opportunity_score ?? 0) >= BRIEFING_MIN_OPPORTUNITY
        && (item.confidence_score ?? 0) >= BRIEFING_MIN_CONFIDENCE
        && ["confirmed", "interpretation"].includes(item.reliability ?? "")
        && Number.isFinite(date)
        && date >= briefingSince;
    })
    .sort((a, b) => {
      const scoreDelta = (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0);
      if (scoreDelta) return scoreDelta;
      return Date.parse(b.published_at ?? b.collected_at) - Date.parse(a.published_at ?? a.collected_at);
    })
    .slice(0, BRIEFING_LIMIT);

  return {
    stats: {
      news24h: newsCount.count ?? 0,
      signals: signalsCount.count ?? 0,
      opportunities: opportunitiesCount.count ?? 0,
      urgent: urgentCount.count ?? 0,
    },
    latestRun: latestRun.data,
    topIdea: topIdea.data,
    changes: recentChanges.data ?? [],
    news,
    schedule: (settings.data?.research_times as string[] | null) ?? [],
    timezone: settings.data?.timezone ?? "America/Bahia",
    aiProvider: settings.data?.ai_provider ?? "none",
  };
}

export async function getYoutubeOpportunities() {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("yt_content_items")
    .select(feedSelect)
    .eq("analysis.provider", "codex")
    .order("collected_at", { ascending: false })
    .limit(100);
  const rows = requireData(data as unknown as Record<string, unknown>[] | null, error, []);
  return rows.map((row) => mapNewsRow(row))
    .filter((item) => item.opportunity_score !== null)
    .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
    .slice(0, 50);
}

export async function getYoutubeNewsDetail(id: string) {
  await requireYoutubeOwner();
  const { data, error } = await createAdminClient()
    .from("yt_content_items")
    .select(feedSelect)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { item: data ? mapNewsRow(data as unknown as Record<string, unknown>) : null };
}

export async function getYoutubeIdeas() {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const [{ data, error }, { data: latestRun, error: runError }] = await Promise.all([
    supabase.from("yt_ideas")
    .select("id, title, alternate_titles, summary, rationale, angle, format, outline, hook, priority, score, confidence_score, status, editorial_state, current_rank, best_rank, last_evaluated_at, updated_at, source_origin")
    .neq("status", "discarded")
    .order("current_rank", { ascending: true, nullsFirst: false })
    .order("score", { ascending: false })
    .order("updated_at", { ascending: false }),
    supabase.from("yt_research_runs").select("id, started_at").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (runError) throw new Error(runError.message);
  const evaluations = latestRun?.id
    ? await supabase.from("yt_idea_evaluations").select("idea_id, rank_delta, change_kind").eq("run_id", latestRun.id)
    : { data: [], error: null };
  if (evaluations.error) throw new Error(evaluations.error.message);
  const changes = new Map((evaluations.data ?? []).map((entry) => [entry.idea_id, entry]));
  return (data ?? []).map((idea) => {
    const change = changes.get(idea.id);
    return {
      ...idea,
      rank_delta: change?.rank_delta ?? null,
      change_kind: (change?.change_kind as YoutubeIdea["change_kind"]) ?? null,
      is_new: change?.change_kind === "nova",
    };
  });
}

export async function getYoutubeTrends() {
  await requireYoutubeOwner();
  const { data, error } = await createAdminClient()
    .from("yt_trends")
    .select("id, topic, state, current_score, confidence_score, first_identified_at, last_evaluated_at, current_position, best_position, latest_evidence, source_origin")
    .not("state", "in", "(arquivado,desatualizado)")
    .order("current_score", { ascending: false })
    .order("last_evaluated_at", { ascending: false });
  return requireData(data as YoutubeTrend[] | null, error, []);
}

export async function getYoutubeIdeaDetail(id: string) {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const [idea, history, sources, youtubeReferences] = await Promise.all([
    supabase.from("yt_ideas").select("id, title, alternate_titles, summary, rationale, angle, format, outline, hook, priority, score, confidence_score, status, editorial_state, current_rank, best_rank, last_evaluated_at, updated_at, created_at, source_origin").eq("id", id).maybeSingle(),
    supabase.from("yt_idea_evaluations").select("score, confidence_score, rank_position, rank_delta, change_kind, rationale, evidence, created_at").eq("idea_id", id).order("created_at"),
    supabase.from("yt_idea_sources").select("item:yt_content_items!inner(title, canonical_url, published_at)").eq("idea_id", id),
    supabase.from("yt_idea_youtube_references").select("id, title, channel_name, video_url, published_on, view_count, selection_reason, observed_at").eq("idea_id", id).order("published_on", { ascending: false }).order("view_count", { ascending: false }).limit(5),
  ]);
  const error = [idea, history, sources, youtubeReferences].map((result) => result.error).find(Boolean);
  if (error) throw new Error(error.message);
  return {
    idea: idea.data,
    history: history.data ?? [],
    sources: (sources.data ?? []).map((row) => {
      const item = firstRelation(row.item as Relation<{ title: string; canonical_url: string; published_at: string | null }>);
      return item ? { item } : row;
    }),
    youtubeReferences: (youtubeReferences.data ?? []) as YoutubeIdeaYoutubeReference[],
  };
}

export async function getYoutubeTrendDetail(id: string) {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const [trend, history] = await Promise.all([
    supabase.from("yt_trends").select("id, topic, state, current_score, confidence_score, first_identified_at, last_evaluated_at, current_position, best_position, latest_evidence, source_origin").eq("id", id).maybeSingle(),
    supabase.from("yt_trend_evaluations").select("score, confidence_score, state, position, rationale, evidence, created_at").eq("trend_id", id).order("created_at"),
  ]);
  const error = [trend, history].map((result) => result.error).find(Boolean);
  if (error) throw new Error(error.message);
  return { trend: trend.data, history: history.data ?? [] };
}

export async function getYoutubeSourcesAndRuns() {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const [sources, runs, failures] = await Promise.all([
    supabase.from("yt_sources").select("id, name, kind, url, category, language, enabled, last_success_at").is("archived_at", null).order("enabled", { ascending: false }).order("name"),
    supabase.from("yt_research_runs").select("id, trigger, status, started_at, finished_at, found_count, inserted_count, analysed_count, failed_sources_count, error_message").order("started_at", { ascending: false }).limit(25),
    supabase.from("yt_source_failures").select("message, created_at, source:yt_sources!inner(name)").order("created_at", { ascending: false }).limit(10),
  ]);
  const failureRows = requireData(failures.data as unknown as Array<Record<string, unknown>> | null, failures.error, [])
    .map((row) => ({
      source_name: firstRelation(row.source as Relation<{ name: string }>)?.name ?? "Fonte desconhecida",
      message: String(row.message),
      created_at: String(row.created_at),
    }));
  return {
    sources: requireData(sources.data, sources.error, []),
    runs: requireData(runs.data, runs.error, []),
    failures: failureRows,
  };
}

export async function getYoutubeSettings() {
  await requireYoutubeOwner();
  const supabase = createAdminClient();
  const [settings, references] = await Promise.all([
    supabase.from("yt_app_settings").select("ai_provider, ai_model, timezone, research_times, languages, keywords, max_items_per_source, max_ai_analyses_per_run, monthly_budget_usd_micros, editorial_profile").eq("id", 1).maybeSingle(),
    supabase.from("yt_channel_references").select("id, name, url, kind, notes").order("name"),
  ]);
  return {
    settings: requireData(settings.data, settings.error, null),
    references: requireData(references.data, references.error, []),
  };
}
