import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/openai";
import { addDays } from "@/lib/performance";
import {
  DAILY_LIFE_ANALYSIS_PROMPT_VERSION,
  DAILY_LIFE_ANALYSIS_TYPE,
  buildDailyLifeMetrics,
  buildFallbackDailyLifeNarrative,
  createDailyLifeAnalysis,
  dailyLifeNarrativeSchema,
  dailyLifePromptInput,
  dailyLifeSystemInstructions,
  parseDailyLifeAnalysis,
  type DailyLifeAnalysis,
  type DailyLifeMetricsInput,
} from "@/lib/daily-life-analysis";

type GenerateDailyLifeAnalysisInput = {
  supabase: SupabaseClient;
  userId: string;
  timezone?: string | null;
  force?: boolean;
  now?: Date;
};

export type GenerateDailyLifeAnalysisResult = {
  state: "generated" | "updated" | "skipped";
  analysis: DailyLifeAnalysis;
  warning: string | null;
};

function localDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeTimezone(value: string | null | undefined): string {
  const timezone = value?.trim() || "America/Bahia";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "America/Bahia";
  }
}

function errorArea(error: unknown, area: string, missing: string[]): void {
  if (error) missing.push(area);
}

async function loadMetricsInput(supabase: SupabaseClient, userId: string, analysisDate: string, timezone: string): Promise<DailyLifeMetricsInput> {
  const historyFrom = addDays(analysisDate, -365);
  const activityFrom = addDays(analysisDate, -90);
  const [
    profileResult,
    publicProfileResult,
    habitsResult,
    habitLogsResult,
    tasksResult,
    taskLogsResult,
    activitiesResult,
    goalsResult,
    eventsResult,
    roadmapsResult,
    studyItemsResult,
    snapshotsResult,
    contributionsResult,
    weightsResult,
  ] = await Promise.all([
    supabase.from("perf_profile").select("treinos_semana_meta, peso_meta").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    supabase.from("perf_habit").select("id, label, tipo, alvo, ativo, frequency_type, weekdays, start_date, end_date").eq("user_id", userId).eq("ativo", true).order("ordem"),
    supabase.from("perf_habit_log").select("habit_id, data, valor").eq("user_id", userId).gte("data", historyFrom).lte("data", analysisDate),
    supabase.from("perf_task").select("id, title, start_date, recurrence_type, recurrence_end_date, active").eq("user_id", userId).eq("active", true).lte("start_date", analysisDate),
    supabase.from("perf_task_log").select("task_id, occurrence_date, completed").eq("user_id", userId).gte("occurrence_date", historyFrom).lte("occurrence_date", analysisDate),
    supabase.from("perf_activity").select("date, area, duration_minutes, status").eq("user_id", userId).gte("date", activityFrom).lte("date", analysisDate).limit(2000),
    supabase.from("perf_goal").select("name, status, start_date, deadline, initial_value, current_value, target_value").eq("user_id", userId).eq("active", true),
    supabase.from("perf_event").select("title, start_at, status").eq("user_id", userId).eq("active", true).gte("start_at", `${analysisDate}T00:00:00+14:00`).lte("start_at", `${addDays(analysisDate, 7)}T23:59:59-12:00`).limit(500),
    supabase.from("perf_study_roadmap").select("id, title, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("perf_study_roadmap_item").select("roadmap_id, title, status, completed_at, scheduled_date, order_index").eq("user_id", userId).limit(5000),
    supabase.from("perf_portfolio_snapshot").select("date, total_value").eq("user_id", userId).gte("date", historyFrom).lte("date", analysisDate).order("date"),
    supabase.from("perf_investment_contribution").select("date, amount").eq("user_id", userId).gte("date", historyFrom).lte("date", analysisDate).limit(2000),
    supabase.from("perf_weight").select("data, peso_kg").eq("user_id", userId).gte("data", historyFrom).lte("data", analysisDate).order("data"),
  ]);

  const missingAreas: string[] = [];
  errorArea(habitsResult.error || habitLogsResult.error, "habitos", missingAreas);
  errorArea(tasksResult.error || taskLogsResult.error, "tarefas", missingAreas);
  errorArea(activitiesResult.error, "academia e estudos", missingAreas);
  errorArea(goalsResult.error, "metas", missingAreas);
  errorArea(eventsResult.error, "agenda", missingAreas);
  errorArea(roadmapsResult.error || studyItemsResult.error, "roadmap de estudos", missingAreas);
  errorArea(snapshotsResult.error || contributionsResult.error, "investimentos", missingAreas);
  errorArea(weightsResult.error, "peso", missingAreas);

  let contributionRows = contributionsResult.data ?? [];
  if (contributionsResult.error) {
    const fallback = await supabase.from("personal_finance_entries").select("entry_date, amount").eq("user_id", userId).eq("type", "investimento").gte("entry_date", historyFrom).lte("entry_date", analysisDate).limit(2000);
    if (!fallback.error) {
      contributionRows = (fallback.data ?? []).map((row) => ({ date: row.entry_date, amount: row.amount }));
      const index = missingAreas.indexOf("investimentos");
      if (!snapshotsResult.error && index >= 0) missingAreas.splice(index, 1);
    }
  }

  return {
    analysisDate,
    timezone,
    profileName: publicProfileResult.data?.nome ?? null,
    trainingWeeklyTarget: numberOrNull(profileResult.data?.treinos_semana_meta),
    targetWeight: numberOrNull(profileResult.data?.peso_meta),
    habits: (habitsResult.data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      type: row.tipo,
      target: numberOrNull(row.alvo),
      active: Boolean(row.ativo),
      frequencyType: row.frequency_type,
      weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number).filter(Number.isFinite) : null,
      startDate: row.start_date,
      endDate: row.end_date,
    })),
    habitLogs: (habitLogsResult.data ?? []).map((row) => ({ habitId: row.habit_id, date: row.data, value: Number(row.valor) })),
    tasks: (tasksResult.data ?? []).map((row) => ({ id: row.id, title: row.title, startDate: row.start_date, recurrenceType: row.recurrence_type, recurrenceEndDate: row.recurrence_end_date, active: Boolean(row.active) })),
    taskLogs: (taskLogsResult.data ?? []).map((row) => ({ taskId: row.task_id, date: row.occurrence_date, completed: Boolean(row.completed) })),
    activities: (activitiesResult.data ?? []).map((row) => ({ date: row.date, area: row.area, durationMinutes: numberOrNull(row.duration_minutes), status: row.status })),
    goals: (goalsResult.data ?? []).map((row) => ({ name: row.name, status: row.status, startDate: row.start_date, deadline: row.deadline, initialValue: Number(row.initial_value), currentValue: Number(row.current_value), targetValue: Number(row.target_value) })),
    events: (eventsResult.data ?? []).map((row) => ({ title: row.title, startAt: row.start_at, status: row.status })),
    roadmaps: (roadmapsResult.data ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status })),
    studyItems: (studyItemsResult.data ?? []).map((row) => ({ roadmapId: row.roadmap_id, title: row.title, status: row.status, completedAt: row.completed_at, scheduledDate: row.scheduled_date, orderIndex: Number(row.order_index) })),
    portfolioSnapshots: (snapshotsResult.data ?? []).map((row) => ({ date: row.date, totalValue: Number(row.total_value) })),
    contributions: contributionRows.map((row) => ({ date: row.date, amount: Number(row.amount) })),
    weights: (weightsResult.data ?? []).map((row) => ({ date: row.data, weightKg: Number(row.peso_kg) })),
    missingAreas,
  };
}

