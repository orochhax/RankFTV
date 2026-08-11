import { addDays } from "@/lib/performance";
import type { ItCareerProjectSpec } from "@/lib/it-career-roadmaps";
import type { StudyOrganizationProfile } from "@/lib/study-organization";

export type MetricActivity = { date: string; durationMinutes: number | null; status?: string; area?: string };
export type StudyItemKind = "core" | "reinforcement" | "challenge" | "check" | "criterion" | "general" | "reading" | "video" | "audiovisual" | "practice" | "quiz" | "project" | "checkpoint";
export type StudyRoadmapKind = "language" | "it_career" | "legacy_skill" | "legacy_unknown";
export type StudyTechnicalLevel = "foundation" | "junior" | "mid" | "senior" | "specialist";
export type StudyModuleKind = "core" | "specialization" | "capstone";
export type StudyContentRole = "legacy_step" | "topic" | "subtopic" | "activity" | "module_project" | "assessment" | "capstone" | "review";
export type StudyQuestionType = "multiple_choice" | "ordering";
export type StudyProjectSpec = ItCareerProjectSpec;
export type StudyRoadmapItem = { id: string; roadmapId: string; moduleId?: string | null; parentItemId?: string | null; section: string | null; title: string; description: string | null; requirements?: string | null; workspace?: string | null; preparationSteps?: string[]; instructions?: string | null; practiceExercises?: string[]; reflectionQuestions?: string[]; completionChecklist?: string[]; subtopics?: string[]; evidence?: string | null; completionCriteria?: string | null; projectSpec?: StudyProjectSpec | null; resourceTitle?: string | null; resourceUrl?: string | null; resourceChannel?: string | null; orderIndex: number; estimatedMinutes: number | null; status: "pending" | "in_progress" | "completed"; completedAt: string | null; scheduledDate?: string | null; itemKind?: StudyItemKind; contentRole?: StudyContentRole; itemCode?: string | null; levelCode?: StudyTechnicalLevel | null; countsForProgress?: boolean; templateNodeId?: string | null };
export type StudyRoadmap = { id: string; title: string; description: string | null; status: "active" | "completed" | "archived"; startDate: string; targetDate: string | null; recommendedTargetDate?: string | null; source?: "manual" | "import" | "ai" | "template"; roadmapKind?: StudyRoadmapKind; templateKey?: string | null; templateVersion?: number | null; targetTechnicalLevel?: StudyTechnicalLevel | null; setup?: Record<string, unknown> | null; difficultyLevel?: "introductory" | "intermediate" | "advanced" | "mixed" | null; qualityScore?: number | null; workloadScore?: number | null; totalEstimatedMinutes?: number | null; createdAt?: string; organizationProfile?: StudyOrganizationProfile | null };
export type StudyRoadmapModule = { id: string; roadmapId: string; title: string; objective: string | null; successCriteria: string | null; topics: string[]; orderIndex: number; estimatedMinutes: number | null; moduleKind?: StudyModuleKind; moduleCode?: string | null; levelCode?: StudyTechnicalLevel | null; templateNodeId?: string | null };
export type StudyAssessmentQuestion = { id: string; itemId: string; prompt: string; options: string[]; orderIndex: number; questionType: StudyQuestionType };
export type StudyAssessmentFeedback = { questionId: string; questionType: StudyQuestionType; correct: boolean };
export type StudyAssessmentAttempt = { id: string; itemId: string; score: number; correctCount: number; totalCount: number; submittedAt: string; answers: Record<string, number | number[]>; feedback: StudyAssessmentFeedback[] };
export type StudyCheckProgress = { itemId: string; group: "preparation" | "completion"; index: number; checked: boolean };

const studyProjectInterestIds = new Set([
  "football", "cars", "news", "technology", "finance",
  "health_wellness", "games", "education", "music", "ecommerce",
]);

function projectRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function projectText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function projectTextList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const entries = value.map(projectText);
  return entries.every((entry): entry is string => entry != null) ? entries : null;
}

/**
 * Normaliza o snapshot JSON antes de expo-lo ao cliente. Dados antigos ou
 * adulterados voltam como null e continuam usando a apresentacao legada.
 */
