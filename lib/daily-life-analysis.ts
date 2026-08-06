import { z } from "zod";
import { addDays, parseISO } from "@/lib/performance";

export const DAILY_LIFE_ANALYSIS_TYPE = "daily_life_review";
export const DAILY_LIFE_ANALYSIS_PROMPT_VERSION = "daily-life-review-v3";

const analysisAreaSchema = z.enum([
  "consistencia",
  "habitos",
  "tarefas",
  "estudos",
  "academia",
  "metas",
  "agenda",
  "investimentos",
  "saude",
  "geral",
]);

const evidenceItemSchema = z.object({
  area: analysisAreaSchema,
  title: z.string().min(1).max(100),
  evidence: z.string().min(1).max(220),
});

const alertItemSchema = evidenceItemSchema.extend({
  impact: z.string().min(1).max(220),
});

const priorityItemSchema = z.object({
  area: analysisAreaSchema,
  title: z.string().min(1).max(100),
  action: z.string().min(1).max(260),
  why: z.string().min(1).max(220),
});

export const dailyLifeNarrativeSchema = z.object({
  headline: z.string().min(1).max(110),
  summary: z.string().min(1).max(700),
  comparison: z.string().min(1).max(320),
  wins: z.array(evidenceItemSchema).max(3),
  alerts: z.array(alertItemSchema).max(3),
  priorities: z.array(priorityItemSchema).min(1).max(3),
  closingMessage: z.string().min(1).max(220),
});

export type DailyLifeNarrative = z.infer<typeof dailyLifeNarrativeSchema>;
export type DailyLifeAnalysisArea = z.infer<typeof analysisAreaSchema>;

export type DailyLifeStatus = "excellent" | "good" | "attention" | "critical" | "insufficient_data";
export type DailyLifeTrend = "up" | "stable" | "down" | "insufficient_data";

export type DailyHabit = {
  id: string;
  label: string;
  type: string;
  target: number | null;
  active: boolean;
  frequencyType?: string | null;
  weekdays?: number[] | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type DailyTask = {
  id: string;
  title: string;
  startDate: string;
  recurrenceType: string;
  recurrenceEndDate: string | null;
  active: boolean;
};

export type DailyLifeMetricsInput = {
  analysisDate: string;
  timezone: string;
  profileName: string | null;
  trainingWeeklyTarget: number | null;
  targetWeight: number | null;
  habits: DailyHabit[];
  habitLogs: { habitId: string; date: string; value: number }[];
  tasks: DailyTask[];
  taskLogs: { taskId: string; date: string; completed: boolean }[];
  activities: { date: string; area: string; durationMinutes: number | null; status: string }[];
  goals: { name: string; status: string; startDate: string; deadline: string | null; initialValue: number; currentValue: number; targetValue: number }[];
  events: { title: string; startAt: string; status: string }[];
  roadmaps: { id: string; title: string; status: string }[];
  studyItems: { roadmapId: string; title: string; status: string; completedAt: string | null; scheduledDate: string | null; orderIndex: number }[];
  portfolioSnapshots: { date: string; totalValue: number }[];
  contributions: { date: string; amount: number }[];
  weights: { date: string; weightKg: number }[];
  missingAreas?: string[];
};

export type DailyLifeMetricsSnapshot = ReturnType<typeof buildDailyLifeMetrics>;

const dailyLifeAnalysisSchema = z.object({
  version: z.literal(1),
  analysisDate: z.string(),
  evaluationDate: z.string(),
  generatedAt: z.string(),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["excellent", "good", "attention", "critical", "insufficient_data"]),
  trend: z.enum(["up", "stable", "down", "insufficient_data"]),
  headline: z.string(),
  summary: z.string(),
  comparison: z.string(),
  wins: z.array(evidenceItemSchema),
  alerts: z.array(alertItemSchema),
  priorities: z.array(priorityItemSchema),
  closingMessage: z.string(),
  coverage: z.object({
    available: z.array(z.string()),
    missing: z.array(z.string()),
    scoreBasis: z.array(z.string()),
    periodDays: z.number(),
  }),
  generation: z.object({
    mode: z.enum(["ai", "fallback"]),
    model: z.string().nullable(),
    promptVersion: z.string(),
    responseId: z.string().nullable(),
    inputTokens: z.number().nullable().optional(),
    outputTokens: z.number().nullable().optional(),
  }),
  metrics: z.unknown(),
});

