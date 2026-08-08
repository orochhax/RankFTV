import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LifeOSDashboard } from "@/components/performance/LifeOSDashboard";
import { PerformanceConfirmProvider } from "@/components/performance/PerformanceConfirmDialog";
import {
  addDays,
  segundaDaSemana,
  indexLogs,
  type Habit,
  type HabitLog,
} from "@/lib/performance";
import {
  type LifeEvent,
  type LifeGoal,
  type LifeInsight,
  type PortfolioSnapshot,
  todayDateInBahia,
} from "@/lib/performance-life-os";
import type { WeeklyReport } from "@/components/performance/RelatorioSemanal";
import {
  expandTaskOccurrences,
  resolveDashboardRange,
  type DashboardPeriod,
  type Task,
} from "@/lib/performance-dashboard";
import { consistencyStatus } from "@/lib/performance-analytics";
import {
  roadmapAiAnswersSchema,
  type RoadmapDraftSummary,
  type RoadmapGenerationJob,
} from "@/lib/study-roadmap-ai";
import type { StudyOrganizationProfile } from "@/lib/study-organization";
import {
  DAILY_LIFE_ANALYSIS_TYPE,
  parseDailyLifeAnalysis,
} from "@/lib/daily-life-analysis";
import {
  isStudyAnswerCorrect,
  type SubmittedStudyAnswer,
} from "@/lib/study-assessment";
import type { StudySessionMetadata } from "@/lib/performance-widgets";
import { isPerformanceOwner } from "@/lib/performance-owner";
import type {
  InvestmentPlan,
  InvestmentPlanRevision,
} from "@/lib/investment-route";

export const metadata = { title: "Carlos Life OS" };
export const maxDuration = 300;

function asNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && Boolean(entry.trim()),
      )
    : [];
}

function chunkValues<T>(values: T[], size = 50): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    chunks.push(values.slice(index, index + size));
  return chunks;
}

async function fetchAllPages<T>(
  loadPage: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: unknown }>,
  pageSize = 500,
): Promise<{ data: T[]; error: unknown | null }> {
  const data: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await loadPage(from, from + pageSize - 1);
    if (page.error) return { data: [], error: page.error };
    const rows = page.data ?? [];
    data.push(...rows);
    if (rows.length < pageSize) return { data, error: null };
  }
}

function isMissingInvestmentRouteSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";
  return (
    ["42P01", "PGRST204", "PGRST205"].includes(code) ||
    (/perf_investment_plan(?:_revision)?/i.test(message) &&
      /does not exist|schema cache|not find/i.test(message))
  );
}

function isMissingDatabaseSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === "string" &&
    ["42P01", "42703", "PGRST204", "PGRST205"].includes(code)
  );
}

function isMissingCanonicalContributionTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";
  return (
    ["42P01", "PGRST205"].includes(code) ||
    (/perf_investment_contribution/i.test(message) &&
      /does not exist|schema cache|not find/i.test(message))
  );
}

function assessmentAnswers(
  value: unknown,
): Record<string, SubmittedStudyAnswer> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, SubmittedStudyAnswer> = {};
  Object.entries(value).forEach(([key, answer]) => {
    if (typeof answer === "number" && Number.isInteger(answer))
      result[key] = answer;
    else if (
      Array.isArray(answer) &&
      answer.every(
        (entry) => typeof entry === "number" && Number.isInteger(entry),
      )
    )
      result[key] = answer as number[];
  });
  return result;
}

