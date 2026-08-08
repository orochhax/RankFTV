/**
 * Pure financial engine for "Carteira em Rota".
 *
 * Rates are effective decimal fractions (`0.06` means 6% a year). Money is
 * never rounded inside the engine. Recurring contributions and withdrawals
 * are applied at month-end, after that month's return. All dates are civil
 * dates (`YYYY-MM-DD`); no runtime clock or timezone conversion is used.
 */

export const MAX_REACH_MONTHS = 1_200;
export const CURRENT_SNAPSHOT_MAX_AGE_DAYS = 35;
export const DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS = 60;
export const ROUTE_COVERAGE_THRESHOLDS = Object.freeze({
  ahead: 1.05,
  onTrack: 0.95,
  attention: 0.8,
});
export const CONTRIBUTION_CONSISTENCY_THRESHOLD = 0.9;

export type InvestmentRouteErrorCode =
  | "INVALID_NUMBER"
  | "INVALID_DATE"
  | "INVALID_RATE"
  | "INVALID_SCENARIO_ORDER"
  | "INVALID_TARGET"
  | "INVALID_HORIZON"
  | "INVALID_FLOW"
  | "INVALID_PLAN"
  | "FUTURE_SNAPSHOT"
  | "CALCULATION_OVERFLOW";

export class InvestmentRouteError extends Error {
  readonly code: InvestmentRouteErrorCode;
  readonly field: string | null;

  constructor(code: InvestmentRouteErrorCode, message: string, field: string | null = null) {
    super(message);
    this.name = "InvestmentRouteError";
    this.code = code;
    this.field = field;
  }
}

export type InvestmentValueMode = "real" | "nominal";

export type InvestmentPlan = {
  id: string;
  name: string;
  active: boolean;
  completedAt?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InvestmentPlanRevision = {
  id: string;
  planId: string;
  version: number;
  effectiveFrom: string;
  baselineDate: string;
  baselineValue: number;
  targetValue: number;
  targetDate: string;
  valueMode: InvestmentValueMode;
  valueReferenceDate: string;
  plannedMonthlyContribution: number;
  annualReturnConservative: number;
  annualReturnBase: number;
  annualReturnFavorable: number;
  annualInflation: number;
  changeNote?: string | null;
  createdAt?: string;
};

export type InvestmentRouteSnapshot = {
  id: string;
  date: string;
  totalValue: number;
  notes?: string | null;
};

export type InvestmentRouteContribution = {
  id: string;
  date: string;
  amount: number;
  source?: string | null;
  sourceEntryId?: string | null;
  institution?: string | null;
  notes?: string | null;
};

export type InvestmentRouteWithdrawal = {
  id: string;
  date: string;
  amount: number;
  institution?: string | null;
  notes?: string | null;
};

export type ProjectionCashFlow = {
  date: string;
  amount: number;
  type: "contribution" | "withdrawal";
};

export type ProjectionPoint = {
  date: string;
  monthIndex: number;
  openingBalance: number;
  returnAmount: number;
  contribution: number;
  withdrawal: number;
  rawBalance: number;
  balance: number;
  depleted: boolean;
};

export type ProjectPortfolioInput = {
  initialBalance: number;
  annualRate: number;
  startDate: string;
  /** Exactly one horizon source is sufficient. When both exist they must agree. */
  months?: number;
  targetDate?: string;
  monthlyContribution?: number;
  cashFlows?: readonly ProjectionCashFlow[];
  /** Civil month keys (`YYYY-MM`) in which the recurring contribution is paused. */
  pausedMonths?: readonly string[];
  targetValue?: number;
};

export type PortfolioProjection = {
  startDate: string;
  endDate: string;
  months: number;
  monthlyRate: number;
  finalBalance: number;
  points: ProjectionPoint[];
  reachedAt: string | null;
  targetReached: boolean;
  unreachable: boolean;
  depletedAt: string | null;
  withdrawalShortfall: number;
};

export type RequiredMonthlyContributionInput = Omit<ProjectPortfolioInput, "monthlyContribution" | "targetValue"> & {
  targetValue: number;
};

export type ContributionPaceMonth = {
  month: string;
  contributed: number;
};

export type ContributionPace = {
  months: ContributionPaceMonth[];
  total: number;
  monthlyAverage: number | null;
  eligibleMonthCount: number;
  hasSufficientHistory: boolean;
  minimumRequiredMonths: number;
};

export type DeriveContributionPaceInput = {
  contributions: readonly InvestmentRouteContribution[];
  asOfDate: string;
  planStartDate?: string | null;
  windowMonths?: number;
  minimumRequiredMonths?: number;
};

export type InvestmentDataQualityLevel =
  | "current"
  | "stale"
  | "update_required"
  | "missing"
  | "unavailable"
  | "migration_missing";

export type InvestmentDataQuality = {
  level: InvestmentDataQualityLevel;
  latestSnapshot: InvestmentRouteSnapshot | null;
  snapshotAgeDays: number | null;
  observedValue: number | null;
  estimatedCurrentValue: number | null;
  contributionsAfterSnapshot: number;
  withdrawalsAfterSnapshot: number;
  hasPostSnapshotFlows: boolean;
  canProject: boolean;
  canComputeDefinitiveStatus: boolean;
  explanationKey:
    | "snapshot_current"
    | "snapshot_stale"
    | "snapshot_too_old"
    | "snapshot_missing"
    | "snapshot_unavailable"
    | "migration_missing";
};

export type AssessInvestmentDataQualityInput = {
  snapshots: readonly InvestmentRouteSnapshot[];
  contributions?: readonly InvestmentRouteContribution[];
  withdrawals?: readonly InvestmentRouteWithdrawal[];
  asOfDate: string;
  queryState?: "ready" | "error" | "migration_missing";
};

export type RouteStatusCode =
  | "configuration_required"
  | "update_required"
  | "insufficient_data"
  | "completed"
  | "ahead"
  | "on_track"
  | "attention"
  | "off_track"
  | "calculating";

export type RouteStatusResult = {
  status: RouteStatusCode;
  label: string;
  coverage: number | null;
  projectedValue: number | null;
  differenceAmount: number | null;
  differencePercent: number | null;
  requiredMonthlyContribution: number | null;
  estimatedReachDate: string | null;
  reachDifferenceMonths: number | null;
  dataQuality: InvestmentDataQualityLevel;
  explanationKey: string;
  explanationValues: {
    contributionPace: number | null;
    projectedValue: number | null;
    targetValue: number | null;
    coverage: number | null;
    requiredMonthlyContribution: number | null;
    snapshotAgeDays: number | null;
    eligiblePaceMonths: number;
  };
};

export type ComputeRouteStatusInput = {
  hasPlan: boolean;
  hasSnapshot: boolean;
  dataQuality: InvestmentDataQualityLevel;
  snapshotAgeDays: number | null;
  assumptionsValid?: boolean;
  currentValue: number | null;
  targetValue: number | null;
  projectedValue: number | null;
  eligiblePaceMonths: number;
  contributionPace?: number | null;
  requiredMonthlyContribution?: number | null;
  targetDate?: string | null;
  estimatedReachDate?: string | null;
  allowCompletion?: boolean;
};

export type MonthlyAdherenceStatus = "met" | "almost" | "below" | "in_progress" | "no_target";

export type MonthlyAdherencePoint = {
  month: string;
  planned: number | null;
  contributed: number;
  ratio: number | null;
  remaining: number;
  excess: number;
  status: MonthlyAdherenceStatus;
  revisionVersion: number | null;
  isCurrentMonth: boolean;
};

export type MonthlyAdherenceResult = {
  months: MonthlyAdherencePoint[];
  volumeAdherence: number | null;
  consistency: number | null;
  eligibleMonthCount: number;
  plannedTotal: number;
  contributedTotal: number;
};

export type ComputeMonthlyAdherenceInput = {
  contributions: readonly InvestmentRouteContribution[];
  revisions: readonly InvestmentPlanRevision[];
  asOfDate: string;
  fromMonth?: string;
  toMonth?: string;
  consistencyThreshold?: number;
};

export type SnapshotPeriodInput = {
  initialSnapshot: InvestmentRouteSnapshot;
  finalSnapshot: InvestmentRouteSnapshot;
  contributions: readonly InvestmentRouteContribution[];
  withdrawals: readonly InvestmentRouteWithdrawal[];
};

export type SnapshotPeriodBreakdown = {
  startDate: string;
  endDate: string;
  initialValue: number;
  finalValue: number;
  contributions: number;
  withdrawals: number;
  residualResult: number;
  totalVariation: number;
};

export type TrajectoryValuePoint = {
  date: string;
  value: number;
};

export type TrajectoryRangePoint = {
  date: string;
  conservative: number;
  base: number;
  favorable: number;
};

export type TrajectoryPoint = {
  date: string;
  actual: number | null;
  originalPlan: number | null;
  currentPlan: number | null;
  routeBase: number | null;
  routeConservative: number | null;
  routeFavorable: number | null;
  simulation: number | null;
};

export type InvestmentScenarioDraft = {
  monthlyContribution?: number;
  oneTimeContribution?: { date: string; amount: number } | null;
  /** A count pauses the next N complete months; an array names exact months. */
  pauseMonths?: number | readonly string[];
  futureWithdrawal?: { date: string; amount: number } | null;
  targetDate?: string;
  targetValue?: number;
  annualRate?: number;
};

export type ScenarioProjection = {
  projection: PortfolioProjection;
  projectedValue: number;
  targetValue: number;
  differenceToTarget: number;
  reachedAt: string | null;
  unreachable: boolean;
};

export type InvestmentTrajectorySeries = {
  historical: TrajectoryValuePoint[];
  originalPlan: TrajectoryValuePoint[];
  currentPlan: TrajectoryValuePoint[];
  currentRoute: TrajectoryValuePoint[];
  range: TrajectoryRangePoint[];
  simulation: TrajectoryValuePoint[] | null;
  points: TrajectoryPoint[];
  contributionSource: "observed" | "planned_provisional" | null;
  valueMode: InvestmentValueMode | null;
  originalPlanValueMode: InvestmentValueMode | null;
  isOriginalPlanComparable: boolean;
  originalPlanConverted: boolean;
};

export type BuildTrajectorySeriesInput = {
  revisions: readonly InvestmentPlanRevision[];
  snapshots: readonly InvestmentRouteSnapshot[];
  contributions?: readonly InvestmentRouteContribution[];
  withdrawals?: readonly InvestmentRouteWithdrawal[];
  asOfDate: string;
  currentMonthlyContribution?: number | null;
  simulation?: InvestmentScenarioDraft | null;
  queryState?: AssessInvestmentDataQualityInput["queryState"];
};

export type BuildInvestmentRouteDashboardInput = {
  plan: InvestmentPlan | null;
  revisions: readonly InvestmentPlanRevision[];
  snapshots: readonly InvestmentRouteSnapshot[];
  contributions: readonly InvestmentRouteContribution[];
  withdrawals: readonly InvestmentRouteWithdrawal[];
  asOfDate: string;
  queryState?: AssessInvestmentDataQualityInput["queryState"];
  adherenceMonths?: number;
};

export type InvestmentRouteDashboard = {
  plan: InvestmentPlan | null;
  originalRevision: InvestmentPlanRevision | null;
  currentRevision: InvestmentPlanRevision | null;
  routeRevision: InvestmentPlanRevision | null;
  dataQuality: InvestmentDataQuality;
  pace: ContributionPace;
  currentValue: {
    observed: number;
    estimated: number;
    isEstimated: boolean;
    date: string;
    valueMode: InvestmentValueMode;
  } | null;
  trajectory: InvestmentTrajectorySeries;
  status: RouteStatusResult;
  requiredMonthlyContribution: number | null;
  adherence: MonthlyAdherenceResult;
  latestBreakdown: SnapshotPeriodBreakdown | null;
  modifiedDietzReturn: number | null;
  projections: {
    conservative: number | null;
    base: number | null;
    favorable: number | null;
    followingPlan: number | null;
  };
};

type CivilDateParts = { year: number; month: number; day: number; dayNumber: number };

function routeError(code: InvestmentRouteErrorCode, message: string, field?: string): never {
  throw new InvestmentRouteError(code, message, field ?? null);
}

function finiteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) routeError("INVALID_NUMBER", `${field} deve ser um número finito.`, field);
  return value;
}

