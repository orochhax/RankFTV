import { CONTRIBUTION_CONSISTENCY_THRESHOLD, InvestmentDataQuality, InvestmentPlanRevision, InvestmentRouteContribution, InvestmentRouteWithdrawal, MAX_REACH_MONTHS } from "./types-core";
import { ComputeMonthlyAdherenceInput, MonthlyAdherencePoint, MonthlyAdherenceResult, MonthlyAdherenceStatus } from "./types-dashboard";
import { addMonthsToKey, annualRate, assertMonthKey, calculated, monthKeyOf, monthsBetweenDates, nominalToRealValue, nonNegativeMoney, normalizeTargetDate, parseCivilDate, positiveMoney, realToNominalValue, routeError } from "./core";
import { validatedDeduplicatedContributions, validatedDeduplicatedWithdrawals } from "./quality";

export function validateRevision(revision: InvestmentPlanRevision, index = 0): InvestmentPlanRevision {
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

export function sortedRevisions(revisions: readonly InvestmentPlanRevision[]): InvestmentPlanRevision[] {
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

export function investmentRouteRevisionAt(revisions: readonly InvestmentPlanRevision[], asOfDate: string): InvestmentPlanRevision | null {
  const nextMonthStart = `${addMonthsToKey(monthKeyOf(asOfDate), 1)}-01`;
  return investmentPlanRevisionAt(revisions, nextMonthStart) ?? investmentPlanRevisionAt(revisions, asOfDate);
}

export function valueInRevisionMode(value: number, valueDate: string, revision: InvestmentPlanRevision): number {
  if (revision.valueMode === "nominal") return value;
  const months = monthsBetweenDates(revision.valueReferenceDate, valueDate);
  return nominalToRealValue(value, revision.annualInflation, months);
}

export function convertValueBetweenRevisions(value: number, valueDate: string, from: InvestmentPlanRevision, to: InvestmentPlanRevision): number {
  const nominal = from.valueMode === "real"
    ? realToNominalValue(value, from.annualInflation, monthsBetweenDates(from.valueReferenceDate, valueDate))
    : value;
  return to.valueMode === "real"
    ? nominalToRealValue(nominal, to.annualInflation, monthsBetweenDates(to.valueReferenceDate, valueDate))
    : nominal;
}

export function currentValueInRevisionMode(input: {
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

export function revisionForMonth(revisions: readonly InvestmentPlanRevision[], month: string): InvestmentPlanRevision | null {
  // O compromisso mensal é definido no primeiro dia do mês. Revisões que
  // entram em vigor depois disso passam a valer para projeções imediatamente,
  // mas não reescrevem retroativamente a meta mensal já iniciada.
  return investmentPlanRevisionAt(revisions, `${assertMonthKey(month)}-01`);
}

export function plannedContributionForMonth(revisions: readonly InvestmentPlanRevision[], month: string): { planned: number; version: number } | null {
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
