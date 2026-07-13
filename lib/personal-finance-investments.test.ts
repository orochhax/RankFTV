import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { PersonalFinanceEntry, RecurringOverride } from "@/lib/personal-finance";
import {
  annualCdiToDaily,
  dailyYieldFraction,
  compoundOverDays,
  mercadoPagoTieredDailyYield,
  distributeProportionally,
  resolveInvestmentOccurrences,
  simulateDailySeries,
  aggregateMonthly,
  projetarInvestimentos,
  type InvestmentSettings,
  type MercadoPagoTierSettings,
} from "@/lib/personal-finance-investments";

const MP_SETTINGS: MercadoPagoTierSettings = { bonusCdiPercent: 120, bonusLimit: 10000, excessCdiPercent: 100 };

const SETTINGS: InvestmentSettings = {
  mercadoPagoBonusCdiPercent: 120,
  mercadoPagoBonusLimit: 10000,
  mercadoPagoExcessCdiPercent: 100,
  lastCdiAnnual: 14.9,
  lastCdiReferenceDate: "2026-07-01",
};

function entry(overrides: Partial<PersonalFinanceEntry> & { id: string }): PersonalFinanceEntry {
  return {
    person: "carlos",
    name: "Aporte",
    category: "Investimentos",
    entryDate: "2026-01-05",
    amount: 1000,
    type: "investimento",
    bank: "mercado_pago",
    paymentMethod: "pix",
    isInstallment: false,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceDayMode: null,
    recurrenceDay: null,
    investmentYieldMode: "mercado_pago_tiered",
    investmentCdiPercent: null,
    sharedEntryGroupId: null,
    ...overrides,
  };
}

function override(overrides: Partial<RecurringOverride> & { id: string; recurringEntryId: string; monthKey: string }): RecurringOverride {
  return {
    name: null,
    category: null,
    entryDate: null,
    amount: null,
    type: null,
    bank: null,
    paymentMethod: null,
    person: null,
    recurrenceDayMode: null,
    recurrenceDay: null,
    investmentYieldMode: null,
    investmentCdiPercent: null,
    deleted: false,
    ...overrides,
  };
}

