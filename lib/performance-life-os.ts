import { addDays, parseISO, scheduledHabits, type Habit, type HabitLog } from "@/lib/performance";
import type { EventRecurrenceRule } from "@/lib/event-recurrence";

const BAHIA_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bahia",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type LifeOSView = "today" | "agenda" | "habits" | "activities" | "goals" | "investments" | "settings";
export type EventStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type ActivityStatus = "planned" | "completed" | "partial" | "cancelled";

export type LifeEvent = {
  id: string; title: string; description: string | null; startAt: string; endAt: string;
  allDay: boolean; status: EventStatus; source: string; categoryId: string | null;
  location: string | null; link: string | null; active?: boolean;
  recurrenceRule?: EventRecurrenceRule | null; recurrenceGroupId?: string | null;
  baseStartAt?: string; baseEndAt?: string; occurrenceId?: string;
};

export type LifeGoal = {
  id: string; name: string; description: string | null; area: string; goalType: string;
  initialValue: number; currentValue: number; targetValue: number; unit: string;
  startDate: string; deadline: string | null; priority: number; status: string; allowOverTarget: boolean;
};

export type PortfolioSnapshot = {
  id: string; date: string; totalValue: number; previousValue: number | null;
  variationAmount: number | null; variationPercentage: number | null; movement: "up" | "down" | "stable";
  notes: string | null;
};

export type LifeInsight = {
  id: string; type: string; analysisStart: string; analysisEnd: string; mainArea: string | null;
  diagnosis: string; mainError: string | null; risk: string | null; recommendedAction: string | null;
  projection: string | null; priority: number; status: string; feedback: string | null; createdAt: string;
};
export type LifeCategory = { id: string; name: string; type: string; area: string | null; color: string | null; active: boolean };

export function durationMinutes(startAt: string, endAt: string): number {
  const minutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return `${hours} hora${hours === 1 ? "" : "s"}`;
  return `${hours}h ${rest}min`;
}

export function goalProgress(goal: Pick<LifeGoal, "initialValue" | "currentValue" | "targetValue" | "allowOverTarget">): number {
  const denominator = goal.targetValue - goal.initialValue;
  if (!Number.isFinite(denominator) || denominator === 0) return goal.currentValue >= goal.targetValue ? 1 : 0;
  const value = (goal.currentValue - goal.initialValue) / denominator;
  return goal.allowOverTarget ? Math.max(0, value) : Math.max(0, Math.min(1, value));
}

export function projectedGoalDate(goal: LifeGoal, todayISO: string): string | null {
  const progress = goalProgress(goal);
  if (progress >= 1) return todayISO;
  const elapsedDays = Math.max(1, Math.round((parseISO(todayISO).getTime() - parseISO(goal.startDate).getTime()) / 86400000));
  const completed = Math.max(0, goal.currentValue - goal.initialValue);
  if (completed <= 0) return null;
  const dailyRate = completed / elapsedDays;
  const remaining = Math.max(0, goal.targetValue - goal.currentValue);
  return addDays(todayISO, Math.ceil(remaining / dailyRate));
}

export function goalNeedsAttention(goal: LifeGoal, todayISO: string): boolean {
  if (!goal.deadline || goal.status === "completed" || goal.status === "cancelled") return false;
  const deadline = parseISO(goal.deadline).getTime();
  const today = parseISO(todayISO).getTime();
  const total = Math.max(1, deadline - parseISO(goal.startDate).getTime());
  const elapsed = Math.max(0, today - parseISO(goal.startDate).getTime());
  return goalProgress(goal) < Math.min(1, elapsed / total) * 0.75;
}

export function dayProgress(habits: Habit[], logs: HabitLog[], dateISO: string): { completed: number; total: number; percent: number } {
  const active = scheduledHabits(habits, dateISO);
  const byHabit = new Map(logs.filter((log) => log.data === dateISO).map((log) => [log.habit_id, log.valor]));
  const completed = active.filter((habit) => {
    const value = byHabit.get(habit.id);
    return value != null && (habit.tipo === "binario" ? value >= 1 : habit.alvo ? value >= habit.alvo : value > 0);
  }).length;
  return { completed, total: active.length, percent: active.length ? Math.round((completed / active.length) * 100) : 0 };
}

export function portfolioVariation(current: number, previous: number | null): { amount: number | null; percent: number | null; movement: "up" | "down" | "stable" } {
  if (previous == null || !Number.isFinite(previous)) return { amount: null, percent: null, movement: "stable" };
  const amount = current - previous;
  return { amount, percent: previous === 0 ? null : (amount / previous) * 100, movement: amount > 0 ? "up" : amount < 0 ? "down" : "stable" };
}

export function netInvested(totalContributions: number, totalWithdrawals: number): number {
  return Math.max(0, totalContributions - totalWithdrawals);
}

export function buildDeterministicInsights(input: {
  todayISO: string; habits: Habit[]; logs: HabitLog[]; goals: LifeGoal[]; events: LifeEvent[];
}): Omit<LifeInsight, "id" | "createdAt">[] {
  const result: Omit<LifeInsight, "id" | "createdAt">[] = [];
  const progress = dayProgress(input.habits, input.logs, input.todayISO);
  if (progress.total > 0 && progress.percent < 50) {
    result.push({ type: "on_demand", analysisStart: addDays(input.todayISO, -6), analysisEnd: input.todayISO, mainArea: "hábitos", diagnosis: `Hoje você concluiu ${progress.completed} de ${progress.total} hábitos planejados.`, mainError: "A execução do dia está abaixo da metade.", risk: "Acumular pendências até o fim do dia.", recommendedAction: "Escolha o próximo hábito curto e registre a execução agora.", projection: null, priority: 1, status: "new", feedback: null });
  }
  const atRisk = input.goals.find((goal) => goalNeedsAttention(goal, input.todayISO));
  if (atRisk) {
    result.push({ type: "on_demand", analysisStart: input.todayISO, analysisEnd: input.todayISO, mainArea: atRisk.area, diagnosis: `A meta ${atRisk.name} está abaixo do ritmo necessário.`, mainError: "O progresso atual não acompanha o prazo.", risk: "A meta entrar em atraso.", recommendedAction: `Defina uma ação mensurável para ${atRisk.name} hoje.`, projection: projectedGoalDate(atRisk, input.todayISO), priority: 1, status: "new", feedback: null });
  }
  if (!input.events.length) {
    result.push({ type: "on_demand", analysisStart: input.todayISO, analysisEnd: input.todayISO, mainArea: "agenda", diagnosis: "Não há eventos pessoais registrados para hoje.", mainError: null, risk: "Não há dados suficientes para avaliar a carga do dia.", recommendedAction: "Registre apenas o próximo compromisso relevante.", projection: null, priority: 2, status: "new", feedback: null });
  }
  return result.slice(0, 5);
}

export function todayDateInBahia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function minutesSinceMidnightInBahia(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = Object.fromEntries(BAHIA_CLOCK_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
  const hours = Number(parts.hour) % 24;
  return hours * 60 + Number(parts.minute) + Number(parts.second) / 60;
}

export function isoDateToLabel(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}
