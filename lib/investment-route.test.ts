import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CURRENT_SNAPSHOT_MAX_AGE_DAYS,
  DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS,
  InvestmentRouteError,
  MAX_REACH_MONTHS,
  annualToMonthlyRate,
  assessInvestmentDataQuality,
  buildInvestmentRouteDashboard,
  buildTrajectorySeries,
  computeMonthlyAdherence,
  computeRouteStatus,
  decomposeSnapshotPeriod,
  deriveCurrentContributionPace,
  investmentPlanRevisionAt,
  modifiedDietzReturn,
  nominalToRealRate,
  nominalToRealValue,
  normalizeTargetDate,
  projectPortfolio,
  realToNominalValue,
  requiredMonthlyContribution,
  simulateInvestmentScenario,
  type InvestmentPlan,
  type InvestmentPlanRevision,
  type InvestmentRouteContribution,
  type InvestmentRouteSnapshot,
  type InvestmentRouteWithdrawal,
  type ProjectionCashFlow,
} from "./investment-route";

function closeTo(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ~${expected}, recebido ${actual} (diferença ${Math.abs(actual - expected)})`,
  );
}

function contribution(id: string, date: string, amount: number, sourceEntryId: string | null = null): InvestmentRouteContribution {
  return { id, date, amount, source: sourceEntryId ? "personal_finance" : "manual", sourceEntryId };
}

function withdrawal(id: string, date: string, amount: number): InvestmentRouteWithdrawal {
  return { id, date, amount };
}

function snapshot(id: string, date: string, totalValue: number): InvestmentRouteSnapshot {
  return { id, date, totalValue };
}

function revision(overrides: Partial<InvestmentPlanRevision> = {}): InvestmentPlanRevision {
  return {
    id: "revision-1",
    planId: "plan-1",
    version: 1,
    effectiveFrom: "2026-01-01",
    baselineDate: "2026-01-01",
    baselineValue: 10_000,
    targetValue: 30_000,
    targetDate: "2026-12-31",
    valueMode: "nominal",
    valueReferenceDate: "2026-01-01",
    plannedMonthlyContribution: 1_000,
    annualReturnConservative: 0.02,
    annualReturnBase: 0.06,
    annualReturnFavorable: 0.1,
    annualInflation: 0.04,
    changeNote: null,
    createdAt: "2026-01-01T12:00:00-03:00",
    ...overrides,
  };
}

function plan(): InvestmentPlan {
  return { id: "plan-1", name: "Independência", active: true, completedAt: null };
}

function assertRouteError(fn: () => unknown, code: InvestmentRouteError["code"]): void {
  assert.throws(fn, (error) => error instanceof InvestmentRouteError && error.code === code);
}

describe("taxas efetivas e conversão monetária", () => {
  test("taxa anual de 0% produz taxa mensal de 0%", () => {
    assert.equal(annualToMonthlyRate(0), 0);
  });

  test("12% a.a. usa a raiz décima segunda, não 1% ao mês", () => {
    const monthly = annualToMonthlyRate(0.12);
    closeTo(monthly, Math.pow(1.12, 1 / 12) - 1);
    assert.notEqual(monthly, 0.01);
    closeTo(Math.pow(1 + monthly, 12), 1.12);
  });

  test("taxa nominal de 10% e inflação de 5% resulta em aproximadamente 4,7619% real", () => {
    closeTo(nominalToRealRate(0.1, 0.05), 0.04761904761904767);
  });

  test("conversão real/nominal é reversível e inflação zero preserva o valor", () => {
    const nominal = realToNominalValue(100_000, 0.05, 24);
    closeTo(nominal, 110_250);
    closeTo(nominalToRealValue(nominal, 0.05, 24), 100_000);
    assert.equal(realToNominalValue(1234.56, 0, 360), 1234.56);
  });

  test("rejeita NaN, Infinity e taxas anuais menores ou iguais a -100%", () => {
    assertRouteError(() => annualToMonthlyRate(Number.NaN), "INVALID_NUMBER");
    assertRouteError(() => annualToMonthlyRate(Number.POSITIVE_INFINITY), "INVALID_NUMBER");
    assertRouteError(() => annualToMonthlyRate(-1), "INVALID_RATE");
    assertRouteError(() => nominalToRealRate(0.1, -1), "INVALID_RATE");
  });
});

describe("projectPortfolio", () => {
  test("aportes no fim do mês produzem R$ 1.000 e R$ 2.010 nos dois primeiros meses a 1% a.m.", () => {
    const annualRate = Math.pow(1.01, 12) - 1;
    const result = projectPortfolio({
      initialBalance: 0,
      annualRate,
      startDate: "2026-01-31",
      months: 2,
      monthlyContribution: 1_000,
    });
    assert.equal(result.points[0].balance, 0);
    closeTo(result.points[1].balance, 1_000);
    closeTo(result.points[2].balance, 2_010);
  });

  test("o primeiro ponto projetado coincide exatamente com saldo e data âncora", () => {
    const result = projectPortfolio({ initialBalance: 18_432.17, annualRate: 0.08, startDate: "2026-08-07", months: 1 });
    assert.deepEqual(result.points[0], {
      date: "2026-08-07",
      monthIndex: 0,
      openingBalance: 18_432.17,
      returnAmount: 0,
      contribution: 0,
      withdrawal: 0,
      rawBalance: 18_432.17,
      balance: 18_432.17,
      depleted: false,
    });
  });

  test("normaliza meses de 28, 29, 30 e 31 dias e atravessa a virada do ano", () => {
    const leap = projectPortfolio({ initialBalance: 1, annualRate: 0, startDate: "2024-01-31", months: 4 });
    assert.deepEqual(leap.points.map((point) => point.date), [
      "2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30", "2024-05-31",
    ]);
    const common = projectPortfolio({ initialBalance: 1, annualRate: 0, startDate: "2025-12-15", months: 3 });
    assert.deepEqual(common.points.map((point) => point.date), ["2025-12-15", "2026-01-31", "2026-02-28", "2026-03-31"]);
    assert.equal(normalizeTargetDate("2024-02-01"), "2024-02-29");
  });

  test("aceita horizonte de um mês e acima de 30 anos", () => {
    assert.equal(projectPortfolio({ initialBalance: 100, annualRate: 0, startDate: "2026-01-15", months: 1 }).points.length, 2);
    const long = projectPortfolio({ initialBalance: 100, annualRate: 0.01, startDate: "2026-01-15", months: 361 });
    assert.equal(long.points.length, 362);
    assert.ok(Number.isFinite(long.finalBalance));
  });

  test("rejeita data e horizonte inválidos", () => {
    assertRouteError(() => projectPortfolio({ initialBalance: 0, annualRate: 0, startDate: "2025-02-29", months: 1 }), "INVALID_DATE");
    assertRouteError(() => projectPortfolio({ initialBalance: 0, annualRate: 0, startDate: "2026-01-01", months: MAX_REACH_MONTHS + 1 }), "INVALID_HORIZON");
    assertRouteError(() => projectPortfolio({ initialBalance: 0, annualRate: 0, startDate: "2026-02-01", targetDate: "2026-01-01" }), "INVALID_HORIZON");
  });

  test("retirada superior ao saldo explicita esgotamento, shortfall e mantém zero depois", () => {
    const flows: ProjectionCashFlow[] = [{ date: "2026-02-15", amount: 1_500, type: "withdrawal" }];
    const result = projectPortfolio({
      initialBalance: 1_000,
      annualRate: 0,
      startDate: "2026-01-31",
      months: 3,
      monthlyContribution: 100,
      cashFlows: flows,
    });
    assert.equal(result.depletedAt, "2026-02-15");
    assert.equal(result.points[1].rawBalance, -500);
    assert.equal(result.withdrawalShortfall, 500);
    assert.deepEqual(result.points.slice(1).map((point) => point.balance), [0, 0, 0]);
  });

  test("fluxos no mês âncora são aplicados mesmo com horizonte zero", () => {
    const result = projectPortfolio({
      initialBalance: 1_000,
      annualRate: 0,
      startDate: "2026-08-07",
      months: 0,
      cashFlows: [{ date: "2026-08-20", amount: 250, type: "contribution" }],
    });
    assert.equal(result.finalBalance, 1_250);
    assert.equal(result.points.at(-1)?.balance, result.finalBalance);
    assert.equal(result.points.at(-1)?.date, "2026-08-20");
    assert.equal(result.points.length, 2);
  });

  test("retirada que esgota a carteira não é mascarada por aporte posterior no mesmo mês", () => {
    const result = projectPortfolio({
      initialBalance: 1_000,
      annualRate: 0,
      startDate: "2026-01-31",
      months: 1,
      cashFlows: [
        { date: "2026-02-10", amount: 1_200, type: "withdrawal" },
        { date: "2026-02-20", amount: 500, type: "contribution" },
      ],
    });
    assert.equal(result.depletedAt, "2026-02-10");
    assert.equal(result.withdrawalShortfall, 200);
    assert.equal(result.finalBalance, 0);
  });

  test("múltiplos fluxos no mesmo dia são agregados sem depender da ordem do array", () => {
    const flows: ProjectionCashFlow[] = [
      { date: "2026-01-20", amount: 150, type: "withdrawal" },
      { date: "2026-01-20", amount: 100, type: "contribution" },
    ];
    const result = projectPortfolio({ initialBalance: 100, annualRate: 0, startDate: "2026-01-15", months: 1, cashFlows: flows });
    assert.equal(result.depletedAt, null);
    assert.equal(result.finalBalance, 50);
  });

  test("aporte maior nunca reduz o saldo final, inclusive com taxa negativa", () => {
    const base = { initialBalance: 10_000, annualRate: -0.2, startDate: "2026-01-31", months: 24 } as const;
    const without = projectPortfolio({ ...base, monthlyContribution: 0 }).finalBalance;
    const withMore = projectPortfolio({ ...base, monthlyContribution: 500 }).finalBalance;
    assert.ok(withMore >= without);
  });

  test("marca como unreachable quando a meta não é alcançada em 1.200 meses", () => {
    const result = projectPortfolio({
      initialBalance: 0,
      annualRate: 0,
      startDate: "2026-01-31",
      months: MAX_REACH_MONTHS,
      monthlyContribution: 0,
      targetValue: 1,
    });
    assert.equal(result.reachedAt, null);
    assert.equal(result.unreachable, true);
  });

  test("não muta cash flows nem meses pausados", () => {
    const flows: ProjectionCashFlow[] = [
      { date: "2026-03-15", amount: 50, type: "withdrawal" },
      { date: "2026-02-15", amount: 100, type: "contribution" },
    ];
    const paused = ["2026-02"];
    const beforeFlows = structuredClone(flows);
    const beforePaused = [...paused];
    projectPortfolio({ initialBalance: 1_000, annualRate: 0.05, startDate: "2026-01-15", months: 3, cashFlows: flows, pausedMonths: paused });
    assert.deepEqual(flows, beforeFlows);
    assert.deepEqual(paused, beforePaused);
  });

  test("valores grandes nunca retornam NaN ou Infinity", () => {
    const validLarge = projectPortfolio({ initialBalance: 1e100, annualRate: 0.2, startDate: "2026-01-01", months: 360 });
    assert.ok(Number.isFinite(validLarge.finalBalance));
    assert.ok(validLarge.points.every((point) => Object.values(point).every((value) => typeof value !== "number" || Number.isFinite(value))));
    assertRouteError(
      () => projectPortfolio({ initialBalance: 1e308, annualRate: 10, startDate: "2026-01-01", months: 1_000 }),
      "CALCULATION_OVERFLOW",
    );
  });
});

describe("requiredMonthlyContribution", () => {
  test("saldo zero, alvo R$ 12.000, 12 meses e taxa zero exige R$ 1.000/mês", () => {
    assert.equal(requiredMonthlyContribution({ initialBalance: 0, targetValue: 12_000, annualRate: 0, startDate: "2026-01-31", months: 12 }), 1_000);
  });

  test("reprojetar com o aporte calculado termina a até R$ 0,01 do alvo", () => {
    const input = {
      initialBalance: 23_456.78,
      targetValue: 100_000,
      annualRate: 0.071,
      startDate: "2026-08-07",
      months: 41,
      pausedMonths: ["2026-10", "2027-01"],
      cashFlows: [{ date: "2027-03-10", amount: 2_500, type: "withdrawal" as const }],
    };
    const required = requiredMonthlyContribution(input);
    assert.notEqual(required, null);
    const projected = projectPortfolio({ ...input, monthlyContribution: required ?? 0 });
    assert.ok(Math.abs(projected.finalBalance - input.targetValue) <= 0.01);
  });

  test("a busca variável valida o saldo final, inclusive com alvo grande", () => {
    const input = {
      initialBalance: 9_000_000_000_000,
      targetValue: 12_000_000_000_000,
      annualRate: 0.04,
      startDate: "2026-01-31",
      months: 48,
      pausedMonths: ["2026-05"],
      cashFlows: [{ date: "2027-03-31", amount: 50_000_000, type: "withdrawal" as const }],
    };
    const required = requiredMonthlyContribution(input);
    assert.notEqual(required, null);
    const projected = projectPortfolio({ ...input, monthlyContribution: required ?? 0 });
    assert.ok(Math.abs(projected.finalBalance - input.targetValue) <= 0.01);
  });

  test("n=0 retorna zero se concluída e null se vencida", () => {
    assert.equal(requiredMonthlyContribution({ initialBalance: 12_000, targetValue: 12_000, annualRate: 0.1, startDate: "2026-08-07", months: 0 }), 0);
    assert.equal(requiredMonthlyContribution({ initialBalance: 11_999, targetValue: 12_000, annualRate: 0.1, startDate: "2026-08-07", months: 0 }), null);
    assert.equal(requiredMonthlyContribution({ initialBalance: 11_500, targetValue: 12_000, annualRate: 0.1, startDate: "2026-08-07", months: 0, cashFlows: [{ date: "2026-08-20", amount: 500, type: "contribution" }] }), 0);
  });

  test("rejeita alvo zero ou negativo", () => {
    assertRouteError(() => requiredMonthlyContribution({ initialBalance: 0, targetValue: 0, annualRate: 0, startDate: "2026-01-01", months: 1 }), "INVALID_TARGET");
    assertRouteError(() => requiredMonthlyContribution({ initialBalance: 0, targetValue: -1, annualRate: 0, startDate: "2026-01-01", months: 1 }), "INVALID_TARGET");
  });
});

describe("deriveCurrentContributionPace", () => {
  test("[1000, 0, 1000, 0, 1000, 0] produz média de R$ 500 e inclui meses zerados", () => {
    const pace = deriveCurrentContributionPace({
      contributions: [
        contribution("1", "2026-02-10", 1_000),
        contribution("2", "2026-04-10", 1_000),
        contribution("3", "2026-06-10", 1_000),
      ],
      asOfDate: "2026-08-07",
      planStartDate: "2026-02-01",
    });
    assert.deepEqual(pace.months.map((item) => item.contributed), [1_000, 0, 1_000, 0, 1_000, 0]);
    assert.equal(pace.monthlyAverage, 500);
    assert.equal(pace.eligibleMonthCount, 6);
    assert.equal(pace.hasSufficientHistory, true);
  });

  test("mês atual incompleto não entra no ritmo e meses anteriores sem aporte contam como zero", () => {
    const pace = deriveCurrentContributionPace({
      contributions: [contribution("july", "2026-07-31", 600), contribution("august", "2026-08-01", 99_000)],
      asOfDate: "2026-08-07",
      planStartDate: "2026-05-15",
    });
    assert.deepEqual(pace.months, [
      { month: "2026-06", contributed: 0 },
      { month: "2026-07", contributed: 600 },
    ]);
    assert.equal(pace.monthlyAverage, 300);
    assert.equal(pace.hasSufficientHistory, false);
  });

  test("deduplica pela sourceEntryId canônica e não muta entradas", () => {
    const items = [
      contribution("canonical", "2026-07-02", 500, "entry-1"),
      contribution("fallback-copy", "2026-07-02", 500, "entry-1"),
    ];
    const before = structuredClone(items);
    const pace = deriveCurrentContributionPace({ contributions: items, asOfDate: "2026-08-01", planStartDate: "2026-07-01" });
    assert.equal(pace.total, 500);
    assert.deepEqual(items, before);
  });
});

describe("assessInvestmentDataQuality", () => {
  test("aplica exatamente os limites de 35, 36, 60 e 61 dias", () => {
    const qualityAt = (snapshotDate: string, asOfDate: string) => assessInvestmentDataQuality({ snapshots: [snapshot("s", snapshotDate, 100)], asOfDate });
    assert.equal(qualityAt("2026-07-03", "2026-08-07").snapshotAgeDays, CURRENT_SNAPSHOT_MAX_AGE_DAYS);
    assert.equal(qualityAt("2026-07-03", "2026-08-07").level, "current");
    assert.equal(qualityAt("2026-07-02", "2026-08-07").level, "stale");
    assert.equal(qualityAt("2026-06-08", "2026-08-07").snapshotAgeDays, DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS);
    assert.equal(qualityAt("2026-06-08", "2026-08-07").level, "stale");
    assert.equal(qualityAt("2026-06-07", "2026-08-07").level, "update_required");
    assert.equal(qualityAt("2026-06-07", "2026-08-07").canComputeDefinitiveStatus, false);
  });

  test("aporte posterior ao snapshot entra no estimado sem alterar o snapshot; fluxo na mesma data não entra", () => {
    const sourceSnapshot = snapshot("s", "2026-08-01", 10_000);
    const quality = assessInvestmentDataQuality({
      snapshots: [sourceSnapshot],
      contributions: [
        contribution("same", "2026-08-01", 999),
        contribution("after", "2026-08-02", 500),
        contribution("future", "2026-08-08", 5_000),
      ],
      withdrawals: [withdrawal("w", "2026-08-03", 100)],
      asOfDate: "2026-08-07",
    });
    assert.equal(quality.observedValue, 10_000);
    assert.equal(quality.estimatedCurrentValue, 10_400);
    assert.equal(quality.contributionsAfterSnapshot, 500);
    assert.equal(sourceSnapshot.totalValue, 10_000);
  });

  test("snapshot futuro é rejeitado", () => {
    assertRouteError(() => assessInvestmentDataQuality({ snapshots: [snapshot("future", "2026-08-08", 1)], asOfDate: "2026-08-07" }), "FUTURE_SNAPSHOT");
  });

  test("retirada posterior superior ao snapshot não é escondida por clamp e bloqueia projeção", () => {
    const quality = assessInvestmentDataQuality({
      snapshots: [snapshot("s", "2026-08-01", 100)],
      withdrawals: [withdrawal("w", "2026-08-02", 150)],
      asOfDate: "2026-08-07",
    });
    assert.equal(quality.estimatedCurrentValue, -50);
    assert.equal(quality.canProject, false);
    assert.equal(quality.canComputeDefinitiveStatus, false);
    assert.doesNotThrow(() => buildInvestmentRouteDashboard({
      plan: plan(), revisions: [revision()], snapshots: [snapshot("s", "2026-08-01", 100)],
      contributions: [], withdrawals: [withdrawal("w", "2026-08-02", 150)], asOfDate: "2026-08-07",
    }));
  });

  test("diferencia ausência, falha parcial e migração não aplicada", () => {
    assert.equal(assessInvestmentDataQuality({ snapshots: [], asOfDate: "2026-08-07" }).level, "missing");
    assert.equal(assessInvestmentDataQuality({ snapshots: [], asOfDate: "2026-08-07", queryState: "error" }).level, "unavailable");
    assert.equal(assessInvestmentDataQuality({ snapshots: [], asOfDate: "2026-08-07", queryState: "migration_missing" }).level, "migration_missing");
  });
});

describe("computeRouteStatus", () => {
  const base = {
    hasPlan: true,
    hasSnapshot: true,
    dataQuality: "current" as const,
    snapshotAgeDays: 5,
    assumptionsValid: true,
    currentValue: 50,
    targetValue: 100,
    projectedValue: 100,
    eligiblePaceMonths: 6,
  };

  test("testa exatamente coberturas de 80%, 95% e 105%", () => {
    assert.equal(computeRouteStatus({ ...base, projectedValue: 79.999 }).status, "off_track");
    assert.equal(computeRouteStatus({ ...base, projectedValue: 80 }).status, "attention");
    assert.equal(computeRouteStatus({ ...base, projectedValue: 95 }).status, "on_track");
    assert.equal(computeRouteStatus({ ...base, projectedValue: 105 }).status, "ahead");
  });

  test("respeita a ordem de decisão para configuração, snapshot, premissas, conclusão e histórico", () => {
    assert.equal(computeRouteStatus({ ...base, hasPlan: false }).status, "configuration_required");
    assert.equal(computeRouteStatus({ ...base, hasSnapshot: false, dataQuality: "missing" }).status, "update_required");
    assert.equal(computeRouteStatus({ ...base, assumptionsValid: false }).status, "insufficient_data");
    assert.equal(computeRouteStatus({ ...base, currentValue: 100 }).status, "completed");
    assert.equal(computeRouteStatus({ ...base, eligiblePaceMonths: 2 }).status, "calculating");
  });

  test("snapshot acima de 60 dias nunca gera status definitivo", () => {
    const result = computeRouteStatus({
      ...base,
      dataQuality: "update_required",
      snapshotAgeDays: DEFINITIVE_STATUS_MAX_SNAPSHOT_AGE_DAYS + 1,
      projectedValue: 120,
    });
    assert.equal(result.status, "update_required");
    assert.notEqual(result.status, "on_track");
  });

  test("retorna explicação numérica e diferença de alcance em meses", () => {
    const result = computeRouteStatus({
      ...base,
      projectedValue: 87,
      contributionPace: 1_800,
      requiredMonthlyContribution: 2_350,
      targetDate: "2030-08-01",
      estimatedReachDate: "2031-01-31",
    });
    assert.equal(result.status, "attention");
    assert.equal(result.coverage, 0.87);
    assert.equal(result.differenceAmount, -13);
    assert.equal(result.reachDifferenceMonths, 5);
    assert.equal(result.explanationValues.contributionPace, 1_800);
  });
});

describe("computeMonthlyAdherence", () => {
  test("plano de R$ 1.000 e aportes [1000, 500, 1500, 0] resultam em 75% de volume e 50% de consistência", () => {
    const result = computeMonthlyAdherence({
      revisions: [revision({ targetDate: "2026-04-30" })],
      contributions: [
        contribution("jan", "2026-01-10", 1_000),
        contribution("feb", "2026-02-10", 500),
        contribution("mar", "2026-03-10", 1_500),
      ],
      asOfDate: "2026-05-01",
      fromMonth: "2026-01",
      toMonth: "2026-04",
    });
    assert.equal(result.volumeAdherence, 0.75);
    assert.equal(result.consistency, 0.5);
    assert.deepEqual(result.months.map((item) => item.status), ["met", "below", "met", "below"]);
  });

  test("mês atual calcula restante/excedente, mas não é classificado como falha", () => {
    const result = computeMonthlyAdherence({
      revisions: [revision()],
      contributions: [contribution("aug", "2026-08-03", 400)],
      asOfDate: "2026-08-07",
      fromMonth: "2026-08",
      toMonth: "2026-08",
    });
    assert.equal(result.months[0].status, "in_progress");
    assert.equal(result.months[0].remaining, 600);
    assert.equal(result.eligibleMonthCount, 0);
  });

  test("plano sem aporte mensal retorna aderência null", () => {
    const result = computeMonthlyAdherence({
      revisions: [revision({ plannedMonthlyContribution: 0 })],
      contributions: [],
      asOfDate: "2026-02-28",
      fromMonth: "2026-01",
      toMonth: "2026-01",
    });
    assert.equal(result.months[0].ratio, null);
    assert.equal(result.months[0].status, "no_target");
    assert.equal(result.volumeAdherence, null);
    assert.equal(result.consistency, null);
  });

  test("mudança de plano no meio do histórico usa a revisão vigente em cada mês", () => {
    const first = revision({ id: "r1", targetDate: "2026-06-30" });
    const second = revision({
      id: "r2",
      version: 2,
      effectiveFrom: "2026-03-01",
      plannedMonthlyContribution: 2_000,
      targetDate: "2026-06-30",
    });
    const result = computeMonthlyAdherence({
      revisions: [second, first],
      contributions: [],
      asOfDate: "2026-05-01",
      fromMonth: "2026-01",
      toMonth: "2026-04",
    });
    assert.deepEqual(result.months.map((item) => item.planned), [1_000, 1_000, 2_000, 2_000]);
    assert.deepEqual(result.months.map((item) => item.revisionVersion), [1, 1, 2, 2]);
    assert.equal(investmentPlanRevisionAt([second, first], "2026-02-28")?.id, "r1");
    assert.equal(investmentPlanRevisionAt([second, first], "2026-03-01")?.id, "r2");
  });

  test("primeira versão no meio do mês só cria meta mensal a partir do mês seguinte", () => {
    const result = computeMonthlyAdherence({
      revisions: [revision({
        effectiveFrom: "2026-03-15",
        baselineDate: "2026-03-01",
        targetDate: "2026-06-30",
      })],
      contributions: [contribution("march", "2026-03-20", 1_000)],
      asOfDate: "2026-05-01",
      fromMonth: "2026-03",
      toMonth: "2026-04",
    });

    assert.deepEqual(result.months.map((item) => ({
      month: item.month,
      planned: item.planned,
      status: item.status,
      revisionVersion: item.revisionVersion,
    })), [
      { month: "2026-03", planned: null, status: "no_target", revisionVersion: null },
      { month: "2026-04", planned: 1_000, status: "below", revisionVersion: 1 },
    ]);
    assert.equal(result.eligibleMonthCount, 1);
    assert.equal(result.plannedTotal, 1_000);
  });

  test("revisões imediatas no meio do mês preservam a meta vigente no primeiro dia", () => {
    const first = revision({ id: "r1", plannedMonthlyContribution: 1_000, targetDate: "2026-06-30" });
    const second = revision({
      id: "r2",
      version: 2,
      effectiveFrom: "2026-03-10",
      baselineDate: "2026-03-10",
      baselineValue: 12_000,
      plannedMonthlyContribution: 2_000,
      targetDate: "2026-06-30",
    });
    const third = revision({
      id: "r3",
      version: 3,
      effectiveFrom: "2026-03-20",
      baselineDate: "2026-03-20",
      baselineValue: 13_000,
      plannedMonthlyContribution: 3_000,
      targetDate: "2026-06-30",
    });
    const result = computeMonthlyAdherence({
      revisions: [third, first, second],
      contributions: [],
      asOfDate: "2026-05-01",
      fromMonth: "2026-03",
      toMonth: "2026-04",
    });

    assert.deepEqual(result.months.map((item) => item.planned), [1_000, 3_000]);
    assert.deepEqual(result.months.map((item) => item.revisionVersion), [1, 3]);
  });

  test("aporte acima de 100% não é limitado e não apaga mês anterior", () => {
    const result = computeMonthlyAdherence({
      revisions: [revision()],
      contributions: [contribution("feb", "2026-02-10", 3_000)],
      asOfDate: "2026-03-01",
      fromMonth: "2026-01",
      toMonth: "2026-02",
    });
    assert.deepEqual(result.months.map((item) => item.ratio), [0, 3]);
    assert.equal(result.consistency, 0.5);
    assert.equal(result.volumeAdherence, 1.5);
  });
});

describe("decomposição e Modified Dietz", () => {
  test("R$ 10.000 + R$ 2.000 - R$ 500 -> R$ 11.700 produz residual de R$ 200", () => {
    const result = decomposeSnapshotPeriod({
      initialSnapshot: snapshot("start", "2026-01-01", 10_000),
      finalSnapshot: snapshot("end", "2026-02-01", 11_700),
      contributions: [contribution("c", "2026-01-15", 2_000)],
      withdrawals: [withdrawal("w", "2026-01-20", 500)],
    });
    assert.equal(result.residualResult, 200);
    assert.equal(result.totalVariation, result.contributions - result.withdrawals + result.residualResult);
  });

  test("fluxo na data final entra no intervalo; fluxo na data inicial não entra; múltiplos fluxos somam", () => {
    const result = decomposeSnapshotPeriod({
      initialSnapshot: snapshot("start", "2026-01-01", 1_000),
      finalSnapshot: snapshot("end", "2026-01-31", 1_350),
      contributions: [
        contribution("initial", "2026-01-01", 999),
        contribution("final-1", "2026-01-31", 200),
        contribution("final-2", "2026-01-31", 300),
      ],
      withdrawals: [withdrawal("final-w", "2026-01-31", 100)],
    });
    assert.equal(result.contributions, 500);
    assert.equal(result.withdrawals, 100);
    assert.equal(result.residualResult, -50);
    assert.equal(result.totalVariation, result.contributions - result.withdrawals + result.residualResult);
  });

  test("Modified Dietz pondera fluxos por dias e dá peso zero ao fluxo final", () => {
    const input = {
      initialSnapshot: snapshot("start", "2026-01-01", 10_000),
      finalSnapshot: snapshot("end", "2026-01-11", 11_100),
      contributions: [contribution("middle", "2026-01-06", 1_000), contribution("final", "2026-01-11", 100)],
      withdrawals: [],
    };
    // Numerador = 0; denominador = 10.000 + 0,5*1.000 + 0*100.
    assert.equal(modifiedDietzReturn(input), 0);
  });

  test("Modified Dietz ignora fluxo na data inicial e retorna null para denominador nulo/negativo", () => {
    const result = modifiedDietzReturn({
      initialSnapshot: snapshot("start", "2026-01-01", 100),
      finalSnapshot: snapshot("end", "2026-01-11", 0),
      contributions: [contribution("initial", "2026-01-01", 10_000)],
      withdrawals: [withdrawal("middle", "2026-01-06", 200)],
    });
    assert.equal(result, null);
  });
});

describe("trajetórias, revisão original e simulação", () => {
  const snapshots = [snapshot("s1", "2026-01-01", 10_000), snapshot("s2", "2026-07-31", 17_000)];
  const contributions = [
    contribution("feb", "2026-02-10", 1_000), contribution("mar", "2026-03-10", 1_000),
    contribution("apr", "2026-04-10", 1_000), contribution("may", "2026-05-10", 1_000),
    contribution("jun", "2026-06-10", 1_000), contribution("jul", "2026-07-10", 1_000),
  ];

  test("histórico contém apenas snapshots reais e primeiro ponto futuro é a âncora", () => {
    const series = buildTrajectorySeries({ revisions: [revision()], snapshots, contributions, asOfDate: "2026-08-07" });
    assert.deepEqual(series.historical.map((point) => point.date), ["2026-01-01", "2026-07-31"]);
    assert.equal(series.currentRoute[0].date, "2026-08-07");
    assert.equal(series.currentRoute[0].value, 17_000);
  });

  test("plano salvo nasce no baseline e rota atual nasce no valor observado", () => {
    const savedRevision = revision({
      effectiveFrom: "2026-01-31",
      baselineDate: "2026-01-31",
      baselineValue: 10_000,
      targetDate: "2026-12-31",
      plannedMonthlyContribution: 1_000,
      annualReturnConservative: 0,
      annualReturnBase: 0,
      annualReturnFavorable: 0,
    });
    const expectedPlan = projectPortfolio({
      initialBalance: 10_000,
      annualRate: 0,
      startDate: "2026-01-31",
      targetDate: "2026-12-31",
      monthlyContribution: 1_000,
      targetValue: 30_000,
    });
    const series = buildTrajectorySeries({
      revisions: [savedRevision],
      snapshots: [snapshot("current", "2026-08-07", 22_000)],
      contributions: [],
      asOfDate: "2026-08-07",
      currentMonthlyContribution: 500,
    });

    assert.deepEqual(series.currentPlan, expectedPlan.points.map((point) => ({ date: point.date, value: point.balance })));
    assert.deepEqual(series.currentPlan[0], { date: "2026-01-31", value: 10_000 });
    assert.deepEqual(series.currentRoute[0], { date: "2026-08-07", value: 22_000 });
    assert.equal(series.currentPlan.at(-1)?.value, 21_000);
    assert.equal(series.currentRoute[1]?.value, 22_500);
  });

  test("com menos de três meses elegíveis, projeta provisoriamente o aporte do plano", () => {
    const shortPlan = revision({
      effectiveFrom: "2026-06-15",
      baselineDate: "2026-06-15",
      baselineValue: 16_000,
      annualReturnConservative: 0,
      annualReturnBase: 0,
      annualReturnFavorable: 0,
    });
    const series = buildTrajectorySeries({
      revisions: [shortPlan],
      snapshots: [snapshot("recent", "2026-07-31", 17_000)],
      contributions: [contribution("jul", "2026-07-10", 500)],
      asOfDate: "2026-08-07",
    });
    assert.equal(series.contributionSource, "planned_provisional");
    assert.equal(series.currentRoute[1].value, 18_000);
  });

  test("cenários ordenados preservam conservador <= base <= favorável", () => {
    const series = buildTrajectorySeries({ revisions: [revision()], snapshots, contributions, asOfDate: "2026-08-07" });
    assert.ok(series.range.length > 1);
    for (const point of series.range) {
      assert.ok(point.conservative <= point.base);
      assert.ok(point.base <= point.favorable);
      assert.ok(Object.values(point).every((value) => typeof value !== "number" || Number.isFinite(value)));
    }
  });

  test("nova revisão não altera a trajetória do plano original", () => {
    const first = revision();
    const second = revision({
      id: "revision-2", version: 2, effectiveFrom: "2026-08-01", targetValue: 50_000,
      targetDate: "2027-06-30", plannedMonthlyContribution: 2_000,
    });
    const before = buildTrajectorySeries({ revisions: [first], snapshots, contributions, asOfDate: "2026-08-07" });
    const after = buildTrajectorySeries({ revisions: [second, first], snapshots, contributions, asOfDate: "2026-08-07" });
    assert.deepEqual(after.originalPlan, before.originalPlan);
    assert.notDeepEqual(after.currentPlan, before.currentPlan);
  });

  test("revisões rejeitam vigência fora do plano, versão duplicada e planIds mistos", () => {
    assertRouteError(() => buildTrajectorySeries({
      revisions: [revision({ effectiveFrom: "2025-12-31" })], snapshots, contributions, asOfDate: "2026-08-07",
    }), "INVALID_PLAN");
    assertRouteError(() => buildTrajectorySeries({
      revisions: [revision({ id: "one" }), revision({ id: "two" })], snapshots, contributions, asOfDate: "2026-08-07",
    }), "INVALID_PLAN");
    assertRouteError(() => buildTrajectorySeries({
      revisions: [revision({ id: "one" }), revision({ id: "two", version: 2, planId: "other-plan", effectiveFrom: "2026-02-01" })],
      snapshots, contributions, asOfDate: "2026-08-07",
    }), "INVALID_PLAN");
  });

  test("simulação é efêmera e não muta revisão, draft ou arrays", () => {
    const saved = revision();
    const draft = {
      monthlyContribution: 1_500,
      oneTimeContribution: { date: "2026-09-10", amount: 500 },
      pauseMonths: 2,
      futureWithdrawal: { date: "2026-11-15", amount: 200 },
    };
    const savedBefore = structuredClone(saved);
    const draftBefore = structuredClone(draft);
    const inputBefore = structuredClone(contributions);
    const simulated = simulateInvestmentScenario({ revision: saved, anchorDate: "2026-08-07", anchorValue: 17_000, draft });
    assert.ok(Number.isFinite(simulated.projectedValue));
    assert.deepEqual(saved, savedBefore);
    assert.deepEqual(draft, draftBefore);
    assert.deepEqual(contributions, inputBefore);
  });

  test("simulação rejeita alvo passado e fluxos posteriores ao alvo", () => {
    assertRouteError(() => simulateInvestmentScenario({
      revision: revision(), anchorDate: "2026-08-07", anchorValue: 17_000,
      draft: { targetDate: "2026-07-01" },
    }), "INVALID_HORIZON");
    assertRouteError(() => simulateInvestmentScenario({
      revision: revision(), anchorDate: "2026-08-07", anchorValue: 17_000,
      draft: { targetDate: "2026-09-01", oneTimeContribution: { date: "2026-10-01", amount: 500 } },
    }), "INVALID_FLOW");
    assertRouteError(() => simulateInvestmentScenario({
      revision: revision(), anchorDate: "2026-08-07", anchorValue: 17_000,
      draft: { targetDate: "2026-09-01", futureWithdrawal: { date: "2026-10-01", amount: 500 } },
    }), "INVALID_FLOW");
  });

  test("plano original com outra referência é convertido e rotulado antes de compartilhar o eixo", () => {
    const original = revision({ valueMode: "real", valueReferenceDate: "2026-01-01" });
    const current = revision({
      id: "revision-2", version: 2, effectiveFrom: "2026-08-01", valueMode: "real",
      valueReferenceDate: "2026-08-01", targetDate: "2027-12-31",
    });
    const series = buildTrajectorySeries({ revisions: [original, current], snapshots, contributions, asOfDate: "2026-08-07" });
    assert.equal(series.isOriginalPlanComparable, true);
    assert.equal(series.originalPlanConverted, true);
    assert.ok(series.originalPlan.length > 0);
    assert.ok(series.points.some((point) => point.originalPlan != null));
  });

  test("cenários fora de ordem são rejeitados", () => {
    assertRouteError(() => buildTrajectorySeries({
      revisions: [revision({ annualReturnConservative: 0.1, annualReturnBase: 0.05 })],
      snapshots,
      contributions,
      asOfDate: "2026-08-07",
    }), "INVALID_SCENARIO_ORDER");
  });
});

describe("dashboard integrado da engine", () => {
  test("sem plano retorna configuração necessária sem transformar ausência em zero", () => {
    const dashboard = buildInvestmentRouteDashboard({
      plan: null,
      revisions: [],
      snapshots: [],
      contributions: [contribution("c", "2026-07-01", 1_000)],
      withdrawals: [],
      asOfDate: "2026-08-07",
    });
    assert.equal(dashboard.status.status, "configuration_required");
    assert.equal(dashboard.currentValue, null);
    assert.equal(dashboard.projections.base, null);
  });

  test("agrega qualidade, ritmo, projeções, aderência e último intervalo sem NaN/Infinity", () => {
    const dashboard = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [revision()],
      snapshots: [snapshot("s1", "2026-06-30", 15_000), snapshot("s2", "2026-07-31", 17_000)],
      contributions: [
        contribution("may", "2026-05-05", 1_000), contribution("jun", "2026-06-05", 1_000),
        contribution("jul", "2026-07-05", 1_000), contribution("aug", "2026-08-02", 500),
      ],
      withdrawals: [],
      asOfDate: "2026-08-07",
    });
    assert.equal(dashboard.currentValue?.estimated, 17_500);
    assert.equal(dashboard.currentValue?.isEstimated, true);
    assert.equal(dashboard.dataQuality.observedValue, 17_000);
    assert.notEqual(dashboard.latestBreakdown, null);
    assert.ok(dashboard.projections.conservative != null && dashboard.projections.base != null && dashboard.projections.favorable != null);
    assert.ok((dashboard.projections.conservative ?? 0) <= (dashboard.projections.base ?? 0));
    assert.ok((dashboard.projections.base ?? 0) <= (dashboard.projections.favorable ?? 0));
    const serialized = JSON.stringify(dashboard);
    assert.equal(serialized.includes("NaN"), false);
    assert.equal(serialized.includes("Infinity"), false);
  });

  test("plano criado hoje sobre baseline antigo ignora meses pré-vigência no ritmo e na aderência", () => {
    const createdToday = revision({
      effectiveFrom: "2026-08-07",
      baselineDate: "2026-05-31",
      baselineValue: 15_000,
      targetDate: "2027-12-31",
    });
    const dashboard = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [createdToday],
      snapshots: [snapshot("baseline", "2026-05-31", 15_000), snapshot("latest", "2026-08-01", 18_000)],
      contributions: [
        contribution("may", "2026-05-10", 900),
        contribution("jun", "2026-06-10", 1_100),
        contribution("jul", "2026-07-10", 1_200),
        contribution("aug", "2026-08-07", 400),
      ],
      withdrawals: [],
      asOfDate: "2026-08-07",
    });

    assert.deepEqual(dashboard.pace.months, []);
    assert.equal(dashboard.pace.total, 0);
    assert.equal(dashboard.pace.eligibleMonthCount, 0);
    assert.equal(dashboard.pace.hasSufficientHistory, false);
    assert.equal(dashboard.adherence.eligibleMonthCount, 0);
    assert.equal(dashboard.adherence.months.find((item) => item.month === "2026-08")?.planned, null);
    assert.ok(dashboard.adherence.months
      .filter((item) => item.month < "2026-08")
      .every((item) => item.planned == null));
    assert.equal(dashboard.status.status, "calculating");
  });

  test("modo real converte snapshot e cada fluxo na própria data antes de formar a âncora", () => {
    const realRevision = revision({
      valueMode: "real",
      valueReferenceDate: "2025-01-01",
      annualInflation: 0.12,
      targetDate: "2027-12-31",
    });
    const dashboard = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [realRevision],
      snapshots: [snapshot("s1", "2025-01-31", 1_200)],
      contributions: [contribution("c1", "2025-07-31", 120)],
      withdrawals: [withdrawal("w1", "2025-10-31", 60)],
      asOfDate: "2026-01-31",
    });
    const expectedObserved = nominalToRealValue(1_200, 0.12, 0);
    const expectedEstimated = expectedObserved
      + nominalToRealValue(120, 0.12, 6)
      - nominalToRealValue(60, 0.12, 9);
    closeTo(dashboard.currentValue?.observed ?? Number.NaN, expectedObserved);
    closeTo(dashboard.currentValue?.estimated ?? Number.NaN, expectedEstimated);
  });

  test("revisão do próximo mês já orienta a rota futura sem reescrever a revisão vigente", () => {
    const current = revision({ targetValue: 30_000, plannedMonthlyContribution: 1_000 });
    const scheduled = revision({
      id: "revision-2",
      version: 2,
      effectiveFrom: "2026-09-01",
      baselineDate: "2026-08-07",
      baselineValue: 17_000,
      targetValue: 40_000,
      plannedMonthlyContribution: 2_000,
      changeNote: "Ajuste agendado.",
    });
    const dashboard = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [current, scheduled],
      snapshots: [snapshot("s1", "2026-08-07", 17_000)],
      contributions: [contribution("jun", "2026-06-05", 1_000), contribution("jul", "2026-07-05", 1_000)],
      withdrawals: [],
      asOfDate: "2026-08-07",
    });
    assert.equal(dashboard.currentRevision?.version, 1);
    assert.equal(dashboard.routeRevision?.version, 2);
    assert.equal(dashboard.status.explanationValues.targetValue, 40_000);
    const expected = projectPortfolio({
      initialBalance: 17_000,
      annualRate: scheduled.annualReturnBase,
      startDate: "2026-08-07",
      months: 4,
      monthlyContribution: 2_000,
      targetValue: 40_000,
    }).finalBalance;
    closeTo(dashboard.projections.followingPlan ?? Number.NaN, expected);
  });

  test("revisão agendada não conclui o destino antes de entrar em vigor", () => {
    const current = revision({ targetValue: 1_000_000, plannedMonthlyContribution: 1_000 });
    const scheduled = revision({
      id: "revision-2",
      version: 2,
      effectiveFrom: "2026-09-01",
      baselineDate: "2026-08-07",
      baselineValue: 600_000,
      targetValue: 500_000,
      plannedMonthlyContribution: 1_000,
    });
    const dashboard = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [current, scheduled],
      snapshots: [snapshot("s1", "2026-08-07", 600_000)],
      contributions: [],
      withdrawals: [],
      asOfDate: "2026-08-07",
    });
    assert.equal(dashboard.currentRevision?.version, 1);
    assert.equal(dashboard.routeRevision?.version, 2);
    assert.notEqual(dashboard.status.status, "completed");

    const afterEffectiveDate = buildInvestmentRouteDashboard({
      plan: plan(),
      revisions: [current, scheduled],
      snapshots: [snapshot("s1", "2026-08-07", 600_000)],
      contributions: [],
      withdrawals: [],
      asOfDate: "2026-09-01",
    });
    assert.equal(afterEffectiveDate.currentRevision?.version, 2);
    assert.equal(afterEffectiveDate.routeRevision?.version, 2);
    assert.equal(afterEffectiveDate.status.status, "completed");
  });
});