export type DailyLifeAnalysis = z.infer<typeof dailyLifeAnalysisSchema>;

type PeriodRate = { completed: number; planned: number; percent: number | null };
type ScoreComponent = { key: string; label: string; weight: number; current: number; previous: number | null };

function datesBetween(from: string, to: string): string[] {
  const result: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) result.push(date);
  return result;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(completed: number, planned: number): number | null {
  return planned > 0 ? Math.round((completed / planned) * 100) : null;
}

function isHabitScheduled(habit: DailyHabit, date: string): boolean {
  if (!habit.active || (habit.startDate && date < habit.startDate) || (habit.endDate && date > habit.endDate)) return false;
  const weekday = parseISO(date).getDay();
  if (habit.frequencyType === "weekdays") return weekday >= 1 && weekday <= 5;
  if (habit.frequencyType === "weekends") return weekday === 0 || weekday === 6;
  if (habit.frequencyType === "custom_weekdays") return (habit.weekdays ?? []).includes(weekday);
  return true;
}

function isHabitComplete(habit: DailyHabit, value: number | undefined): boolean {
  if (value == null) return false;
  if (habit.type === "binario") return value >= 1;
  return habit.target && habit.target > 0 ? value >= habit.target : value > 0;
}

function isTaskScheduled(task: DailyTask, date: string): boolean {
  if (!task.active || date < task.startDate) return false;
  if (task.recurrenceType === "none") return date === task.startDate;
  return !task.recurrenceEndDate || date <= task.recurrenceEndDate;
}

function timestampDate(value: string | null, timezone: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function periodHabitRate(input: DailyLifeMetricsInput, from: string, to: string): PeriodRate {
  const values = new Map(input.habitLogs.map((log) => [`${log.habitId}:${log.date}`, log.value]));
  let planned = 0;
  let completed = 0;
  for (const date of datesBetween(from, to)) {
    for (const habit of input.habits) {
      if (!isHabitScheduled(habit, date)) continue;
      planned += 1;
      if (isHabitComplete(habit, values.get(`${habit.id}:${date}`))) completed += 1;
    }
  }
  return { completed, planned, percent: percent(completed, planned) };
}

function periodTaskRate(input: DailyLifeMetricsInput, from: string, to: string): PeriodRate {
  const values = new Map(input.taskLogs.map((log) => [`${log.taskId}:${log.date}`, log.completed]));
  let planned = 0;
  let completed = 0;
  for (const date of datesBetween(from, to)) {
    for (const task of input.tasks) {
      if (!isTaskScheduled(task, date)) continue;
      planned += 1;
      if (values.get(`${task.id}:${date}`)) completed += 1;
    }
  }
  return { completed, planned, percent: percent(completed, planned) };
}

function weightedScore(components: ScoreComponent[], side: "current" | "previous"): number | null {
  const available = components.filter((component) => side === "current" || component.previous != null);
  if (!available.length) return null;
  const totalWeight = available.reduce((sum, component) => sum + component.weight, 0);
  const total = available.reduce((sum, component) => sum + (side === "current" ? component.current : component.previous ?? 0) * component.weight, 0);
  return Math.round(total / totalWeight);
}

function statusForScore(score: number | null): DailyLifeStatus {
  if (score == null) return "insufficient_data";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "attention";
  return "critical";
}

function trendForScores(current: number | null, previous: number | null): DailyLifeTrend {
  if (current == null || previous == null) return "insufficient_data";
  if (current - previous >= 5) return "up";
  if (previous - current >= 5) return "down";
  return "stable";
}

function goalProgress(goal: DailyLifeMetricsInput["goals"][number]): number {
  const distance = goal.targetValue - goal.initialValue;
  if (!Number.isFinite(distance) || distance === 0) return goal.currentValue >= goal.targetValue ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((goal.currentValue - goal.initialValue) / distance) * 100)));
}

function goalAtRisk(goal: DailyLifeMetricsInput["goals"][number], evaluationDate: string): boolean {
  if (goal.status === "at_risk") return true;
  if (!goal.deadline || ["completed", "cancelled", "paused"].includes(goal.status)) return false;
  const total = Math.max(1, parseISO(goal.deadline).getTime() - parseISO(goal.startDate).getTime());
  const elapsed = Math.max(0, parseISO(evaluationDate).getTime() - parseISO(goal.startDate).getTime());
  const expected = Math.min(100, Math.round((elapsed / total) * 100));
  return goalProgress(goal) + 15 < expected;
}

