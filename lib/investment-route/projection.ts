import { InvestmentRouteError, MAX_REACH_MONTHS, PortfolioProjection, ProjectPortfolioInput, ProjectionCashFlow, ProjectionPoint, RequiredMonthlyContributionInput } from "./types-core";
import { addMonthsToKey, annualRate, annualToMonthlyRate, applyFlowsToBalance, assertMonthKey, calculated, endOfMonthFromKey, monthKeyOf, nonNegativeMoney, positiveMoney, resolveProjectionMonths, routeError, validateCashFlows } from "./core";

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
