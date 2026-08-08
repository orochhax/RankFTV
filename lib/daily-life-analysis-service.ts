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

type QueryError = {
  code?: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
};

type QueryResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

type DailyLifeDataState = "ready" | "partial" | "error" | "migration_missing";

const METRICS_PAGE_SIZE = 500;

export type GenerateDailyLifeAnalysisResult = {
  state: "generated" | "updated" | "skipped";
  analysis: DailyLifeAnalysis;
  warning: string | null;
};

function localDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bahia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
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

function timestampLocalDate(
  value: string | null | undefined,
  timezone: string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : localDate(date, timezone);
}

function isMissingRelation(error: QueryError | null | undefined): boolean {
  if (!error) return false;
  const message =
    `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/\b(relation|table)\b/.test(message) &&
      /\b(does not exist|not found|schema cache)\b/.test(message))
  );
}

function isMissingColumn(error: QueryError | null | undefined): boolean {
  if (!error) return false;
  const message =
    `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (/\bcolumn\b/.test(message) &&
      /\b(does not exist|not found|schema cache)\b/.test(message))
  );
}

async function loadAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += METRICS_PAGE_SIZE) {
    const page = await loadPage(from, from + METRICS_PAGE_SIZE - 1);
    if (page.error) return { data: null, error: page.error };
    const pageRows = page.data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < METRICS_PAGE_SIZE) return { data: rows, error: null };
  }
}

function compactText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function compactStringArray(
  value: unknown,
  maxItems = 30,
  maxLength = 160,
): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .slice(0, maxItems)
        .map((item) => item.slice(0, maxLength))
    : [];
}

function compactActivityMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const muscleGroups = compactStringArray(metadata.muscle_groups, 20, 50);
  if (muscleGroups.length) result.muscle_groups = muscleGroups;

  const sessionValue = metadata.study_session;
  if (
    sessionValue &&
    typeof sessionValue === "object" &&
    !Array.isArray(sessionValue)
  ) {
    const session = sessionValue as Record<string, unknown>;
    const compactSession: Record<string, unknown> = {};
    for (const key of [
      "focus_minutes",
      "short_break_minutes",
      "long_break_minutes",
      "total_minutes",
      "cycles_completed",
    ]) {
      const numeric = numberOrNull(session[key]);
      if (numeric != null) compactSession[key] = numeric;
    }
    for (const key of ["source", "roadmap_id", "started_at", "ended_at"]) {
      const textValue = compactText(session[key], 160);
      if (textValue) compactSession[key] = textValue;
    }
    for (const key of ["module_ids", "item_ids", "subject_labels"]) {
      const values = compactStringArray(session[key]);
      if (values.length) compactSession[key] = values;
    }
    if (Object.keys(compactSession).length)
      result.study_session = compactSession;
  }

  return Object.keys(result).length ? result : null;
}

function mergeState(...states: DailyLifeDataState[]): DailyLifeDataState {
  if (states.includes("error")) return "error";
  if (states.includes("migration_missing")) return "migration_missing";
  if (states.includes("partial")) return "partial";
  return "ready";
}

function historicalEndDate(
  explicitEndDate: string | null,
  active: boolean,
  updatedAt: string | null,
  timezone: string,
): string | null {
  if (active || !updatedAt) return explicitEndDate;
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return explicitEndDate;
  const boundary = addDays(localDate(updated, timezone), -1);
  return explicitEndDate && explicitEndDate < boundary
    ? explicitEndDate
    : boundary;
}

