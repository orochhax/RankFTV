import { InvestmentRouteError, InvestmentRouteErrorCode, MAX_REACH_MONTHS, ProjectPortfolioInput, ProjectionCashFlow } from "./types-core";

export type CivilDateParts = { year: number; month: number; day: number; dayNumber: number };

export function routeError(code: InvestmentRouteErrorCode, message: string, field?: string): never {
  throw new InvestmentRouteError(code, message, field ?? null);
}

export function finiteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) routeError("INVALID_NUMBER", `${field} deve ser um número finito.`, field);
  return value;
}

export function nonNegativeMoney(value: number, field: string): number {
  finiteNumber(value, field);
  if (value < 0) routeError("INVALID_NUMBER", `${field} não pode ser negativo.`, field);
  return value;
}

export function positiveMoney(value: number, field: string): number {
  finiteNumber(value, field);
  if (value <= 0) routeError("INVALID_TARGET", `${field} deve ser maior que zero.`, field);
  return value;
}

export function annualRate(value: number, field: string): number {
  finiteNumber(value, field);
  if (value <= -1) routeError("INVALID_RATE", `${field} deve ser maior que -100%.`, field);
  return value;
}

export function calculated(value: number, field: string): number {
  if (!Number.isFinite(value)) routeError("CALCULATION_OVERFLOW", `O cálculo de ${field} excedeu o limite numérico.`, field);
  return value;
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInCivilMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Gregorian civil date to a day index, without creating a Date/timezone value. */
export function daysFromCivil(yearValue: number, monthValue: number, day: number): number {
  let year = yearValue;
  year -= monthValue <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = monthValue + (monthValue > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

export function parseCivilDate(value: string, field = "date"): CivilDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) routeError("INVALID_DATE", `${field} deve usar YYYY-MM-DD.`, field);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInCivilMonth(year, month)) {
    routeError("INVALID_DATE", `${field} não é uma data civil válida.`, field);
  }
  return { year, month, day, dayNumber: daysFromCivil(year, month, day) };
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function civilDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

export function assertMonthKey(value: string, field = "month"): string {
  if (!/^\d{4}-\d{2}$/.test(value)) routeError("INVALID_DATE", `${field} deve usar YYYY-MM.`, field);
  parseCivilDate(`${value}-01`, field);
  return value;
}

export function monthKeyOf(value: string): string {
  const parsed = parseCivilDate(value);
  return `${String(parsed.year).padStart(4, "0")}-${pad2(parsed.month)}`;
}

export function addMonthsToKey(value: string, amount: number): string {
  assertMonthKey(value);
  if (!Number.isInteger(amount)) routeError("INVALID_HORIZON", "A quantidade de meses deve ser inteira.", "months");
  const [year, month] = value.split("-").map(Number);
  const absolute = year * 12 + month - 1 + amount;
  if (absolute < 0) routeError("INVALID_DATE", "O mês calculado é inválido.", "month");
  return `${String(Math.floor(absolute / 12)).padStart(4, "0")}-${pad2((absolute % 12) + 1)}`;
}

export function endOfMonthFromKey(value: string): string {
  assertMonthKey(value);
  const [year, month] = value.split("-").map(Number);
  return civilDate(year, month, daysInCivilMonth(year, month));
}

export function normalizeTargetDate(value: string): string {
  return endOfMonthFromKey(monthKeyOf(value));
}

export function monthsBetweenDates(startDate: string, endDate: string): number {
  const start = parseCivilDate(startDate, "startDate");
  const end = parseCivilDate(endDate, "endDate");
  return (end.year - start.year) * 12 + end.month - start.month;
}

export function daysBetweenDates(startDate: string, endDate: string): number {
  return parseCivilDate(endDate, "endDate").dayNumber - parseCivilDate(startDate, "startDate").dayNumber;
}

export function annualToMonthlyRate(annualRateValue: number): number {
  const validRate = annualRate(annualRateValue, "annualRate");
  return calculated(Math.pow(1 + validRate, 1 / 12) - 1, "monthlyRate");
}

export function nominalToRealRate(nominalRate: number, inflationRate: number): number {
  const nominal = annualRate(nominalRate, "nominalRate");
  const inflation = annualRate(inflationRate, "inflationRate");
  return calculated((1 + nominal) / (1 + inflation) - 1, "realRate");
}

export function realToNominalValue(realValue: number, inflationRate: number, months: number): number {
  nonNegativeMoney(realValue, "realValue");
  const inflation = annualRate(inflationRate, "inflationRate");
  finiteNumber(months, "months");
  return calculated(realValue * Math.pow(1 + inflation, months / 12), "nominalValue");
}

export function nominalToRealValue(nominalValue: number, inflationRate: number, months: number): number {
  nonNegativeMoney(nominalValue, "nominalValue");
  const inflation = annualRate(inflationRate, "inflationRate");
  finiteNumber(months, "months");
  return calculated(nominalValue / Math.pow(1 + inflation, months / 12), "realValue");
}

export function resolveProjectionMonths(input: Pick<ProjectPortfolioInput, "startDate" | "targetDate" | "months">): number {
  parseCivilDate(input.startDate, "startDate");
  let fromTarget: number | null = null;
  if (input.targetDate != null) {
    parseCivilDate(input.targetDate, "targetDate");
    fromTarget = monthsBetweenDates(input.startDate, normalizeTargetDate(input.targetDate));
    if (fromTarget < 0) routeError("INVALID_HORIZON", "A data-alvo não pode anteceder o mês inicial.", "targetDate");
  }
  if (input.months == null && fromTarget == null) {
    routeError("INVALID_HORIZON", "Informe months ou targetDate.", "months");
  }
  if (input.months != null) {
    if (!Number.isInteger(input.months) || input.months < 0 || input.months > MAX_REACH_MONTHS) {
      routeError("INVALID_HORIZON", `O horizonte deve estar entre 0 e ${MAX_REACH_MONTHS} meses.`, "months");
    }
    if (fromTarget != null && fromTarget !== input.months) {
      routeError("INVALID_HORIZON", "months e targetDate representam horizontes diferentes.", "months");
    }
    return input.months;
  }
  if (fromTarget == null || fromTarget > MAX_REACH_MONTHS) {
    routeError("INVALID_HORIZON", `O horizonte deve estar entre 0 e ${MAX_REACH_MONTHS} meses.`, "targetDate");
  }
  return fromTarget;
}

export function validateCashFlows(flows: readonly ProjectionCashFlow[]): ProjectionCashFlow[] {
  return flows.map((flow, index) => {
    parseCivilDate(flow.date, `cashFlows[${index}].date`);
    if (flow.type !== "contribution" && flow.type !== "withdrawal") {
      routeError("INVALID_FLOW", "O tipo do fluxo é inválido.", `cashFlows[${index}].type`);
    }
    positiveMoney(flow.amount, `cashFlows[${index}].amount`);
    return { date: flow.date, amount: flow.amount, type: flow.type };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function applyFlowsToBalance(
  balance: number,
  flows: readonly ProjectionCashFlow[],
  targetValue: number | null = null,
): {
  balance: number;
  contribution: number;
  withdrawal: number;
  depleted: boolean;
  shortfall: number;
  depletedAt: string | null;
  reachedAt: string | null;
} {
  let contribution = 0;
  let withdrawal = 0;
  let current = balance;
  let shortfall = 0;
  let depletedAt: string | null = null;
  let reachedAt: string | null = null;
  const grouped = new Map<string, { contribution: number; withdrawal: number }>();
  for (const flow of flows) {
    const day = grouped.get(flow.date) ?? { contribution: 0, withdrawal: 0 };
    if (flow.type === "contribution") day.contribution = calculated(day.contribution + flow.amount, "dailyContributions");
    else day.withdrawal = calculated(day.withdrawal + flow.amount, "dailyWithdrawals");
    grouped.set(flow.date, day);
  }
  for (const [date, day] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    contribution = calculated(contribution + day.contribution, "flowContributions");
    withdrawal = calculated(withdrawal + day.withdrawal, "flowWithdrawals");
    const raw = calculated(current + day.contribution - day.withdrawal, "balance");
    if (raw <= 0 && day.withdrawal > 0) {
      shortfall = calculated(shortfall + Math.max(0, -raw), "withdrawalShortfall");
      current = 0;
      depletedAt = date;
      break;
    }
    current = raw;
    if (!reachedAt && targetValue != null && current >= targetValue) reachedAt = date;
  }
  return { balance: current, contribution, withdrawal, depleted: depletedAt != null, shortfall, depletedAt, reachedAt };
}