function closeTo(actual: number, expected: number, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ~${expected}, recebido ${actual} (diferença ${Math.abs(actual - expected)})`,
  );
}

describe("annualCdiToDaily", () => {
  test("CDI anual 0% vira taxa diária 0", () => {
    closeTo(annualCdiToDaily(0), 0);
  });

  test("composto 252x da taxa diária volta pro CDI anual (base 252 dias úteis)", () => {
    const annual = 14.9;
    const daily = annualCdiToDaily(annual);
    const resultado = compoundOverDays(100, daily, 252);
    closeTo(resultado, 100 * (1 + annual / 100), 0.02);
  });
});

describe("compoundOverDays (juros compostos)", () => {
  test("aplica a taxa diária repetidamente, compondo sobre o saldo anterior", () => {
    // 1000 * 1.01^3 = 1030.301
    closeTo(compoundOverDays(1000, 0.01, 3), 1030.301, 1e-9);
  });

  test("0 dias não altera o saldo", () => {
    assert.equal(compoundOverDays(500, 0.05, 0), 500);
  });
});

describe("mercadoPagoTieredDailyYield", () => {
  const dailyCdi = annualCdiToDaily(14.9);

  test("saldo abaixo do limite: 100% na faixa bônus", () => {
    const y = mercadoPagoTieredDailyYield(5000, dailyCdi, MP_SETTINGS);
    closeTo(y, 5000 * dailyYieldFraction(dailyCdi, 120));
  });

  test("saldo acima do limite: parte na faixa bônus, parte na faixa excedente", () => {
    const y = mercadoPagoTieredDailyYield(15000, dailyCdi, MP_SETTINGS);
    const esperado = 10000 * dailyYieldFraction(dailyCdi, 120) + 5000 * dailyYieldFraction(dailyCdi, 100);
    closeTo(y, esperado);
  });

  test("saldo zero não rende nada", () => {
    assert.equal(mercadoPagoTieredDailyYield(0, dailyCdi, MP_SETTINGS), 0);
  });
});

describe("distributeProportionally", () => {
  test("distribui o rendimento proporcional ao saldo de cada pessoa", () => {
    const { carlos, julia } = distributeProportionally(100, 300, 700);
    closeTo(carlos, 30);
    closeTo(julia, 70);
  });

  test("saldo total zero não quebra (retorna zero pros dois)", () => {
    const { carlos, julia } = distributeProportionally(50, 0, 0);
    assert.equal(carlos, 0);
    assert.equal(julia, 0);
  });
});

describe("limite compartilhado entre Carlos e Julia (não é por pessoa)", () => {
  const dailyCdi = annualCdiToDaily(14.9);

  test("Carlos R$8.000 + Julia R$8.000 dividem o MESMO limite de R$10.000", () => {
    // Se o limite fosse individual, os dois estariam 100% na faixa bônus (nenhum excedente).
    const comoSeFossemIndividuais = 8000 * dailyYieldFraction(dailyCdi, 120) * 2;

    // Cálculo correto: saldo total 16.000 → 10.000 na faixa bônus + 6.000 na faixa excedente.
    const total = mercadoPagoTieredDailyYield(16000, dailyCdi, MP_SETTINGS);
    const esperadoCorreto = 10000 * dailyYieldFraction(dailyCdi, 120) + 6000 * dailyYieldFraction(dailyCdi, 100);
    closeTo(total, esperadoCorreto);

    // O cálculo correto rende MENOS que o (errado) individual, porque parte do saldo caiu na faixa de 100%.
    assert.ok(total < comoSeFossemIndividuais);
  });

  test("simulateDailySeries também respeita o limite compartilhado, mesmo com dois lançamentos separados", () => {
    const occurrences = resolveInvestmentOccurrences(
      [
        entry({ id: "carlos-mp", person: "carlos", entryDate: "2026-07-01", amount: 8000 }),
        entry({ id: "julia-mp",  person: "julia",  entryDate: "2026-07-01", amount: 8000 }),
      ],
      [],
      "2026-07-10",
    );
    const daily = simulateDailySeries(occurrences, SETTINGS, "2026-07-02", "2026-07-02");
    assert.equal(daily.length, 1);
    const esperado = mercadoPagoTieredDailyYield(16000, annualCdiToDaily(14.9), MP_SETTINGS);
    closeTo(daily[0].rendimentoDia, esperado, 1e-6);
  });
});

describe("filtro Carlos/Julia não recalcula o limite como se fosse individual", () => {
  test("a simulação usa sempre o saldo total, independente de qual pessoa está sendo exibida", () => {
    const entries = [
      entry({ id: "carlos-mp", person: "carlos", entryDate: "2026-07-01", amount: 8000 }),
      entry({ id: "julia-mp",  person: "julia",  entryDate: "2026-07-01", amount: 8000 }),
    ];
    // projetarInvestimentos SEMPRE recebe a lista completa (não filtrada por
    // pessoa) — a tela só filtra o que é EXIBIDO depois. Aqui simulamos essa
    // regra: passar só os lançamentos do Carlos precisa dar um resultado
    // DIFERENTE (maior rendimento) do que passar os dois juntos, provando
    // que o limite de 10k não pode "resetar" por pessoa.
    const pontosTodos = projetarInvestimentos(entries, [], SETTINGS, "2026-07-02", 1);
    const pontosSoCarlos = projetarInvestimentos(
      entries.filter((e) => e.person === "carlos"),
      [],
      SETTINGS,
      "2026-07-02",
      1,
    );

    const rendimentoCarlosNoTotal = pontosTodos[0].saldoCarlos - 8000;
    const rendimentoSeFosseIsolado = pontosSoCarlos[0].saldoCarlos - 8000;

    // Isolado, os 8.000 do Carlos ficariam 100% na faixa de 120% do CDI.
    // Junto com a Julia (16.000 no total), uma fatia cai na faixa de 100%.
    // Por isso o rendimento do Carlos DEVE ser menor quando calculado corretamente.
    assert.ok(rendimentoCarlosNoTotal < rendimentoSeFosseIsolado);
  });
});

describe("investimento com percentual único do CDI", () => {
  test("rende exatamente saldo * dailyYieldFraction(dailyCdi, cdiPercent) por dia", () => {
    const occurrences = resolveInvestmentOccurrences(
      [
        entry({
          id: "cdb-105",
          person: "julia",
          bank: "inter",
          entryDate: "2026-07-01",
          amount: 2000,
          investmentYieldMode: "single_cdi",
          investmentCdiPercent: 105,
        }),
      ],
      [],
      "2026-07-10",
    );
    const daily = simulateDailySeries(occurrences, SETTINGS, "2026-07-02", "2026-07-02");
    const dailyCdi = annualCdiToDaily(14.9);
    closeTo(daily[0].rendimentoDia, 2000 * dailyYieldFraction(dailyCdi, 105), 1e-6);
  });

  test("percentuais diferentes (100, 105, 110, 120) produzem rendimentos diferentes e crescentes", () => {
    const percentuais = [100, 105, 110, 120];
    const rendimentos = percentuais.map((cdiPercent) => {
      const occurrences = resolveInvestmentOccurrences(
        [entry({ id: `cdb-${cdiPercent}`, entryDate: "2026-07-01", amount: 1000, investmentYieldMode: "single_cdi", investmentCdiPercent: cdiPercent })],
        [],
        "2026-07-10",
      );
      return simulateDailySeries(occurrences, SETTINGS, "2026-07-02", "2026-07-02")[0].rendimentoDia;
    });
    for (let i = 1; i < rendimentos.length; i++) {
      assert.ok(rendimentos[i] > rendimentos[i - 1]);
    }
  });
});

describe("aporte mensal recorrente (fixo)", () => {
  test("gera uma ocorrência por mês, do início até o horizonte", () => {
    const fixo = entry({ id: "salario-invest", entryDate: "2026-01-05", amount: 500, isRecurring: true });
    const occurrences = resolveInvestmentOccurrences([fixo], [], "2026-06-30");
    // jan, fev, mar, abr, mai, jun = 6 ocorrências
    assert.equal(occurrences.length, 6);
    assert.deepEqual(occurrences.map((o) => o.date), [
      "2026-01-05", "2026-02-05", "2026-03-05", "2026-04-05", "2026-05-05", "2026-06-05",
    ]);
  });

  test("um aporte só começa a render no próximo dia útil (não no próprio dia)", () => {
    const fixo = entry({ id: "aporte-unico", entryDate: "2026-07-06", amount: 1000, investmentYieldMode: "single_cdi", investmentCdiPercent: 100 });
    // 2026-07-06 é segunda-feira; simula só esse dia — aporte entra, mas não rende ainda.
    const occurrences = resolveInvestmentOccurrences([fixo], [], "2026-07-06");
    const daily = simulateDailySeries(occurrences, SETTINGS, "2026-07-05", "2026-07-06");
    const diaDoAporte = daily.find((d) => d.date === "2026-07-06")!;
    assert.equal(diaDoAporte.rendimentoDia, 0);
    assert.equal(diaDoAporte.aporteDia, 1000);
  });
});

describe("override de somente um mês", () => {
  test("muda o valor de um mês específico sem afetar os outros (ex: aporte maior por um mês)", () => {
    const fixo = entry({ id: "aporte-fixo", entryDate: "2026-07-01", amount: 1000, isRecurring: true });
    const overrideAgosto = override({
      id: "ov1",
      recurringEntryId: "aporte-fixo",
      monthKey: "2026-08",
      amount: 1800,
    });

    const occurrences = resolveInvestmentOccurrences([fixo], [overrideAgosto], "2026-09-30");
    const porMes = Object.fromEntries(occurrences.map((o) => [o.date.slice(0, 7), o.amount]));

    assert.equal(porMes["2026-07"], 1000);
    assert.equal(porMes["2026-08"], 1800); // só agosto muda
    assert.equal(porMes["2026-09"], 1000); // volta ao normal
  });

  test("override deleted=true remove a ocorrência só daquele mês", () => {
    const fixo = entry({ id: "aporte-fixo-2", entryDate: "2026-07-01", amount: 1000, isRecurring: true });
    const overrideAgosto = override({
      id: "ov2",
      recurringEntryId: "aporte-fixo-2",
      monthKey: "2026-08",
      deleted: true,
    });

    const occurrences = resolveInvestmentOccurrences([fixo], [overrideAgosto], "2026-09-30");
    const meses = occurrences.map((o) => o.date.slice(0, 7));
    assert.deepEqual(meses, ["2026-07", "2026-09"]);
  });
});

describe("rendimento acumulado", () => {
  test("rendimento acumulado total é a soma de Carlos e Julia", () => {
    const occurrences = resolveInvestmentOccurrences(
      [
        entry({ id: "carlos-mp", person: "carlos", entryDate: "2026-07-01", amount: 5000 }),
        entry({ id: "julia-mp", person: "julia", entryDate: "2026-07-01", amount: 5000 }),
      ],
      [],
      "2026-07-10",
    );
    const daily = simulateDailySeries(occurrences, SETTINGS, "2026-07-02", "2026-07-10");
    const last = daily[daily.length - 1];

    closeTo(last.rendimentoAcumuladoTotal, last.rendimentoAcumuladoCarlos + last.rendimentoAcumuladoJulia, 1e-9);
  });

  test("a linha acumulada consegue usar o filtro ativo", () => {
    const pontos = projetarInvestimentos(
      [
        entry({ id: "carlos-mp", person: "carlos", entryDate: "2026-07-01", amount: 5000 }),
        entry({ id: "julia-mp", person: "julia", entryDate: "2026-07-01", amount: 5000 }),
      ],
      [],
      SETTINGS,
      "2026-07-02",
      1,
    );
    const first = pontos[0];

    assert.ok(first.rendimentoAcumuladoTotal > first.rendimentoAcumuladoCarlos);
    assert.ok(first.rendimentoAcumuladoTotal > first.rendimentoAcumuladoJulia);
    closeTo(first.rendimentoAcumuladoTotal, first.rendimentoAcumuladoCarlos + first.rendimentoAcumuladoJulia, 1e-9);
  });

  test("aggregateMonthly soma rendimento por pessoa e mantém rendimento do mês não acumulado", () => {
    const occurrences = resolveInvestmentOccurrences(
      [
        entry({ id: "carlos-fixo", person: "carlos", entryDate: "2026-01-02", amount: 1000, isRecurring: true }),
        entry({ id: "julia-fixo", person: "julia", entryDate: "2026-01-02", amount: 1000, isRecurring: true }),
      ],
      [],
      "2026-03-31",
    );
    const daily = simulateDailySeries(occurrences, SETTINGS, "2026-01-02", "2026-03-31");
    const monthly = aggregateMonthly(daily);
    const fevereiro = monthly.find((p) => p.monthKey === "2026-02")!;
    const janeiro = monthly.find((p) => p.monthKey === "2026-01")!;

    closeTo(fevereiro.rendimentoDoMes, fevereiro.rendimentoDoMesCarlos + fevereiro.rendimentoDoMesJulia, 1e-9);
    closeTo(fevereiro.rendimentoDoMes, fevereiro.rendimentoAcumuladoTotal - janeiro.rendimentoAcumuladoTotal, 1e-9);
    assert.ok(fevereiro.rendimentoDoMes < fevereiro.rendimentoAcumuladoTotal);
  });
});