function nonNegativeMoney(value: number, field: string): number {
  finiteNumber(value, field);
  if (value < 0) routeError("INVALID_NUMBER", `${field} não pode ser negativo.`, field);
  return value;
}

function positiveMoney(value: number, field: string): number {
  finiteNumber(value, field);
  if (value <= 0) routeError("INVALID_TARGET", `${field} deve ser maior que zero.`, field);
  return value;
}

function annualRate(value: number, field: string): number {
  finiteNumber(value, field);
  if (value <= -1) routeError("INVALID_RATE", `${field} deve ser maior que -100%.`, field);
  return value;
}

function calculated(value: number, field: string): number {
  if (!Number.isFinite(value)) routeError("CALCULATION_OVERFLOW", `O cálculo de ${field} excedeu o limite numérico.`, field);
  return value;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInCivilMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Gregorian civil date to a day index, without creating a Date/timezone value. */
function daysFromCivil(yearValue: number, monthValue: number, day: number): number {
  let year = yearValue;
  year -= monthValue <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = monthValue + (monthValue > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

function parseCivilDate(value: string, field = "date"): CivilDateParts {
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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function civilDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function assertMonthKey(value: string, field = "month"): string {
  if (!/^\d{4}-\d{2}$/.test(value)) routeError("INVALID_DATE", `${field} deve usar YYYY-MM.`, field);
  parseCivilDate(`${value}-01`, field);
  return value;
}

function monthKeyOf(value: string): string {
  const parsed = parseCivilDate(value);
  return `${String(parsed.year).padStart(4, "0")}-${pad2(parsed.month)}`;
}

function addMonthsToKey(value: string, amount: number): string {
  assertMonthKey(value);
  if (!Number.isInteger(amount)) routeError("INVALID_HORIZON", "A quantidade de meses deve ser inteira.", "months");
  const [year, month] = value.split("-").map(Number);
  const absolute = year * 12 + month - 1 + amount;
  if (absolute < 0) routeError("INVALID_DATE", "O mês calculado é inválido.", "month");
  return `${String(Math.floor(absolute / 12)).padStart(4, "0")}-${pad2((absolute % 12) + 1)}`;
}

function endOfMonthFromKey(value: string): string {
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

function daysBetweenDates(startDate: string, endDate: string): number {
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

function resolveProjectionMonths(input: Pick<ProjectPortfolioInput, "startDate" | "targetDate" | "months">): number {
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

function validateCashFlows(flows: readonly ProjectionCashFlow[]): ProjectionCashFlow[] {
  return flows.map((flow, index) => {
    parseCivilDate(flow.date, `cashFlows[${index}].date`);
    if (flow.type !== "contribution" && flow.type !== "withdrawal") {
      routeError("INVALID_FLOW", "O tipo do fluxo é inválido.", `cashFlows[${index}].type`);
    }
    positiveMoney(flow.amount, `cashFlows[${index}].amount`);
    return { date: flow.date, amount: flow.amount, type: flow.type };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function applyFlowsToBalance(
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

export function projectPortfolio(input: ProjectPortfolioInput): PortfolioProjection {
  nonNegativeMoney(input.initialBalance, "initialBalance");
  const rate = annualRate(input.annualRate, "annualRate");
  const months = resolveProjectionMonths(input);
  const monthlyContribution = input.monthlyContribution ?? 0;
  nonNegativeMoney(monthlyContribution, "monthlyContribution");
  const monthlyRate = annualToMonthlyRate(rate);
  const startMonth = monthKeyOf(input.startDate);
  const endDate = endOfMonthFromKey(addMonthsToKey(startMonth, months));
  const paused = new Set((input.pausedMonths ?? []).map((month, index) => assertMonthKey(month, `pausedMonths[${index}]`)));
  const allFlows = validateCashFlows(input.cashFlows ?? []);
  const targetValue = input.targetValue == null ? null : positiveMoney(input.targetValue, "targetValue");
  const points: ProjectionPoint[] = [{
    date: input.startDate,
    monthIndex: 0,
    openingBalance: input.initialBalance,
    returnAmount: 0,
    contribution: 0,
    withdrawal: 0,
    rawBalance: input.initialBalance,
    balance: input.initialBalance,
    depleted: false,
  }];
  let balance = input.initialBalance;
  let reachedAt = targetValue != null && balance >= targetValue ? input.startDate : null;
  let depletedAt: string | null = null;
  let withdrawalShortfall = 0;

  // Remaining flows in the anchor month are explicit actions, separate from
  // the next complete recurring month. They receive no partial-month return.
  const currentMonthFlows = allFlows.filter((flow) => flow.date > input.startDate && monthKeyOf(flow.date) === startMonth);
  if (currentMonthFlows.length) {
    const applied = applyFlowsToBalance(balance, currentMonthFlows, targetValue);
    const openingBalance = balance;
    balance = applied.balance;
    withdrawalShortfall = applied.shortfall;
    depletedAt = applied.depletedAt;
    if (!reachedAt && applied.reachedAt) reachedAt = applied.reachedAt;
    points.push({
      date: applied.depletedAt ?? currentMonthFlows.at(-1)!.date,
      monthIndex: 0,
      openingBalance,
      returnAmount: 0,
      contribution: applied.contribution,
      withdrawal: applied.withdrawal,
      rawBalance: calculated(openingBalance + applied.contribution - applied.withdrawal, "rawBalance"),
      balance,
      depleted: applied.depleted,
    });
  }

  for (let monthIndex = 1; monthIndex <= months; monthIndex += 1) {
    const month = addMonthsToKey(startMonth, monthIndex);
    const date = endOfMonthFromKey(month);
    if (depletedAt) {
      points.push({
        date,
        monthIndex,
        openingBalance: 0,
        returnAmount: 0,
        contribution: 0,
        withdrawal: 0,
        rawBalance: 0,
        balance: 0,
        depleted: true,
      });
      continue;
    }

    const openingBalance = balance;
    const returnAmount = calculated(openingBalance * monthlyRate, "returnAmount");
    const recurring = paused.has(month) ? 0 : monthlyContribution;
    const monthFlows = allFlows.filter((flow) => flow.date > input.startDate && monthKeyOf(flow.date) === month);
    const scheduledFlows: ProjectionCashFlow[] = recurring > 0
      ? [...monthFlows, { date, amount: recurring, type: "contribution" }]
      : monthFlows;
    const balanceBeforeFlows = calculated(openingBalance + returnAmount, "balanceBeforeFlows");
    const applied = applyFlowsToBalance(balanceBeforeFlows, scheduledFlows, targetValue);
    const contribution = applied.contribution;
    const flowWithdrawals = applied.withdrawal;
    const rawBalance = calculated(balanceBeforeFlows + contribution - flowWithdrawals, "rawBalance");
    withdrawalShortfall = calculated(withdrawalShortfall + applied.shortfall, "withdrawalShortfall");
    if (applied.depletedAt) depletedAt = applied.depletedAt;
    balance = applied.balance;
    if (!reachedAt && applied.reachedAt) reachedAt = applied.reachedAt;
    if (!reachedAt && targetValue != null && balance >= targetValue) reachedAt = date;
    points.push({
      date,
      monthIndex,
      openingBalance,
      returnAmount,
      contribution,
      withdrawal: flowWithdrawals,
      rawBalance,
      balance,
      depleted: depletedAt != null,
    });
  }

  calculated(balance, "finalBalance");
  return {
    startDate: input.startDate,
    endDate,
    months,
    monthlyRate,
    finalBalance: balance,
    points,
    reachedAt,
    targetReached: reachedAt != null,
    unreachable: targetValue != null && reachedAt == null && months >= MAX_REACH_MONTHS,
    depletedAt,
    withdrawalShortfall,
  };
}

export function requiredMonthlyContribution(input: RequiredMonthlyContributionInput): number | null {
  const targetValue = positiveMoney(input.targetValue, "targetValue");
  nonNegativeMoney(input.initialBalance, "initialBalance");
  const months = resolveProjectionMonths(input);
  const rate = annualRate(input.annualRate, "annualRate");
  validateCashFlows(input.cashFlows ?? []);
  (input.pausedMonths ?? []).forEach((month, index) => assertMonthKey(month, `pausedMonths[${index}]`));
  if (months === 0) {
    const atDeadline = projectPortfolio({
      initialBalance: input.initialBalance,
      annualRate: rate,
      startDate: input.startDate,
      months,
      monthlyContribution: 0,
      cashFlows: input.cashFlows,
      pausedMonths: input.pausedMonths,
      targetValue,
    });
    return atDeadline.finalBalance >= targetValue ? 0 : null;
  }

  const balanceFor = (monthlyContribution: number): number => projectPortfolio({
    ...input,
    monthlyContribution,
    targetValue,
  }).finalBalance;
  const refineToCent = (candidateValue: number): number => {
    let candidate = candidateValue;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const projected = balanceFor(candidate);
      const gap = projected - targetValue;
      if (Math.abs(gap) <= 0.01) return calculated(candidate, "requiredMonthlyContribution");
      const step = Math.max(1e-7, Math.abs(candidate) * 1e-8);
      const nextProjected = balanceFor(calculated(candidate + step, "requiredMonthlyContributionProbe"));
      const sensitivity = (nextProjected - projected) / step;
      if (!Number.isFinite(sensitivity) || sensitivity <= 0) break;
      const nextCandidate = Math.max(0, candidate - gap / sensitivity);
      if (nextCandidate === candidate) break;
      candidate = nextCandidate;
    }
    const projected = balanceFor(candidate);
    if (Math.abs(projected - targetValue) > 0.01) {
      routeError(
        "CALCULATION_OVERFLOW",
        "Não foi possível representar o aporte necessário com precisão de um centavo.",
        "requiredMonthlyContribution",
      );
    }
    return calculated(candidate, "requiredMonthlyContribution");
  };

  const hasVariableFlows = Boolean(input.cashFlows?.length || input.pausedMonths?.length);
  if (!hasVariableFlows) {
    const monthlyRate = annualToMonthlyRate(rate);
    const growth = calculated(Math.pow(1 + monthlyRate, months), "growthFactor");
    const futureInitial = calculated(input.initialBalance * growth, "futureInitialBalance");
    if (futureInitial >= targetValue) return 0;
    const annuityFactor = monthlyRate === 0
      ? months
      : calculated(Math.expm1(months * Math.log1p(monthlyRate)) / monthlyRate, "annuityFactor");
    if (annuityFactor <= 0) return null;
    return refineToCent(calculated(Math.max(0, (targetValue - futureInitial) / annuityFactor), "requiredMonthlyContribution"));
  }

  if (balanceFor(0) >= targetValue) return 0;

  let low = 0;
  let high = Math.max(1, targetValue);
  let highBalance = 0;
  for (let attempt = 0; attempt < 512; attempt += 1) {
    try {
      highBalance = balanceFor(high);
    } catch (error) {
      if (error instanceof InvestmentRouteError && error.code === "CALCULATION_OVERFLOW") {
        highBalance = Number.POSITIVE_INFINITY;
      } else {
        throw error;
      }
    }
    if (highBalance >= targetValue) break;
    high *= 2;
    if (!Number.isFinite(high)) return null;
  }
  if (highBalance < targetValue) return null;

  for (let iteration = 0; iteration < 220; iteration += 1) {
    const middle = low + (high - low) / 2;
    let middleBalance: number;
    try {
      middleBalance = balanceFor(middle);
    } catch (error) {
      if (error instanceof InvestmentRouteError && error.code === "CALCULATION_OVERFLOW") middleBalance = Number.POSITIVE_INFINITY;
      else throw error;
    }
    if (middleBalance >= targetValue) {
      high = middle;
      highBalance = middleBalance;
    } else {
      low = middle;
    }
    if (highBalance - targetValue <= 0.005 && high - low <= Math.max(1e-10, high * 1e-13)) break;
  }
  return refineToCent(high);
}

function contributionDeduplicationKey(item: InvestmentRouteContribution, index: number): string {
  if (item.sourceEntryId) return `source:${item.sourceEntryId}`;
  if (item.id) return `id:${item.id}`;
  return `row:${index}`;
}

function validatedDeduplicatedContributions(items: readonly InvestmentRouteContribution[]): InvestmentRouteContribution[] {
  const seen = new Set<string>();
  const result: InvestmentRouteContribution[] = [];
  items.forEach((item, index) => {
    parseCivilDate(item.date, `contributions[${index}].date`);
    nonNegativeMoney(item.amount, `contributions[${index}].amount`);
    const key = contributionDeduplicationKey(item, index);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...item });
  });
  return result;
}

function validatedDeduplicatedWithdrawals(items: readonly InvestmentRouteWithdrawal[]): InvestmentRouteWithdrawal[] {
  const seen = new Set<string>();
  const result: InvestmentRouteWithdrawal[] = [];
  items.forEach((item, index) => {
    parseCivilDate(item.date, `withdrawals[${index}].date`);
    nonNegativeMoney(item.amount, `withdrawals[${index}].amount`);
    const key = item.id ? `id:${item.id}` : `row:${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...item });
  });
  return result;
}

export function deriveCurrentContributionPace(input: DeriveContributionPaceInput): ContributionPace {
  parseCivilDate(input.asOfDate, "asOfDate");
  const windowMonths = input.windowMonths ?? 6;
  const minimumRequiredMonths = input.minimumRequiredMonths ?? 3;
  if (!Number.isInteger(windowMonths) || windowMonths <= 0 || windowMonths > MAX_REACH_MONTHS) {
    routeError("INVALID_HORIZON", "windowMonths deve ser um inteiro positivo.", "windowMonths");
  }
  if (!Number.isInteger(minimumRequiredMonths) || minimumRequiredMonths <= 0) {
    routeError("INVALID_HORIZON", "minimumRequiredMonths deve ser um inteiro positivo.", "minimumRequiredMonths");
  }
  const contributions = validatedDeduplicatedContributions(input.contributions);
  const currentMonth = monthKeyOf(input.asOfDate);
  const lastClosedMonth = addMonthsToKey(currentMonth, -1);
  let firstMonth = addMonthsToKey(lastClosedMonth, -(windowMonths - 1));
  if (input.planStartDate) {
    const start = parseCivilDate(input.planStartDate, "planStartDate");
    const startMonth = monthKeyOf(input.planStartDate);
    const firstFullPlanMonth = start.day === 1 ? startMonth : addMonthsToKey(startMonth, 1);
    if (firstFullPlanMonth > firstMonth) firstMonth = firstFullPlanMonth;
  }
  if (firstMonth > lastClosedMonth) {
    return { months: [], total: 0, monthlyAverage: null, eligibleMonthCount: 0, hasSufficientHistory: false, minimumRequiredMonths };
  }
  const monthCount = monthsBetweenDates(`${firstMonth}-01`, `${lastClosedMonth}-01`) + 1;
  const totals = new Map<string, number>();
  for (const item of contributions) {
    const month = monthKeyOf(item.date);
    if (month < firstMonth || month > lastClosedMonth) continue;
    totals.set(month, calculated((totals.get(month) ?? 0) + item.amount, "monthlyContributions"));
  }
  const months: ContributionPaceMonth[] = Array.from({ length: monthCount }, (_, index) => {
    const month = addMonthsToKey(firstMonth, index);
    return { month, contributed: totals.get(month) ?? 0 };
  });
  const total = months.reduce((sum, item) => calculated(sum + item.contributed, "contributionPaceTotal"), 0);
  const monthlyAverage = months.length ? calculated(total / months.length, "monthlyContributionPace") : null;
  return {
    months,
    total,
    monthlyAverage,
    eligibleMonthCount: months.length,
    hasSufficientHistory: months.length >= minimumRequiredMonths,
    minimumRequiredMonths,
  };
}

export function assessInvestmentDataQuality(input: AssessInvestmentDataQualityInput): InvestmentDataQuality {
  parseCivilDate(input.asOfDate, "asOfDate");
  if (input.queryState === "error") {
    return {
      level: "unavailable", latestSnapshot: null, snapshotAgeDays: null, observedValue: null,
      estimatedCurrentValue: null, contributionsAfterSnapshot: 0, withdrawalsAfterSnapshot: 0,
      hasPostSnapshotFlows: false, canProject: false, canComputeDefinitiveStatus: false,
      explanationKey: "snapshot_unavailable",
    };
  }
  if (input.queryState === "migration_missing") {
    return {
      level: "migration_missing", latestSnapshot: null, snapshotAgeDays: null, observedValue: null,
      estimatedCurrentValue: null, contributionsAfterSnapshot: 0, withdrawalsAfterSnapshot: 0,
      hasPostSnapshotFlows: false, canProject: false, canComputeDefinitiveStatus: false,
      explanationKey: "migration_missing",
    };
  }
  const snapshots = input.snapshots.map((snapshot, index) => {
    parseCivilDate(snapshot.date, `snapshots[${index}].date`);
    nonNegativeMoney(snapshot.totalValue, `snapshots[${index}].totalValue`);
    if (snapshot.date > input.asOfDate) {
      routeError("FUTURE_SNAPSHOT", "Snapshots futuros não podem compor a rota.", `snapshots[${index}].date`);
    }
    return { ...snapshot };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (!snapshots.length) {
    return {
      level: "missing", latestSnapshot: null, snapshotAgeDays: null, observedValue: null,
      estimatedCurrentValue: null, contributionsAfterSnapshot: 0, withdrawalsAfterSnapshot: 0,
      hasPostSnapshotFlows: false, canProject: false, canComputeDefinitiveStatus: false,
      explanationKey: "snapshot_missing",
    };
  }
  const latestSnapshot = snapshots.at(-1) ?? null;
  if (!latestSnapshot) routeError("INVALID_PLAN", "Não foi possível selecionar o snapshot.");
  const snapshotAgeDays = daysBetweenDates(latestSnapshot.date, input.asOfDate);
  const contributions = validatedDeduplicatedContributions(input.contributions ?? []);
  const withdrawals = validatedDeduplicatedWithdrawals(input.withdrawals ?? []);
  const contributionsAfterSnapshot = contributions
    .filter((item) => item.date > latestSnapshot.date && item.date <= input.asOfDate)
    .reduce((sum, item) => calculated(sum + item.amount, "contributionsAfterSnapshot"), 0);
  const withdrawalsAfterSnapshot = withdrawals
    .filter((item) => item.date > latestSnapshot.date && item.date <= input.asOfDate)
    .reduce((sum, item) => calculated(sum + item.amount, "withdrawalsAfterSnapshot"), 0);
  const estimatedCurrentValue = calculated(
    latestSnapshot.totalValue + contributionsAfterSnapshot - withdrawalsAfterSnapshot,
    "estimatedCurrentValue",
  );
  const level: InvestmentDataQualityLevel = snapshotAgeDays <= CURRENT_SNAPSHOT_MAX_AGE_DAYS
    ? "current"
    : snapshotAgeDays <= DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS
      ? "stale"
      : "update_required";
  return {
    level,
    latestSnapshot,
    snapshotAgeDays,
    observedValue: latestSnapshot.totalValue,
    estimatedCurrentValue,
    contributionsAfterSnapshot,
    withdrawalsAfterSnapshot,
    hasPostSnapshotFlows: contributionsAfterSnapshot !== 0 || withdrawalsAfterSnapshot !== 0,
    canProject: level !== "update_required" && estimatedCurrentValue >= 0,
    canComputeDefinitiveStatus: (level === "current" || level === "stale") && estimatedCurrentValue >= 0,
    explanationKey: level === "current" ? "snapshot_current" : level === "stale" ? "snapshot_stale" : "snapshot_too_old",
  };
}

const STATUS_LABELS: Record<RouteStatusCode, string> = {
  configuration_required: "Configuração necessária",
  update_required: "Atualização necessária",
  insufficient_data: "Dados insuficientes",
  completed: "Concluída",
  ahead: "Adiantada",
  on_track: "No caminho",
  attention: "Atenção",
  off_track: "Fora da rota",
  calculating: "Calculando sua rota",
};

export function computeRouteStatus(input: ComputeRouteStatusInput): RouteStatusResult {
  if (input.snapshotAgeDays != null) nonNegativeMoney(input.snapshotAgeDays, "snapshotAgeDays");
  if (!Number.isInteger(input.eligiblePaceMonths) || input.eligiblePaceMonths < 0) {
    routeError("INVALID_HORIZON", "eligiblePaceMonths deve ser um inteiro não negativo.", "eligiblePaceMonths");
  }
  const validTarget = input.targetValue != null && Number.isFinite(input.targetValue) && input.targetValue > 0;
  const validCurrent = input.currentValue != null && Number.isFinite(input.currentValue) && input.currentValue >= 0;
  const validProjected = input.projectedValue != null && Number.isFinite(input.projectedValue);
  const assumptionsValid = (input.assumptionsValid ?? true) && validTarget && validCurrent;
  const target = validTarget ? input.targetValue as number : null;
  const current = validCurrent ? input.currentValue as number : null;
  const projected = validProjected ? input.projectedValue as number : null;
  const coverage = target != null && projected != null ? calculated(projected / target, "coverage") : null;
  const differenceAmount = target != null && projected != null ? calculated(projected - target, "differenceAmount") : null;
  const differencePercent = coverage == null ? null : coverage - 1;
  const reachDifferenceMonths = input.targetDate && input.estimatedReachDate
    ? monthsBetweenDates(normalizeTargetDate(input.targetDate), normalizeTargetDate(input.estimatedReachDate))
    : null;

  let status: RouteStatusCode;
  let explanationKey: string;
  if (!input.hasPlan) {
    status = "configuration_required";
    explanationKey = "plan_missing";
  } else if (!input.hasSnapshot || input.dataQuality === "missing") {
    status = "update_required";
    explanationKey = "snapshot_missing";
  } else if (input.snapshotAgeDays != null && input.snapshotAgeDays > DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS) {
    status = "update_required";
    explanationKey = "snapshot_too_old";
  } else if (input.dataQuality === "unavailable" || input.dataQuality === "migration_missing" || !assumptionsValid) {
    status = "insufficient_data";
    explanationKey = input.dataQuality === "migration_missing" ? "migration_missing" : "invalid_or_unavailable_data";
  } else if (input.allowCompletion !== false && current != null && target != null && current >= target) {
    status = "completed";
    explanationKey = "target_reached";
  } else if (input.eligiblePaceMonths < 3) {
    status = "calculating";
    explanationKey = "pace_history_insufficient";
  } else if (coverage == null) {
    status = "insufficient_data";
    explanationKey = "projection_unavailable";
  } else if (coverage >= ROUTE_COVERAGE_THRESHOLDS.ahead) {
    status = "ahead";
    explanationKey = "coverage_ahead";
  } else if (coverage >= ROUTE_COVERAGE_THRESHOLDS.onTrack) {
    status = "on_track";
    explanationKey = "coverage_on_track";
  } else if (coverage >= ROUTE_COVERAGE_THRESHOLDS.attention) {
    status = "attention";
    explanationKey = "coverage_attention";
  } else {
    status = "off_track";
    explanationKey = "coverage_off_track";
  }

  return {
    status,
    label: STATUS_LABELS[status],
    coverage,
    projectedValue: projected,
    differenceAmount,
    differencePercent,
    requiredMonthlyContribution: input.requiredMonthlyContribution ?? null,
    estimatedReachDate: input.estimatedReachDate ?? null,
    reachDifferenceMonths,
    dataQuality: input.dataQuality,
    explanationKey,
    explanationValues: {
      contributionPace: input.contributionPace ?? null,
      projectedValue: projected,
      targetValue: target,
      coverage,
      requiredMonthlyContribution: input.requiredMonthlyContribution ?? null,
      snapshotAgeDays: input.snapshotAgeDays,
      eligiblePaceMonths: input.eligiblePaceMonths,
    },
  };
}

function validateRevision(revision: InvestmentPlanRevision, index = 0): InvestmentPlanRevision {
  if (!Number.isInteger(revision.version) || revision.version <= 0) {
    routeError("INVALID_PLAN", "A versão da revisão deve ser um inteiro positivo.", `revisions[${index}].version`);
  }
  parseCivilDate(revision.effectiveFrom, `revisions[${index}].effectiveFrom`);
  parseCivilDate(revision.baselineDate, `revisions[${index}].baselineDate`);
  parseCivilDate(revision.targetDate, `revisions[${index}].targetDate`);
  parseCivilDate(revision.valueReferenceDate, `revisions[${index}].valueReferenceDate`);
  nonNegativeMoney(revision.baselineValue, `revisions[${index}].baselineValue`);
  positiveMoney(revision.targetValue, `revisions[${index}].targetValue`);
  nonNegativeMoney(revision.plannedMonthlyContribution, `revisions[${index}].plannedMonthlyContribution`);
  annualRate(revision.annualReturnConservative, `revisions[${index}].annualReturnConservative`);
  annualRate(revision.annualReturnBase, `revisions[${index}].annualReturnBase`);
  annualRate(revision.annualReturnFavorable, `revisions[${index}].annualReturnFavorable`);
  annualRate(revision.annualInflation, `revisions[${index}].annualInflation`);
  if (revision.annualReturnConservative > revision.annualReturnBase || revision.annualReturnBase > revision.annualReturnFavorable) {
    routeError("INVALID_SCENARIO_ORDER", "As taxas devem respeitar conservadora <= base <= favorável.", `revisions[${index}]`);
  }
  if (normalizeTargetDate(revision.targetDate) <= revision.baselineDate) {
    routeError("INVALID_PLAN", "A data-alvo deve ser posterior à data-base.", `revisions[${index}].targetDate`);
  }
  if (revision.effectiveFrom < revision.baselineDate || revision.effectiveFrom > normalizeTargetDate(revision.targetDate)) {
    routeError(
      "INVALID_PLAN",
      "A vigência da revisão deve ficar entre a data-base e a data-alvo.",
      `revisions[${index}].effectiveFrom`,
    );
  }
  if (revision.valueMode !== "real" && revision.valueMode !== "nominal") {
    routeError("INVALID_PLAN", "O modo de valor deve ser real ou nominal.", `revisions[${index}].valueMode`);
  }
  return revision;
}

function sortedRevisions(revisions: readonly InvestmentPlanRevision[]): InvestmentPlanRevision[] {
  const validated = revisions.map((revision, index) => ({ ...validateRevision(revision, index) }));
  const planIds = new Set(validated.map((revision) => revision.planId));
  if (planIds.size > 1) routeError("INVALID_PLAN", "Todas as revisões devem pertencer ao mesmo plano.", "revisions");
  const versions = new Set<number>();
  for (const revision of validated) {
    if (versions.has(revision.version)) routeError("INVALID_PLAN", "Não pode haver versões de revisão duplicadas.", "revisions");
    versions.add(revision.version);
  }
  return validated.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.version - b.version);
}

export function originalInvestmentPlanRevision(revisions: readonly InvestmentPlanRevision[]): InvestmentPlanRevision | null {
  const sorted = sortedRevisions(revisions);
  return [...sorted].sort((a, b) => a.version - b.version || a.effectiveFrom.localeCompare(b.effectiveFrom))[0] ?? null;
}

export function investmentPlanRevisionAt(revisions: readonly InvestmentPlanRevision[], date: string): InvestmentPlanRevision | null {
  parseCivilDate(date, "date");
  return sortedRevisions(revisions).filter((revision) => revision.effectiveFrom <= date).at(-1) ?? null;
}

function investmentRouteRevisionAt(revisions: readonly InvestmentPlanRevision[], asOfDate: string): InvestmentPlanRevision | null {
  const nextMonthStart = `${addMonthsToKey(monthKeyOf(asOfDate), 1)}-01`;
  return investmentPlanRevisionAt(revisions, nextMonthStart) ?? investmentPlanRevisionAt(revisions, asOfDate);
}

function valueInRevisionMode(value: number, valueDate: string, revision: InvestmentPlanRevision): number {
  if (revision.valueMode === "nominal") return value;
  const months = monthsBetweenDates(revision.valueReferenceDate, valueDate);
  return nominalToRealValue(value, revision.annualInflation, months);
}

function convertValueBetweenRevisions(value: number, valueDate: string, from: InvestmentPlanRevision, to: InvestmentPlanRevision): number {
  const nominal = from.valueMode === "real"
    ? realToNominalValue(value, from.annualInflation, monthsBetweenDates(from.valueReferenceDate, valueDate))
    : value;
  return to.valueMode === "real"
    ? nominalToRealValue(nominal, to.annualInflation, monthsBetweenDates(to.valueReferenceDate, valueDate))
    : nominal;
}

function currentValueInRevisionMode(input: {
  quality: InvestmentDataQuality;
  contributions: readonly InvestmentRouteContribution[];
  withdrawals: readonly InvestmentRouteWithdrawal[];
  asOfDate: string;
  revision: InvestmentPlanRevision;
}): { observed: number; estimated: number } | null {
  const snapshot = input.quality.latestSnapshot;
  if (!snapshot || input.quality.observedValue == null) return null;
  const observed = valueInRevisionMode(input.quality.observedValue, snapshot.date, input.revision);
  const contributions = validatedDeduplicatedContributions(input.contributions)
    .filter((item) => item.date > snapshot.date && item.date <= input.asOfDate)
    .reduce((total, item) => calculated(total + valueInRevisionMode(item.amount, item.date, input.revision), "comparableContributions"), 0);
  const withdrawals = validatedDeduplicatedWithdrawals(input.withdrawals)
    .filter((item) => item.date > snapshot.date && item.date <= input.asOfDate)
    .reduce((total, item) => calculated(total + valueInRevisionMode(item.amount, item.date, input.revision), "comparableWithdrawals"), 0);
  return {
    observed,
    estimated: calculated(observed + contributions - withdrawals, "comparableEstimatedCurrentValue"),
  };
}

function revisionForMonth(revisions: readonly InvestmentPlanRevision[], month: string): InvestmentPlanRevision | null {
  // O compromisso mensal é definido no primeiro dia do mês. Revisões que
  // entram em vigor depois disso passam a valer para projeções imediatamente,
  // mas não reescrevem retroativamente a meta mensal já iniciada.
  return investmentPlanRevisionAt(revisions, `${assertMonthKey(month)}-01`);
}

function plannedContributionForMonth(revisions: readonly InvestmentPlanRevision[], month: string): { planned: number; version: number } | null {
  const revision = revisionForMonth(revisions, month);
  if (!revision) return null;
  if (month > monthKeyOf(revision.targetDate)) return null;
  return { planned: revision.plannedMonthlyContribution, version: revision.version };
}

export function computeMonthlyAdherence(input: ComputeMonthlyAdherenceInput): MonthlyAdherenceResult {
  parseCivilDate(input.asOfDate, "asOfDate");
  const revisions = sortedRevisions(input.revisions);
  const contributions = validatedDeduplicatedContributions(input.contributions);
  const currentMonth = monthKeyOf(input.asOfDate);
  if (!revisions.length && !input.fromMonth && !input.toMonth) {
    return { months: [], volumeAdherence: null, consistency: null, eligibleMonthCount: 0, plannedTotal: 0, contributedTotal: 0 };
  }
  const firstRevision = originalInvestmentPlanRevision(revisions);
  const fromMonth = input.fromMonth ? assertMonthKey(input.fromMonth, "fromMonth") : monthKeyOf(firstRevision?.effectiveFrom ?? input.asOfDate);
  let toMonth = input.toMonth ? assertMonthKey(input.toMonth, "toMonth") : currentMonth;
  if (toMonth > currentMonth) toMonth = currentMonth;
  if (fromMonth > toMonth) {
    return { months: [], volumeAdherence: null, consistency: null, eligibleMonthCount: 0, plannedTotal: 0, contributedTotal: 0 };
  }
  const count = monthsBetweenDates(`${fromMonth}-01`, `${toMonth}-01`) + 1;
  if (count > MAX_REACH_MONTHS) routeError("INVALID_HORIZON", "O intervalo de aderência é muito longo.", "fromMonth");
  const contributionTotals = new Map<string, number>();
  for (const item of contributions) {
    const month = monthKeyOf(item.date);
    if (month < fromMonth || month > toMonth || item.date > input.asOfDate) continue;
    const revision = revisionForMonth(revisions, month);
    const comparableAmount = revision ? valueInRevisionMode(item.amount, item.date, revision) : item.amount;
    contributionTotals.set(month, calculated((contributionTotals.get(month) ?? 0) + comparableAmount, "monthlyContribution"));
  }
  const months: MonthlyAdherencePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const month = addMonthsToKey(fromMonth, index);
    const target = plannedContributionForMonth(revisions, month);
    const planned = target?.planned ?? null;
    const contributed = contributionTotals.get(month) ?? 0;
    const ratio = planned == null || planned === 0 ? null : calculated(contributed / planned, "monthlyAdherence");
    const isCurrentMonth = month === currentMonth;
    const status: MonthlyAdherenceStatus = planned == null || planned === 0
      ? "no_target"
      : isCurrentMonth
        ? "in_progress"
        : ratio != null && ratio >= 1
          ? "met"
          : ratio != null && ratio >= 0.8
            ? "almost"
            : "below";
    months.push({
      month,
      planned,
      contributed,
      ratio,
      remaining: planned == null ? 0 : Math.max(0, planned - contributed),
      excess: planned == null ? 0 : Math.max(0, contributed - planned),
      status,
      revisionVersion: target?.version ?? null,
      isCurrentMonth,
    });
  }
  const eligible = months.filter((item) => !item.isCurrentMonth && item.planned != null && item.planned > 0);
  const plannedTotal = eligible.reduce((sum, item) => calculated(sum + (item.planned ?? 0), "plannedTotal"), 0);
  const contributedTotal = eligible.reduce((sum, item) => calculated(sum + item.contributed, "contributedTotal"), 0);
  const threshold = input.consistencyThreshold ?? CONTRIBUTION_CONSISTENCY_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 0) routeError("INVALID_NUMBER", "consistencyThreshold deve ser não negativo.", "consistencyThreshold");
  return {
    months,
    volumeAdherence: plannedTotal > 0 ? calculated(contributedTotal / plannedTotal, "volumeAdherence") : null,
    consistency: eligible.length
      ? eligible.filter((item) => (item.ratio ?? 0) >= threshold).length / eligible.length
      : null,
    eligibleMonthCount: eligible.length,
    plannedTotal,
    contributedTotal,
  };
}

function validateSnapshotPeriod(input: SnapshotPeriodInput): {
  contributions: InvestmentRouteContribution[];
  withdrawals: InvestmentRouteWithdrawal[];
  totalDays: number;
} {
  parseCivilDate(input.initialSnapshot.date, "initialSnapshot.date");
  parseCivilDate(input.finalSnapshot.date, "finalSnapshot.date");
  nonNegativeMoney(input.initialSnapshot.totalValue, "initialSnapshot.totalValue");
  nonNegativeMoney(input.finalSnapshot.totalValue, "finalSnapshot.totalValue");
  const totalDays = daysBetweenDates(input.initialSnapshot.date, input.finalSnapshot.date);
  if (totalDays <= 0) routeError("INVALID_HORIZON", "O snapshot final deve ser posterior ao inicial.", "finalSnapshot.date");
  const contributions = validatedDeduplicatedContributions(input.contributions)
    .filter((item) => item.date > input.initialSnapshot.date && item.date <= input.finalSnapshot.date);
  const withdrawals = validatedDeduplicatedWithdrawals(input.withdrawals)
    .filter((item) => item.date > input.initialSnapshot.date && item.date <= input.finalSnapshot.date);
  return { contributions, withdrawals, totalDays };
}

export function decomposeSnapshotPeriod(input: SnapshotPeriodInput): SnapshotPeriodBreakdown {
  const period = validateSnapshotPeriod(input);
  const contributions = period.contributions.reduce((sum, item) => calculated(sum + item.amount, "periodContributions"), 0);
  const withdrawals = period.withdrawals.reduce((sum, item) => calculated(sum + item.amount, "periodWithdrawals"), 0);
  const totalVariation = calculated(input.finalSnapshot.totalValue - input.initialSnapshot.totalValue, "totalVariation");
  const residualResult = calculated(
    input.finalSnapshot.totalValue - input.initialSnapshot.totalValue - contributions + withdrawals,
    "residualResult",
  );
  return {
    startDate: input.initialSnapshot.date,
    endDate: input.finalSnapshot.date,
    initialValue: input.initialSnapshot.totalValue,
    finalValue: input.finalSnapshot.totalValue,
    contributions,
    withdrawals,
    residualResult,
    totalVariation,
  };
}

export function modifiedDietzReturn(input: SnapshotPeriodInput): number | null {
  const period = validateSnapshotPeriod(input);
  let weightedCashFlows = 0;
  let netCashFlows = 0;
  for (const contribution of period.contributions) {
    const weight = daysBetweenDates(contribution.date, input.finalSnapshot.date) / period.totalDays;
    netCashFlows = calculated(netCashFlows + contribution.amount, "netCashFlows");
    weightedCashFlows = calculated(weightedCashFlows + weight * contribution.amount, "weightedCashFlows");
  }
  for (const withdrawal of period.withdrawals) {
    const signedAmount = -withdrawal.amount;
    const weight = daysBetweenDates(withdrawal.date, input.finalSnapshot.date) / period.totalDays;
    netCashFlows = calculated(netCashFlows + signedAmount, "netCashFlows");
    weightedCashFlows = calculated(weightedCashFlows + weight * signedAmount, "weightedCashFlows");
  }
  const denominator = calculated(input.initialSnapshot.totalValue + weightedCashFlows, "modifiedDietzDenominator");
  if (denominator <= 0) return null;
  const numerator = calculated(
    input.finalSnapshot.totalValue - input.initialSnapshot.totalValue - netCashFlows,
    "modifiedDietzNumerator",
  );
  return calculated(numerator / denominator, "modifiedDietzReturn");
}

function projectionValues(projection: PortfolioProjection): TrajectoryValuePoint[] {
  return projection.points.map((point) => ({ date: point.date, value: point.balance }));
}

function projectionForRevision(revision: InvestmentPlanRevision): PortfolioProjection {
  return projectPortfolio({
    initialBalance: revision.baselineValue,
    annualRate: revision.annualReturnBase,
    startDate: revision.baselineDate,
    targetDate: normalizeTargetDate(revision.targetDate),
    monthlyContribution: revision.plannedMonthlyContribution,
    targetValue: revision.targetValue,
  });
}

function pauseMonthKeys(pause: InvestmentScenarioDraft["pauseMonths"], anchorDate: string): string[] {
  if (pause == null) return [];
  if (typeof pause !== "number") return pause.map((month, index) => assertMonthKey(month, `pauseMonths[${index}]`));
  if (!Number.isInteger(pause) || pause < 0 || pause > MAX_REACH_MONTHS) {
    routeError("INVALID_HORIZON", "pauseMonths deve ser uma contagem inteira não negativa.", "pauseMonths");
  }
  const anchorMonth = monthKeyOf(anchorDate);
  return Array.from({ length: pause }, (_, index) => addMonthsToKey(anchorMonth, index + 1));
}

export function simulateInvestmentScenario(input: {
  revision: InvestmentPlanRevision;
  anchorDate: string;
  anchorValue: number;
  draft: InvestmentScenarioDraft;
}): ScenarioProjection {
  const revision = validateRevision(input.revision);
  parseCivilDate(input.anchorDate, "anchorDate");
  nonNegativeMoney(input.anchorValue, "anchorValue");
  const targetDate = normalizeTargetDate(input.draft.targetDate ?? revision.targetDate);
  if (targetDate < input.anchorDate) {
    routeError("INVALID_HORIZON", "A data-alvo da simulação não pode estar no passado.", "targetDate");
  }
  const targetValue = positiveMoney(input.draft.targetValue ?? revision.targetValue, "targetValue");
  const annualRateValue = input.draft.annualRate ?? revision.annualReturnBase;
  annualRate(annualRateValue, "annualRate");
  const monthlyContribution = input.draft.monthlyContribution ?? revision.plannedMonthlyContribution;
  nonNegativeMoney(monthlyContribution, "monthlyContribution");
  const cashFlows: ProjectionCashFlow[] = [];
  if (input.draft.oneTimeContribution) {
    parseCivilDate(input.draft.oneTimeContribution.date, "oneTimeContribution.date");
    positiveMoney(input.draft.oneTimeContribution.amount, "oneTimeContribution.amount");
    if (input.draft.oneTimeContribution.date <= input.anchorDate) {
      routeError("INVALID_FLOW", "O aporte extra deve ocorrer após a data âncora.", "oneTimeContribution.date");
    }
    if (input.draft.oneTimeContribution.date > targetDate) {
      routeError("INVALID_FLOW", "O aporte extra não pode ocorrer após a data-alvo.", "oneTimeContribution.date");
    }
    cashFlows.push({ ...input.draft.oneTimeContribution, type: "contribution" });
  }
  if (input.draft.futureWithdrawal) {
    parseCivilDate(input.draft.futureWithdrawal.date, "futureWithdrawal.date");
    positiveMoney(input.draft.futureWithdrawal.amount, "futureWithdrawal.amount");
    if (input.draft.futureWithdrawal.date <= input.anchorDate) {
      routeError("INVALID_FLOW", "A retirada futura deve ocorrer após a data âncora.", "futureWithdrawal.date");
    }
    if (input.draft.futureWithdrawal.date > targetDate) {
      routeError("INVALID_FLOW", "A retirada futura não pode ocorrer após a data-alvo.", "futureWithdrawal.date");
    }
    cashFlows.push({ ...input.draft.futureWithdrawal, type: "withdrawal" });
  }
  const horizon = Math.max(0, monthsBetweenDates(input.anchorDate, targetDate));
  const projection = projectPortfolio({
    initialBalance: input.anchorValue,
    annualRate: annualRateValue,
    startDate: input.anchorDate,
    months: horizon,
    monthlyContribution,
    cashFlows,
    pausedMonths: pauseMonthKeys(input.draft.pauseMonths, input.anchorDate),
    targetValue,
  });
  return {
    projection,
    projectedValue: projection.finalBalance,
    targetValue,
    differenceToTarget: calculated(projection.finalBalance - targetValue, "differenceToTarget"),
    reachedAt: projection.reachedAt,
    unreachable: projection.unreachable,
  };
}

function mergeTrajectorySeries(input: {
  historical: TrajectoryValuePoint[];
  originalPlan: TrajectoryValuePoint[];
  currentPlan: TrajectoryValuePoint[];
  currentRoute: TrajectoryValuePoint[];
  range: TrajectoryRangePoint[];
  simulation: TrajectoryValuePoint[] | null;
  includeOriginalPlan: boolean;
}): TrajectoryPoint[] {
  const map = new Map<string, TrajectoryPoint>();
  const point = (date: string): TrajectoryPoint => {
    const existing = map.get(date);
    if (existing) return existing;
    const created: TrajectoryPoint = {
      date, actual: null, originalPlan: null, currentPlan: null, routeBase: null,
      routeConservative: null, routeFavorable: null, simulation: null,
    };
    map.set(date, created);
    return created;
  };
  input.historical.forEach((item) => { point(item.date).actual = item.value; });
  if (input.includeOriginalPlan) input.originalPlan.forEach((item) => { point(item.date).originalPlan = item.value; });
  input.currentPlan.forEach((item) => { point(item.date).currentPlan = item.value; });
  input.currentRoute.forEach((item) => { point(item.date).routeBase = item.value; });
  input.range.forEach((item) => {
    const current = point(item.date);
    current.routeConservative = item.conservative;
    current.routeBase = item.base;
    current.routeFavorable = item.favorable;
  });
  input.simulation?.forEach((item) => { point(item.date).simulation = item.value; });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildTrajectorySeries(input: BuildTrajectorySeriesInput): InvestmentTrajectorySeries {
  parseCivilDate(input.asOfDate, "asOfDate");
  const revisions = sortedRevisions(input.revisions);
  const originalRevision = originalInvestmentPlanRevision(revisions);
  const currentRevision = investmentRouteRevisionAt(revisions, input.asOfDate);
  const quality = assessInvestmentDataQuality({
    snapshots: input.snapshots,
    contributions: input.contributions,
    withdrawals: input.withdrawals,
    asOfDate: input.asOfDate,
    queryState: input.queryState,
  });
  const historical = [...input.snapshots]
    .filter((snapshot) => snapshot.date <= input.asOfDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((snapshot) => ({
      date: snapshot.date,
      value: currentRevision ? valueInRevisionMode(snapshot.totalValue, snapshot.date, currentRevision) : snapshot.totalValue,
    }));
  let originalPlan = originalRevision ? projectionValues(projectionForRevision(originalRevision)) : [];
  // O plano vigente é uma referência independente do patrimônio observado:
  // nasce no baseline salvo da revisão. A rota comportamental, abaixo, é que
  // parte do check-in atual para tornar o desvio visível.
  const currentPlan: TrajectoryValuePoint[] = currentRevision
    ? projectionValues(projectionForRevision(currentRevision))
    : [];
  let currentRoute: TrajectoryValuePoint[] = [];
  let range: TrajectoryRangePoint[] = [];
  let simulation: TrajectoryValuePoint[] | null = null;
  let contributionSource: InvestmentTrajectorySeries["contributionSource"] = null;

  const comparableCurrentValue = currentRevision
    ? currentValueInRevisionMode({ quality, contributions: input.contributions ?? [], withdrawals: input.withdrawals ?? [], asOfDate: input.asOfDate, revision: currentRevision })
    : null;
  if (currentRevision && quality.canProject && comparableCurrentValue && comparableCurrentValue.estimated >= 0) {
    const anchorValue = comparableCurrentValue.estimated;
    const pace = input.currentMonthlyContribution == null
      ? deriveCurrentContributionPace({
          contributions: (input.contributions ?? []).map((item) => ({
            ...item,
            amount: valueInRevisionMode(item.amount, item.date, currentRevision),
          })),
          asOfDate: input.asOfDate,
          planStartDate: originalRevision?.effectiveFrom ?? currentRevision.effectiveFrom,
        })
      : null;
    const inferredObservedContribution = pace?.hasSufficientHistory ? pace.monthlyAverage : null;
    const routeContribution = input.currentMonthlyContribution ?? inferredObservedContribution ?? currentRevision.plannedMonthlyContribution;
    nonNegativeMoney(routeContribution, "currentMonthlyContribution");
    contributionSource = input.currentMonthlyContribution != null || pace?.hasSufficientHistory ? "observed" : "planned_provisional";
    const horizon = Math.max(0, monthsBetweenDates(input.asOfDate, normalizeTargetDate(currentRevision.targetDate)));
    const baseInput = {
      initialBalance: anchorValue,
      startDate: input.asOfDate,
      months: horizon,
      targetValue: currentRevision.targetValue,
    };
    const conservativeProjection = projectPortfolio({
      ...baseInput,
      annualRate: currentRevision.annualReturnConservative,
      monthlyContribution: routeContribution,
    });
    const baseProjection = projectPortfolio({
      ...baseInput,
      annualRate: currentRevision.annualReturnBase,
      monthlyContribution: routeContribution,
    });
    const favorableProjection = projectPortfolio({
      ...baseInput,
      annualRate: currentRevision.annualReturnFavorable,
      monthlyContribution: routeContribution,
    });
    currentRoute = projectionValues(baseProjection);
    range = baseProjection.points.map((point, index) => ({
      date: point.date,
      conservative: conservativeProjection.points[index].balance,
      base: point.balance,
      favorable: favorableProjection.points[index].balance,
    }));
    if (input.simulation) {
      const simulated = simulateInvestmentScenario({ revision: currentRevision, anchorDate: input.asOfDate, anchorValue, draft: input.simulation });
      simulation = projectionValues(simulated.projection);
    }
  }

  const valueMode = currentRevision?.valueMode ?? null;
  const originalPlanValueMode = originalRevision?.valueMode ?? null;
  const sharesOriginalPlanAxis = !valueMode || !originalPlanValueMode || (
    valueMode === originalPlanValueMode
    && (valueMode === "nominal" || currentRevision?.valueReferenceDate === originalRevision?.valueReferenceDate)
  );
  const originalPlanConverted = Boolean(!sharesOriginalPlanAxis && originalRevision && currentRevision);
  if (originalPlanConverted && originalRevision && currentRevision) {
    originalPlan = originalPlan.map((point) => ({
      date: point.date,
      value: convertValueBetweenRevisions(point.value, point.date, originalRevision, currentRevision),
    }));
  }
  const isOriginalPlanComparable = sharesOriginalPlanAxis || originalPlanConverted;
  const points = mergeTrajectorySeries({ historical, originalPlan, currentPlan, currentRoute, range, simulation, includeOriginalPlan: isOriginalPlanComparable });
  return {
    historical,
    originalPlan,
    currentPlan,
    currentRoute,
    range,
    simulation,
    points,
    contributionSource,
    valueMode,
    originalPlanValueMode,
    isOriginalPlanComparable,
    originalPlanConverted,
  };
}

function estimateReach(input: {
  initialBalance: number;
  annualRate: number;
  startDate: string;
  monthlyContribution: number;
  targetValue: number;
}): { date: string | null; unreachable: boolean } {
  const projection = projectPortfolio({ ...input, months: MAX_REACH_MONTHS });
  return { date: projection.reachedAt, unreachable: projection.unreachable };
}

export function buildInvestmentRouteDashboard(input: BuildInvestmentRouteDashboardInput): InvestmentRouteDashboard {
  parseCivilDate(input.asOfDate, "asOfDate");
  const revisions = sortedRevisions(input.revisions);
  const originalRevision = originalInvestmentPlanRevision(revisions);
  const currentRevision = investmentPlanRevisionAt(revisions, input.asOfDate);
  const routeRevision = investmentRouteRevisionAt(revisions, input.asOfDate);
  const quality = assessInvestmentDataQuality({
    snapshots: input.snapshots,
    contributions: input.contributions,
    withdrawals: input.withdrawals,
    asOfDate: input.asOfDate,
    queryState: input.queryState,
  });
  const paceContributions = routeRevision
    ? input.contributions.map((item) => ({ ...item, amount: valueInRevisionMode(item.amount, item.date, routeRevision) }))
    : input.contributions;
  const pace = deriveCurrentContributionPace({
    contributions: paceContributions,
    asOfDate: input.asOfDate,
    planStartDate: originalRevision?.effectiveFrom ?? routeRevision?.effectiveFrom,
  });
  const trajectory = buildTrajectorySeries({
    revisions,
    snapshots: input.snapshots,
    contributions: input.contributions,
    withdrawals: input.withdrawals,
    asOfDate: input.asOfDate,
    currentMonthlyContribution: pace.hasSufficientHistory ? pace.monthlyAverage : null,
    queryState: input.queryState,
  });
  const rawObserved = quality.observedValue;
  const rawEstimated = quality.estimatedCurrentValue;
  const comparableCurrentValue = routeRevision
    ? currentValueInRevisionMode({ quality, contributions: input.contributions, withdrawals: input.withdrawals, asOfDate: input.asOfDate, revision: routeRevision })
    : null;
  const currentValue = routeRevision && quality.latestSnapshot && comparableCurrentValue && comparableCurrentValue.estimated >= 0
    ? {
        observed: comparableCurrentValue.observed,
        estimated: comparableCurrentValue.estimated,
        isEstimated: quality.hasPostSnapshotFlows,
        date: quality.latestSnapshot.date,
        valueMode: routeRevision.valueMode,
      }
    : quality.latestSnapshot && rawObserved != null && rawEstimated != null && rawEstimated >= 0
      ? { observed: rawObserved, estimated: rawEstimated, isEstimated: quality.hasPostSnapshotFlows, date: quality.latestSnapshot.date, valueMode: "nominal" as const }
      : null;

  let requiredContribution: number | null = null;
  let conservative: number | null = null;
  let base: number | null = null;
  let favorable: number | null = null;
  let followingPlan: number | null = null;
  let estimatedReachDate: string | null = null;
  if (routeRevision && currentValue && quality.canProject) {
    const horizon = Math.max(0, monthsBetweenDates(input.asOfDate, normalizeTargetDate(routeRevision.targetDate)));
    requiredContribution = requiredMonthlyContribution({
      initialBalance: currentValue.estimated,
      targetValue: routeRevision.targetValue,
      annualRate: routeRevision.annualReturnBase,
      startDate: input.asOfDate,
      months: horizon,
    });
    const routeContribution = pace.hasSufficientHistory && pace.monthlyAverage != null
      ? pace.monthlyAverage
      : routeRevision.plannedMonthlyContribution;
    const projectionInput = {
      initialBalance: currentValue.estimated,
      startDate: input.asOfDate,
      months: horizon,
      monthlyContribution: routeContribution,
      targetValue: routeRevision.targetValue,
    };
    conservative = projectPortfolio({ ...projectionInput, annualRate: routeRevision.annualReturnConservative }).finalBalance;
    base = projectPortfolio({ ...projectionInput, annualRate: routeRevision.annualReturnBase }).finalBalance;
    favorable = projectPortfolio({ ...projectionInput, annualRate: routeRevision.annualReturnFavorable }).finalBalance;
    followingPlan = projectPortfolio({
      ...projectionInput,
      monthlyContribution: routeRevision.plannedMonthlyContribution,
      annualRate: routeRevision.annualReturnBase,
    }).finalBalance;
    estimatedReachDate = estimateReach({
      initialBalance: currentValue.estimated,
      annualRate: routeRevision.annualReturnBase,
      startDate: input.asOfDate,
      monthlyContribution: routeContribution,
      targetValue: routeRevision.targetValue,
    }).date;
  }
  const status = computeRouteStatus({
    hasPlan: Boolean(input.plan && routeRevision),
    hasSnapshot: Boolean(quality.latestSnapshot),
    dataQuality: quality.level,
    snapshotAgeDays: quality.snapshotAgeDays,
    assumptionsValid: Boolean(routeRevision),
    currentValue: currentValue?.estimated ?? null,
    targetValue: routeRevision?.targetValue ?? null,
    projectedValue: base,
    eligiblePaceMonths: pace.eligibleMonthCount,
    contributionPace: pace.monthlyAverage,
    requiredMonthlyContribution: requiredContribution,
    targetDate: routeRevision?.targetDate,
    estimatedReachDate,
    allowCompletion: Boolean(currentRevision && routeRevision && currentRevision.id === routeRevision.id),
  });
  const adherenceWindow = input.adherenceMonths ?? 12;
  if (!Number.isInteger(adherenceWindow) || adherenceWindow <= 0 || adherenceWindow > MAX_REACH_MONTHS) {
    routeError("INVALID_HORIZON", "adherenceMonths deve ser um inteiro positivo.", "adherenceMonths");
  }
  const currentMonth = monthKeyOf(input.asOfDate);
  const adherence = computeMonthlyAdherence({
    contributions: input.contributions,
    revisions,
    asOfDate: input.asOfDate,
    fromMonth: addMonthsToKey(currentMonth, -(adherenceWindow - 1)),
    toMonth: currentMonth,
  });
  const orderedSnapshots = [...input.snapshots].filter((item) => item.date <= input.asOfDate).sort((a, b) => a.date.localeCompare(b.date));
  const latestPair = orderedSnapshots.length >= 2 ? orderedSnapshots.slice(-2) : null;
  const latestBreakdown = latestPair ? decomposeSnapshotPeriod({
    initialSnapshot: latestPair[0],
    finalSnapshot: latestPair[1],
    contributions: input.contributions,
    withdrawals: input.withdrawals,
  }) : null;
  const dietz = latestPair ? modifiedDietzReturn({
    initialSnapshot: latestPair[0],
    finalSnapshot: latestPair[1],
    contributions: input.contributions,
    withdrawals: input.withdrawals,
  }) : null;
  return {
    plan: input.plan ? { ...input.plan } : null,
    originalRevision,
    currentRevision,
    routeRevision,
    dataQuality: quality,
    pace,
    currentValue,
    trajectory,
    status,
    requiredMonthlyContribution: requiredContribution,
    adherence,
    latestBreakdown,
    modifiedDietzReturn: dietz,
    projections: { conservative, base, favorable, followingPlan },
  };
}
