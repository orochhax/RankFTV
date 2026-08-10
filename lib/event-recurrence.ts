export const PERFORMANCE_TIMEZONE = "America/Bahia" as const;

export type EventRecurrenceEnd =
  | { type: "never" }
  | { type: "until"; date: string }
  | { type: "count"; count: number };

export type EventRecurrenceRule = {
  version: 1;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byWeekdays?: number[];
  monthlyMode?: "day_of_month" | "nth_weekday";
  monthDay?: number;
  weekdayOrdinal?: 1 | 2 | 3 | 4 | 5 | -1;
  end: EventRecurrenceEnd;
  timezone: typeof PERFORMANCE_TIMEZONE;
};

export type EventRecurrencePreset =
  | "none"
  | "daily"
  | "weekly"
  | "monthly_nth_weekday"
  | "yearly"
  | "weekdays"
  | "custom";

export type RecurringEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: string;
  location: string | null;
  link?: string | null;
  recurrenceRule?: EventRecurrenceRule | null;
  recurrenceGroupId?: string | null;
};

export type EventOccurrence<T extends RecurringEvent = RecurringEvent> = T & {
  occurrenceId: string;
  seriesId: string;
  occurrenceDate: string;
  baseStartAt: string;
  baseEndAt: string;
};

export type DateRange = { from: string; to: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SCAN_DAYS = 200_000;
const DEFAULT_MAX_OCCURRENCES = 2_000;

function dateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = dateFromKey(value);
  return !Number.isNaN(parsed.getTime()) && dateKeyUtc(parsed) === value;
}

function dateKeyUtc(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKeyUtc(date);
}

function differenceInDays(from: string, to: string): number {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);
}

function monthsBetween(from: string, to: string): number {
  const a = dateFromKey(from);
  const b = dateFromKey(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
}

function weekday(value: string): number {
  return dateFromKey(value).getUTCDay();
}

function mondayOf(value: string): string {
  const day = weekday(value);
  return addCalendarDays(value, day === 0 ? -6 : 1 - day);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
}

function ordinalForDate(value: string): 1 | 2 | 3 | 4 | 5 | -1 {
  const date = dateFromKey(value);
  const day = date.getUTCDate();
  if (day + 7 > daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1)) return -1;
  return Math.ceil(day / 7) as 1 | 2 | 3 | 4 | 5;
}

function isOrdinalWeekday(value: string, targetWeekday: number, ordinal: number): boolean {
  if (weekday(value) !== targetWeekday) return false;
  const date = dateFromKey(value);
  const day = date.getUTCDate();
  if (ordinal === -1) return day + 7 > daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  return Math.ceil(day / 7) === ordinal;
}

export function dateKeyInBahia(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PERFORMANCE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function clockInBahia(value: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PERFORMANCE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function bahiaInstant(date: string, clock: string): Date {
  return new Date(`${date}T${clock}-03:00`);
}

function normalizedWeekdays(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const days = [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return days.length ? days : undefined;
}

export function parseEventRecurrenceRule(value: unknown): EventRecurrenceRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.version !== 1 || !["daily", "weekly", "monthly", "yearly"].includes(String(source.frequency))) return null;
  const interval = Number(source.interval);
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) return null;
  const endSource = source.end;
  if (!endSource || typeof endSource !== "object" || Array.isArray(endSource)) return null;
  const rawEnd = endSource as Record<string, unknown>;
  let end: EventRecurrenceEnd;
  if (rawEnd.type === "never") end = { type: "never" };
  else if (rawEnd.type === "until" && isIsoDate(rawEnd.date)) end = { type: "until", date: rawEnd.date };
  else if (rawEnd.type === "count") {
    const count = Number(rawEnd.count);
    if (!Number.isInteger(count) || count < 1 || count > 10_000) return null;
    end = { type: "count", count };
  } else return null;

  const frequency = source.frequency as EventRecurrenceRule["frequency"];
  const byWeekdays = normalizedWeekdays(source.byWeekdays);
  if (frequency === "weekly" && !byWeekdays?.length) return null;
  const monthlyMode = source.monthlyMode === "nth_weekday" ? "nth_weekday" : source.monthlyMode === "day_of_month" ? "day_of_month" : undefined;
  const monthDay = Number(source.monthDay);
  const rawOrdinal = Number(source.weekdayOrdinal);
  const weekdayOrdinal = [1, 2, 3, 4, 5, -1].includes(rawOrdinal)
    ? rawOrdinal as EventRecurrenceRule["weekdayOrdinal"]
    : undefined;
  if (frequency === "monthly") {
    if (!monthlyMode) return null;
    if (monthlyMode === "day_of_month" && (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31)) return null;
    if (monthlyMode === "nth_weekday" && (!weekdayOrdinal || !byWeekdays?.length || byWeekdays.length !== 1)) return null;
  }

  return {
    version: 1,
    frequency,
    interval,
    ...(byWeekdays ? { byWeekdays } : {}),
    ...(monthlyMode ? { monthlyMode } : {}),
    ...(Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31 ? { monthDay } : {}),
    ...(weekdayOrdinal ? { weekdayOrdinal } : {}),
    end,
    timezone: PERFORMANCE_TIMEZONE,
  };
}

