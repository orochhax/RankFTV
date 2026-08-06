import { addDays, parseISO, type Habit, type HabitLog } from "@/lib/performance";
import type { TaskOccurrence } from "@/lib/performance-dashboard";
import type { InvestmentContribution, InvestmentSnapshot } from "@/lib/performance-widgets";

export type ConsistencyStatus = {
  streak: number;
  todayPercent: number;
  todayQualified: boolean;
  threshold: number;
};

export type HabitChartPeriod = "week" | "month" | "year";

export type HabitChartPoint = {
  key: string;
  label: string;
  total: number;
  [habitId: string]: string | number;
};

export type ParsedRoadmapItem = {
  section: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  completionCriteria?: string | null;
  resourceTitle?: string | null;
  resourceUrl?: string | null;
  resourceChannel?: string | null;
  scheduledDate: string | null;
  estimatedMinutes?: number | null;
  itemKind: "core" | "reinforcement" | "challenge" | "check" | "criterion" | "general";
  orderIndex: number;
};

export type ParsedRoadmap = {
  title: string;
  description: string | null;
  items: ParsedRoadmapItem[];
};

export const ROADMAP_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const ROADMAP_IMPORT_MAX_ITEMS = 5_000;

export function isHabitDone(habit: Habit, value: number | null | undefined): boolean {
  if (value == null) return false;
  if (habit.tipo === "binario") return value >= 1;
  return habit.alvo && habit.alvo > 0 ? value >= habit.alvo : value > 0;
}

function scoreForDate(habits: Habit[], logs: HabitLog[], tasks: TaskOccurrence[], date: string): { score: number; planned: boolean } {
  const domains: number[] = [];
  const activeHabits = habits.filter((habit) => habit.ativo);
  if (activeHabits.length) {
    const values = new Map(logs.filter((log) => log.data === date).map((log) => [log.habit_id, log.valor]));
    domains.push(activeHabits.filter((habit) => isHabitDone(habit, values.get(habit.id))).length / activeHabits.length);
  }
  const dayTasks = tasks.filter((task) => task.occurrenceDate === date);
  if (dayTasks.length) domains.push(dayTasks.filter((task) => task.completed).length / dayTasks.length);
  if (!domains.length) return { score: 0, planned: false };
  return { score: domains.reduce((sum, value) => sum + value, 0) / domains.length, planned: true };
}

export function consistencyStatus(habits: Habit[], logs: HabitLog[], tasks: TaskOccurrence[], today: string, threshold = 0.7): ConsistencyStatus {
  const todayScore = scoreForDate(habits, logs, tasks, today);
  let cursor = todayScore.score >= threshold ? today : addDays(today, -1);
  let streak = 0;
  for (let checked = 0; checked < 730; checked += 1) {
    const day = scoreForDate(habits, logs, tasks, cursor);
    if (!day.planned || day.score < threshold) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return {
    streak,
    todayPercent: Math.round(todayScore.score * 100),
    todayQualified: todayScore.score >= threshold,
    threshold: Math.round(threshold * 100),
  };
}

function mondayOf(date: string): string {
  const value = parseISO(date);
  const day = value.getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)).replace(".", "");
}

export function habitChartData(habits: Habit[], logs: HabitLog[], today: string, period: HabitChartPeriod): HabitChartPoint[] {
  const active = habits.filter((habit) => habit.ativo);
  const start = period === "week" ? addDays(today, -6) : period === "month" ? addDays(today, -27) : `${today.slice(0, 4)}-01-01`;
  const buckets = new Map<string, { label: string; dates: string[] }>();

  for (let date = start; date <= today; date = addDays(date, 1)) {
    const key = period === "week" ? date : period === "month" ? mondayOf(date) : date.slice(0, 7);
    const label = period === "week"
      ? new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "")
      : period === "month"
        ? `${new Date(`${key}T12:00:00Z`).getUTCDate()}/${String(new Date(`${key}T12:00:00Z`).getUTCMonth() + 1).padStart(2, "0")}`
        : monthLabel(key);
    const bucket = buckets.get(key) ?? { label, dates: [] };
    bucket.dates.push(date);
    buckets.set(key, bucket);
  }

  const byDate = new Map<string, Map<string, number>>();
  logs.forEach((log) => {
    const values = byDate.get(log.data) ?? new Map<string, number>();
    values.set(log.habit_id, log.valor);
    byDate.set(log.data, values);
  });

  return [...buckets].map(([key, bucket]) => {
    const point: HabitChartPoint = { key, label: bucket.label, total: 0 };
    active.forEach((habit) => {
      const completed = bucket.dates.filter((date) => isHabitDone(habit, byDate.get(date)?.get(habit.id))).length;
      point[habit.id] = completed;
      point.total += completed;
    });
    return point;
  });
}