function aiWarning(error: unknown): string {
  if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") return "OpenAI nao configurada; foi usada a leitura local.";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  if (status === 429) return "Limite da OpenAI atingido; foi usada a leitura local.";
  if (status && status >= 500) return "OpenAI indisponivel; foi usada a leitura local.";
  return "A resposta da IA nao ficou valida; foi usada a leitura local.";
}

export async function generateDailyLifeAnalysis(input: GenerateDailyLifeAnalysisInput): Promise<GenerateDailyLifeAnalysisResult> {
  const timezone = safeTimezone(input.timezone);
  const now = input.now ?? new Date();
  const analysisDate = localDate(now, timezone);
  const existingResult = await input.supabase
    .from("perf_ai_insight")
    .select("id, source_data")
    .eq("user_id", input.userId)
    .eq("type", DAILY_LIFE_ANALYSIS_TYPE)
    .eq("analysis_end", analysisDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingResult.error) throw new Error(existingResult.error.message);
  const existingAnalysis = parseDailyLifeAnalysis(existingResult.data?.source_data);
  if (existingAnalysis && !input.force) return { state: "skipped", analysis: existingAnalysis, warning: null };

  const metricsInput = await loadMetricsInput(input.supabase, input.userId, analysisDate, timezone);
  const metrics = buildDailyLifeMetrics(metricsInput);
  const fallback = buildFallbackDailyLifeNarrative(metrics);
  const model = process.env.OPENAI_LIFE_OS_MODEL?.trim() || process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  let narrative = fallback;
  let mode: "ai" | "fallback" = "fallback";
  let responseId: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let warning: string | null = null;

  if (metrics.coverage.available.length > 0) {
    try {
      const response = await getOpenAIClient().responses.parse({
        model,
        reasoning: { effort: "medium" },
        instructions: dailyLifeSystemInstructions(),
        input: dailyLifePromptInput(metrics),
        text: { format: zodTextFormat(dailyLifeNarrativeSchema, "daily_life_analysis") },
        max_output_tokens: 3_000,
        safety_identifier: createHash("sha256").update(input.userId).digest("hex"),
        store: false,
      });
      if (!response.output_parsed) throw new Error("EMPTY_STRUCTURED_OUTPUT");
      narrative = response.output_parsed;
      mode = "ai";
      responseId = response.id;
      inputTokens = response.usage?.input_tokens ?? null;
      outputTokens = response.usage?.output_tokens ?? null;
    } catch (error) {
      warning = aiWarning(error);
    }
  } else {
    warning = "Ainda nao ha dados suficientes; foi criada uma leitura inicial local.";
  }

  const generatedAt = now.toISOString();
  const analysis = createDailyLifeAnalysis({
    metrics,
    narrative,
    generatedAt,
    generation: {
      mode,
      model: mode === "ai" ? model : null,
      promptVersion: DAILY_LIFE_ANALYSIS_PROMPT_VERSION,
      responseId,
      inputTokens,
      outputTokens,
    },
  });
  const priority = analysis.status === "critical" ? 1 : analysis.status === "attention" ? 2 : 3;
  const primaryAlert = analysis.alerts[0] ?? null;
  const primaryPriority = analysis.priorities[0] ?? null;
  const row = {
    user_id: input.userId,
    type: DAILY_LIFE_ANALYSIS_TYPE,
    analysis_start: metrics.periods.currentFrom,
    analysis_end: analysisDate,
    main_area: primaryPriority?.area ?? primaryAlert?.area ?? "geral",
    diagnosis: analysis.headline,
    main_error: primaryAlert ? `${primaryAlert.title}: ${primaryAlert.evidence}` : null,
    risk: primaryAlert?.impact ?? null,
    recommended_action: primaryPriority?.action ?? null,
    projection: analysis.comparison,
    priority,
    status: "new",
    source_data: analysis,
    created_at: generatedAt,
  };

  if (existingResult.data?.id) {
    const { error } = await input.supabase.from("perf_ai_insight").update(row).eq("id", existingResult.data.id).eq("user_id", input.userId);
    if (error) throw new Error(error.message);
    return { state: "updated", analysis, warning };
  }

  const { error: insertError } = await input.supabase.from("perf_ai_insight").insert(row);
  if (insertError) {
    if (insertError.code !== "23505") throw new Error(insertError.message);
    const { error: updateError } = await input.supabase.from("perf_ai_insight").update(row).eq("user_id", input.userId).eq("type", DAILY_LIFE_ANALYSIS_TYPE).eq("analysis_end", analysisDate);
    if (updateError) throw new Error(updateError.message);
    return { state: "updated", analysis, warning };
  }
  return { state: "generated", analysis, warning };
}