function studySessionMetadata(value: unknown): StudySessionMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const session = (value as Record<string, unknown>).study_session;
  if (!session || typeof session !== "object" || Array.isArray(session))
    return null;
  const row = session as Record<string, unknown>;
  const strings = (key: string) =>
    Array.isArray(row[key])
      ? (row[key] as unknown[]).filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [];
  const numeric = (key: string) =>
    Number.isFinite(Number(row[key]))
      ? Math.max(0, Math.round(Number(row[key])))
      : 0;
  return {
    source: row.source === "pomodoro" ? "pomodoro" : "manual",
    focusMinutes: numeric("focus_minutes"),
    shortBreakMinutes: numeric("short_break_minutes"),
    longBreakMinutes: numeric("long_break_minutes"),
    totalMinutes: numeric("total_minutes"),
    cyclesCompleted: numeric("cycles_completed"),
    roadmapId: typeof row.roadmap_id === "string" ? row.roadmap_id : null,
    moduleIds: strings("module_ids"),
    itemIds: strings("item_ids"),
    subjectLabels: strings("subject_labels"),
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
  };
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) redirect("/");

  const today = todayDateInBahia();
  const params = (await searchParams) ?? {};
  const periodValue =
    typeof params.period === "string" &&
    ["today", "week", "month", "custom"].includes(params.period)
      ? (params.period as DashboardPeriod)
      : "today";
  const range = resolveDashboardRange(
    periodValue,
    today,
    typeof params.from === "string" ? params.from : undefined,
    typeof params.to === "string" ? params.to : undefined,
  );
  const monday = segundaDaSemana(today);
  const recentGenerationSince = `${addDays(today, -1)}T00:00:00-03:00`;

  const [
    profileRes,
    publicProfileRes,
    privateProfileRes,
    habitsRes,
    allHabitsRes,
    logsRes,
    weightsRes,
    currentReportRes,
    reportHistoryRes,
    ratingsRes,
    matchesRes,
    trainingsRes,
    testsRes,
    categoriesRes,
    eventsRes,
    activitiesRes,
    goalsRes,
    snapshotsRes,
    withdrawalsRes,
    insightsRes,
    dailyInsightRes,
    contributionsRes,
    tasksRes,
    taskLogsRes,
  ] = await Promise.all([
    supabase
      .from("perf_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("nome, username, foto_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles_private")
      .select("telefone, data_nascimento")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("perf_habit")
      .select("*")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("perf_habit")
      .select("*")
      .eq("user_id", user.id)
      .order("ordem"),
    supabase
      .from("perf_habit_log")
      .select("habit_id, data, valor")
      .eq("user_id", user.id)
      .gte("data", addDays(today, -730))
      .lte("data", range.to),
    supabase
      .from("perf_weight")
      .select("peso_kg, data")
      .eq("user_id", user.id)
      .order("data", { ascending: true })
      .limit(365),
    supabase
      .from("perf_weekly_report")
      .select("*")
      .eq("user_id", user.id)
      .eq("semana_inicio", monday)
      .maybeSingle(),
    supabase
      .from("perf_weekly_report")
      .select("*")
      .eq("user_id", user.id)
      .eq("fechado", true)
      .order("semana_inicio", { ascending: false })
      .limit(8),
    supabase
      .from("perf_rating")
      .select("id, data, rating")
      .eq("user_id", user.id)
      .order("data", { ascending: true })
      .limit(365),
    supabase
      .from("perf_match")
      .select("*")
      .eq("user_id", user.id)
      .order("data", { ascending: false })
      .limit(100),
    supabase
      .from("perf_training")
      .select("id, data, tipo, duracao_min, obs")
      .eq("user_id", user.id)
      .order("data", { ascending: false })
      .limit(50),
    supabase
      .from("perf_test")
      .select("id, data, tipo_teste, valor, unidade")
      .eq("user_id", user.id)
      .order("data", { ascending: false }),
    supabase
      .from("perf_category")
      .select("id, name, type, area, color, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("perf_event")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("start_at", { ascending: true }),
    supabase
      .from("perf_activity")
      .select(
        "id, title, date, area, type, duration_minutes, status, notes, metadata",
      )
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(500),
    supabase
      .from("perf_goal")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("priority", { ascending: true }),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("perf_portfolio_snapshot")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      return { data, error };
    }),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("perf_investment_withdrawal")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      return { data, error };
    }),
    supabase
      .from("perf_ai_insight")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("perf_ai_insight")
      .select("source_data")
      .eq("user_id", user.id)
      .eq("type", DAILY_LIFE_ANALYSIS_TYPE)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("personal_finance_entries")
        .select("id, amount, entry_date, name, bank")
        .eq("user_id", user.id)
        .eq("type", "investimento")
        .order("entry_date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
    supabase
      .from("perf_task")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .lte("start_date", range.to)
      .order("start_date"),
    supabase
      .from("perf_task_log")
      .select("task_id, occurrence_date, completed, completed_at")
      .eq("user_id", user.id)
      .gte("occurrence_date", addDays(today, -730))
      .lte("occurrence_date", range.to > today ? range.to : today),
  ]);
  const [
    roadmapsRes,
    roadmapMetaRes,
    roadmapAnswersRes,
    studyDraftsRes,
    studyGenerationJobsRes,
    investmentContributionsRes,
    investmentPlansRes,
    investmentPlanRevisionsRes,
  ] = await Promise.all([
    supabase
      .from("perf_study_roadmap")
      .select(
        "id, title, description, status, start_date, target_date, source, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("perf_study_roadmap")
      .select(
        "id, generation_id, difficulty_level, quality_score, workload_score, total_estimated_minutes",
      )
      .eq("user_id", user.id),
    supabase
      .from("perf_study_roadmap_generation")
      .select("id, answers")
      .eq("user_id", user.id)
      .eq("status", "accepted"),
    supabase
      .from("perf_study_roadmap_generation")
      .select(
        "id, origin, original_filename, preview_title, preview_description, module_count, step_count, total_estimated_minutes, created_at",
      )
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("perf_study_roadmap_generation")
      .select("id, status, preview_title, error_message, created_at")
      .eq("user_id", user.id)
      .in("status", ["generating", "failed"])
      .gte("created_at", recentGenerationSince)
      .order("created_at", { ascending: false })
      .limit(5),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("perf_investment_contribution")
        .select("id, date, amount, institution, notes, source, source_entry_id")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("perf_investment_plan")
        .select(
          "id, name, active, completed_at, archived_at, created_at, updated_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("perf_investment_plan_revision")
        .select(
          "id, plan_id, version, effective_from, baseline_date, baseline_value, target_value, target_date, value_mode, value_reference_date, planned_monthly_contribution, annual_return_conservative, annual_return_base, annual_return_favorable, annual_inflation, change_note, created_at",
        )
        .eq("user_id", user.id)
        .order("effective_from", { ascending: true })
        .order("version", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }),
  ]);

  const activeRoadmapRow =
    (roadmapsRes.data ?? []).find((roadmap) => roadmap.status === "active") ??
    roadmapsRes.data?.[0] ??
    null;
  const loadedRoadmapId =
    activeRoadmapRow?.id ?? "00000000-0000-0000-0000-000000000000";
  const [studyItemsRes, studyItemReferenceDetailsRes, studyModulesRes] =
    await Promise.all([
      supabase
        .from("perf_study_roadmap_item")
        .select(
          "id, roadmap_id, section, title, description, order_index, estimated_minutes, status, completed_at, scheduled_date, item_kind",
        )
        .eq("user_id", user.id)
        .eq("roadmap_id", loadedRoadmapId)
        .order("order_index"),
      supabase
        .from("perf_study_roadmap_item")
        .select(
          "id, module_id, requirements, workspace, preparation_steps, instructions, practice_exercises, reflection_questions, completion_checklist, evidence_prompt, completion_criteria, resource_title, resource_url, resource_channel",
        )
        .eq("user_id", user.id)
        .eq("roadmap_id", loadedRoadmapId),
      supabase
        .from("perf_study_roadmap_module")
        .select(
          "id, roadmap_id, title, objective, success_criteria, topics, order_index, estimated_minutes",
        )
        .eq("user_id", user.id)
        .eq("roadmap_id", loadedRoadmapId)
        .order("order_index"),
    ]);
  const studyItemDetailsRes = studyItemReferenceDetailsRes.error
    ? await supabase
        .from("perf_study_roadmap_item")
        .select(
          "id, module_id, requirements, workspace, instructions, completion_criteria, resource_title, resource_url, resource_channel",
        )
        .eq("user_id", user.id)
        .eq("roadmap_id", loadedRoadmapId)
    : null;
  const legacyStudyItemDetailsRes =
    studyItemReferenceDetailsRes.error && studyItemDetailsRes?.error
      ? await supabase
          .from("perf_study_roadmap_item")
          .select(
            "id, module_id, instructions, completion_criteria, resource_title, resource_url, resource_channel",
          )
          .eq("user_id", user.id)
          .eq("roadmap_id", loadedRoadmapId)
      : null;
  const studyItemDetailRows = !studyItemReferenceDetailsRes.error
    ? (studyItemReferenceDetailsRes.data ?? [])
    : !studyItemDetailsRes?.error
      ? (studyItemDetailsRes?.data ?? [])
      : (legacyStudyItemDetailsRes?.data ?? []);
  const studyItemIds = (studyItemsRes.data ?? []).map((item) => item.id);
  const itemIdChunks = chunkValues(studyItemIds);
  const enhancedQuestionResults = await Promise.all(
    itemIdChunks.map((ids) =>
      supabase
        .from("perf_study_assessment_question")
        .select(
          "id, item_id, question_type, prompt, options, order_index, correct_option, correct_order, explanation",
        )
        .eq("user_id", user.id)
        .in("item_id", ids)
        .order("order_index"),
    ),
  );
  const enhancedQuestionError =
    enhancedQuestionResults.find((result) => result.error)?.error ?? null;
  const legacyQuestionResults = enhancedQuestionError
    ? await Promise.all(
        itemIdChunks.map((ids) =>
          supabase
            .from("perf_study_assessment_question")
            .select(
              "id, item_id, prompt, options, order_index, correct_option, explanation",
            )
            .eq("user_id", user.id)
            .in("item_id", ids)
            .order("order_index"),
        ),
      )
    : [];
  const legacyQuestionError =
    legacyQuestionResults.find((result) => result.error)?.error ?? null;
  const studyQuestionRows = (
    enhancedQuestionError ? legacyQuestionResults : enhancedQuestionResults
  ).flatMap((result) => result.data ?? []);
  const studyAttemptResults = await Promise.all(
    itemIdChunks.map((ids) =>
      supabase
        .from("perf_study_assessment_attempt")
        .select(
          "id, item_id, answers, score, correct_count, total_count, submitted_at",
        )
        .eq("user_id", user.id)
        .in("item_id", ids)
        .order("submitted_at", { ascending: false }),
    ),
  );
  const studyAttemptsError =
    studyAttemptResults.find((result) => result.error)?.error ?? null;
  const studyAttemptRows = studyAttemptResults.flatMap(
    (result) => result.data ?? [],
  );
  const studyReferenceStandardReady = !studyItemReferenceDetailsRes.error;
  const studyEnhancementsReady =
    (!studyItemReferenceDetailsRes.error || !studyItemDetailsRes?.error) &&
    !enhancedQuestionError;

  const habits: Habit[] = (habitsRes.data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    tipo: row.tipo,
    alvo: asNumber(row.alvo),
    unidade: row.unidade,
    ordem: row.ordem,
    ativo: row.ativo,
  }));
  const logs: HabitLog[] = (logsRes.data ?? []).map((row) => ({
    habit_id: row.habit_id,
    data: row.data,
    valor: Number(row.valor),
  }));
  const allHabits: Habit[] = (allHabitsRes.data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    tipo: row.tipo,
    alvo: asNumber(row.alvo),
    unidade: row.unidade,
    ordem: row.ordem,
    ativo: row.ativo,
  }));
  const valuesToday = indexLogs(logs)[today] ?? {};
  const profile = profileRes.data;
  const weights = (weightsRes.data ?? []).map((row) => ({
    data: row.data as string,
    peso_kg: Number(row.peso_kg),
  }));
  const profileData = profile
    ? {
        altura_cm: asNumber(profile.altura_cm),
        data_nascimento: profile.data_nascimento,
        lado: profile.lado,
        pe_dominante: profile.pe_dominante,
        peso_meta: asNumber(profile.peso_meta),
        rating_meta: asNumber(profile.rating_meta),
        treinos_semana_meta: asNumber(profile.treinos_semana_meta),
      }
    : null;
  const events: LifeEvent[] = (eventsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: Boolean(row.all_day),
    status: row.status,
    source: row.source,
    categoryId: row.category_id,
    location: row.location,
    link: row.link,
    active: row.active,
  }));
  const goals: LifeGoal[] = (goalsRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    area: row.area,
    goalType: row.goal_type,
    initialValue: Number(row.initial_value),
    currentValue: Number(row.current_value),
    targetValue: Number(row.target_value),
    unit: row.unit,
    startDate: row.start_date,
    deadline: row.deadline,
    priority: Number(row.priority),
    status: row.status,
    allowOverTarget: Boolean(row.allow_over_target),
  }));
  const snapshots: PortfolioSnapshot[] = (snapshotsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      date: row.date,
      totalValue: Number(row.total_value),
      previousValue: asNumber(row.previous_value),
      variationAmount: asNumber(row.variation_amount),
      variationPercentage: asNumber(row.variation_percentage),
      movement: row.movement,
      notes: row.notes,
    }),
  );
  const studyV2Errors = [
    roadmapMetaRes.error,
    legacyStudyItemDetailsRes?.error,
    studyModulesRes.error,
    legacyQuestionError,
    studyAttemptsError,
  ].filter(Boolean);
  const newTableErrors = [
    eventsRes.error,
    activitiesRes.error,
    goalsRes.error,
    snapshotsRes.error,
    withdrawalsRes.error,
    insightsRes.error,
    dailyInsightRes.error,
    tasksRes.error,
    taskLogsRes.error,
    roadmapsRes.error,
    studyItemsRes.error,
    studyDraftsRes.error,
    studyGenerationJobsRes.error,
    investmentContributionsRes.error,
    ...studyV2Errors,
  ].filter(Boolean);
  const canUseLegacyContributions =
    Boolean(investmentContributionsRes.error) &&
    isMissingCanonicalContributionTable(investmentContributionsRes.error) &&
    !contributionsRes.error;
  const contributions = canUseLegacyContributions
    ? (contributionsRes.data ?? []).map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        date: row.entry_date,
        institution: row.bank ?? null,
        notes: row.name ?? null,
        source: "personal_finance",
        sourceEntryId: row.id,
      }))
    : !investmentContributionsRes.error
      ? investmentContributionsRes.data.map((row) => ({
          id: row.id,
          amount: Number(row.amount),
          date: row.date,
          institution: row.institution,
          notes: row.notes,
          source: row.source,
          sourceEntryId: row.source_entry_id,
        }))
      : [];
  const investmentContributionWriteReady = !investmentContributionsRes.error;
  const investmentRouteQueryErrors = [
    investmentPlansRes.error,
    investmentPlanRevisionsRes.error,
  ].filter(Boolean);
  const investmentRouteSchemaReady = !investmentRouteQueryErrors.some(
    isMissingInvestmentRouteSchema,
  );
  const investmentRouteLoadError =
    investmentRouteSchemaReady && investmentRouteQueryErrors.length > 0
      ? "Não foi possível carregar os detalhes do plano neste momento."
      : null;
  const investmentMovementsLoadError =
    Boolean(snapshotsRes.error) ||
    Boolean(withdrawalsRes.error) ||
    Boolean(investmentContributionsRes.error && !canUseLegacyContributions)
      ? "Não foi possível carregar todos os check-ins, aportes e retiradas com segurança."
      : null;
  const investmentPlanHistory: InvestmentPlan[] = !investmentPlansRes.error
    ? investmentPlansRes.data.map((row) => ({
        id: row.id,
        name: row.name,
        active: Boolean(row.active),
        completedAt: row.completed_at,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    : [];
  const investmentPlan =
    investmentPlanHistory.find((plan) => plan.active) ?? null;
  const investmentPlanRevisionHistory: InvestmentPlanRevision[] =
    !investmentPlanRevisionsRes.error
      ? investmentPlanRevisionsRes.data.map((row) => ({
          id: row.id,
          planId: row.plan_id,
          version: Number(row.version),
          effectiveFrom: row.effective_from,
          baselineDate: row.baseline_date,
          baselineValue: Number(row.baseline_value),
          targetValue: Number(row.target_value),
          targetDate: row.target_date,
          valueMode: row.value_mode === "real" ? "real" : "nominal",
          valueReferenceDate: row.value_reference_date,
          plannedMonthlyContribution: Number(row.planned_monthly_contribution),
          annualReturnConservative: Number(row.annual_return_conservative),
          annualReturnBase: Number(row.annual_return_base),
          annualReturnFavorable: Number(row.annual_return_favorable),
          annualInflation: Number(row.annual_inflation),
          changeNote: row.change_note,
          createdAt: row.created_at,
        }))
      : [];
  const investmentPlanRevisions = investmentPlan
    ? investmentPlanRevisionHistory.filter(
        (revision) => revision.planId === investmentPlan.id,
      )
    : [];
  const tasks: Task[] = (tasksRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    recurrenceType: row.recurrence_type,
    recurrenceEndDate: row.recurrence_end_date,
    active: Boolean(row.active),
  }));
  const taskLogs = (taskLogsRes.data ?? []).map((row) => ({
    task_id: row.task_id,
    occurrence_date: row.occurrence_date,
    completed: Boolean(row.completed),
    completed_at: row.completed_at,
  }));
  const taskOccurrences = expandTaskOccurrences(tasks, taskLogs, range);
  const consistencyOccurrences = expandTaskOccurrences(tasks, taskLogs, {
    period: "custom",
    from: addDays(today, -730),
    to: today,
  });
  const consistency = consistencyStatus(
    habits,
    logs,
    consistencyOccurrences,
    today,
  );
  const roadmapMetaById = new Map(
    (roadmapMetaRes.data ?? []).map((row) => [row.id, row]),
  );
  const roadmapOrganizationProfiles = new Map<
    string,
    StudyOrganizationProfile
  >();
  (roadmapAnswersRes.data ?? []).forEach((row) => {
    const parsed = roadmapAiAnswersSchema.safeParse(row.answers);
    // Roadmaps de idioma anteriores usavam "mobile" como valor tecnico sem
    // perguntar o dispositivo ao usuario, portanto nao tratamos isso como resposta.
    if (
      !parsed.success ||
      (parsed.data.roadmapType === "language" &&
        !parsed.data.organizationProfileCollected)
    )
      return;
    roadmapOrganizationProfiles.set(row.id, {
      roadmapType: parsed.data.roadmapType,
      subject: parsed.data.subject,
      targetLanguage: parsed.data.targetLanguage,
      availableDevices: parsed.data.availableDevices,
      digitalLiteracy: parsed.data.digitalLiteracy,
    });
  });
  const itemDetailsById = new Map(
    studyItemDetailRows.map((row) => [row.id, row]),
  );
  const studyRoadmaps = (roadmapsRes.data ?? []).map((row) => {
    const meta = roadmapMetaById.get(row.id);
    const organizationProfile =
      typeof meta?.generation_id === "string"
        ? (roadmapOrganizationProfiles.get(meta.generation_id) ?? null)
        : null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      targetDate: row.target_date,
      source: row.source,
      difficultyLevel: meta?.difficulty_level ?? null,
      qualityScore: asNumber(meta?.quality_score),
      workloadScore: asNumber(meta?.workload_score),
      totalEstimatedMinutes: asNumber(meta?.total_estimated_minutes),
      createdAt: row.created_at,
      organizationProfile,
    };
  });
  const studyDrafts: RoadmapDraftSummary[] = (studyDraftsRes.data ?? [])
    .filter((row) => Boolean(row.preview_title))
    .map((row) => ({
      generationId: row.id,
      origin: row.origin === "import" ? "import" : "ai",
      originalFilename: row.original_filename ?? null,
      title: row.preview_title ?? "Roadmap sem titulo",
      description: row.preview_description ?? null,
      moduleCount: Number(row.module_count ?? 0),
      stepCount: Number(row.step_count ?? 0),
      totalEstimatedMinutes: Number(row.total_estimated_minutes ?? 0),
      createdAt: row.created_at,
    }));
  const studyGenerationJobs: RoadmapGenerationJob[] = (
    studyGenerationJobsRes.data ?? []
  ).flatMap((row) =>
    row.status === "generating" || row.status === "failed"
      ? [
          {
            generationId: row.id,
            status: row.status,
            title: row.preview_title ?? "Novo roadmap",
            error: row.error_message ?? null,
            createdAt: row.created_at,
          },
        ]
      : [],
  );
  const primaryRoadmap =
    studyRoadmaps.find((roadmap) => roadmap.status === "active") ??
    studyRoadmaps[0] ??
    null;
  const privateQuestionsByItem = new Map<string, typeof studyQuestionRows>();
  studyQuestionRows.forEach((question) =>
    privateQuestionsByItem.set(question.item_id, [
      ...(privateQuestionsByItem.get(question.item_id) ?? []),
      question,
    ]),
  );

  return (
    <PerformanceConfirmProvider>
      <LifeOSDashboard
        today={today}
        monday={monday}
        userId={user.id}
        email={user.email ?? ""}
        telefone={privateProfileRes.data?.telefone ?? null}
        dataNascimento={
          privateProfileRes.data?.data_nascimento ??
          profileData?.data_nascimento ??
          null
        }
        nome={publicProfileRes.data?.nome ?? "Carlos"}
        username={publicProfileRes.data?.username ?? null}
        fotoUrl={publicProfileRes.data?.foto_url ?? null}
        profile={profileData}
        alturaCm={profileData?.altura_cm ?? null}
        pesoAtual={weights.at(-1)?.peso_kg ?? null}
        habits={habits}
        allHabits={allHabits}
        logs={logs}
        valoresHoje={valuesToday}
        reportAtual={(currentReportRes.data ?? null) as WeeklyReport | null}
        reportHistory={(reportHistoryRes.data ?? []) as WeeklyReport[]}
        weights={weights}
        ratings={(ratingsRes.data ?? []).map((row) => ({
          id: row.id,
          data: row.data,
          rating: Number(row.rating),
        }))}
        matches={(matchesRes.data ?? []).map((row) => ({
          id: row.id,
          data: row.data,
          parceiro: row.parceiro,
          adversario: row.adversario,
          resultado: row.resultado,
          placar: row.placar,
          obs: row.obs,
        }))}
        trainings={(trainingsRes.data ?? []).map((row) => ({
          id: row.id,
          data: row.data,
          tipo: row.tipo,
          duracao_min: asNumber(row.duracao_min),
          obs: row.obs,
        }))}
        tests={(testsRes.data ?? []).map((row) => ({
          id: row.id,
          data: row.data,
          tipo_teste: row.tipo_teste,
          valor: Number(row.valor),
          unidade: row.unidade,
        }))}
        events={events}
        categories={(categoriesRes.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          area: row.area,
          color: row.color,
          active: Boolean(row.active),
        }))}
        activities={(activitiesRes.data ?? []).map((row) => {
          const metadata =
            row.metadata && typeof row.metadata === "object"
              ? (row.metadata as { muscle_groups?: unknown })
              : {};
          return {
            id: row.id,
            title: row.title,
            date: row.date,
            area: row.area,
            type: row.type,
            durationMinutes: asNumber(row.duration_minutes),
            status: row.status,
            notes: row.notes,
            muscleGroups: Array.isArray(metadata.muscle_groups)
              ? metadata.muscle_groups.filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
            studySession: studySessionMetadata(row.metadata),
          };
        })}
        goals={goals}
        snapshots={snapshots}
        investmentPlan={investmentPlan}
        investmentPlanRevisions={investmentPlanRevisions}
        investmentPlanHistory={investmentPlanHistory}
        investmentPlanRevisionHistory={investmentPlanRevisionHistory}
        investmentRouteSchemaReady={investmentRouteSchemaReady}
        investmentContributionWriteReady={investmentContributionWriteReady}
        investmentRouteLoadError={investmentRouteLoadError}
        investmentMovementsLoadError={investmentMovementsLoadError}
        withdrawals={(withdrawalsRes.data ?? []).map((row) => ({
          id: row.id,
          date: row.date,
          amount: Number(row.amount),
          institution: row.institution,
          notes: row.notes,
        }))}
        insights={
          (insightsRes.data ?? []).map((row) => ({
            id: row.id,
            type: row.type,
            analysisStart: row.analysis_start,
            analysisEnd: row.analysis_end,
            mainArea: row.main_area,
            diagnosis: row.diagnosis,
            mainError: row.main_error,
            risk: row.risk,
            recommendedAction: row.recommended_action,
            projection: row.projection,
            priority: Number(row.priority),
            status: row.status,
            feedback: row.feedback,
            createdAt: row.created_at,
          })) as LifeInsight[]
        }
        contributions={contributions}
        studyRoadmap={primaryRoadmap}
        studyRoadmaps={studyRoadmaps}
        studyItems={(studyItemsRes.data ?? []).map((row) => {
          const details = itemDetailsById.get(row.id) as
            | ((typeof studyItemDetailRows)[number] & {
                requirements?: string | null;
                workspace?: string | null;
                preparation_steps?: unknown;
                practice_exercises?: unknown;
                reflection_questions?: unknown;
                completion_checklist?: unknown;
                evidence_prompt?: string | null;
              })
            | undefined;
          return {
            id: row.id,
            roadmapId: row.roadmap_id,
            moduleId: details?.module_id ?? null,
            section: row.section,
            title: row.title,
            description: row.description,
            requirements: details?.requirements ?? null,
            workspace: details?.workspace ?? null,
            preparationSteps: stringList(details?.preparation_steps),
            instructions: details?.instructions ?? null,
            practiceExercises: stringList(details?.practice_exercises),
            reflectionQuestions: stringList(details?.reflection_questions),
            completionChecklist: stringList(details?.completion_checklist),
            evidence: details?.evidence_prompt ?? null,
            completionCriteria: details?.completion_criteria ?? null,
            resourceTitle: details?.resource_title ?? null,
            resourceUrl: details?.resource_url ?? null,
            resourceChannel: details?.resource_channel ?? null,
            orderIndex: Number(row.order_index),
            estimatedMinutes: asNumber(row.estimated_minutes),
            status: row.status,
            completedAt: row.completed_at,
            scheduledDate: row.scheduled_date,
            itemKind: row.item_kind,
          };
        })}
        studyModules={(studyModulesRes.data ?? []).map((row) => ({
          id: row.id,
          roadmapId: row.roadmap_id,
          title: row.title,
          objective: row.objective,
          successCriteria: row.success_criteria,
          topics: Array.isArray(row.topics)
            ? row.topics.filter(
                (value): value is string => typeof value === "string",
              )
            : [],
          orderIndex: Number(row.order_index),
          estimatedMinutes: asNumber(row.estimated_minutes),
        }))}
        studyQuestions={studyQuestionRows.map((row) => {
          const enhanced = row as typeof row & { question_type?: string };
          return {
            id: row.id,
            itemId: row.item_id,
            prompt: row.prompt,
            options: Array.isArray(row.options)
              ? row.options.filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
            orderIndex: Number(row.order_index),
            questionType:
              enhanced.question_type === "ordering"
                ? ("ordering" as const)
                : ("multiple_choice" as const),
          };
        })}
        studyAttempts={studyAttemptRows.map((row) => {
          const answers = assessmentAnswers(row.answers);
          const feedback = (privateQuestionsByItem.get(row.item_id) ?? []).map(
            (question) => {
              const enhanced = question as typeof question & {
                question_type?: string;
                correct_option?: number | null;
                correct_order?: unknown;
                explanation?: string | null;
              };
              const questionType =
                enhanced.question_type === "ordering"
                  ? ("ordering" as const)
                  : ("multiple_choice" as const);
              const options = Array.isArray(question.options)
                ? question.options
                : [];
              const correctOrder = Array.isArray(enhanced.correct_order)
                ? enhanced.correct_order.map(Number).filter(Number.isInteger)
                : [];
              const correctOptionIndex =
                questionType === "multiple_choice" &&
                enhanced.correct_option != null &&
                Number.isInteger(Number(enhanced.correct_option))
                  ? Number(enhanced.correct_option)
                  : null;
              return {
                questionId: question.id,
                questionType,
                correct: isStudyAnswerCorrect(answers[question.id], {
                  questionType,
                  optionCount: options.length,
                  correctOptionIndex,
                  correctOrder,
                }),
                correctOptionIndex,
                correctOrder,
                explanation:
                  enhanced.explanation ??
                  "Revise a explicacao da etapa antes de tentar novamente.",
              };
            },
          );
          return {
            id: row.id,
            itemId: row.item_id,
            score: Number(row.score),
            correctCount: Number(row.correct_count),
            totalCount: Number(row.total_count),
            submittedAt: row.submitted_at,
            answers,
            feedback,
          };
        })}
        studyDrafts={studyDrafts}
        studyGenerationJobs={studyGenerationJobs}
        studyDraftsReady={!studyDraftsRes.error}
        studyEnhancementsReady={studyEnhancementsReady}
        studyReferenceStandardReady={studyReferenceStandardReady}
        studyV2Ready={!studyV2Errors.length}
        range={range}
        taskOccurrences={taskOccurrences}
        consistency={consistency}
        dailyAnalysis={parseDailyLifeAnalysis(
          dailyInsightRes.data?.source_data,
        )}
        schemaReady={!newTableErrors.some(isMissingDatabaseSchema)}
      />
    </PerformanceConfirmProvider>
  );
}
