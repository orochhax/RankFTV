import { addDays } from "@/lib/performance";

export type MetricActivity = { date: string; durationMinutes: number | null; status?: string; area?: string };
export type StudyItemKind = "core" | "reinforcement" | "challenge" | "check" | "criterion" | "general" | "reading" | "video" | "practice" | "quiz" | "project" | "checkpoint";
export type StudyRoadmapItem = { id: string; roadmapId: string; moduleId?: string | null; section: string | null; title: string; description: string | null; instructions?: string | null; completionCriteria?: string | null; resourceTitle?: string | null; resourceUrl?: string | null; resourceChannel?: string | null; orderIndex: number; estimatedMinutes: number | null; status: "pending" | "in_progress" | "completed"; completedAt: string | null; scheduledDate?: string | null; itemKind?: StudyItemKind };
export type StudyRoadmap = { id: string; title: string; description: string | null; status: "active" | "completed" | "archived"; startDate: string; targetDate: string | null; source?: "manual" | "import" | "ai"; difficultyLevel?: "introductory" | "intermediate" | "advanced" | "mixed" | null; qualityScore?: number | null; workloadScore?: number | null; totalEstimatedMinutes?: number | null; createdAt?: string };
export type StudyRoadmapModule = { id: string; roadmapId: string; title: string; objective: string | null; successCriteria: string | null; topics: string[]; orderIndex: number; estimatedMinutes: number | null };
export type StudyAssessmentQuestion = { id: string; itemId: string; prompt: string; options: string[]; orderIndex: number };
export type StudyAssessmentAttempt = { id: string; itemId: string; score: number; correctCount: number; totalCount: number; submittedAt: string };
export type InvestmentContribution = { id: string; date: string; amount: number; institution: string | null; notes: string | null; source?: string };
export type InvestmentSnapshot = { date: string; totalValue: number };
export type InvestmentWithdrawal = { date: string; amount: number };

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
