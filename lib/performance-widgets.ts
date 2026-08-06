import { addDays } from "@/lib/performance";

export type MetricActivity = { date: string; durationMinutes: number | null; status?: string; area?: string };
export type StudyItemKind = "core" | "reinforcement" | "challenge" | "check" | "criterion" | "general" | "reading" | "video" | "practice" | "quiz" | "project" | "checkpoint";
export type StudyQuestionType = "multiple_choice" | "ordering";
export type StudyRoadmapItem = { id: string; roadmapId: string; moduleId?: string | null; section: string | null; title: string; description: string | null; requirements?: string | null; workspace?: string | null; instructions?: string | null; completionCriteria?: string | null; resourceTitle?: string | null; resourceUrl?: string | null; resourceChannel?: string | null; orderIndex: number; estimatedMinutes: number | null; status: "pending" | "in_progress" | "completed"; completedAt: string | null; scheduledDate?: string | null; itemKind?: StudyItemKind };
export type StudyRoadmap = { id: string; title: string; description: string | null; status: "active" | "completed" | "archived"; startDate: string; targetDate: string | null; source?: "manual" | "import" | "ai"; difficultyLevel?: "introductory" | "intermediate" | "advanced" | "mixed" | null; qualityScore?: number | null; workloadScore?: number | null; totalEstimatedMinutes?: number | null; createdAt?: string };
export type StudyRoadmapModule = { id: string; roadmapId: string; title: string; objective: string | null; successCriteria: string | null; topics: string[]; orderIndex: number; estimatedMinutes: number | null };
export type StudyAssessmentQuestion = { id: string; itemId: string; prompt: string; options: string[]; orderIndex: number; questionType: StudyQuestionType };
export type StudyAssessmentAttempt = { id: string; itemId: string; score: number; correctCount: number; totalCount: number; submittedAt: string };
export type InvestmentContribution = { id: string; date: string; amount: number; institution: string | null; notes: string | null; source?: string };
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

export function roadmapProgress(items: Pick<StudyRoadmapItem, "status" | "orderIndex">[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((item) => item.status === "completed").length / items.length) * 100);
}

export function nextStudyItem(items: StudyRoadmapItem[]): StudyRoadmapItem | null {
  return [...items].filter((item) => item.status !== "completed").sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? null;
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