export function parseStudyProjectSpec(value: unknown): StudyProjectSpec | null {
  const spec = projectRecord(value);
  const interest = projectRecord(spec?.interest);
  const data = projectRecord(spec?.data);
  if (!spec || spec.schemaVersion !== 1 || !interest || !data) return null;
  if (spec.projectKind !== "module_challenge" && spec.projectKind !== "capstone") return null;

  const interestId = projectText(interest.id);
  const interestLabel = projectText(interest.label);
  const sourceType = data.sourceType;
  if (!interestId || !studyProjectInterestIds.has(interestId) || !interestLabel) return null;
  if (!["synthetic_generator", "provided_fixture", "public_dataset"].includes(String(sourceType))) return null;

  const requiredTextKeys = [
    "blueprintId", "projectTitle", "productDefinition", "problemStatement",
    "targetAudience", "implementationFreedom",
  ] as const;
  const normalizedText = Object.fromEntries(requiredTextKeys.map((key) => [key, projectText(spec[key])]));
  if (requiredTextKeys.some((key) => !normalizedText[key])) return null;

  const requiredLists = [
    "functionalities", "technicalConcepts", "mandatoryRequirements", "deliverables",
    "submissionInstructions", "outOfScope",
  ] as const;
  const normalizedLists = Object.fromEntries(requiredLists.map((key) => [key, projectTextList(spec[key])]));
  if (requiredLists.some((key) => !normalizedLists[key])) return null;

  const sourceLabel = projectText(data.sourceLabel);
  const acquisitionInstructions = projectText(data.acquisitionInstructions);
  const preparationRules = projectTextList(data.preparationRules);
  if (!sourceLabel || !acquisitionInstructions || !preparationRules || !Array.isArray(data.entities) || !data.entities.length) return null;
  const entities = data.entities.map((entry) => {
    const entity = projectRecord(entry);
    const name = projectText(entity?.name);
    if (!name || !Array.isArray(entity?.requiredFields) || !entity.requiredFields.length) return null;
    const requiredFields = entity.requiredFields.map((fieldValue) => {
      const field = projectRecord(fieldValue);
      const fieldName = projectText(field?.name);
      const type = projectText(field?.type);
      const description = projectText(field?.description);
      return fieldName && type && description ? { name: fieldName, type, description } : null;
    });
    return requiredFields.every((field): field is NonNullable<typeof field> => field != null)
      ? { name, requiredFields }
      : null;
  });
  if (!entities.every((entry): entry is NonNullable<typeof entry> => entry != null)) return null;

  if (!Array.isArray(spec.evaluationCriteria) || !spec.evaluationCriteria.length) return null;
  const evaluationCriteria = spec.evaluationCriteria.map((entry) => {
    const criterion = projectRecord(entry);
    const id = projectText(criterion?.id);
    const label = projectText(criterion?.label);
    const description = projectText(criterion?.description);
    const weightPercent = criterion?.weightPercent;
    return id && label && description && typeof weightPercent === "number" && Number.isInteger(weightPercent) && weightPercent > 0 && weightPercent <= 100
      ? { id, label, description, weightPercent }
      : null;
  });
  if (!evaluationCriteria.every((entry): entry is NonNullable<typeof entry> => entry != null)) return null;
  if (evaluationCriteria.reduce((total, entry) => total + entry.weightPercent, 0) !== 100) return null;

  return {
    schemaVersion: 1,
    blueprintId: normalizedText.blueprintId!,
    projectKind: spec.projectKind,
    interest: { id: interestId as StudyProjectSpec["interest"]["id"], label: interestLabel },
    projectTitle: normalizedText.projectTitle!,
    productDefinition: normalizedText.productDefinition!,
    problemStatement: normalizedText.problemStatement!,
    targetAudience: normalizedText.targetAudience!,
    functionalities: normalizedLists.functionalities!,
    data: {
      sourceType: sourceType as StudyProjectSpec["data"]["sourceType"],
      sourceLabel,
      acquisitionInstructions,
      entities,
      preparationRules,
    },
    technicalConcepts: normalizedLists.technicalConcepts!,
    mandatoryRequirements: normalizedLists.mandatoryRequirements!,
    deliverables: normalizedLists.deliverables!,
    evaluationCriteria,
    submissionInstructions: normalizedLists.submissionInstructions!,
    implementationFreedom: normalizedText.implementationFreedom!,
    outOfScope: normalizedLists.outOfScope!,
  };
}
export type StudySessionMetadata = {
  source: "pomodoro" | "manual";
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  totalMinutes: number;
  cyclesCompleted: number;
  roadmapId: string | null;
  moduleIds: string[];
  itemIds: string[];
  subjectLabels: string[];
  startedAt: string | null;
  endedAt: string | null;
};
export type InvestmentContribution = { id: string; date: string; amount: number; institution: string | null; notes: string | null; source?: string; sourceEntryId?: string | null };
export type InvestmentSnapshot = { date: string; totalValue: number };
export type InvestmentWithdrawal = { date: string; amount: number };
export type PortfolioChartPeriod = "day" | "week" | "month";
export type DurationChartPoint = { date: string; label: string; fullLabel: string; minutes: number };
export type PortfolioChartPoint = { key: string; date: string; label: string; fullLabel: string; value: number };

export function academyStreak(activityDates: string[], today: string): number {
  const dates = new Set(activityDates);
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function averageDuration(activities: MetricActivity[]): number {
  const valid = activities.filter((item) => item.durationMinutes != null && item.durationMinutes > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0) / valid.length);
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "");
}

function mondayOf(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, weekday === 0 ? -6 : 1 - weekday);
}