export function habitCurrentStreak(habit: Habit, logs: HabitLog[], today: string): number {
  const values = new Map(logs.filter((log) => log.habit_id === habit.id).map((log) => [log.data, log.valor]));
  let cursor = isHabitDone(habit, values.get(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (isHabitDone(habit, values.get(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function habitBestWeekday(habit: Habit, logs: HabitLog[]): string | null {
  const weekdays = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  logs.filter((log) => log.habit_id === habit.id).forEach((log) => {
    const day = parseISO(log.data).getDay();
    weekdays[day].total += 1;
    if (isHabitDone(habit, log.valor)) weekdays[day].done += 1;
  });
  const best = weekdays.map((value, day) => ({ day, rate: value.total ? value.done / value.total : -1 })).sort((a, b) => b.rate - a.rate)[0];
  if (!best || best.rate < 0) return null;
  return ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"][best.day];
}

function cleanMarkdown(value: string): string {
  return value.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").trim();
}

function sectionKind(section: string): ParsedRoadmapItem["itemKind"] {
  const normalized = section.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("nucleo")) return "core";
  if (normalized.includes("reforco")) return "reinforcement";
  if (normalized.includes("desafio")) return "challenge";
  if (normalized.includes("checagem")) return "check";
  if (normalized.includes("criterio")) return "criterion";
  return "general";
}

export function parseStudyRoadmapMarkdown(markdown: string): ParsedRoadmap {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "Roadmap de estudos";
  let currentSection = "Geral";
  let currentDate: string | null = null;
  let dayTitle = "";
  const items: ParsedRoadmapItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const h1 = line.match(/^#\s+(.+)/);
    if (h1 && !line.startsWith("##")) title = cleanMarkdown(h1[1]).slice(0, 160);

    const day = line.match(/^##\s+(.+?)(?:\s+[—-]\s+)(\d{2})\/(\d{2})\/(\d{4})\s*$/);
    if (day) {
      dayTitle = cleanMarkdown(day[1]);
      currentDate = `${day[4]}-${day[3]}-${day[2]}`;
      currentSection = dayTitle;
      continue;
    }

    const section = line.match(/^###\s+(.+)/);
    if (section) {
      currentSection = cleanMarkdown(section[1]);
      continue;
    }

    const checkbox = line.match(/^(?:[-*]|\d+\.)\s+\[[ xX]\]\s+(.+)/);
    if (!checkbox) continue;
    const itemTitle = cleanMarkdown(checkbox[1]);
    if (!itemTitle) continue;
    items.push({
      section: dayTitle ? `${dayTitle} / ${currentSection}` : currentSection,
      title: itemTitle.slice(0, 500),
      scheduledDate: currentDate,
      itemKind: sectionKind(currentSection),
      orderIndex: items.length,
    });
  }

  return { title, description: items.length ? `${items.length} atividades importadas do Markdown.` : null, items };
}

export function monthlyPortfolioSeries(snapshots: InvestmentSnapshot[]): { month: string; label: string; value: number }[] {
  const latest = new Map<string, InvestmentSnapshot>();
  [...snapshots].sort((a, b) => a.date.localeCompare(b.date)).forEach((item) => latest.set(item.date.slice(0, 7), item));
  return [...latest].sort(([a], [b]) => a.localeCompare(b)).map(([month, item]) => ({ month, label: monthLabel(month), value: item.totalValue }));
}

export function monthlyContributionSeries(contributions: InvestmentContribution[]): { month: string; label: string; value: number }[] {
  const totals = new Map<string, number>();
  contributions.forEach((item) => totals.set(item.date.slice(0, 7), (totals.get(item.date.slice(0, 7)) ?? 0) + item.amount));
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, label: monthLabel(month), value }));
}
