import { ContributionPace, InvestmentDataQuality, InvestmentDataQualityLevel, InvestmentPlan, InvestmentPlanRevision, InvestmentRouteContribution, InvestmentRouteSnapshot, InvestmentRouteWithdrawal, InvestmentValueMode, PortfolioProjection } from "./types-core";

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
