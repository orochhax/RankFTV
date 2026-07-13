import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addMonthsToKey, parseBRLInput, monthKeyToDbDate, dbDateToMonthKey,
  personOfAmounts, amountForFilter, filterByPersonParticipation,
  sortByVisibleAmountDesc, sumVisibleAmount, classificarResultado, resultadoPrevisto,
  contarPagoPendente, lastFourMonthKeys, buildExpenseChartPoints, resolverValoresOrcamento,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome,
} from "@/lib/monthly-budget";

function expense(overrides: Partial<MonthlyBudgetExpense> & { id: string }): MonthlyBudgetExpense {
  return {
    monthKey: "2026-08",
    name: "Despesa",
    amountCarlos: 0,
    amountJulia: 0,
    isPaid: false,
    paidAt: null,
    ...overrides,
  };
}

function income(overrides: Partial<MonthlyBudgetIncome> & { id: string }): MonthlyBudgetIncome {
  return {
    monthKey: "2026-08",
    name: "Receita",
    amountCarlos: 0,
    amountJulia: 0,
    ...overrides,
  };
}

describe("virada de ano (dezembro/janeiro)", () => {
  test("addMonthsToKey avança de dezembro pra janeiro do ano seguinte", () => {
    assert.equal(addMonthsToKey("2026-12", 1), "2027-01");
  });

  test("lastFourMonthKeys atravessa a virada do ano corretamente", () => {
    assert.deepEqual(lastFourMonthKeys("2027-01"), ["2026-10", "2026-11", "2026-12", "2027-01"]);
  });
});

describe("parseBRLInput / divisão com centavos", () => {
  test('"125,00" é interpretado como 125 (R$ 125,00)', () => {
    assert.equal(parseBRLInput("125,00"), 125);
  });

  test("resolverValoresOrcamento no modo igual preserva centavos (R$301,01 -> 150,50/150,51)", () => {
    const r = resolverValoresOrcamento({ pessoa: "carlos_e_julia", splitMode: "igual", amountTotal: 301.01, amountCarlos: NaN, amountJulia: NaN });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.valores.amountCarlos, 150.5);
      assert.equal(r.valores.amountJulia, 150.51);
      assert.equal(Math.round((r.valores.amountCarlos + r.valores.amountJulia) * 100), 30101);
    }
  });

  test("resolverValoresOrcamento no modo personalizado exige os dois valores > 0", () => {
    const semJulia = resolverValoresOrcamento({ pessoa: "carlos_e_julia", splitMode: "personalizado", amountTotal: NaN, amountCarlos: 100, amountJulia: 0 });
    assert.equal(semJulia.ok, false);
  });

  test("resolverValoresOrcamento pra pessoa única ignora os outros valores", () => {
    const r = resolverValoresOrcamento({ pessoa: "carlos", splitMode: "igual", amountTotal: 125, amountCarlos: NaN, amountJulia: NaN });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.valores.amountCarlos, 125);
      assert.equal(r.valores.amountJulia, 0);
    }
  });
});

describe("filtros por pessoa", () => {
  const doisCompartilhados = [
    expense({ id: "1", amountCarlos: 100, amountJulia: 0 }),
    expense({ id: "2", amountCarlos: 0, amountJulia: 200 }),
    expense({ id: "3", amountCarlos: 50, amountJulia: 50 }),
  ];

  test("personOfAmounts identifica pessoa única ou compartilhado", () => {
    assert.equal(personOfAmounts({ amountCarlos: 100, amountJulia: 0 }), "carlos");
    assert.equal(personOfAmounts({ amountCarlos: 0, amountJulia: 200 }), "julia");
    assert.equal(personOfAmounts({ amountCarlos: 50, amountJulia: 50 }), "carlos_e_julia");
  });

  test('filtro "todos" mostra todos os itens e soma o total combinado', () => {
    const filtrados = filterByPersonParticipation(doisCompartilhados, "todos");
    assert.equal(filtrados.length, 3);
    assert.equal(sumVisibleAmount(filtrados, "todos"), 400);
  });

  test('filtro "carlos" mostra só quem tem parte do Carlos, e soma só a fatia dele', () => {
    const filtrados = filterByPersonParticipation(doisCompartilhados, "carlos");
    assert.equal(filtrados.length, 2);
    assert.equal(sumVisibleAmount(filtrados, "carlos"), 150);
    assert.equal(amountForFilter(doisCompartilhados[2], "carlos"), 50);
  });

  test('filtro "julia" mostra só quem tem parte da Julia, e soma só a fatia dela', () => {
    const filtrados = filterByPersonParticipation(doisCompartilhados, "julia");
    assert.equal(filtrados.length, 2);
    assert.equal(sumVisibleAmount(filtrados, "julia"), 250);
  });
});

