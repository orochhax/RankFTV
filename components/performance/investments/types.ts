import type { InvestmentContribution } from "@/lib/performance-widgets";
import type { PortfolioSnapshot } from "@/lib/performance-life-os";

export type InvestmentWithdrawalRow = {
  id: string;
  date: string;
  amount: number;
  institution: string | null;
  notes: string | null;
};

export type RouteStatusKey =
  | "completed"
  | "ahead"
  | "on_track"
  | "attention"
  | "off_track"
  | "calculating"
  | "update_required"
  | "insufficient_data";

export type RouteQualityKey = "current" | "stale" | "estimated" | "insufficient";

export type RouteProjectionPoint = {
  date: string;
  label: string;
  actual?: number | null;
  estimated?: number | null;
  originalPlan?: number | null;
  currentPlan?: number | null;
  currentRoute?: number | null;
  conservative?: number | null;
  favorable?: number | null;
  simulation?: number | null;
};

export type RouteHeroModel = {
  status: RouteStatusKey;
  quality: RouteQualityKey;
  title: string;
  targetValue: number;
  targetDate: string;
  currentValue: number | null;
  currentIsEstimated: boolean;
  progressPercent: number | null;
  projectedBase: number | null;
  projectedLow: number | null;
  projectedHigh: number | null;
  requiredMonthlyContribution: number | null;
  planDifference: number | null;
  explanation: string;
  valueModeLabel: string;
  referenceDate: string;
  realConversionApproximate: boolean;
  scheduledEffectiveFrom: string | null;
};

export type MonthlyActionModel = {
  monthLabel: string;
  planned: number | null;
  contributed: number;
  remaining: number;
  excess: number;
  progressPercent: number | null;
  impact: number | null;
  message: string;
};

export type FutureModel = {
  title: string;
  description: string;
  monthlyContribution: number | null;
  projectedValue: number | null;
  targetDifference: number | null;
  reachDate: string | null;
  monthDifference: number | null;
  qualityLabel: string;
};

export type RouteBreakdownModel = {
  from: string;
  to: string;
  initialValue: number;
  finalValue: number;
  contributions: number;
  withdrawals: number;
  residual: number;
  totalChange: number;
  modifiedDietzReturn: number | null;
  valueModeNote: string;
  planChange: string | null;
};

export type LogbookEntry = {
  id: string;
  date: string;
  kind: "checkin" | "contribution" | "withdrawal" | "plan";
  title: string;
  summary: string;
  details?: string | null;
};

export type ScenarioDraft = {
  monthlyContribution: number;
  oneTimeContribution: number;
  oneTimeContributionDate: string;
  pauseMonths: number;
  futureWithdrawal: number;
  futureWithdrawalDate: string;
  targetDate: string;
  targetValue: number;
  annualReturn: number;
};

export type ScenarioResultModel = {
  projectedValue: number | null;
  baseProjectedValue: number | null;
  deltaValue: number | null;
  reachDate: string | null;
  monthDifference: number | null;
  contributionDelta: number | null;
  targetDateDeltaMonths: number | null;
  error?: string | null;
};

export type MovementData = {
  contributions: InvestmentContribution[];
  withdrawals: InvestmentWithdrawalRow[];
  snapshots: PortfolioSnapshot[];
};