export function quickRecurrenceRule(preset: EventRecurrencePreset, anchorDate: string): EventRecurrenceRule | null {
  if (preset === "none" || preset === "custom" || !isIsoDate(anchorDate)) return null;
  const common = { version: 1 as const, interval: 1, end: { type: "never" } as const, timezone: PERFORMANCE_TIMEZONE };
  if (preset === "daily") return { ...common, frequency: "daily" };
  if (preset === "weekly") return { ...common, frequency: "weekly", byWeekdays: [weekday(anchorDate)] };
  if (preset === "weekdays") return { ...common, frequency: "weekly", byWeekdays: [1, 2, 3, 4, 5] };
  if (preset === "yearly") return { ...common, frequency: "yearly" };
  return {
    ...common,
    frequency: "monthly",
    monthlyMode: "nth_weekday",
    byWeekdays: [weekday(anchorDate)],
    weekdayOrdinal: ordinalForDate(anchorDate),
  };
}

function sameNumberList(a?: number[], b?: number[]): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

export function recurrencePresetForRule(rule: EventRecurrenceRule | null | undefined, anchorDate: string): EventRecurrencePreset {
  if (!rule) return "none";
  if (rule.interval !== 1 || rule.end.type !== "never") return "custom";
  if (rule.frequency === "daily") return "daily";
  if (rule.frequency === "yearly") return "yearly";
  if (rule.frequency === "weekly" && sameNumberList(rule.byWeekdays, [weekday(anchorDate)])) return "weekly";
  if (rule.frequency === "weekly" && sameNumberList(rule.byWeekdays, [1, 2, 3, 4, 5])) return "weekdays";
  if (
    rule.frequency === "monthly" &&
    rule.monthlyMode === "nth_weekday" &&
    sameNumberList(rule.byWeekdays, [weekday(anchorDate)]) &&
    rule.weekdayOrdinal === ordinalForDate(anchorDate)
  ) return "monthly_nth_weekday";
  return "custom";
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const SHORT_WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const ORDINALS: Record<number, string> = { 1: "primeiro(a)", 2: "segundo(a)", 3: "terceiro(a)", 4: "quarto(a)", 5: "quinto(a)", [-1]: "último(a)" };

function listLabel(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}

export function recurrenceSummary(rule: EventRecurrenceRule | null | undefined, anchorDate: string): string {
  if (!rule) return "Não se repete";
  const suffix = rule.end.type === "until"
    ? ` até ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(dateFromKey(rule.end.date))}`
    : rule.end.type === "count"
      ? `, ${rule.end.count} ocorrência${rule.end.count === 1 ? "" : "s"}`
      : "";
  if (rule.frequency === "daily") return `${rule.interval === 1 ? "Todos os dias" : `A cada ${rule.interval} dias`}${suffix}`;
  if (rule.frequency === "weekly") {
    const days = (rule.byWeekdays ?? []).map((day) => SHORT_WEEKDAYS[day]);
    const prefix = sameNumberList(rule.byWeekdays, [1, 2, 3, 4, 5]) && rule.interval === 1
      ? "Todos os dias da semana (segunda a sexta-feira)"
      : `${rule.interval === 1 ? "Toda semana" : `A cada ${rule.interval} semanas`}: ${listLabel(days)}`;
    return `${prefix}${suffix}`;
  }
  if (rule.frequency === "monthly") {
    const cadence = rule.interval === 1 ? "Todo mês" : `A cada ${rule.interval} meses`;
    const detail = rule.monthlyMode === "nth_weekday"
      ? `no(a) ${ORDINALS[rule.weekdayOrdinal ?? 1]} ${WEEKDAYS[rule.byWeekdays?.[0] ?? weekday(anchorDate)]}`
      : `no dia ${rule.monthDay ?? Number(anchorDate.slice(8))}`;
    return `${cadence} ${detail}${suffix}`;
  }
  const formatted = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(dateFromKey(anchorDate));
  return `${rule.interval === 1 ? "Anualmente" : `A cada ${rule.interval} anos`} em ${formatted}${suffix}`;
}

export function recurrencePresetOptions(anchorDate: string): Array<{ value: EventRecurrencePreset; label: string }> {
  const weekDay = WEEKDAYS[weekday(anchorDate)] ?? "dia escolhido";
  const monthly = quickRecurrenceRule("monthly_nth_weekday", anchorDate);
  const annual = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(dateFromKey(anchorDate));
  return [
    { value: "none", label: "Não se repete" },
    { value: "daily", label: "Todos os dias" },
    { value: "weekly", label: `Semanal: toda ${weekDay}` },
    { value: "monthly_nth_weekday", label: `Mensal no(a) ${ORDINALS[monthly?.weekdayOrdinal ?? 1]} ${weekDay}` },
    { value: "yearly", label: `Anual em ${annual}` },
    { value: "weekdays", label: "Todos os dias da semana (segunda a sexta-feira)" },
    { value: "custom", label: "Personalizar…" },
  ];
}

function matchesRecurrence(rule: EventRecurrenceRule, anchorDate: string, candidate: string): boolean {
  if (candidate < anchorDate) return false;
  const dayDifference = differenceInDays(anchorDate, candidate);
  if (rule.frequency === "daily") return dayDifference % rule.interval === 0;
  if (rule.frequency === "weekly") {
    const weekDifference = Math.floor(differenceInDays(mondayOf(anchorDate), mondayOf(candidate)) / 7);
    return weekDifference >= 0 && weekDifference % rule.interval === 0 && (rule.byWeekdays ?? []).includes(weekday(candidate));
  }
  if (rule.frequency === "monthly") {
    const monthDifference = monthsBetween(anchorDate, candidate);
    if (monthDifference < 0 || monthDifference % rule.interval !== 0) return false;
    if (rule.monthlyMode === "day_of_month") return Number(candidate.slice(8)) === rule.monthDay;
    return isOrdinalWeekday(candidate, rule.byWeekdays?.[0] ?? weekday(anchorDate), rule.weekdayOrdinal ?? ordinalForDate(anchorDate));
  }
  const anchor = dateFromKey(anchorDate);
  const current = dateFromKey(candidate);
  const yearDifference = current.getUTCFullYear() - anchor.getUTCFullYear();
  return yearDifference >= 0 && yearDifference % rule.interval === 0 && current.getUTCMonth() === anchor.getUTCMonth() && current.getUTCDate() === anchor.getUTCDate();
}

function rangeInstants(range: DateRange): { start: number; end: number } {
  return {
    start: bahiaInstant(range.from, "00:00:00").getTime(),
    end: bahiaInstant(addCalendarDays(range.to, 1), "00:00:00").getTime(),
  };
}

export function eventIntersectsDate(event: Pick<RecurringEvent, "startAt" | "endAt">, date: string): boolean {
  const range = rangeInstants({ from: date, to: date });
  return new Date(event.startAt).getTime() < range.end && new Date(event.endAt).getTime() > range.start;
}

export function expandEventOccurrences<T extends RecurringEvent>(
  events: readonly T[],
  range: DateRange,
  maxOccurrences = DEFAULT_MAX_OCCURRENCES,
): EventOccurrence<T>[] {
  if (!isIsoDate(range.from) || !isIsoDate(range.to) || range.from > range.to) return [];
  const visibleRange = rangeInstants(range);
  const output: EventOccurrence<T>[] = [];

  for (const event of events) {
    const rule = parseEventRecurrenceRule(event.recurrenceRule);
    if (!rule) {
      if (new Date(event.startAt).getTime() < visibleRange.end && new Date(event.endAt).getTime() > visibleRange.start) {
        output.push({ ...event, occurrenceId: event.id, seriesId: event.id, occurrenceDate: dateKeyInBahia(event.startAt), baseStartAt: event.startAt, baseEndAt: event.endAt });
      }
      continue;
    }

    const anchorDate = dateKeyInBahia(event.startAt);
    const startClock = event.allDay ? "00:00:00" : clockInBahia(event.startAt);
    const duration = Math.max(1, new Date(event.endAt).getTime() - new Date(event.startAt).getTime());
    let matched = 0;
    let scanned = 0;
    for (let candidate = anchorDate; candidate <= range.to; candidate = addCalendarDays(candidate, 1)) {
      scanned += 1;
      if (scanned > MAX_SCAN_DAYS) throw new RangeError("A série recorrente excede o intervalo seguro de leitura.");
      if (!matchesRecurrence(rule, anchorDate, candidate)) continue;
      matched += 1;
      if (rule.end.type === "count" && matched > rule.end.count) break;
      if (rule.end.type === "until" && candidate > rule.end.date) break;
      const occurrenceStart = bahiaInstant(candidate, startClock);
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
      if (occurrenceStart.getTime() < visibleRange.end && occurrenceEnd.getTime() > visibleRange.start) {
        output.push({
          ...event,
          startAt: occurrenceStart.toISOString(),
          endAt: occurrenceEnd.toISOString(),
          occurrenceId: `${event.id}::${candidate}`,
          seriesId: event.id,
          occurrenceDate: candidate,
          baseStartAt: event.startAt,
          baseEndAt: event.endAt,
        });
        if (output.length > maxOccurrences) throw new RangeError("A visualização excede o limite seguro de ocorrências.");
      }
    }
  }

  return output.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title) || a.occurrenceId.localeCompare(b.occurrenceId));
}
