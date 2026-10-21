import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyseYoutubeContent } from "@/lib/youtube/ai";
import {
  collectYoutubeSource,
  type YoutubeCollectedItem,
  type YoutubeSource,
} from "@/lib/youtube/collectors";
import { scoreYoutubeOpportunity, type YoutubeScoreWeights } from "@/lib/youtube/domain";

type YoutubeSettings = {
  ai_provider: string;
  ai_model: string;
  max_items_per_source: number;
  max_ai_analyses_per_run: number;
  scoring_weights: Partial<YoutubeScoreWeights>;
  editorial_profile: string;
};

type StoredItem = YoutubeCollectedItem & { id: string };

export type YoutubeResearchResult = {
  runId: string;
  status: "completed" | "partial";
  found: number;
  inserted: number;
  analysed: number;
  failedSources: number;
  inputTokens: number;
  outputTokens: number;
};

export class YoutubeResearchAlreadyRunningError extends Error {
  constructor() {
    super("Já existe uma pesquisa em andamento.");
  }
}

function databaseError(prefix: string, error: { message: string; code?: string }) {
  return new Error(`${prefix}_${error.code ?? "failed"}: ${error.message}`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function saveItem(
  supabase: SupabaseClient,
  item: YoutubeCollectedItem,
  runId: string,
): Promise<StoredItem | null> {
  const { data, error } = await supabase.from("yt_content_items").insert({
    source_id: item.sourceId,
    run_id: runId,
    title: item.title,
    summary: item.summary,
    url: item.url,
    canonical_url: item.canonicalUrl,
    content_hash: item.contentHash,
    author: item.author,
    language: item.language,
    category: item.category,
    published_at: item.publishedAt,
    raw: item.raw,
  }).select("id").maybeSingle();
  if (error?.code === "23505") return null;
  if (error) throw databaseError("youtube_content_insert", error);
  return data ? { ...item, id: data.id } : null;
}

async function analyseItem(
  supabase: SupabaseClient,
  item: StoredItem,
  settings: YoutubeSettings,
) {
  if (settings.ai_provider !== "openai" || !settings.ai_model) return null;
  const result = await analyseYoutubeContent({
    title: item.title,
    summary: item.summary,
    url: item.canonicalUrl,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt,
    language: item.language,
    category: item.category,
    editorialProfile: settings.editorial_profile,
  }, settings.ai_model);
  const analysis = result.data;
  const opportunityScore = scoreYoutubeOpportunity(analysis.components, settings.scoring_weights);

  const { error: analysisError } = await supabase.from("yt_analyses").upsert({
    item_id: item.id,
    provider: "openai",
    model: settings.ai_model,
    summary_pt_br: analysis.summaryPtBr,
    why_it_matters: analysis.whyItMatters,
    reliability: analysis.reliability,
    relevance_score: analysis.relevanceScore,
    novelty_score: analysis.noveltyScore,
    urgency_score: analysis.urgencyScore,
    opportunity_score: opportunityScore,
    confidence_score: analysis.confidenceScore,
    evidence_type: analysis.evidenceType,
    factors: analysis.factors,
  }, { onConflict: "item_id", ignoreDuplicates: true });
  if (analysisError) throw databaseError("youtube_analysis_insert", analysisError);

  let ideaId: string | null = null;
  const { data: insertedIdea, error: ideaError } = await supabase.from("yt_ideas").insert({
    title: analysis.idea.title,
    alternate_titles: analysis.idea.alternateTitles,
    summary: analysis.idea.summary,
    rationale: analysis.idea.rationale,
    angle: analysis.idea.angle,
    format: analysis.idea.format,
    outline: analysis.idea.outline,
    hook: analysis.idea.hook,
    priority: analysis.idea.priority,
    score: opportunityScore,
    confidence_score: analysis.confidenceScore,
    source_fingerprint: item.contentHash,
  }).select("id").maybeSingle();
  if (ideaError?.code === "23505") {
    const { data: existingIdea, error: existingIdeaError } = await supabase
      .from("yt_ideas")
      .select("id")
      .eq("source_fingerprint", item.contentHash)
      .maybeSingle();
    if (existingIdeaError) throw databaseError("youtube_idea_lookup", existingIdeaError);
    ideaId = existingIdea?.id ?? null;
  } else if (ideaError) {
    throw databaseError("youtube_idea_insert", ideaError);
  } else {
    ideaId = insertedIdea?.id ?? null;
  }

  if (ideaId) {
    const { error: linkError } = await supabase.from("yt_idea_sources").upsert({
      idea_id: ideaId,
      item_id: item.id,
    }, { onConflict: "idea_id,item_id", ignoreDuplicates: true });
    if (linkError) throw databaseError("youtube_idea_source_insert", linkError);
  }
  return result;
}

export async function runYoutubeResearch(
  trigger: "manual" | "scheduled" | "reprocess",
  scheduleKey?: string,
): Promise<YoutubeResearchResult> {
  const supabase = createAdminClient();
  let runId: string | undefined;
  try {
    const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    await supabase.from("yt_research_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Execução interrompida antes da conclusão.",
    }).eq("status", "running").lt("started_at", staleCutoff);

    const { data: run, error: runError } = await supabase.from("yt_research_runs").insert({
      trigger,
      schedule_key: scheduleKey ?? null,
    }).select("id").maybeSingle();
    if (runError?.code === "23505") throw new YoutubeResearchAlreadyRunningError();
    if (runError) throw databaseError("youtube_research_start", runError);
    if (!run) throw new Error("YOUTUBE_RESEARCH_START_FAILED");
    const currentRunId = run.id;
    runId = currentRunId;

    const [settingsResult, sourcesResult] = await Promise.all([
      supabase.from("yt_app_settings").select("ai_provider, ai_model, max_items_per_source, max_ai_analyses_per_run, scoring_weights, editorial_profile").eq("id", 1).maybeSingle(),
      supabase.from("yt_sources").select("id, name, kind, url, category, language").eq("enabled", true).is("archived_at", null).in("kind", ["rss", "atom", "api"]).order("name"),
    ]);
    if (settingsResult.error) throw databaseError("youtube_settings_read", settingsResult.error);
    if (sourcesResult.error) throw databaseError("youtube_sources_read", sourcesResult.error);
    if (!settingsResult.data) throw new Error("YOUTUBE_SETTINGS_NOT_INITIALIZED");
    const settings = settingsResult.data as YoutubeSettings;
    const sources = (sourcesResult.data ?? []) as YoutubeSource[];

    const collectionResults = await mapWithConcurrency(sources, 4, async (source) => {
      try {
        const items = await collectYoutubeSource(source, settings.max_items_per_source);
        const { error } = await supabase.from("yt_sources").update({
          last_success_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", source.id);
        if (error) throw databaseError("youtube_source_update", error);
        return { source, items, error: null as Error | null };
      } catch (error) {
        return {
          source,
          items: [] as YoutubeCollectedItem[],
          error: error instanceof Error ? error : new Error("Falha desconhecida"),
        };
      }
    });

    const failures = collectionResults.filter((result) => result.error);
    if (failures.length) {
      const { error } = await supabase.from("yt_source_failures").insert(failures.map((failure) => ({
        run_id: currentRunId,
        source_id: failure.source.id,
        message: failure.error!.message.slice(0, 1000),
      })));
      if (error) throw databaseError("youtube_failures_insert", error);
    }

    const collected = collectionResults.flatMap((result) => result.items);
    const unique = [...new Map(collected.map((item) => [item.contentHash, item])).values()];
    const inserted: StoredItem[] = [];
    for (const item of unique) {
      const stored = await saveItem(supabase, item, currentRunId);
      if (stored) inserted.push(stored);
    }

    let analysed = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const aiErrors: string[] = [];
    const analysisResults = await mapWithConcurrency(
      inserted.slice(0, settings.max_ai_analyses_per_run),
      2,
      async (item) => {
        try {
          return { result: await analyseItem(supabase, item, settings), error: null as string | null };
        } catch (error) {
          return { result: null, error: error instanceof Error ? error.message : "Falha de IA desconhecida" };
        }
      },
    );
    for (const entry of analysisResults) {
      if (entry.result) {
        analysed += 1;
        inputTokens += entry.result.inputTokens;
        outputTokens += entry.result.outputTokens;
      }
      if (entry.error) aiErrors.push(entry.error);
    }

    const status = failures.length || aiErrors.length ? "partial" : "completed";
    const { error: finishError } = await supabase.from("yt_research_runs").update({
      status,
      finished_at: new Date().toISOString(),
      found_count: collected.length,
      inserted_count: inserted.length,
      analysed_count: analysed,
      failed_sources_count: failures.length,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      error_message: aiErrors.slice(0, 3).join(" | ") || null,
    }).eq("id", currentRunId);
    if (finishError) throw databaseError("youtube_research_finish", finishError);
    return {
      runId: currentRunId,
      status,
      found: collected.length,
      inserted: inserted.length,
      analysed,
      failedSources: failures.length,
      inputTokens,
      outputTokens,
    };
  } catch (error) {
    if (runId) {
      await supabase.from("yt_research_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: (error instanceof Error ? error.message : "Falha desconhecida").slice(0, 2000),
      }).eq("id", runId);
    }
    throw error;
  }
}