export async function loadDailyLifeMetricsInput(
  supabase: SupabaseClient,
  userId: string,
  analysisDate: string,
  timezone: string,
): Promise<DailyLifeMetricsInput> {
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
    withdrawalsResult,
    weightsResult,
    studyAttemptsResult,
    investmentPlanResult,
    investmentPlanRevisionsResult,
  ] = await Promise.all([
    supabase
      .from("perf_profile")
      .select("treinos_semana_meta, peso_meta")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    supabase
      .from("perf_habit")
      .select(
        "id, label, tipo, alvo, ativo, frequency_type, weekdays, start_date, end_date, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("ordem"),
    loadAllPages<{
      id: string;
      habit_id: string;
      data: string;
      valor: unknown;
    }>((from, to) =>
      supabase
        .from("perf_habit_log")
        .select("id, habit_id, data, valor")
        .eq("user_id", userId)
        .gte("data", historyFrom)
        .lte("data", analysisDate)
        .order("data")
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("perf_task")
      .select(
        "id, title, start_date, recurrence_type, recurrence_end_date, active, updated_at",
      )
      .eq("user_id", userId)
      .lte("start_date", analysisDate),
    loadAllPages<{
      id: string;
      task_id: string;
      occurrence_date: string;
      completed: boolean;
    }>((from, to) =>
      supabase
        .from("perf_task_log")
        .select("id, task_id, occurrence_date, completed")
        .eq("user_id", userId)
        .gte("occurrence_date", historyFrom)
        .lte("occurrence_date", analysisDate)
        .order("occurrence_date")
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{
      id: string;
      date: string;
      area: string;
      title: string;
      type: string | null;
      study_item_id: string | null;
      duration_minutes: unknown;
      status: string;
      learning: string | null;
      metadata: unknown;
    }>((from, to) =>
      supabase
        .from("perf_activity")
        .select(
          "id, date, area, title, type, study_item_id, duration_minutes, status, learning, metadata",
        )
        .eq("user_id", userId)
        .gte("date", activityFrom)
        .lte("date", analysisDate)
        .order("date")
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("perf_goal")
      .select(
        "name, status, start_date, deadline, initial_value, current_value, target_value",
      )
      .eq("user_id", userId)
      .eq("active", true),
    supabase
      .from("perf_event")
      .select("title, start_at, status")
      .eq("user_id", userId)
      .eq("active", true)
      .gte("start_at", `${analysisDate}T00:00:00+14:00`)
      .lte("start_at", `${addDays(analysisDate, 7)}T23:59:59-12:00`)
      .limit(500),
    loadAllPages<{
      id: string;
      title: string;
      status: string;
      target_date: string | null;
      total_estimated_minutes: unknown;
    }>((from, to) =>
      supabase
        .from("perf_study_roadmap")
        .select("id, title, status, target_date, total_estimated_minutes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{
      id: string;
      roadmap_id: string;
      title: string;
      status: string;
      completed_at: string | null;
      scheduled_date: string | null;
      order_index: unknown;
      estimated_minutes: unknown;
    }>((from, to) =>
      supabase
        .from("perf_study_roadmap_item")
        .select(
          "id, roadmap_id, title, status, completed_at, scheduled_date, order_index, estimated_minutes",
        )
        .eq("user_id", userId)
        .order("roadmap_id")
        .order("order_index")
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{ id: string; date: string; total_value: unknown }>(
      (from, to) =>
        supabase
          .from("perf_portfolio_snapshot")
          .select("id, date, total_value")
          .eq("user_id", userId)
          .lte("date", analysisDate)
          .order("date")
          .order("id")
          .range(from, to),
    ),
    loadAllPages<{ id: string; date: string; amount: unknown }>((from, to) =>
      supabase
        .from("perf_investment_contribution")
        .select("id, date, amount")
        .eq("user_id", userId)
        .lte("date", analysisDate)
        .order("date")
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{
      id: string;
      date: string;
      amount: unknown;
      institution: string | null;
      notes: string | null;
    }>((from, to) =>
      supabase
        .from("perf_investment_withdrawal")
        .select("id, date, amount, institution, notes")
        .eq("user_id", userId)
        .lte("date", analysisDate)
        .order("date")
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{ id: string; data: string; peso_kg: unknown }>((from, to) =>
      supabase
        .from("perf_weight")
        .select("id, data, peso_kg")
        .eq("user_id", userId)
        .lte("data", analysisDate)
        .order("data")
        .order("id")
        .range(from, to),
    ),
    loadAllPages<{
      id: string;
      item_id: string;
      score: unknown;
      correct_count: unknown;
      total_count: unknown;
      submitted_at: string;
    }>((from, to) =>
      supabase
        .from("perf_study_assessment_attempt")
        .select("id, item_id, score, correct_count, total_count, submitted_at")
        .eq("user_id", userId)
        .lte("submitted_at", `${analysisDate}T23:59:59.999Z`)
        .order("submitted_at")
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("perf_investment_plan")
      .select(
        "id, name, active, completed_at, archived_at, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(1)
      .maybeSingle(),
    loadAllPages<{
      id: string;
      plan_id: string;
      version: unknown;
      effective_from: string;
      baseline_date: string;
      baseline_value: unknown;
      target_value: unknown;
      target_date: string;
      value_mode: "real" | "nominal";
      value_reference_date: string;
      planned_monthly_contribution: unknown;
      annual_return_conservative: unknown;
      annual_return_base: unknown;
      annual_return_favorable: unknown;
      annual_inflation: unknown;
      change_note: string | null;
      created_at: string;
    }>((from, to) =>
      supabase
        .from("perf_investment_plan_revision")
        .select(
          "id, plan_id, version, effective_from, baseline_date, baseline_value, target_value, target_date, value_mode, value_reference_date, planned_monthly_contribution, annual_return_conservative, annual_return_base, annual_return_favorable, annual_inflation, change_note, created_at",
        )
        .eq("user_id", userId)
        .order("effective_from")
        .order("version")
        .order("id")
        .range(from, to),
    ),
  ]);

  let resolvedActivitiesResult = activitiesResult;
  let activityOptionalState: DailyLifeDataState = "ready";
  if (activitiesResult.error && isMissingColumn(activitiesResult.error)) {
    const legacyActivitiesResult = await loadAllPages<{
      id: string;
      date: string;
      area: string;
      title: string;
      type: string | null;
      duration_minutes: unknown;
      status: string;
    }>((from, to) =>
      supabase
        .from("perf_activity")
        .select("id, date, area, title, type, duration_minutes, status")
        .eq("user_id", userId)
        .gte("date", activityFrom)
        .lte("date", analysisDate)
        .order("date")
        .order("id")
        .range(from, to),
    );
    if (!legacyActivitiesResult.error) {
      resolvedActivitiesResult = {
        ...legacyActivitiesResult,
        data: (legacyActivitiesResult.data ?? []).map((row) => ({
          ...row,
          study_item_id: null,
          learning: null,
          metadata: null,
        })),
      };
      activityOptionalState = "partial";
    }
  }

  let resolvedRoadmapsResult = roadmapsResult;
  let studyOptionalState: DailyLifeDataState = "ready";
  if (roadmapsResult.error && isMissingColumn(roadmapsResult.error)) {
    const legacyRoadmapsResult = await loadAllPages<{
      id: string;
      title: string;
      status: string;
    }>((from, to) =>
      supabase
        .from("perf_study_roadmap")
        .select("id, title, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    if (!legacyRoadmapsResult.error) {
      resolvedRoadmapsResult = {
        ...legacyRoadmapsResult,
        data: (legacyRoadmapsResult.data ?? []).map((row) => ({
          ...row,
          target_date: null,
          total_estimated_minutes: null,
        })),
      };
      studyOptionalState = "partial";
    }
  }
  if (studyAttemptsResult.error) studyOptionalState = "partial";

  let contributionRows: Array<{ id: string; date: string; amount: unknown }> =
    contributionsResult.data ?? [];
  let canonicalContributionState: DailyLifeDataState = contributionsResult.error
    ? "error"
    : "ready";
  if (isMissingRelation(contributionsResult.error)) {
    const fallback = await loadAllPages<{
      id: string;
      entry_date: string;
      amount: unknown;
    }>((from, to) =>
      supabase
        .from("personal_finance_entries")
        .select("id, entry_date, amount")
        .eq("user_id", userId)
        .eq("type", "investimento")
        .lte("entry_date", analysisDate)
        .order("entry_date")
        .order("id")
        .range(from, to),
    );
    if (!fallback.error) {
      contributionRows = (fallback.data ?? []).map((row) => ({
        id: row.id,
        date: row.entry_date,
        amount: row.amount,
      }));
      canonicalContributionState = "migration_missing";
    }
  }

  const investmentDataState = mergeState(
    snapshotsResult.error
      ? isMissingRelation(snapshotsResult.error)
        ? "migration_missing"
        : "error"
      : "ready",
    canonicalContributionState,
    withdrawalsResult.error
      ? isMissingRelation(withdrawalsResult.error)
        ? "migration_missing"
        : "error"
      : "ready",
  );
  const investmentPlanDataState = mergeState(
    investmentPlanResult.error
      ? isMissingRelation(investmentPlanResult.error)
        ? "migration_missing"
        : "error"
      : "ready",
    investmentPlanRevisionsResult.error
      ? isMissingRelation(investmentPlanRevisionsResult.error)
        ? "migration_missing"
        : "error"
      : "ready",
  );
  const profileState: DailyLifeDataState =
    profileResult.error || publicProfileResult.error ? "error" : "ready";
  const activityState: DailyLifeDataState = resolvedActivitiesResult.error
    ? "error"
    : activityOptionalState;
  const studyBaseState: DailyLifeDataState =
    resolvedRoadmapsResult.error || studyItemsResult.error ? "error" : "ready";
  const dataStates = {
    habits:
      habitsResult.error || habitLogsResult.error
        ? ("error" as const)
        : ("ready" as const),
    tasks:
      tasksResult.error || taskLogsResult.error
        ? ("error" as const)
        : ("ready" as const),
    academy: mergeState(
      activityState,
      profileResult.error ? "partial" : "ready",
    ),
    study: mergeState(activityState, studyBaseState, studyOptionalState),
    goals: goalsResult.error ? ("error" as const) : ("ready" as const),
    agenda: eventsResult.error ? ("error" as const) : ("ready" as const),
    investments: investmentDataState,
    investmentPlan: investmentPlanDataState,
    body: mergeState(
      weightsResult.error ? "error" : "ready",
      profileResult.error ? "partial" : "ready",
    ),
    profile: profileState,
  };
  const missingAreas = [
    dataStates.habits !== "ready" ? "habitos" : null,
    dataStates.tasks !== "ready" ? "tarefas" : null,
    dataStates.academy !== "ready" ? "academia" : null,
    dataStates.study !== "ready" ? "estudos" : null,
    dataStates.goals !== "ready" ? "metas" : null,
    dataStates.agenda !== "ready" ? "agenda" : null,
    dataStates.investments !== "ready" ? "investimentos" : null,
    dataStates.investmentPlan !== "ready" ? "plano de investimentos" : null,
    dataStates.body !== "ready" ? "peso" : null,
    dataStates.profile !== "ready" ? "perfil" : null,
  ].filter((area): area is string => area != null);

  const investmentPlan = investmentPlanResult.data
    ? {
        id: investmentPlanResult.data.id,
        name: investmentPlanResult.data.name,
        active: Boolean(investmentPlanResult.data.active),
        completedAt: investmentPlanResult.data.completed_at,
        archivedAt: investmentPlanResult.data.archived_at,
        createdAt: investmentPlanResult.data.created_at,
        updatedAt: investmentPlanResult.data.updated_at,
      }
    : null;
  const activeRevisionRows = investmentPlan
    ? (investmentPlanRevisionsResult.data ?? []).filter(
        (row) => row.plan_id === investmentPlan.id,
      )
    : [];

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
      // The pure engine needs historical records marked schedulable; the
      // derived end date prevents an archived habit from leaking forward.
      active: true,
      frequencyType: row.frequency_type,
      weekdays: Array.isArray(row.weekdays)
        ? row.weekdays.map(Number).filter(Number.isFinite)
        : null,
      startDate:
        row.start_date ?? timestampLocalDate(row.created_at, timezone),
      endDate: historicalEndDate(
        row.end_date,
        Boolean(row.ativo),
        row.updated_at,
        timezone,
      ),
    })),
    habitLogs: (habitLogsResult.data ?? []).map((row) => ({
      habitId: row.habit_id,
      date: row.data,
      value: Number(row.valor),
    })),
    tasks: (tasksResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      startDate: row.start_date,
      recurrenceType: row.recurrence_type,
      recurrenceEndDate: historicalEndDate(
        row.recurrence_end_date,
        Boolean(row.active),
        row.updated_at,
        timezone,
      ),
      active: true,
    })),
    taskLogs: (taskLogsResult.data ?? []).map((row) => ({
      taskId: row.task_id,
      date: row.occurrence_date,
      completed: Boolean(row.completed),
    })),
    activities: (resolvedActivitiesResult.data ?? []).map((row) => ({
      date: row.date,
      area: row.area,
      title: compactText(row.title, 240),
      type: compactText(row.type, 80),
      studyItemId: row.study_item_id,
      durationMinutes: numberOrNull(row.duration_minutes),
      status: row.status,
      learning: compactText(row.learning, 500),
      metadata: compactActivityMetadata(row.metadata),
    })),
    goals: (goalsResult.data ?? []).map((row) => ({
      name: row.name,
      status: row.status,
      startDate: row.start_date,
      deadline: row.deadline,
      initialValue: Number(row.initial_value),
      currentValue: Number(row.current_value),
      targetValue: Number(row.target_value),
    })),
    events: (eventsResult.data ?? []).map((row) => ({
      title: row.title,
      startAt: row.start_at,
      status: row.status,
    })),
    roadmaps: (resolvedRoadmapsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      targetDate: row.target_date,
      totalEstimatedMinutes: numberOrNull(row.total_estimated_minutes),
    })),
    studyItems: (studyItemsResult.data ?? []).map((row) => ({
      id: row.id,
      roadmapId: row.roadmap_id,
      title: row.title,
      status: row.status,
      completedAt: row.completed_at,
      scheduledDate: row.scheduled_date,
      orderIndex: Number(row.order_index),
      estimatedMinutes: numberOrNull(row.estimated_minutes),
    })),
    studyAttempts: (studyAttemptsResult.data ?? []).map((row) => ({
      itemId: row.item_id,
      score: Number(row.score),
      correctCount: Number(row.correct_count),
      totalCount: Number(row.total_count),
      submittedAt: row.submitted_at,
    })),
    portfolioSnapshots: (snapshotsResult.data ?? []).map((row) => ({
      date: row.date,
      totalValue: Number(row.total_value),
    })),
    contributions: contributionRows.map((row) => ({
      date: row.date,
      amount: Number(row.amount),
    })),
    withdrawals: (withdrawalsResult.data ?? []).map((row) => ({
      id: row.id,
      date: row.date,
      amount: Number(row.amount),
      institution: row.institution,
      notes: row.notes,
    })),
    investmentPlan,
    investmentPlanRevisions: activeRevisionRows.map((row) => ({
      id: row.id,
      planId: row.plan_id,
      version: Number(row.version),
      effectiveFrom: row.effective_from,
      baselineDate: row.baseline_date,
      baselineValue: Number(row.baseline_value),
      targetValue: Number(row.target_value),
      targetDate: row.target_date,
      valueMode: row.value_mode,
      valueReferenceDate: row.value_reference_date,
      plannedMonthlyContribution: Number(row.planned_monthly_contribution),
      annualReturnConservative: Number(row.annual_return_conservative),
      annualReturnBase: Number(row.annual_return_base),
      annualReturnFavorable: Number(row.annual_return_favorable),
      annualInflation: Number(row.annual_inflation),
      changeNote: row.change_note,
      createdAt: row.created_at,
    })),
    weights: (weightsResult.data ?? []).map((row) => ({
      date: row.data,
      weightKg: Number(row.peso_kg),
    })),
    missingAreas,
    dataStates,
  };
}

function aiWarning(error: unknown): string {
  if (
    error instanceof Error &&
    error.message === "OPENAI_API_KEY_NOT_CONFIGURED"
  )
    return "OpenAI nao configurada; foi usada a leitura local.";
  const status =
    typeof error === "object" && error && "status" in error
      ? Number(error.status)
      : null;
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : null;
  const type =
    typeof error === "object" && error && "type" in error
      ? String(error.type)
      : null;
  if (code === "credit_balance_exhausted" || type === "insufficient_quota")
    return "Creditos da OpenAI esgotados; foi usada a leitura local.";
  if (status === 429)
    return "Limite da OpenAI atingido; foi usada a leitura local.";
  if (status && status >= 500)
    return "OpenAI indisponivel; foi usada a leitura local.";
  return "A resposta da IA nao ficou valida; foi usada a leitura local.";
}

export async function generateDailyLifeAnalysis(
  input: GenerateDailyLifeAnalysisInput,
): Promise<GenerateDailyLifeAnalysisResult> {
  const timezone = safeTimezone(input.timezone);
  const now = input.now ?? new Date();
  const analysisDate = localDate(now, timezone);
  const evaluationDate = addDays(analysisDate, -1);
  const existingResult = await input.supabase
    .from("perf_ai_insight")
    .select("id, source_data")
    .eq("user_id", input.userId)
    .eq("type", DAILY_LIFE_ANALYSIS_TYPE)
    .eq("analysis_end", evaluationDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingResult.error) throw new Error(existingResult.error.message);
  const existingAnalysis = parseDailyLifeAnalysis(
    existingResult.data?.source_data,
  );
  if (
    existingAnalysis?.generation.promptVersion ===
      DAILY_LIFE_ANALYSIS_PROMPT_VERSION &&
    !input.force
  ) {
    return { state: "skipped", analysis: existingAnalysis, warning: null };
  }

  const metricsInput = await loadDailyLifeMetricsInput(
    input.supabase,
    input.userId,
    analysisDate,
    timezone,
  );
  const metrics = buildDailyLifeMetrics(metricsInput);
  const fallback = buildFallbackDailyLifeNarrative(metrics);
  const model =
    process.env.OPENAI_LIFE_OS_MODEL?.trim() ||
    process.env.OPENAI_ROADMAP_MODEL?.trim() ||
    "gpt-5.6-sol";
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
        text: {
          format: zodTextFormat(
            dailyLifeNarrativeSchema,
            "daily_life_analysis",
          ),
        },
        max_output_tokens: 3_000,
        safety_identifier: createHash("sha256")
          .update(input.userId)
          .digest("hex"),
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
    warning =
      "Ainda nao ha dados suficientes; foi criada uma leitura inicial local.";
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
      warning,
    },
  });
  const priority =
    analysis.status === "critical"
      ? 1
      : analysis.status === "attention"
        ? 2
        : 3;
  const primaryAlert = analysis.alerts[0] ?? null;
  const primaryPriority = analysis.priorities[0] ?? null;
  const row = {
    user_id: input.userId,
    type: DAILY_LIFE_ANALYSIS_TYPE,
    analysis_start: metrics.periods.currentFrom,
    analysis_end: analysis.evaluationDate,
    main_area: primaryPriority?.area ?? primaryAlert?.area ?? "geral",
    diagnosis: analysis.headline,
    main_error: primaryAlert
      ? `${primaryAlert.title}: ${primaryAlert.evidence}`
      : null,
    risk: primaryAlert?.impact ?? null,
    recommended_action: primaryPriority?.action ?? null,
    projection: analysis.comparison,
    priority,
    status: "new",
    source_data: analysis,
    created_at: generatedAt,
  };

  if (existingResult.data?.id) {
    const { error } = await input.supabase
      .from("perf_ai_insight")
      .update(row)
      .eq("id", existingResult.data.id)
      .eq("user_id", input.userId);
    if (error) throw new Error(error.message);
    return { state: "updated", analysis, warning };
  }

  const { error: insertError } = await input.supabase
    .from("perf_ai_insight")
    .insert(row);
  if (insertError) {
    if (insertError.code !== "23505") throw new Error(insertError.message);
    const { error: updateError } = await input.supabase
      .from("perf_ai_insight")
      .update(row)
      .eq("user_id", input.userId)
      .eq("type", DAILY_LIFE_ANALYSIS_TYPE)
      .eq("analysis_end", analysis.evaluationDate);
    if (updateError) throw new Error(updateError.message);
    return { state: "updated", analysis, warning };
  }
  return { state: "generated", analysis, warning };
}
