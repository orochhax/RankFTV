import { CURRENT_SNAPSHOT_MAX_AGE_DAYS, ContributionPace, ContributionPaceMonth, DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS, DeriveContributionPaceInput, InvestmentDataQuality, InvestmentDataQualityLevel, InvestmentRouteContribution, InvestmentRouteWithdrawal, MAX_REACH_MONTHS, ROUTE_COVERAGE_THRESHOLDS } from "./types-core";
import { AssessInvestmentDataQualityInput, ComputeRouteStatusInput, RouteStatusCode, RouteStatusResult } from "./types-dashboard";
import { addMonthsToKey, calculated, daysBetweenDates, monthKeyOf, monthsBetweenDates, nonNegativeMoney, normalizeTargetDate, parseCivilDate, routeError } from "./core";

export function contributionDeduplicationKey(item: InvestmentRouteContribution, index: number): string {
  if (item.sourceEntryId) return `source:${item.sourceEntryId}`;
  if (item.id) return `id:${item.id}`;
  return `row:${index}`;
}

export function validatedDeduplicatedContributions(items: readonly InvestmentRouteContribution[]): InvestmentRouteContribution[] {
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

export function validatedDeduplicatedWithdrawals(items: readonly InvestmentRouteWithdrawal[]): InvestmentRouteWithdrawal[] {
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

export const STATUS_LABELS: Record<RouteStatusCode, string> = {
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
