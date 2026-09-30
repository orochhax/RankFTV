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
