import { InvestmentPlanRevision, MAX_REACH_MONTHS, PortfolioProjection, ProjectionCashFlow } from "./types-core";
import { InvestmentScenarioDraft, ScenarioProjection, TrajectoryValuePoint } from "./types-dashboard";
import { addMonthsToKey, annualRate, assertMonthKey, calculated, monthKeyOf, monthsBetweenDates, nonNegativeMoney, normalizeTargetDate, parseCivilDate, positiveMoney, routeError } from "./core";
import { projectPortfolio } from "./projection";
import { validateRevision } from "./revisions";

export function projectionValues(projection: PortfolioProjection): TrajectoryValuePoint[] {
  return projection.points.map((point) => ({ date: point.date, value: point.balance }));
}

export function projectionForRevision(revision: InvestmentPlanRevision): PortfolioProjection {
  return projectPortfolio({
    initialBalance: revision.baselineValue,
    annualRate: revision.annualReturnBase,
    startDate: revision.baselineDate,
    targetDate: normalizeTargetDate(revision.targetDate),
    monthlyContribution: revision.plannedMonthlyContribution,
    targetValue: revision.targetValue,
  });
}

export function pauseMonthKeys(pause: InvestmentScenarioDraft["pauseMonths"], anchorDate: string): string[] {
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
