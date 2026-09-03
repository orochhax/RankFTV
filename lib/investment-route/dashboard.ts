import { MAX_REACH_MONTHS } from "./types-core";
import { BuildInvestmentRouteDashboardInput, BuildTrajectorySeriesInput, InvestmentRouteDashboard, InvestmentTrajectorySeries, TrajectoryPoint, TrajectoryRangePoint, TrajectoryValuePoint } from "./types-dashboard";
import { addMonthsToKey, monthKeyOf, monthsBetweenDates, nonNegativeMoney, normalizeTargetDate, parseCivilDate, routeError } from "./core";
import { projectPortfolio, requiredMonthlyContribution } from "./projection";
import { assessInvestmentDataQuality, computeRouteStatus, deriveCurrentContributionPace } from "./quality";
import { computeMonthlyAdherence, convertValueBetweenRevisions, currentValueInRevisionMode, investmentPlanRevisionAt, investmentRouteRevisionAt, originalInvestmentPlanRevision, sortedRevisions, valueInRevisionMode } from "./revisions";
import { decomposeSnapshotPeriod, modifiedDietzReturn } from "./returns";
import { projectionForRevision, projectionValues, simulateInvestmentScenario } from "./scenarios";

export function mergeTrajectorySeries(input: {
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

export function estimateReach(input: {
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
