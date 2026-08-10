import { addDays, isHabitScheduled, parseISO, type Habit, type HabitLog } from "@/lib/performance";

export type DashboardPeriod = "today" | "week" | "month" | "custom";
export type DashboardRange = { period: DashboardPeriod; from: string; to: string };
export type Task = { id: string; title: string; startDate: string; recurrenceType: "none" | "daily"; recurrenceEndDate: string | null; active: boolean };
export type TaskOccurrence = Task & { occurrenceDate: string; completed: boolean; completedAt: string | null };
export type HabitMonthStats = { completed: number; eligible: number; percent: number; status: "good" | "bad" | "no_data" };

export function validISO(value: string | null | undefined): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

export function resolveDashboardRange(period: DashboardPeriod, today: string, from?: string, to?: string): DashboardRange {
  if (period === "week") {
    const day = parseISO(today).getDay();
    return { period, from: addDays(today, day === 0 ? -6 : 1 - day), to: addDays(today, day === 0 ? 0 : 7 - day) };
  }
  if (period === "month") {
    const first = `${today.slice(0, 7)}-01`;
    const nextMonth = new Date(parseISO(first));
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const next = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
    return { period, from: first, to: addDays(next, -1) };
  }
  if (period === "custom" && validISO(from) && validISO(to) && from! <= to!) {
    return { period, from: from!, to: to! };
  }
  return { period: period === "custom" ? "today" : period, from: today, to: today };
}

export function rangeDays(range: DashboardRange): number {
  return Math.max(0, Math.floor((parseISO(range.to).getTime() - parseISO(range.from).getTime()) / 86400000) + 1);
}

export function isTaskScheduled(task: Task, date: string): boolean {
  if (!task.active || date < task.startDate) return false;
  if (task.recurrenceType === "none") return date === task.startDate;
  return !task.recurrenceEndDate || date <= task.recurrenceEndDate;
}

export function expandTaskOccurrences(tasks: Task[], logs: { task_id: string; occurrence_date: string; completed: boolean; completed_at: string | null }[], range: DashboardRange): TaskOccurrence[] {
  const byLog = new Map(logs.map((log) => [`${log.task_id}:${log.occurrence_date}`, log]));
  const result: TaskOccurrence[] = [];
  for (const task of tasks) {
    const start = task.startDate > range.from ? task.startDate : range.from;
    const end = task.recurrenceEndDate && task.recurrenceEndDate < range.to ? task.recurrenceEndDate : range.to;
    if (start > end) continue;
    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (!isTaskScheduled(task, date)) continue;
      const log = byLog.get(`${task.id}:${date}`);
      result.push({ ...task, occurrenceDate: date, completed: Boolean(log?.completed), completedAt: log?.completed_at ?? null });
    }
  }
  return result.sort((a, b) => Number(a.completed) - Number(b.completed) || a.occurrenceDate.localeCompare(b.occurrenceDate) || a.title.localeCompare(b.title));
}

export function taskProgress(occurrences: TaskOccurrence[]): { completed: number; total: number; percent: number } {
  const total = occurrences.length;
  const completed = occurrences.filter((occurrence) => occurrence.completed).length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export function habitMonthStats(habit: Habit, logs: HabitLog[], month: string, today: string): HabitMonthStats {
  const first = `${month}-01`;
  const nextDate = new Date(parseISO(first));
  nextDate.setMonth(nextDate.getMonth() + 1);
  const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;
  const last = addDays(next, -1);
  const end = last < today ? last : today;
  if (end < first) return { completed: 0, eligible: 0, percent: 0, status: "no_data" };
  const logMap = new Map(logs.filter((log) => log.habit_id === habit.id).map((log) => [log.data, log.valor]));
  let completed = 0;
  let eligible = 0;
  for (let date = first; date <= end; date = addDays(date, 1)) {
    if (!isHabitScheduled(habit, date)) continue;
    eligible++;
    const value = logMap.get(date);
    const done = habit.tipo === "binario" ? value != null && value >= 1 : value != null && (habit.alvo ? value >= habit.alvo : value > 0);
    if (done) completed++;
  }
  const percent = eligible ? Math.round((completed / eligible) * 100) : 0;
  return { completed, eligible, percent, status: eligible === 0 ? "no_data" : percent >= 70 ? "good" : "bad" };
}

export function monthGrid(month: string): string[][] {
  const first = parseISO(`${month}-01`);
  const nextDate = new Date(first);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const last = addDays(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`, -1);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: string[] = Array.from({ length: offset }, () => "");
  for (let date = `${month}-01`; date <= last; date = addDays(date, 1)) cells.push(date);
  while (cells.length % 7) cells.push("");
  const weeks: string[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function previousMonth(month: string): string {
  const date = parseISO(`${month}-01`);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(month: string): string {
  const date = parseISO(`${month}-01`);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