export function buildDailyLifeMetrics(input: DailyLifeMetricsInput) {
  const evaluationDate = addDays(input.analysisDate, -1);
  const currentFrom = addDays(evaluationDate, -6);
  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(previousTo, -6);

  const habitsCurrent = periodHabitRate(input, currentFrom, evaluationDate);
  const habitsPrevious = periodHabitRate(input, previousFrom, previousTo);
  const habitsYesterday = periodHabitRate(input, evaluationDate, evaluationDate);
  const habitsDayBefore = periodHabitRate(input, addDays(evaluationDate, -1), addDays(evaluationDate, -1));
  const habitsToday = periodHabitRate(input, input.analysisDate, input.analysisDate);
  const habitValues = new Map(input.habitLogs.map((log) => [`${log.habitId}:${log.date}`, log.value]));
  const weakHabits = input.habits.map((habit) => {
    const scheduled = datesBetween(currentFrom, evaluationDate).filter((date) => isHabitScheduled(habit, date));
    const completed = scheduled.filter((date) => isHabitComplete(habit, habitValues.get(`${habit.id}:${date}`))).length;
    return { name: habit.label, completed, planned: scheduled.length, percent: percent(completed, scheduled.length) };
  }).filter((habit) => habit.planned >= 2).sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101)).slice(0, 3);

  const tasksCurrent = periodTaskRate(input, currentFrom, evaluationDate);
  const tasksPrevious = periodTaskRate(input, previousFrom, previousTo);
  const tasksYesterday = periodTaskRate(input, evaluationDate, evaluationDate);
  const tasksDayBefore = periodTaskRate(input, addDays(evaluationDate, -1), addDays(evaluationDate, -1));
  const tasksToday = periodTaskRate(input, input.analysisDate, input.analysisDate);
  const taskLogMap = new Map(input.taskLogs.map((log) => [`${log.taskId}:${log.date}`, log.completed]));
  const pendingTasksToday = input.tasks.filter((task) => isTaskScheduled(task, input.analysisDate) && !taskLogMap.get(`${task.id}:${input.analysisDate}`)).map((task) => task.title).slice(0, 5);

  const activeRoadmap = input.roadmaps.find((roadmap) => roadmap.status === "active") ?? null;
  const roadmapItems = activeRoadmap ? input.studyItems.filter((item) => item.roadmapId === activeRoadmap.id) : [];
  const completedRoadmapItems = roadmapItems.filter((item) => item.status === "completed").length;
  const itemCompletionDate = (item: DailyLifeMetricsInput["studyItems"][number]) => timestampDate(item.completedAt, input.timezone);
  const studyCompletedCurrent = roadmapItems.filter((item) => { const date = itemCompletionDate(item); return date != null && date >= currentFrom && date <= evaluationDate; }).length;
  const studyCompletedPrevious = roadmapItems.filter((item) => { const date = itemCompletionDate(item); return date != null && date >= previousFrom && date <= previousTo; }).length;
  const nextStudyItem = roadmapItems.filter((item) => item.status !== "completed").sort((a, b) => a.orderIndex - b.orderIndex)[0]?.title ?? null;
  const completedActivities = input.activities.filter((activity) => activity.status === "completed");
  const studyActivities = completedActivities.filter((activity) => ["estudo", "estudos", "study"].includes(activity.area.toLowerCase()));
  const academyActivities = completedActivities.filter((activity) => ["academia", "gym", "treino"].includes(activity.area.toLowerCase()));
  const activityStats = (activities: typeof completedActivities, from: string, to: string) => {
    const period = activities.filter((activity) => activity.date >= from && activity.date <= to);
    return { sessions: period.length, minutes: period.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0), days: new Set(period.map((activity) => activity.date)).size };
  };
  const studyCurrent = activityStats(studyActivities, currentFrom, evaluationDate);
  const studyPrevious = activityStats(studyActivities, previousFrom, previousTo);
  const academyCurrent = activityStats(academyActivities, currentFrom, evaluationDate);
  const academyPrevious = activityStats(academyActivities, previousFrom, previousTo);

  const scheduledStudyCurrent = roadmapItems.filter((item) => item.scheduledDate && item.scheduledDate >= currentFrom && item.scheduledDate <= evaluationDate);
  const scheduledStudyPrevious = roadmapItems.filter((item) => item.scheduledDate && item.scheduledDate >= previousFrom && item.scheduledDate <= previousTo);
  const scheduledStudyCurrentPercent = percent(scheduledStudyCurrent.filter((item) => item.status === "completed").length, scheduledStudyCurrent.length);
  const scheduledStudyPreviousPercent = percent(scheduledStudyPrevious.filter((item) => item.status === "completed").length, scheduledStudyPrevious.length);

  const activeGoals = input.goals.filter((goal) => !["completed", "cancelled", "paused"].includes(goal.status));
  const atRiskGoals = activeGoals.filter((goal) => goalAtRisk(goal, evaluationDate)).map((goal) => ({ name: goal.name, progressPercent: goalProgress(goal), deadline: goal.deadline })).slice(0, 4);

  const localEventDate = (value: string) => timestampDate(value, input.timezone);
  const nextWeekEnd = addDays(input.analysisDate, 6);
  const upcomingEvents = input.events.filter((event) => event.status !== "cancelled" && localEventDate(event.startAt) && localEventDate(event.startAt)! >= input.analysisDate && localEventDate(event.startAt)! <= nextWeekEnd);
  const todayEvents = upcomingEvents.filter((event) => localEventDate(event.startAt) === input.analysisDate);

  const sortedSnapshots = [...input.portfolioSnapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latestSnapshot = [...sortedSnapshots].reverse().find((snapshot) => snapshot.date <= input.analysisDate) ?? null;
  const monthAgoSnapshot = [...sortedSnapshots].reverse().find((snapshot) => snapshot.date <= addDays(input.analysisDate, -30)) ?? null;
  const portfolioChangePercent = latestSnapshot && monthAgoSnapshot && monthAgoSnapshot.totalValue !== 0
    ? round(((latestSnapshot.totalValue - monthAgoSnapshot.totalValue) / monthAgoSnapshot.totalValue) * 100, 2)
    : null;
  const contributions30Days = input.contributions.filter((item) => item.date >= addDays(input.analysisDate, -29) && item.date <= input.analysisDate).reduce((sum, item) => sum + item.amount, 0);

  const sortedWeights = [...input.weights].filter((item) => item.date <= input.analysisDate).sort((a, b) => a.date.localeCompare(b.date));
  const currentWeight = sortedWeights.at(-1) ?? null;
  const previousWeight = [...sortedWeights].reverse().find((item) => item.date <= addDays(input.analysisDate, -30)) ?? null;

  const scoreComponents: ScoreComponent[] = [];
  if (habitsCurrent.percent != null) scoreComponents.push({ key: "habits", label: "Habitos", weight: 40, current: habitsCurrent.percent, previous: habitsPrevious.percent });
  if (tasksCurrent.percent != null) scoreComponents.push({ key: "tasks", label: "Tarefas", weight: 35, current: tasksCurrent.percent, previous: tasksPrevious.percent });
  if (input.trainingWeeklyTarget && input.trainingWeeklyTarget > 0) {
    scoreComponents.push({ key: "academy", label: "Academia", weight: 15, current: Math.min(100, Math.round((academyCurrent.sessions / input.trainingWeeklyTarget) * 100)), previous: Math.min(100, Math.round((academyPrevious.sessions / input.trainingWeeklyTarget) * 100)) });
  }
  if (scheduledStudyCurrentPercent != null) scoreComponents.push({ key: "study", label: "Estudos planejados", weight: 10, current: scheduledStudyCurrentPercent, previous: scheduledStudyPreviousPercent });

  const score = weightedScore(scoreComponents, "current");
  const previousScore = weightedScore(scoreComponents, "previous");
  const status = statusForScore(score);
  const trend = trendForScores(score, previousScore);
  const dailyCommitmentRate = (date: string) => {
    const habitRate = periodHabitRate(input, date, date);
    const taskRate = periodTaskRate(input, date, date);
    return percent(habitRate.completed + taskRate.completed, habitRate.planned + taskRate.planned);
  };
  let streak = 0;
  for (let date = evaluationDate, checked = 0; checked < 365; checked += 1, date = addDays(date, -1)) {
    const rate = dailyCommitmentRate(date);
    if (rate == null || rate < 70) break;
    streak += 1;
  }
  const yesterdayPercent = percent(habitsYesterday.completed + tasksYesterday.completed, habitsYesterday.planned + tasksYesterday.planned);
  const dayBeforePercent = percent(habitsDayBefore.completed + tasksDayBefore.completed, habitsDayBefore.planned + tasksDayBefore.planned);
  const available = [
    input.habits.length ? "habitos" : null,
    input.tasks.length ? "tarefas" : null,
    activeRoadmap ? "estudos" : null,
    academyActivities.length || input.trainingWeeklyTarget ? "academia" : null,
    activeGoals.length ? "metas" : null,
    input.events.length ? "agenda" : null,
    latestSnapshot || input.contributions.length ? "investimentos" : null,
    currentWeight ? "saude" : null,
  ].filter((area): area is string => Boolean(area));

  return {
    profileName: input.profileName,
    analysisDate: input.analysisDate,
    evaluationDate,
    periods: { currentFrom, currentTo: evaluationDate, previousFrom, previousTo },
    overall: {
      score,
      previousScore,
      deltaPoints: score != null && previousScore != null ? score - previousScore : null,
      status,
      trend,
      scoreBasis: scoreComponents.map((component) => component.label),
    },
    consistency: {
      streak,
      thresholdPercent: 70,
      yesterdayPercent,
      dayBeforePercent,
      yesterdayDeltaPoints: yesterdayPercent != null && dayBeforePercent != null ? yesterdayPercent - dayBeforePercent : null,
      currentWeekPercent: percent(habitsCurrent.completed + tasksCurrent.completed, habitsCurrent.planned + tasksCurrent.planned),
      previousWeekPercent: percent(habitsPrevious.completed + tasksPrevious.completed, habitsPrevious.planned + tasksPrevious.planned),
    },
    habits: { current: habitsCurrent, previous: habitsPrevious, yesterday: habitsYesterday, today: habitsToday, weakHabits },
    tasks: { current: tasksCurrent, previous: tasksPrevious, yesterday: tasksYesterday, today: tasksToday, pendingToday: pendingTasksToday },
    study: {
      activeRoadmap: activeRoadmap?.title ?? null,
      roadmapCompleted: completedRoadmapItems,
      roadmapTotal: roadmapItems.length,
      roadmapProgressPercent: percent(completedRoadmapItems, roadmapItems.length),
      completedStepsCurrent: studyCompletedCurrent,
      completedStepsPrevious: studyCompletedPrevious,
      sessionsCurrent: studyCurrent.sessions,
      sessionsPrevious: studyPrevious.sessions,
      minutesCurrent: studyCurrent.minutes,
      minutesPrevious: studyPrevious.minutes,
      nextItem: nextStudyItem,
    },
    academy: {
      sessionsCurrent: academyCurrent.sessions,
      sessionsPrevious: academyPrevious.sessions,
      minutesCurrent: academyCurrent.minutes,
      minutesPrevious: academyPrevious.minutes,
      weeklyTarget: input.trainingWeeklyTarget,
      averageMinutes: academyCurrent.sessions ? Math.round(academyCurrent.minutes / academyCurrent.sessions) : null,
    },
    goals: { active: activeGoals.length, atRisk: atRiskGoals },
    agenda: { todayCount: todayEvents.length, nextSevenDaysCount: upcomingEvents.length, todayTitles: todayEvents.map((event) => event.title).slice(0, 5) },
    investments: { currentPortfolioValue: latestSnapshot?.totalValue ?? null, portfolioChange30DaysPercent: portfolioChangePercent, contributions30Days: round(contributions30Days, 2) },
    body: { currentWeightKg: currentWeight?.weightKg ?? null, targetWeightKg: input.targetWeight, change30DaysKg: currentWeight && previousWeight ? round(currentWeight.weightKg - previousWeight.weightKg, 1) : null, lastWeightDate: currentWeight?.date ?? null },
    coverage: { available, missing: [...new Set(input.missingAreas ?? [])], periodDays: 7 },
  };
}