export function academyDurationSeries(activities: MetricActivity[], today: string, days = 7): DurationChartPoint[] {
  const totals = new Map<string, number>();
  activities.forEach((item) => {
    const minutes = Math.max(0, item.durationMinutes ?? 0);
    totals.set(item.date, (totals.get(item.date) ?? 0) + minutes);
  });

  return Array.from({ length: Math.max(1, days) }, (_, index) => {
    const date = addDays(today, index - Math.max(1, days) + 1);
    return {
      date,
      label: dateLabel(date, { weekday: "short" }).slice(0, 3),
      fullLabel: dateLabel(date, { weekday: "long", day: "2-digit", month: "short" }),
      minutes: totals.get(date) ?? 0,
    };
  });
}

export function portfolioValueSeries(snapshots: InvestmentSnapshot[], period: PortfolioChartPeriod): PortfolioChartPoint[] {
  const bucketed = new Map<string, InvestmentSnapshot>();
  [...snapshots]
    .filter((item) => Number.isFinite(item.totalValue) && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((item) => {
      const key = period === "day" ? item.date : period === "week" ? mondayOf(item.date) : item.date.slice(0, 7);
      bucketed.set(key, item);
    });

  const limit = period === "day" ? 14 : 12;
  return [...bucketed]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, item]) => {
      const bucketDate = period === "month" ? `${key}-01` : key;
      const label = period === "month"
        ? dateLabel(bucketDate, { month: "short", year: "2-digit" })
        : dateLabel(bucketDate, { day: "2-digit", month: "2-digit" });
      const fullLabel = period === "day"
        ? dateLabel(item.date, { day: "2-digit", month: "long", year: "numeric" })
        : period === "week"
          ? `Semana de ${dateLabel(bucketDate, { day: "2-digit", month: "short" })}`
          : dateLabel(bucketDate, { month: "long", year: "numeric" });
      return { key, date: item.date, label, fullLabel, value: item.totalValue };
    });
}

export function portfolioSeriesVariation(points: PortfolioChartPoint[]): { amount: number; percent: number | null } | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points.at(-1)?.value ?? first;
  const amount = last - first;
  return { amount, percent: first === 0 ? null : (amount / first) * 100 };
}

export function studyWeeklyStats(activities: MetricActivity[], monday: string, today: string): { totalMinutes: number; averageMinutes: number; elapsedDays: number } {
  const end = addDays(monday, 6);
  const totalMinutes = activities.filter((item) => item.date >= monday && item.date <= end).reduce((sum, item) => sum + Math.max(0, item.durationMinutes ?? 0), 0);
  const elapsedDays = Math.min(7, Math.max(1, Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${monday}T12:00:00Z`).getTime()) / 86400000) + 1));
  return { totalMinutes, averageMinutes: Math.round(totalMinutes / elapsedDays), elapsedDays };
}

export function roadmapProgress(items: Pick<StudyRoadmapItem, "status" | "orderIndex" | "countsForProgress">[]): number {
  const countableItems = items.filter((item) => item.countsForProgress !== false);
  if (!countableItems.length) return 0;
  return Math.round((countableItems.filter((item) => item.status === "completed").length / countableItems.length) * 100);
}

export function weightedRoadmapProgress(items: Pick<StudyRoadmapItem, "status" | "estimatedMinutes" | "countsForProgress">[]): number {
  const countableItems = items.filter((item) => item.countsForProgress !== false);
  const totalWeight = countableItems.reduce((sum, item) => sum + Math.max(1, item.estimatedMinutes ?? 0), 0);
  if (!totalWeight) return 0;
  const completedWeight = countableItems
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + Math.max(1, item.estimatedMinutes ?? 0), 0);
  return Math.round((completedWeight / totalWeight) * 100);
}

export function nextStudyItem(items: StudyRoadmapItem[]): StudyRoadmapItem | null {
  return [...items].filter((item) => item.countsForProgress !== false && item.status !== "completed").sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null;
}

export function investmentSummary(contributions: InvestmentContribution[], snapshots: InvestmentSnapshot[], withdrawals: InvestmentWithdrawal[]) {
  const totalContributed = contributions.reduce((sum, item) => sum + item.amount, 0);
  const totalWithdrawn = withdrawals.reduce((sum, item) => sum + item.amount, 0);
  const netInvested = totalContributed - totalWithdrawn;
  const latestSnapshot = [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
  const currentValue = latestSnapshot?.totalValue ?? 0;
  const result = latestSnapshot ? currentValue - netInvested : 0;
  return { totalContributed, totalWithdrawn, netInvested, currentValue, result, returnPercent: latestSnapshot && netInvested > 0 ? (result / netInvested) * 100 : null };
}

export function cumulativeContributions(contributions: InvestmentContribution[]): { month: string; amount: number; cumulative: number }[] {
  const byMonth = new Map<string, number>();
  contributions.forEach((item) => byMonth.set(item.date.slice(0, 7), (byMonth.get(item.date.slice(0, 7)) ?? 0) + item.amount));
  let cumulative = 0;
  return [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => { cumulative += amount; return { month, amount, cumulative }; });
}