describe("resultado previsto (receitas - despesas)", () => {
  test("resultado positivo quando receitas > despesas", () => {
    const incomes = [income({ id: "r1", amountCarlos: 3000, amountJulia: 2000 })];
    const expenses = [expense({ id: "e1", amountCarlos: 1000, amountJulia: 500 })];
    const r = resultadoPrevisto(incomes, expenses, "2026-08", "todos");
    assert.equal(r.resultado, 3500);
    assert.equal(r.status, "positivo");
  });

  test("resultado negativo quando despesas > receitas", () => {
    const incomes = [income({ id: "r1", amountCarlos: 500, amountJulia: 0 })];
    const expenses = [expense({ id: "e1", amountCarlos: 1000, amountJulia: 0 })];
    const r = resultadoPrevisto(incomes, expenses, "2026-08", "todos");
    assert.equal(r.resultado, -500);
    assert.equal(r.status, "negativo");
  });

  test("resultado neutro quando receitas == despesas", () => {
    const incomes = [income({ id: "r1", amountCarlos: 1000, amountJulia: 0 })];
    const expenses = [expense({ id: "e1", amountCarlos: 1000, amountJulia: 0 })];
    const r = resultadoPrevisto(incomes, expenses, "2026-08", "todos");
    assert.equal(r.resultado, 0);
    assert.equal(r.status, "neutro");
  });

  test("classificarResultado cobre os 3 status", () => {
    assert.equal(classificarResultado(10), "positivo");
    assert.equal(classificarResultado(-10), "negativo");
    assert.equal(classificarResultado(0), "neutro");
  });

  test("resultado do mês ignora lançamentos de outros meses", () => {
    const incomes = [income({ id: "r1", monthKey: "2026-07", amountCarlos: 5000, amountJulia: 0 })];
    const expenses = [expense({ id: "e1", monthKey: "2026-08", amountCarlos: 1000, amountJulia: 0 })];
    const r = resultadoPrevisto(incomes, expenses, "2026-08", "todos");
    assert.equal(r.receitas, 0);
    assert.equal(r.despesas, 1000);
  });
});

describe("ordenação por valor visível", () => {
  test("ordena do maior pro menor conforme o filtro Todos", () => {
    const itens = [
      expense({ id: "a", amountCarlos: 100, amountJulia: 0 }),
      expense({ id: "b", amountCarlos: 0, amountJulia: 300 }),
      expense({ id: "c", amountCarlos: 50, amountJulia: 50 }),
    ];
    const ordenado = sortByVisibleAmountDesc(itens, "todos").map((e) => e.id);
    assert.deepEqual(ordenado, ["b", "a", "c"]);
  });

  test("a ordenação muda conforme o filtro (usa o valor visível daquela pessoa)", () => {
    const itens = [
      expense({ id: "a", amountCarlos: 100, amountJulia: 0 }),
      expense({ id: "b", amountCarlos: 10, amountJulia: 300 }),
    ];
    assert.deepEqual(sortByVisibleAmountDesc(itens, "carlos").map((e) => e.id), ["a", "b"]);
    assert.deepEqual(sortByVisibleAmountDesc(itens, "julia").map((e) => e.id), ["b", "a"]);
  });
});

describe("gráfico: quatro meses (mês atual + 3 anteriores)", () => {
  test("retorna exatamente 4 pontos, na ordem cronológica", () => {
    const pontos = buildExpenseChartPoints([], "2026-08");
    assert.equal(pontos.length, 4);
    assert.deepEqual(pontos.map((p) => p.monthKey), ["2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  test("mês sem despesas aparece com valor zero (não é omitido)", () => {
    const despesas = [expense({ id: "1", monthKey: "2026-08", amountCarlos: 100, amountJulia: 50 })];
    const pontos = buildExpenseChartPoints(despesas, "2026-08");
    const maio = pontos.find((p) => p.monthKey === "2026-05")!;
    assert.equal(maio.carlos, 0);
    assert.equal(maio.julia, 0);
    assert.equal(maio.total, 0);
    const agosto = pontos.find((p) => p.monthKey === "2026-08")!;
    assert.equal(agosto.carlos, 100);
    assert.equal(agosto.julia, 50);
    assert.equal(agosto.total, 150);
  });

  test("soma despesas pagas e pendentes juntas no gráfico", () => {
    const despesas = [
      expense({ id: "1", monthKey: "2026-08", amountCarlos: 100, amountJulia: 0, isPaid: true }),
      expense({ id: "2", monthKey: "2026-08", amountCarlos: 50, amountJulia: 0, isPaid: false }),
    ];
    const agosto = buildExpenseChartPoints(despesas, "2026-08").find((p) => p.monthKey === "2026-08")!;
    assert.equal(agosto.carlos, 150);
  });
});

describe("status pago não afeta os totais", () => {
  test("despesa paga continua contando no total normalmente", () => {
    const expenses = [
      expense({ id: "1", amountCarlos: 100, amountJulia: 0, isPaid: true, paidAt: "2026-08-05T12:00:00.000Z" }),
      expense({ id: "2", amountCarlos: 50, amountJulia: 0, isPaid: false }),
    ];
    assert.equal(sumVisibleAmount(expenses, "todos"), 150);
  });

  test("contarPagoPendente conta certo sem alterar a soma", () => {
    const expenses = [
      expense({ id: "1", amountCarlos: 100, amountJulia: 0, isPaid: true }),
      expense({ id: "2", amountCarlos: 50, amountJulia: 0, isPaid: false }),
      expense({ id: "3", amountCarlos: 0, amountJulia: 30, isPaid: true }),
    ];
    const { pagas, pendentes } = contarPagoPendente(expenses, "2026-08", "todos");
    assert.equal(pagas, 2);
    assert.equal(pendentes, 1);
    assert.equal(sumVisibleAmount(expenses, "todos"), 180);
  });
});

describe("conversão month_key <-> date", () => {
  test("monthKeyToDbDate / dbDateToMonthKey são inversas", () => {
    assert.equal(monthKeyToDbDate("2026-08"), "2026-08-01");
    assert.equal(dbDateToMonthKey("2026-08-01"), "2026-08");
  });
});