function rateEvidence(label: string, rate: PeriodRate): string {
  return rate.percent == null ? `${label}: sem compromissos planejados.` : `${label}: ${rate.completed} de ${rate.planned} concluidos (${rate.percent}%).`;
}

export function buildFallbackDailyLifeNarrative(metrics: DailyLifeMetricsSnapshot): DailyLifeNarrative {
  const score = metrics.overall.score;
  const name = metrics.profileName?.split(" ")[0] ?? "Voce";
  const delta = metrics.overall.deltaPoints;
  const comparison = delta == null
    ? "Ainda nao ha duas semanas comparaveis para medir a tendencia com seguranca."
    : Math.abs(delta) < 5
      ? `O desempenho ficou estavel em relacao aos 7 dias anteriores (${delta >= 0 ? "+" : ""}${delta} pontos).`
      : delta > 0
        ? `Voce avancou ${delta} pontos em relacao aos 7 dias anteriores.`
        : `Voce caiu ${Math.abs(delta)} pontos em relacao aos 7 dias anteriores; a perda de constancia precisa de ajuste hoje.`;

  const candidates = [
    metrics.habits.current.percent == null ? null : { area: "habitos" as const, title: "Habitos medidos", value: metrics.habits.current.percent, evidence: rateEvidence("Ultimos 7 dias", metrics.habits.current) },
    metrics.tasks.current.percent == null ? null : { area: "tarefas" as const, title: "Execucao das tarefas", value: metrics.tasks.current.percent, evidence: rateEvidence("Ultimos 7 dias", metrics.tasks.current) },
    metrics.academy.weeklyTarget == null ? null : { area: "academia" as const, title: "Ritmo de treino", value: Math.min(100, Math.round((metrics.academy.sessionsCurrent / metrics.academy.weeklyTarget) * 100)), evidence: `${metrics.academy.sessionsCurrent} de ${metrics.academy.weeklyTarget} treinos da meta semanal.` },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.value - a.value);

  const wins: DailyLifeNarrative["wins"] = candidates.filter((item) => item.value >= 70).slice(0, 2).map(({ area, title, evidence }) => ({ area, title, evidence }));
  const alerts: DailyLifeNarrative["alerts"] = candidates.filter((item) => item.value < 60).reverse().slice(0, 2).map(({ area, title, evidence }) => ({ area, title, evidence, impact: "Manter esse ritmo reduz a chance de cumprir o que foi planejado para a semana." }));
  if (metrics.goals.atRisk.length) alerts.push({ area: "metas", title: "Meta fora do ritmo", evidence: `${metrics.goals.atRisk[0].name} esta com ${metrics.goals.atRisk[0].progressPercent}% de progresso.`, impact: "Sem uma acao concreta, o prazo tende a ficar mais distante." });

  const priorities: DailyLifeNarrative["priorities"] = [];
  if ((metrics.tasks.today.planned ?? 0) > 0) priorities.push({ area: "tarefas", title: "Defina a entrega principal", action: `Escolha uma das ${metrics.tasks.today.planned} tarefas de hoje e conclua a mais importante antes de abrir novas frentes.`, why: "Uma prioridade terminada vale mais do que varias iniciadas." });
  if (metrics.habits.weakHabits[0]) priorities.push({ area: "habitos", title: `Recupere ${metrics.habits.weakHabits[0].name}`, action: "Defina um horario e uma versao minima executavel para esse habito ainda hoje.", why: rateEvidence("Ultimos 7 dias", metrics.habits.weakHabits[0]) });
  if (metrics.study.activeRoadmap && metrics.study.nextItem) priorities.push({ area: "estudos", title: "Avance uma etapa real", action: `Execute a proxima etapa de ${metrics.study.activeRoadmap}: ${metrics.study.nextItem}.`, why: `${metrics.study.completedStepsCurrent} etapas foram concluidas nos ultimos 7 dias.` });
  if (!priorities.length) priorities.push({ area: "geral", title: "Crie um compromisso mensuravel", action: "Registre uma tarefa ou habito pequeno para hoje e marque somente quando estiver realmente concluido.", why: "Ainda faltam dados suficientes para recomendar um ajuste mais especifico." });

  const headline = score == null
    ? "Sua leitura diaria precisa de mais dados"
    : metrics.overall.trend === "down"
      ? "Seu ritmo caiu; hoje pede menos promessa e mais conclusao"
      : metrics.overall.trend === "up"
        ? "Voce melhorou o ritmo; proteja o que funcionou"
        : score >= 70
          ? "A base esta funcionando; mantenha a execucao simples"
          : "Seu plano existe, mas a execucao ainda esta irregular";

  return {
    headline,
    summary: score == null
      ? `${name}, ainda nao existem compromissos mensuraveis suficientes para uma leitura confiavel. A analise nao vai preencher esse vazio com suposicoes.`
      : `${name}, sua nota objetiva dos ultimos 7 dias foi ${score}/100, calculada apenas sobre ${metrics.overall.scoreBasis.join(", ").toLowerCase()}. O foco de hoje e corrigir o ponto mais fraco sem aumentar a quantidade de compromissos.`,
    comparison,
    wins,
    alerts: alerts.slice(0, 3),
    priorities: priorities.slice(0, 3),
    closingMessage: metrics.overall.trend === "down" ? "Hoje nao precisa ser perfeito, mas precisa interromper a queda com uma entrega concreta." : "Seja melhor que ontem em algo que possa ser marcado e comprovado.",
  };
}

