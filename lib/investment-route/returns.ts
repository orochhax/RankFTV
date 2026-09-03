import { InvestmentRouteContribution, InvestmentRouteWithdrawal } from "./types-core";
import { SnapshotPeriodBreakdown, SnapshotPeriodInput } from "./types-dashboard";
import { calculated, daysBetweenDates, nonNegativeMoney, parseCivilDate, routeError } from "./core";
import { validatedDeduplicatedContributions, validatedDeduplicatedWithdrawals } from "./quality";

export function validateSnapshotPeriod(input: SnapshotPeriodInput): {
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
