import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LifeOSDashboard } from "@/components/performance/LifeOSDashboard";
import { addDays, segundaDaSemana, indexLogs, type Habit, type HabitLog } from "@/lib/performance";
import { type LifeEvent, type LifeGoal, type LifeInsight, type PortfolioSnapshot, todayDateInBahia } from "@/lib/performance-life-os";
import type { WeeklyReport } from "@/components/performance/RelatorioSemanal";
import { expandTaskOccurrences, resolveDashboardRange, type DashboardPeriod, type Task } from "@/lib/performance-dashboard";
import { consistencyStatus } from "@/lib/performance-analytics";
import type { RoadmapDraftSummary } from "@/lib/study-roadmap-ai";
import { DAILY_LIFE_ANALYSIS_TYPE, parseDailyLifeAnalysis } from "@/lib/daily-life-analysis";

export const metadata = { title: "Carlos Life OS" };
export const maxDuration = 300;

function asNumber(value: unknown): number | null {
  return value == null ? null : Number(value);
}

function chunkValues<T>(values: T[], size = 50): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

export default async function PerformancePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const today = todayDateInBahia();
  const params = (await searchParams) ?? {};
  const periodValue = typeof params.period === "string" && ["today", "week", "month", "custom"].includes(params.period) ? params.period as DashboardPeriod : "today";
  const range = resolveDashboardRange(periodValue, today, typeof params.from === "string" ? params.from : undefined, typeof params.to === "string" ? params.to : undefined);
  const monday = segundaDaSemana(today);

  const [profileRes, publicProfileRes, habitsRes, allHabitsRes, logsRes, weightsRes, currentReportRes, reportHistoryRes, ratingsRes, matchesRes, trainingsRes, testsRes, categoriesRes, eventsRes, activitiesRes, goalsRes, snapshotsRes, withdrawalsRes, insightsRes, dailyInsightRes, contributionsRes, tasksRes, taskLogsRes] = await Promise.all([
    supabase.from("perf_profile").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("nome, username, foto_url").eq("id", user.id).maybeSingle(),
    supabase.from("perf_habit").select("*").eq("user_id", user.id).eq("ativo", true).order("ordem"),
    supabase.from("perf_habit").select("*").eq("user_id", user.id).order("ordem"),
    supabase.from("perf_habit_log").select("habit_id, data, valor").eq("user_id", user.id).gte("data", addDays(today, -730)).lte("data", range.to),
    supabase.from("perf_weight").select("peso_kg, data").eq("user_id", user.id).order("data", { ascending: true }).limit(365),
    supabase.from("perf_weekly_report").select("*").eq("user_id", user.id).eq("semana_inicio", monday).maybeSingle(),
    supabase.from("perf_weekly_report").select("*").eq("user_id", user.id).eq("fechado", true).order("semana_inicio", { ascending: false }).limit(8),
    supabase.from("perf_rating").select("id, data, rating").eq("user_id", user.id).order("data", { ascending: true }).limit(365),
    supabase.from("perf_match").select("*").eq("user_id", user.id).order("data", { ascending: false }).limit(100),
    supabase.from("perf_training").select("id, data, tipo, duracao_min, obs").eq("user_id", user.id).order("data", { ascending: false }).limit(50),
    supabase.from("perf_test").select("id, data, tipo_teste, valor, unidade").eq("user_id", user.id).order("data", { ascending: false }),
    supabase.from("perf_category").select("id, name, type, area, color, active").eq("user_id", user.id).eq("active", true).order("name"),
    supabase.from("perf_event").select("*").eq("user_id", user.id).eq("active", true).order("start_at", { ascending: true }),
    supabase.from("perf_activity").select("id, title, date, area, type, duration_minutes, status, notes, metadata").eq("user_id", user.id).order("date", { ascending: false }).limit(500),
    supabase.from("perf_goal").select("*").eq("user_id", user.id).eq("active", true).order("priority", { ascending: true }),
    supabase.from("perf_portfolio_snapshot").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
    supabase.from("perf_investment_withdrawal").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
    supabase.from("perf_ai_insight").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("perf_ai_insight").select("source_data").eq("user_id", user.id).eq("type", DAILY_LIFE_ANALYSIS_TYPE).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("personal_finance_entries").select("id, amount, entry_date, name, bank").eq("user_id", user.id).eq("type", "investimento").order("entry_date", { ascending: true }).limit(500),
    supabase.from("perf_task").select("*").eq("user_id", user.id).eq("active", true).lte("start_date", range.to).order("start_date"),
    supabase.from("perf_task_log").select("task_id, occurrence_date, completed, completed_at").eq("user_id", user.id).gte("occurrence_date", addDays(today, -730)).lte("occurrence_date", range.to > today ? range.to : today),
  ]);
  const [roadmapsRes, roadmapMetaRes, studyDraftsRes, investmentContributionsRes] = await Promise.all([
    supabase.from("perf_study_roadmap").select("id, title, description, status, start_date, target_date, source, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("perf_study_roadmap").select("id, difficulty_level, quality_score, workload_score, total_estimated_minutes").eq("user_id", user.id),
    supabase.from("perf_study_roadmap_generation").select("id, origin, original_filename, preview_title, preview_description, module_count, step_count, total_estimated_minutes, created_at").eq("user_id", user.id).eq("status", "ready").order("created_at", { ascending: false }).limit(20),
    supabase.from("perf_investment_contribution").select("id, date, amount, institution, notes, source").eq("user_id", user.id).order("date", { ascending: true }),
  ]);

  const activeRoadmapRow = (roadmapsRes.data ?? []).find((roadmap) => roadmap.status === "active") ?? roadmapsRes.data?.[0] ?? null;
  const loadedRoadmapId = activeRoadmapRow?.id ?? "00000000-0000-0000-0000-000000000000";
  const [studyItemsRes, studyItemDetailsRes, studyModulesRes] = await Promise.all([
    supabase.from("perf_study_roadmap_item").select("id, roadmap_id, section, title, description, order_index, estimated_minutes, status, completed_at, scheduled_date, item_kind").eq("user_id", user.id).eq("roadmap_id", loadedRoadmapId).order("order_index"),
    supabase.from("perf_study_roadmap_item").select("id, module_id, requirements, workspace, instructions, completion_criteria, resource_title, resource_url, resource_channel").eq("user_id", user.id).eq("roadmap_id", loadedRoadmapId),
    supabase.from("perf_study_roadmap_module").select("id, roadmap_id, title, objective, success_criteria, topics, order_index, estimated_minutes").eq("user_id", user.id).eq("roadmap_id", loadedRoadmapId).order("order_index"),
  ]);
  const legacyStudyItemDetailsRes = studyItemDetailsRes.error
    ? await supabase.from("perf_study_roadmap_item").select("id, module_id, instructions, completion_criteria, resource_title, resource_url, resource_channel").eq("user_id", user.id).eq("roadmap_id", loadedRoadmapId)
    : null;
  const studyItemDetailRows = studyItemDetailsRes.error ? (legacyStudyItemDetailsRes?.data ?? []) : (studyItemDetailsRes.data ?? []);
  const studyItemIds = (studyItemsRes.data ?? []).map((item) => item.id);
  const itemIdChunks = chunkValues(studyItemIds);
  const enhancedQuestionResults = await Promise.all(itemIdChunks.map((ids) => supabase
    .from("perf_study_assessment_question")
    .select("id, item_id, question_type, prompt, options, order_index")
    .eq("user_id", user.id)
    .in("item_id", ids)
    .order("order_index")));
  const enhancedQuestionError = enhancedQuestionResults.find((result) => result.error)?.error ?? null;
  const legacyQuestionResults = enhancedQuestionError ? await Promise.all(itemIdChunks.map((ids) => supabase
    .from("perf_study_assessment_question")
    .select("id, item_id, prompt, options, order_index")
    .eq("user_id", user.id)
    .in("item_id", ids)
    .order("order_index"))) : [];
  const legacyQuestionError = legacyQuestionResults.find((result) => result.error)?.error ?? null;
  const studyQuestionRows = (enhancedQuestionError ? legacyQuestionResults : enhancedQuestionResults).flatMap((result) => result.data ?? []);
  const studyAttemptResults = await Promise.all(itemIdChunks.map((ids) => supabase
    .from("perf_study_assessment_attempt")
    .select("id, item_id, score, correct_count, total_count, submitted_at")
    .eq("user_id", user.id)
    .in("item_id", ids)
    .order("submitted_at", { ascending: false })));
  const studyAttemptsError = studyAttemptResults.find((result) => result.error)?.error ?? null;
  const studyAttemptRows = studyAttemptResults.flatMap((result) => result.data ?? []);
  const studyEnhancementsReady = !studyItemDetailsRes.error && !enhancedQuestionError;

  const habits: Habit[] = (habitsRes.data ?? []).map((row) => ({ id: row.id, label: row.label, tipo: row.tipo, alvo: asNumber(row.alvo), unidade: row.unidade, ordem: row.ordem, ativo: row.ativo }));
  const logs: HabitLog[] = (logsRes.data ?? []).map((row) => ({ habit_id: row.habit_id, data: row.data, valor: Number(row.valor) }));
  const allHabits: Habit[] = (allHabitsRes.data ?? []).map((row) => ({ id: row.id, label: row.label, tipo: row.tipo, alvo: asNumber(row.alvo), unidade: row.unidade, ordem: row.ordem, ativo: row.ativo }));
  const valuesToday = indexLogs(logs)[today] ?? {};
  const profile = profileRes.data;
  const weights = (weightsRes.data ?? []).map((row) => ({ data: row.data as string, peso_kg: Number(row.peso_kg) }));
  const profileData = profile ? { altura_cm: asNumber(profile.altura_cm), data_nascimento: profile.data_nascimento, lado: profile.lado, pe_dominante: profile.pe_dominante, peso_meta: asNumber(profile.peso_meta), rating_meta: asNumber(profile.rating_meta), treinos_semana_meta: asNumber(profile.treinos_semana_meta) } : null;
  const events: LifeEvent[] = (eventsRes.data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, startAt: row.start_at, endAt: row.end_at, allDay: Boolean(row.all_day), status: row.status, source: row.source, categoryId: row.category_id, location: row.location, link: row.link, active: row.active }));
  const goals: LifeGoal[] = (goalsRes.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, area: row.area, goalType: row.goal_type, initialValue: Number(row.initial_value), currentValue: Number(row.current_value), targetValue: Number(row.target_value), unit: row.unit, startDate: row.start_date, deadline: row.deadline, priority: Number(row.priority), status: row.status, allowOverTarget: Boolean(row.allow_over_target) }));
  const snapshots: PortfolioSnapshot[] = (snapshotsRes.data ?? []).map((row) => ({ id: row.id, date: row.date, totalValue: Number(row.total_value), previousValue: asNumber(row.previous_value), variationAmount: asNumber(row.variation_amount), variationPercentage: asNumber(row.variation_percentage), movement: row.movement, notes: row.notes }));
  const studyV2Errors = [roadmapMetaRes.error, legacyStudyItemDetailsRes?.error, studyModulesRes.error, legacyQuestionError, studyAttemptsError].filter(Boolean);
  const newTableErrors = [eventsRes.error, activitiesRes.error, goalsRes.error, snapshotsRes.error, withdrawalsRes.error, insightsRes.error, dailyInsightRes.error, tasksRes.error, taskLogsRes.error, roadmapsRes.error, studyItemsRes.error, studyDraftsRes.error, investmentContributionsRes.error, ...studyV2Errors].filter(Boolean);
  const contributions = investmentContributionsRes.error
    ? (contributionsRes.data ?? []).map((row) => ({ id: row.id, amount: Number(row.amount), date: row.entry_date, institution: row.bank ?? null, notes: row.name ?? null, source: "personal_finance" }))
    : (investmentContributionsRes.data ?? []).map((row) => ({ id: row.id, amount: Number(row.amount), date: row.date, institution: row.institution, notes: row.notes, source: row.source }));
  const tasks: Task[] = (tasksRes.data ?? []).map((row) => ({ id: row.id, title: row.title, startDate: row.start_date, recurrenceType: row.recurrence_type, recurrenceEndDate: row.recurrence_end_date, active: Boolean(row.active) }));
  const taskLogs = (taskLogsRes.data ?? []).map((row) => ({ task_id: row.task_id, occurrence_date: row.occurrence_date, completed: Boolean(row.completed), completed_at: row.completed_at }));
  const taskOccurrences = expandTaskOccurrences(tasks, taskLogs, range);
  const consistencyOccurrences = expandTaskOccurrences(tasks, taskLogs, { period: "custom", from: addDays(today, -730), to: today });
  const consistency = consistencyStatus(habits, logs, consistencyOccurrences, today);
  const roadmapMetaById = new Map((roadmapMetaRes.data ?? []).map((row) => [row.id, row]));
  const itemDetailsById = new Map(studyItemDetailRows.map((row) => [row.id, row]));
  const studyRoadmaps = (roadmapsRes.data ?? []).map((row) => {
    const meta = roadmapMetaById.get(row.id);
    return { id: row.id, title: row.title, description: row.description, status: row.status, startDate: row.start_date, targetDate: row.target_date, source: row.source, difficultyLevel: meta?.difficulty_level ?? null, qualityScore: asNumber(meta?.quality_score), workloadScore: asNumber(meta?.workload_score), totalEstimatedMinutes: asNumber(meta?.total_estimated_minutes), createdAt: row.created_at };
  });
  const studyDrafts: RoadmapDraftSummary[] = (studyDraftsRes.data ?? []).filter((row) => Boolean(row.preview_title)).map((row) => ({
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
  const primaryRoadmap = studyRoadmaps.find((roadmap) => roadmap.status === "active") ?? studyRoadmaps[0] ?? null;

  return <LifeOSDashboard
    today={today}
    monday={monday}
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
    ratings={(ratingsRes.data ?? []).map((row) => ({ id: row.id, data: row.data, rating: Number(row.rating) }))}
    matches={(matchesRes.data ?? []).map((row) => ({ id: row.id, data: row.data, parceiro: row.parceiro, adversario: row.adversario, resultado: row.resultado, placar: row.placar, obs: row.obs }))}
    trainings={(trainingsRes.data ?? []).map((row) => ({ id: row.id, data: row.data, tipo: row.tipo, duracao_min: asNumber(row.duracao_min), obs: row.obs }))}
    tests={(testsRes.data ?? []).map((row) => ({ id: row.id, data: row.data, tipo_teste: row.tipo_teste, valor: Number(row.valor), unidade: row.unidade }))}
    events={events}
    categories={(categoriesRes.data ?? []).map((row) => ({ id: row.id, name: row.name, type: row.type, area: row.area, color: row.color, active: Boolean(row.active) }))}
    activities={(activitiesRes.data ?? []).map((row) => { const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as { muscle_groups?: unknown } : {}; return { id: row.id, title: row.title, date: row.date, area: row.area, type: row.type, durationMinutes: asNumber(row.duration_minutes), status: row.status, notes: row.notes, muscleGroups: Array.isArray(metadata.muscle_groups) ? metadata.muscle_groups.filter((value): value is string => typeof value === "string") : [] }; })}
    goals={goals}
    snapshots={snapshots}
    withdrawals={(withdrawalsRes.data ?? []).map((row) => ({ id: row.id, date: row.date, amount: Number(row.amount), institution: row.institution, notes: row.notes }))}
    insights={(insightsRes.data ?? []).map((row) => ({ id: row.id, type: row.type, analysisStart: row.analysis_start, analysisEnd: row.analysis_end, mainArea: row.main_area, diagnosis: row.diagnosis, mainError: row.main_error, risk: row.risk, recommendedAction: row.recommended_action, projection: row.projection, priority: Number(row.priority), status: row.status, feedback: row.feedback, createdAt: row.created_at })) as LifeInsight[]}
    contributions={contributions}
    studyRoadmap={primaryRoadmap}
    studyRoadmaps={studyRoadmaps}
    studyItems={(studyItemsRes.data ?? []).map((row) => { const details = itemDetailsById.get(row.id) as (typeof studyItemDetailRows)[number] & { requirements?: string | null; workspace?: string | null } | undefined; return { id: row.id, roadmapId: row.roadmap_id, moduleId: details?.module_id ?? null, section: row.section, title: row.title, description: row.description, requirements: details?.requirements ?? null, workspace: details?.workspace ?? null, instructions: details?.instructions ?? null, completionCriteria: details?.completion_criteria ?? null, resourceTitle: details?.resource_title ?? null, resourceUrl: details?.resource_url ?? null, resourceChannel: details?.resource_channel ?? null, orderIndex: Number(row.order_index), estimatedMinutes: asNumber(row.estimated_minutes), status: row.status, completedAt: row.completed_at, scheduledDate: row.scheduled_date, itemKind: row.item_kind }; })}
    studyModules={(studyModulesRes.data ?? []).map((row) => ({ id: row.id, roadmapId: row.roadmap_id, title: row.title, objective: row.objective, successCriteria: row.success_criteria, topics: Array.isArray(row.topics) ? row.topics.filter((value): value is string => typeof value === "string") : [], orderIndex: Number(row.order_index), estimatedMinutes: asNumber(row.estimated_minutes) }))}
    studyQuestions={studyQuestionRows.map((row) => { const enhanced = row as typeof row & { question_type?: string }; return { id: row.id, itemId: row.item_id, prompt: row.prompt, options: Array.isArray(row.options) ? row.options.filter((value): value is string => typeof value === "string") : [], orderIndex: Number(row.order_index), questionType: enhanced.question_type === "ordering" ? "ordering" as const : "multiple_choice" as const }; })}
    studyAttempts={studyAttemptRows.map((row) => ({ id: row.id, itemId: row.item_id, score: Number(row.score), correctCount: Number(row.correct_count), totalCount: Number(row.total_count), submittedAt: row.submitted_at }))}
    studyDrafts={studyDrafts}
    studyDraftsReady={!studyDraftsRes.error}
    studyEnhancementsReady={studyEnhancementsReady}
    studyV2Ready={!studyV2Errors.length}
    range={range}
    taskOccurrences={taskOccurrences}
    consistency={consistency}
    dailyAnalysis={parseDailyLifeAnalysis(dailyInsightRes.data?.source_data)}
    schemaReady={!newTableErrors.length}
  />;
}