export function dailyLifeSystemInstructions(): string {
  return [
    "Voce e um coach pessoal de evolucao, produtividade e constancia.",
    "Escreva em portugues do Brasil com energia, entusiasmo e proximidade.",
    "Comemore conquistas reais e destaque claramente qualquer evolucao comprovada pelos dados.",
    "Faca o usuario terminar a leitura com vontade de agir imediatamente.",
    "Quando houver queda de rendimento, seja firme e puxe a responsabilidade, mas sempre mostre que e possivel recuperar.",
    "Transforme pontos negativos em desafios claros e alcancaveis para hoje.",
    "Use linguagem natural, encorajadora e empolgada, sem parecer artificial.",
    "Nunca use motivacao vazia: conecte cada incentivo a um numero, tarefa, habito ou resultado presente nas metricas.",
    "Aponte queda de rendimento ou falta de constancia quando os numeros sustentarem isso, sem humilhar, diagnosticar ou dramatizar.",
    "Toda afirmacao deve ser sustentada exclusivamente pelo JSON de metricas. Nunca invente rotina, causa, sentimento, renda, saude ou resultado.",
    "Quando faltarem dados, diga claramente que faltam dados. Ausencia de registro nao prova que a atividade nao aconteceu.",
    "Se dois registros se contradisserem, como um treino concluido e o habito Academia nao marcado, trate isso como divergencia de registro; nao use a ausencia do check para negar a atividade comprovada.",
    "A analise acontece as 05:00: avalie a janela encerrada ontem. Use os compromissos de hoje apenas para recomendar o proximo passo, nunca para penalizar o usuario.",
    "Compare os ultimos 7 dias encerrados ontem com os 7 anteriores. A nota e a tendencia ja foram calculadas pelo sistema e nao podem ser alteradas.",
    "Priorize no maximo tres acoes pequenas, especificas e executaveis hoje. Nao recomende aumentar o volume apenas para parecer produtivo.",
    "Nao ofereca aconselhamento medico ou recomendacao de investimento. Dados corporais e financeiros servem apenas para acompanhamento descritivo.",
    "Seja curto, concreto e cite numeros ou nomes presentes nos dados em cada evidencia.",
    "O headline deve expressar a decisao principal do dia. Nao repita literalmente nota, status ou tendencia no headline.",
  ].join("\n");
}

export function dailyLifePromptInput(metrics: DailyLifeMetricsSnapshot): string {
  return [
    "Produza a visao diaria estruturada a partir das metricas abaixo.",
    `Nota imutavel: ${metrics.overall.score ?? "sem dados"}.`,
    `Status imutavel: ${metrics.overall.status}.`,
    `Tendencia imutavel: ${metrics.overall.trend}.`,
    "Nao repita todas as metricas; destaque somente o que muda a decisao de hoje.",
    JSON.stringify(metrics),
  ].join("\n\n");
}

export function createDailyLifeAnalysis(input: {
  metrics: DailyLifeMetricsSnapshot;
  narrative: DailyLifeNarrative;
  generatedAt: string;
  generation: DailyLifeAnalysis["generation"];
}): DailyLifeAnalysis {
  return {
    version: 1,
    analysisDate: input.metrics.analysisDate,
    evaluationDate: input.metrics.evaluationDate,
    generatedAt: input.generatedAt,
    score: input.metrics.overall.score,
    status: input.metrics.overall.status,
    trend: input.metrics.overall.trend,
    ...input.narrative,
    coverage: {
      available: input.metrics.coverage.available,
      missing: input.metrics.coverage.missing,
      scoreBasis: input.metrics.overall.scoreBasis,
      periodDays: input.metrics.coverage.periodDays,
    },
    generation: input.generation,
    metrics: input.metrics,
  };
}

export function parseDailyLifeAnalysis(value: unknown): DailyLifeAnalysis | null {
  const parsed = dailyLifeAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
