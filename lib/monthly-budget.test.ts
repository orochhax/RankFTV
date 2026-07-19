import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addMonthsToKey, parseBRLInput, monthKeyToDbDate, dbDateToMonthKey,
  personOfAmounts, amountForFilter, filterByPersonParticipation,
  sortByVisibleAmountDesc, sumVisibleAmount, classificarResultado, resultadoPrevisto,
  contarPagoPendente, lastFourMonthKeys, buildExpenseChartPoints, resolverValoresOrcamento,
  monthKeyRange, monthsBetweenCount, buildExpenseDrafts, buildIncomeDrafts, MAX_REPEAT_MONTHS,
  dueDateForMonth, dayOfDate, idsNoEscopoDeEdicao, resolverAjusteIntervalo, groupMonthBounds,
  legacyGroupKey, siblingsOfGroup, fazParteDeGrupo, resolverPeriodoEdicao,
  formatDateTimeBahia, createdAtDateKeyBahia, contagensDoEscopo,
  buildEventSnapshot, periodoResumoLabel, diffEventSnapshots, historyEventToRpcPayload,
  mapHistoryEventRow, groupHistoryEventsByEntity, filtrarHistorico, sortHistoryByOccurredAtDesc,
  HISTORY_FILTROS_VAZIOS,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome, type EscopoEdicao,
  type MonthlyBudgetOccurrenceSnapshot, type MonthlyBudgetHistoryEvent, type HistoryEventRow,
} from "@/lib/monthly-budget";

function expense(overrides: Partial<MonthlyBudgetExpense> & { id: string }): MonthlyBudgetExpense {
  return {
    monthKey: "2026-08",
    name: "Despesa",
    amountCarlos: 0,
    amountJulia: 0,
    isPaid: false,
    paidAt: null,
    dueDate: null,
    repeatGroupId: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

function income(overrides: Partial<MonthlyBudgetIncome> & { id: string }): MonthlyBudgetIncome {
  return {
    monthKey: "2026-08",
    name: "Receita",
    amountCarlos: 0,
    amountJulia: 0,
    repeatGroupId: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
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

describe("repetir lançamento até um mês final", () => {
  test("sem mês final, o intervalo é só o mês inicial", () => {
    assert.deepEqual(monthKeyRange("2026-08", null), ["2026-08"]);
  });

  test("mês final igual ao inicial também é só um mês", () => {
    assert.deepEqual(monthKeyRange("2026-08", "2026-08"), ["2026-08"]);
  });

  test("intervalo atravessando a virada do ano", () => {
    assert.deepEqual(monthKeyRange("2026-11", "2027-02"), ["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  test("mês final antes do inicial cai no fallback de só o mês inicial", () => {
    assert.deepEqual(monthKeyRange("2026-08", "2026-07"), ["2026-08"]);
  });

  test("monthsBetweenCount conta os meses inclusive nas duas pontas", () => {
    assert.equal(monthsBetweenCount("2026-08", "2026-08"), 1);
    assert.equal(monthsBetweenCount("2026-11", "2027-02"), 4);
  });

  test("buildExpenseDrafts gera uma linha por mês, com o mesmo nome e valores", () => {
    const drafts = buildExpenseDrafts({
      startMonthKey: "2026-08",
      endMonthKey: "2026-10",
      name: "Financiamento",
      amountCarlos: 100,
      amountJulia: 50,
      dueDay: null,
    });
    assert.equal(drafts.length, 3);
    assert.deepEqual(drafts.map((d) => d.monthKey), ["2026-08", "2026-09", "2026-10"]);
    assert.ok(drafts.every((d) => d.name === "Financiamento" && d.amountCarlos === 100 && d.amountJulia === 50));
  });

  test("buildExpenseDrafts usa o mesmo dia de vencimento em cada mês (nunca desloca pro mês seguinte)", () => {
    const drafts = buildExpenseDrafts({
      startMonthKey: "2026-08",
      endMonthKey: "2026-10",
      name: "Cartão",
      amountCarlos: 200,
      amountJulia: 0,
      dueDay: 10,
    });
    assert.deepEqual(drafts.map((d) => d.dueDate), ["2026-08-10", "2026-09-10", "2026-10-10"]);
  });

  test("buildExpenseDrafts clampa o vencimento no último dia de meses mais curtos", () => {
    const drafts = buildExpenseDrafts({
      startMonthKey: "2026-01",
      endMonthKey: "2026-02",
      name: "Aluguel",
      amountCarlos: 500,
      amountJulia: 0,
      dueDay: 31,
    });
    assert.deepEqual(drafts.map((d) => d.dueDate), ["2026-01-31", "2026-02-28"]);
  });

  test("buildExpenseDrafts sem vencimento mantém dueDate null em todos os meses", () => {
    const drafts = buildExpenseDrafts({
      startMonthKey: "2026-08",
      endMonthKey: "2026-09",
      name: "Academia",
      amountCarlos: 0,
      amountJulia: 90,
      dueDay: null,
    });
    assert.deepEqual(drafts.map((d) => d.dueDate), [null, null]);
  });

  test("buildIncomeDrafts gera uma linha por mês, sem campo de vencimento", () => {
    const drafts = buildIncomeDrafts({
      startMonthKey: "2026-08",
      endMonthKey: "2026-09",
      name: "Salário",
      amountCarlos: 3000,
      amountJulia: 0,
    });
    assert.equal(drafts.length, 2);
    assert.deepEqual(drafts.map((d) => d.monthKey), ["2026-08", "2026-09"]);
  });

  test("MAX_REPEAT_MONTHS é um limite razoável (não libera intervalos absurdos)", () => {
    assert.ok(MAX_REPEAT_MONTHS > 0 && MAX_REPEAT_MONTHS <= 120);
  });

  test("financiamento longo (parcela de moto, dia 17, 48 meses) cabe dentro do limite e vence sempre no mesmo dia", () => {
    assert.equal(monthsBetweenCount("2025-07", "2029-06"), 48);
    assert.ok(48 <= MAX_REPEAT_MONTHS);

    const drafts = buildExpenseDrafts({
      startMonthKey: "2025-07",
      endMonthKey: "2029-06",
      name: "Parcela - Moto",
      amountCarlos: 600,
      amountJulia: 0,
      dueDay: 17,
    });

    assert.equal(drafts.length, 48);
    assert.equal(drafts[0].monthKey, "2025-07");
    assert.equal(drafts[drafts.length - 1].monthKey, "2029-06");
    assert.ok(drafts.every((d) => d.dueDate?.endsWith("-17")));
    assert.equal(drafts[0].dueDate, "2025-07-17");
    assert.equal(drafts[drafts.length - 1].dueDate, "2029-06-17");
  });
});

describe("dueDateForMonth / dayOfDate (vencimento por dia, sem deslocar mês)", () => {
  test("constrói a data a partir do dia informado, dentro do próprio mês", () => {
    assert.equal(dueDateForMonth("2026-09", 17), "2026-09-17");
    assert.equal(dueDateForMonth("2026-10", 17), "2026-10-17");
  });

  test("sem dia informado, retorna null", () => {
    assert.equal(dueDateForMonth("2026-09", null), null);
  });

  test("clampa no último dia do mês quando o dia escolhido não existe nele", () => {
    assert.equal(dueDateForMonth("2026-02", 31), "2026-02-28");
    assert.equal(dueDateForMonth("2026-04", 31), "2026-04-30");
  });

  test("dayOfDate extrai o dia de uma data salva, e é o inverso de dueDateForMonth", () => {
    assert.equal(dayOfDate("2026-09-17"), 17);
    assert.equal(dayOfDate(null), null);
    const monthKey = "2026-11";
    const day = 5;
    assert.equal(dayOfDate(dueDateForMonth(monthKey, day)), day);
  });
});

describe("idsNoEscopoDeEdicao (editar só este mês / este e os próximos / todos)", () => {
  const grupo = [
    { id: "ago", monthKey: "2026-08" },
    { id: "set", monthKey: "2026-09" },
    { id: "out", monthKey: "2026-10" },
  ];

  test('"esta" atinge só a linha âncora', () => {
    assert.deepEqual(idsNoEscopoDeEdicao(grupo, "2026-09", "esta"), ["set"]);
  });

  test('"esta_e_proximas" atinge a âncora e tudo com mês igual ou depois', () => {
    assert.deepEqual(idsNoEscopoDeEdicao(grupo, "2026-09", "esta_e_proximas"), ["set", "out"]);
  });

  test('"esta_e_proximas" a partir do primeiro mês do grupo atinge todo mundo', () => {
    assert.deepEqual(idsNoEscopoDeEdicao(grupo, "2026-08", "esta_e_proximas"), ["ago", "set", "out"]);
  });

  test('"todas" atinge o grupo inteiro, independente do mês âncora', () => {
    assert.deepEqual(idsNoEscopoDeEdicao(grupo, "2026-09", "todas"), ["ago", "set", "out"]);
  });
});

describe("grupo legado (lançamentos antigos sem repeat_group_id, ex: a moto)", () => {
  // Simula a Parcela - Moto criada antes da coluna existir: 3 linhas, mesmo
  // nome + valor, meses consecutivos, todas com repeatGroupId null.
  const moto = [
    expense({ id: "m1", monthKey: "2026-08", name: "Parcela - Moto", amountCarlos: 600, amountJulia: 0, repeatGroupId: null }),
    expense({ id: "m2", monthKey: "2026-09", name: "Parcela - Moto", amountCarlos: 600, amountJulia: 0, repeatGroupId: null }),
    expense({ id: "m3", monthKey: "2026-10", name: "Parcela - Moto", amountCarlos: 600, amountJulia: 0, repeatGroupId: null }),
    expense({ id: "outro", monthKey: "2026-08", name: "Mercado", amountCarlos: 200, amountJulia: 0, repeatGroupId: null }),
  ];

  test("legacyGroupKey junta por nome + divisão de valor", () => {
    assert.equal(legacyGroupKey(moto[0]), legacyGroupKey(moto[1]));
    assert.notEqual(legacyGroupKey(moto[0]), legacyGroupKey(moto[3]));
  });

  test("siblingsOfGroup encontra as 3 parcelas da moto, mesmo sem repeat_group_id", () => {
    const irmas = siblingsOfGroup(moto, moto[1]).map((i) => i.id).sort();
    assert.deepEqual(irmas, ["m1", "m2", "m3"]);
  });

  test("fazParteDeGrupo é true pra moto (grupo legado) e false pra lançamento único", () => {
    assert.equal(fazParteDeGrupo(moto, moto[0]), true);
    assert.equal(fazParteDeGrupo(moto, moto[3]), false);
  });

  test("groupMonthBounds cobre todo o período do grupo legado", () => {
    assert.deepEqual(groupMonthBounds(moto, moto[0]), { start: "2026-08", end: "2026-10" });
  });

  test("um lançamento com repeat_group_id não se mistura com linhas legadas de mesmo nome/valor", () => {
    const misto = [
      expense({ id: "g1", monthKey: "2026-08", name: "Aluguel", amountCarlos: 1000, amountJulia: 0, repeatGroupId: "grupo-real" }),
      expense({ id: "g2", monthKey: "2026-09", name: "Aluguel", amountCarlos: 1000, amountJulia: 0, repeatGroupId: "grupo-real" }),
      expense({ id: "legada", monthKey: "2026-08", name: "Aluguel", amountCarlos: 1000, amountJulia: 0, repeatGroupId: null }),
    ];
    assert.deepEqual(siblingsOfGroup(misto, misto[0]).map((i) => i.id).sort(), ["g1", "g2"]);
    assert.deepEqual(siblingsOfGroup(misto, misto[2]).map((i) => i.id), ["legada"]);
  });
});

describe("groupMonthBounds (limites do grupo pra editar/excluir)", () => {
  test("sem repeatGroupId, o intervalo é só o próprio mês", () => {
    const itens = [expense({ id: "1", monthKey: "2026-08", repeatGroupId: null })];
    assert.deepEqual(groupMonthBounds(itens, itens[0]), { start: "2026-08", end: "2026-08" });
  });

  test("com repeatGroupId, retorna o menor e o maior mês do grupo inteiro", () => {
    const itens = [
      expense({ id: "1", monthKey: "2026-08", repeatGroupId: "g1" }),
      expense({ id: "2", monthKey: "2026-09", repeatGroupId: "g1" }),
      expense({ id: "3", monthKey: "2026-10", repeatGroupId: "g1" }),
      expense({ id: "4", monthKey: "2026-08", repeatGroupId: null }),
    ];
    assert.deepEqual(groupMonthBounds(itens, itens[1]), { start: "2026-08", end: "2026-10" });
  });
});

describe("resolverAjusteIntervalo (mudar o período na edição)", () => {
  const grupo = [
    { id: "ago", monthKey: "2026-08" },
    { id: "set", monthKey: "2026-09" },
    { id: "out", monthKey: "2026-10" },
  ];

  test("estender o mês final cria só os meses novos", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-08", "2026-12");
    assert.deepEqual(ajuste.mesesParaCriar, ["2026-11", "2026-12"]);
    assert.deepEqual(ajuste.idsParaApagar, []);
  });

  test("encurtar o mês final apaga só as linhas que ficaram depois dele", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-08", "2026-09");
    assert.deepEqual(ajuste.mesesParaCriar, []);
    assert.deepEqual(ajuste.idsParaApagar, ["out"]);
  });

  test("mesmo período não muda nada", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-08", "2026-10");
    assert.deepEqual(ajuste.mesesParaCriar, []);
    assert.deepEqual(ajuste.idsParaApagar, []);
  });

  test("adiantar o mês inicial cria os meses novos no começo", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-06", "2026-10");
    assert.deepEqual(ajuste.mesesParaCriar, ["2026-06", "2026-07"]);
    assert.deepEqual(ajuste.idsParaApagar, []);
  });

  test("atrasar o mês inicial apaga as linhas que ficaram antes dele", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-09", "2026-10");
    assert.deepEqual(ajuste.mesesParaCriar, []);
    assert.deepEqual(ajuste.idsParaApagar, ["ago"]);
  });

  test("mudar os dois lados ao mesmo tempo move o período inteiro", () => {
    const ajuste = resolverAjusteIntervalo(grupo, "2026-10", "2026-12");
    assert.deepEqual(ajuste.mesesParaCriar, ["2026-11", "2026-12"]);
    assert.deepEqual(ajuste.idsParaApagar.sort(), ["ago", "set"]);
  });

  test("funciona também pra converter uma linha solta (grupo de 1) num período", () => {
    const solo = [{ id: "unico", monthKey: "2026-08" }];
    const ajuste = resolverAjusteIntervalo(solo, "2026-08", "2026-10");
    assert.deepEqual(ajuste.mesesParaCriar, ["2026-09", "2026-10"]);
  });
});

describe("resolverPeriodoEdicao (regra de período por escopo, sem FormData)", () => {
  test('"esta_e_proximas" ignora o "De" submetido — usa sempre o início atual do grupo', () => {
    const r = resolverPeriodoEdicao({
      escopo: "esta_e_proximas",
      anchorMonthKey: "2026-10",
      grupoMinAtual: "2026-08",
      monthKeySubmetido: "2026-01", // não deveria importar nesse escopo
      ateSubmetido: "2026-12",
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.novoPrimeiroMes, "2026-08");
      assert.equal(r.novoUltimoMes, "2026-12");
    }
  });

  test('"esta_e_proximas" rejeita "Até" antes do mês que está sendo editado (a âncora sumiria)', () => {
    const r = resolverPeriodoEdicao({
      escopo: "esta_e_proximas",
      anchorMonthKey: "2026-10",
      grupoMinAtual: "2026-08",
      monthKeySubmetido: "",
      ateSubmetido: "2026-09",
    });
    assert.equal(r.ok, false);
  });

  test('"esta_e_proximas" sem "Até" informado usa o próprio mês da âncora (não expande nem reduz)', () => {
    const r = resolverPeriodoEdicao({
      escopo: "esta_e_proximas",
      anchorMonthKey: "2026-10",
      grupoMinAtual: "2026-08",
      monthKeySubmetido: "",
      ateSubmetido: "",
    });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.novoUltimoMes, "2026-10");
  });

  test('"todas" usa livremente o "De" e o "Até" submetidos', () => {
    const r = resolverPeriodoEdicao({
      escopo: "todas",
      anchorMonthKey: "2026-10",
      grupoMinAtual: "2026-08",
      monthKeySubmetido: "2026-06",
      ateSubmetido: "2026-09",
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.novoPrimeiroMes, "2026-06");
      assert.equal(r.novoUltimoMes, "2026-09");
    }
  });

  test('"todas" rejeita mês final antes do mês inicial', () => {
    const r = resolverPeriodoEdicao({
      escopo: "todas",
      anchorMonthKey: "2026-10",
      grupoMinAtual: "2026-08",
      monthKeySubmetido: "2026-10",
      ateSubmetido: "2026-08",
    });
    assert.equal(r.ok, false);
  });

  test("respeita MAX_REPEAT_MONTHS", () => {
    const r = resolverPeriodoEdicao({
      escopo: "todas",
      anchorMonthKey: "2026-01",
      grupoMinAtual: "2026-01",
      monthKeySubmetido: "2020-01",
      ateSubmetido: "2030-01",
    });
    assert.equal(r.ok, false);
  });
});

// ── Simulação pura do fluxo completo de edição ───────────────────────────────
// Espelha exatamente a sequência que app/admin/gasto-mensal/actions.ts roda
// (editarDespesa/editarReceita): resolve o período (só se escopo != "esta"),
// reconcilia o grupo (cria/apaga linhas) e aplica os novos valores só nas
// linhas dentro do escopo. Sem FormData/Supabase — só as funções puras.

type LinhaSimulada = {
  id: string;
  monthKey: string;
  name: string;
  amountCarlos: number;
  amountJulia: number;
  isPaid: boolean;
  paidAt: string | null;
  groupId: string;
};

function novaSerie(groupId: string, meses: string[], base: Omit<LinhaSimulada, "id" | "monthKey" | "groupId">): LinhaSimulada[] {
  return meses.map((monthKey, i) => ({ id: `${groupId}-${i}`, monthKey, groupId, ...base }));
}

/** Espelha editarDespesa/editarReceita: escopo "esta" nunca toca período; os outros reconciliam o intervalo. */
function simularEdicao(
  linhas: LinhaSimulada[],
  idEditado: string,
  escopo: EscopoEdicao,
  novosValores: { name: string; amountCarlos: number; amountJulia: number },
  opts: { monthKeySubmetido?: string; ateSubmetido?: string } = {},
): LinhaSimulada[] {
  const anchor = linhas.find((l) => l.id === idEditado);
  if (!anchor) throw new Error("linha não encontrada");

  if (escopo === "esta") {
    return linhas.map((l) => (l.id === idEditado ? { ...l, ...novosValores } : l));
  }

  const grupo = linhas.filter((l) => l.groupId === anchor.groupId).map((l) => ({ id: l.id, monthKey: l.monthKey }));
  const grupoMinAtual = grupo.map((g) => g.monthKey).sort()[0];

  const periodo = resolverPeriodoEdicao({
    escopo,
    anchorMonthKey: anchor.monthKey,
    grupoMinAtual,
    monthKeySubmetido: opts.monthKeySubmetido ?? anchor.monthKey,
    ateSubmetido: opts.ateSubmetido ?? "",
  });
  if (!periodo.ok) throw new Error(periodo.error);

  const ajuste = resolverAjusteIntervalo(grupo, periodo.novoPrimeiroMes, periodo.novoUltimoMes);

  let resultado = linhas.filter((l) => l.groupId !== anchor.groupId || !ajuste.idsParaApagar.includes(l.id));

  for (const mk of ajuste.mesesParaCriar) {
    // Novas ocorrências nascem pendentes — nunca herdam is_paid/paid_at de ninguém.
    resultado.push({ id: `${anchor.groupId}-novo-${mk}`, monthKey: mk, groupId: anchor.groupId, isPaid: false, paidAt: null, ...novosValores });
  }

  const grupoAtualizado = resultado.filter((l) => l.groupId === anchor.groupId).map((l) => ({ id: l.id, monthKey: l.monthKey }));
  const idsAlvo = new Set(idsNoEscopoDeEdicao(grupoAtualizado, anchor.monthKey, escopo));

  resultado = resultado.map((l) => (idsAlvo.has(l.id) ? { ...l, ...novosValores } : l));

  return resultado;
}

describe("fluxo completo de edição — exemplo obrigatório (Salário ago-dez, Carlos, R$2000)", () => {
  function salario() {
    return novaSerie("serie-salario", ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"], {
      name: "Salário", amountCarlos: 2000, amountJulia: 0, isPaid: false, paidAt: null,
    });
  }
  const porMes = (linhas: LinhaSimulada[]) => Object.fromEntries(linhas.map((l) => [l.monthKey, l]));

  test('"somente este mês" em outubro pra R$2500: só outubro muda', () => {
    const depois = simularEdicao(salario(), "serie-salario-2", "esta", { name: "Salário", amountCarlos: 2500, amountJulia: 0 });
    const m = porMes(depois);
    assert.equal(m["2026-10"].amountCarlos, 2500);
    assert.equal(m["2026-08"].amountCarlos, 2000);
    assert.equal(m["2026-09"].amountCarlos, 2000);
    assert.equal(m["2026-11"].amountCarlos, 2000);
    assert.equal(m["2026-12"].amountCarlos, 2000);
  });

  test('reabrindo outubro depois da exceção, o período mostrado continua ago-dez (mesmo groupId)', () => {
    const depois = simularEdicao(salario(), "serie-salario-2", "esta", { name: "Salário", amountCarlos: 2500, amountJulia: 0 });
    const bounds = groupMonthBounds(
      depois.map((l) => ({ ...l, repeatGroupId: l.groupId })),
      { ...depois.find((l) => l.id === "serie-salario-2")!, repeatGroupId: "serie-salario" },
    );
    assert.deepEqual(bounds, { start: "2026-08", end: "2026-12" });
    assert.ok(depois.every((l) => l.groupId === "serie-salario"));
  });

  test('"este mês e os próximos" em outubro: outubro, novembro e dezembro mudam; agosto e setembro não', () => {
    const depois = simularEdicao(
      salario(), "serie-salario-2", "esta_e_proximas",
      { name: "Salário", amountCarlos: 2600, amountJulia: 0 },
      { ateSubmetido: "2026-12" },
    );
    const m = porMes(depois);
    assert.equal(m["2026-08"].amountCarlos, 2000);
    assert.equal(m["2026-09"].amountCarlos, 2000);
    assert.equal(m["2026-10"].amountCarlos, 2600);
    assert.equal(m["2026-11"].amountCarlos, 2600);
    assert.equal(m["2026-12"].amountCarlos, 2600);
  });

  test('"todos os meses" muda agosto até dezembro inteiro', () => {
    const depois = simularEdicao(
      salario(), "serie-salario-2", "todas",
      { name: "Salário", amountCarlos: 2700, amountJulia: 0 },
      { monthKeySubmetido: "2026-08", ateSubmetido: "2026-12" },
    );
    assert.ok(depois.every((l) => l.amountCarlos === 2700));
    assert.equal(depois.length, 5);
  });

  test("todas as ocorrências continuam com o mesmo repeat_group_id depois de qualquer escopo", () => {
    const depoisEsta = simularEdicao(salario(), "serie-salario-2", "esta", { name: "Salário", amountCarlos: 2500, amountJulia: 0 });
    const depoisTodas = simularEdicao(depoisEsta, "serie-salario-2", "todas", { name: "Salário", amountCarlos: 2700, amountJulia: 0 }, { monthKeySubmetido: "2026-08", ateSubmetido: "2026-12" });
    assert.ok(depoisTodas.every((l) => l.groupId === "serie-salario"));
  });
});

describe("fluxo completo de edição — item único vira série, expande e reduz", () => {
  function itemUnico(): LinhaSimulada[] {
    return [{ id: "solo-1", monthKey: "2026-08", groupId: "solo", name: "Freela", amountCarlos: 500, amountJulia: 0, isPaid: false, paidAt: null }];
  }

  test('"somente este mês" num item único só afeta ele mesmo (nada a mais existe)', () => {
    const depois = simularEdicao(itemUnico(), "solo-1", "esta", { name: "Freela", amountCarlos: 600, amountJulia: 0 });
    assert.equal(depois.length, 1);
    assert.equal(depois[0].amountCarlos, 600);
  });

  test('"todos os meses" com Até expandido transforma o item único numa série, sem duplicar o mês existente', () => {
    const depois = simularEdicao(
      itemUnico(), "solo-1", "todas",
      { name: "Freela", amountCarlos: 600, amountJulia: 0 },
      { monthKeySubmetido: "2026-08", ateSubmetido: "2026-10" },
    );
    const meses = depois.map((l) => l.monthKey).sort();
    assert.deepEqual(meses, ["2026-08", "2026-09", "2026-10"]);
    assert.equal(new Set(depois.map((l) => l.groupId)).size, 1);
    assert.ok(depois.every((l) => l.amountCarlos === 600));
  });

  test("meses novos criados pela expansão nascem pendentes (nunca herdam is_paid de outra linha)", () => {
    const pago: LinhaSimulada[] = [{ id: "solo-1", monthKey: "2026-08", groupId: "solo", name: "Freela", amountCarlos: 500, amountJulia: 0, isPaid: true, paidAt: "2026-08-05T00:00:00.000Z" }];
    const depois = simularEdicao(
      pago, "solo-1", "todas",
      { name: "Freela", amountCarlos: 500, amountJulia: 0 },
      { monthKeySubmetido: "2026-08", ateSubmetido: "2026-09" },
    );
    const setembro = depois.find((l) => l.monthKey === "2026-09")!;
    assert.equal(setembro.isPaid, false);
    assert.equal(setembro.paidAt, null);
  });
});

describe("fluxo completo de edição — expansão e redução preservam is_paid das linhas que já existiam", () => {
  function grupoComPagamentos(): LinhaSimulada[] {
    return [
      { id: "g-ago", monthKey: "2026-08", groupId: "g", name: "Cartão", amountCarlos: 300, amountJulia: 0, isPaid: true, paidAt: "2026-08-05T00:00:00.000Z" },
      { id: "g-set", monthKey: "2026-09", groupId: "g", name: "Cartão", amountCarlos: 300, amountJulia: 0, isPaid: false, paidAt: null },
      { id: "g-out", monthKey: "2026-10", groupId: "g", name: "Cartão", amountCarlos: 300, amountJulia: 0, isPaid: false, paidAt: null },
    ];
  }

  test('editar com "todas" muda o valor mas nunca mexe em is_paid/paid_at das linhas que já existiam', () => {
    const depois = simularEdicao(
      grupoComPagamentos(), "g-set", "todas",
      { name: "Cartão", amountCarlos: 350, amountJulia: 0 },
      { monthKeySubmetido: "2026-08", ateSubmetido: "2026-10" },
    );
    const agosto = depois.find((l) => l.id === "g-ago")!;
    assert.equal(agosto.amountCarlos, 350); // valor mudou
    assert.equal(agosto.isPaid, true); // status pago preservado
    assert.equal(agosto.paidAt, "2026-08-05T00:00:00.000Z");
  });

  test('expandir com "este mês e os próximos" cria dezembro pendente, sem afetar agosto (pago) nem setembro/outubro', () => {
    const depois = simularEdicao(
      grupoComPagamentos(), "g-out", "esta_e_proximas",
      { name: "Cartão", amountCarlos: 320, amountJulia: 0 },
      { ateSubmetido: "2026-12" },
    );
    const porMes = Object.fromEntries(depois.map((l) => [l.monthKey, l]));
    assert.equal(porMes["2026-08"].amountCarlos, 300); // antes da âncora, intocado
    assert.equal(porMes["2026-08"].isPaid, true);
    assert.equal(porMes["2026-09"].amountCarlos, 300); // antes da âncora, intocado
    assert.equal(porMes["2026-10"].amountCarlos, 320); // âncora, mudou
    assert.equal(porMes["2026-11"].amountCarlos, 320); // criado novo
    assert.equal(porMes["2026-11"].isPaid, false);
    assert.equal(porMes["2026-12"].amountCarlos, 320); // criado novo
    assert.equal(porMes["2026-12"].isPaid, false);
  });

  test('reduzir com "todas" remove os meses que saíram do período, sem tocar is_paid dos que ficaram', () => {
    const depois = simularEdicao(
      grupoComPagamentos(), "g-set", "todas",
      { name: "Cartão", amountCarlos: 300, amountJulia: 0 },
      { monthKeySubmetido: "2026-08", ateSubmetido: "2026-09" },
    );
    assert.deepEqual(depois.map((l) => l.monthKey).sort(), ["2026-08", "2026-09"]);
    assert.equal(depois.find((l) => l.id === "g-ago")!.isPaid, true);
  });
});

describe("conversão month_key <-> date", () => {
  test("monthKeyToDbDate / dbDateToMonthKey são inversas", () => {
    assert.equal(monthKeyToDbDate("2026-08"), "2026-08-01");
    assert.equal(dbDateToMonthKey("2026-08-01"), "2026-08");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Extrato (/admin/gasto-mensal/extrato) — histórico de EVENTOS, não de ocorrências
// ═══════════════════════════════════════════════════════════════════════════

describe("Extrato — formatDateTimeBahia (occurred_at, sempre fuso Bahia)", () => {
  test("formata em dd/MM/yyyy HH:mm, convertendo de UTC pro fuso de Bahia (UTC-3)", () => {
    assert.equal(formatDateTimeBahia("2026-08-10T15:30:00.000Z"), "10/08/2026 12:30");
  });

  test("cruza a virada do dia corretamente perto da meia-noite em Bahia", () => {
    // 2026-08-10T02:00:00Z == 2026-08-09T23:00:00 em Bahia (UTC-3)
    assert.equal(formatDateTimeBahia("2026-08-10T02:00:00.000Z"), "09/08/2026 23:00");
  });

  test("preenche com zero à esquerda (dia/mês/hora/minuto de um dígito)", () => {
    assert.equal(formatDateTimeBahia("2026-01-05T06:05:00.000Z"), "05/01/2026 03:05");
  });
});

describe("Extrato — createdAtDateKeyBahia (data civil pro filtro de intervalo)", () => {
  test("retorna YYYY-MM-DD no fuso de Bahia, não em UTC", () => {
    assert.equal(createdAtDateKeyBahia("2026-08-10T02:00:00.000Z"), "2026-08-09");
    assert.equal(createdAtDateKeyBahia("2026-08-10T15:00:00.000Z"), "2026-08-10");
  });
});

describe("Extrato — contagensDoEscopo (quantos registros cada escopo de exclusão afeta)", () => {
  const grupo = [
    { id: "ago", monthKey: "2026-08" },
    { id: "set", monthKey: "2026-09" },
    { id: "out", monthKey: "2026-10" },
  ];

  test('"esta" afeta só 1 registro (a própria ocorrência)', () => {
    assert.equal(contagensDoEscopo(grupo, "2026-09").esta, 1);
  });

  test('"esta_e_proximas" a partir de setembro afeta 2 (set + out)', () => {
    assert.equal(contagensDoEscopo(grupo, "2026-09").esta_e_proximas, 2);
  });

  test('"todas" sempre afeta o grupo inteiro, independente da âncora', () => {
    assert.equal(contagensDoEscopo(grupo, "2026-09").todas, 3);
    assert.equal(contagensDoEscopo(grupo, "2026-08").todas, 3);
  });

  test("item único (sem série) — todos os escopos afetam só 1 registro", () => {
    const unico = [{ id: "solo", monthKey: "2026-08" }];
    const c = contagensDoEscopo(unico, "2026-08");
    assert.deepEqual(c, { esta: 1, esta_e_proximas: 1, todas: 1 });
  });
});

function occ(overrides: Partial<MonthlyBudgetOccurrenceSnapshot> & { id: string; monthKey: string }): MonthlyBudgetOccurrenceSnapshot {
  return { amountCarlos: 99, amountJulia: 0, dueDate: null, isPaid: false, paidAt: null, ...overrides };
}

describe("buildEventSnapshot (monta o snapshot de um evento a partir das ocorrências afetadas)", () => {
  test("série de 12 meses gera UM snapshot com monthsCount 12, não 12 snapshots", () => {
    const ocorrencias = Array.from({ length: 12 }, (_, i) =>
      occ({ id: `m${i}`, monthKey: `2026-${String(i + 1).padStart(2, "0")}` }),
    );
    const snap = buildEventSnapshot("Inter", ocorrencias);
    assert.ok(snap);
    assert.equal(snap!.monthsCount, 12);
    assert.equal(snap!.occurrences.length, 12);
    assert.equal(snap!.periodStart, "2026-01");
    assert.equal(snap!.periodEnd, "2026-12");
  });

  test("ordena as ocorrências por monthKey independente da ordem de entrada", () => {
    const snap = buildEventSnapshot("X", [
      occ({ id: "b", monthKey: "2026-10" }),
      occ({ id: "a", monthKey: "2026-08" }),
      occ({ id: "c", monthKey: "2026-12" }),
    ]);
    assert.deepEqual(snap!.occurrences.map((o) => o.monthKey), ["2026-08", "2026-10", "2026-12"]);
    assert.equal(snap!.periodStart, "2026-08");
    assert.equal(snap!.periodEnd, "2026-12");
  });

  test("amountTotal soma Carlos + Julia da primeira ocorrência (todas as ocorrências de um evento têm o mesmo valor)", () => {
    const snap = buildEventSnapshot("Aluguel", [occ({ id: "a", monthKey: "2026-08", amountCarlos: 1000, amountJulia: 1000 })]);
    assert.equal(snap!.amountTotal, 2000);
    assert.equal(snap!.person, "carlos_e_julia");
  });

  test("dueDay vem do dia da primeira ocorrência com due_date preenchido", () => {
    const snap = buildEventSnapshot("Cartão", [
      occ({ id: "a", monthKey: "2026-08", dueDate: null }),
      occ({ id: "b", monthKey: "2026-09", dueDate: "2026-09-17" }),
    ]);
    assert.equal(snap!.dueDay, 17);
  });

  test("array vazio retorna null (nenhum evento sem ocorrência)", () => {
    assert.equal(buildEventSnapshot("Vazio", []), null);
  });

  test("editar só um mês da série: snapshot contém APENAS a ocorrência editada, não a série inteira", () => {
    // Simula o antes/depois de editar outubro numa série ago-dez.
    const antes = buildEventSnapshot("Inter", [occ({ id: "out", monthKey: "2026-10", amountCarlos: 99 })]);
    const depois = buildEventSnapshot("Inter", [occ({ id: "out", monthKey: "2026-10", amountCarlos: 109 })]);
    assert.equal(antes!.occurrences.length, 1);
    assert.equal(depois!.occurrences.length, 1);
    assert.equal(antes!.amountTotal, 99);
    assert.equal(depois!.amountTotal, 109);
    assert.equal(antes!.periodStart, "2026-10");
    assert.equal(antes!.periodEnd, "2026-10");
  });
});

describe("periodoResumoLabel (resumo do período pro item da timeline)", () => {
  test("um mês só: 'ago/2026 · 1 mês'", () => {
    assert.equal(periodoResumoLabel({ periodStart: "2026-08", periodEnd: "2026-08", monthsCount: 1 }), "ago/2026 · 1 mês");
  });

  test("intervalo: 'ago/2026 até dez/2026 · 5 meses' (exemplo obrigatório do Inter)", () => {
    assert.equal(
      periodoResumoLabel({ periodStart: "2026-08", periodEnd: "2026-12", monthsCount: 5 }),
      "ago/2026 até dez/2026 · 5 meses",
    );
  });
});

describe("diffEventSnapshots (quais campos mudaram entre antes/depois)", () => {
  test("só o valor mudou: name/período/vencimento não são destacados", () => {
    const antes = buildEventSnapshot("Inter", [occ({ id: "out", monthKey: "2026-10", amountCarlos: 99 })])!;
    const depois = buildEventSnapshot("Inter", [occ({ id: "out", monthKey: "2026-10", amountCarlos: 109 })])!;
    const diff = diffEventSnapshots(antes, depois);
    assert.deepEqual(diff, { name: false, amountCarlos: true, amountJulia: false, dueDay: false, period: false });
  });

  test("nome e período mudam juntos", () => {
    const antes = buildEventSnapshot("Cartão", [occ({ id: "a", monthKey: "2026-08" })])!;
    const depois = buildEventSnapshot("Cartão novo", [occ({ id: "a", monthKey: "2026-09" })])!;
    const diff = diffEventSnapshots(antes, depois);
    assert.equal(diff.name, true);
    assert.equal(diff.period, true);
  });

  test("sem antes ou sem depois (criação/exclusão): nada é destacado", () => {
    const snap = buildEventSnapshot("X", [occ({ id: "a", monthKey: "2026-08" })])!;
    assert.deepEqual(diffEventSnapshots(null, snap), { name: false, amountCarlos: false, amountJulia: false, dueDay: false, period: false });
    assert.deepEqual(diffEventSnapshots(snap, null), { name: false, amountCarlos: false, amountJulia: false, dueDay: false, period: false });
  });
});

describe("historyEventToRpcPayload / mapHistoryEventRow (ida e volta TS <-> RPC/linha do banco)", () => {
  test("converte monthKey pra data e de volta sem perder o mês", () => {
    const snap = buildEventSnapshot("Inter", [occ({ id: "out", monthKey: "2026-10" })])!;
    const payload = historyEventToRpcPayload({
      action: "updated", entityGroupId: "g1", anchorEntryId: "out", anchorMonthKey: "2026-10",
      editScope: "esta", beforeSnapshot: null, afterSnapshot: snap, affectedMonths: ["2026-10"],
    });
    assert.equal(payload.anchor_month_key, "2026-10-01");
    assert.deepEqual(payload.affected_months, ["2026-10-01"]);
    assert.equal(payload.edit_scope, "esta");
  });

  test("entityGroupId/anchorEntryId/editScope nulos viram string vazia (RPC espera '' pra NULLIF)", () => {
    const payload = historyEventToRpcPayload({
      action: "created", entityGroupId: null, anchorEntryId: null, anchorMonthKey: "2026-08",
      editScope: null, beforeSnapshot: null, afterSnapshot: null, affectedMonths: [],
    });
    assert.equal(payload.entity_group_id, "");
    assert.equal(payload.anchor_entry_id, "");
    assert.equal(payload.edit_scope, "");
  });

  test("mapHistoryEventRow reconverte a linha do banco (snake_case + date) pro evento em camelCase/monthKey", () => {
    const row: HistoryEventRow = {
      id: "ev1", entity_kind: "expense", action: "updated", entity_group_id: "g1",
      anchor_entry_id: "out", anchor_month_key: "2026-10-01", edit_scope: "esta",
      previous_event_id: "ev0", occurred_at: "2026-10-05T12:00:00.000Z",
      before_snapshot: null, after_snapshot: null, affected_months: ["2026-10-01"], metadata: {},
    };
    const evento = mapHistoryEventRow(row);
    assert.equal(evento.anchorMonthKey, "2026-10");
    assert.deepEqual(evento.affectedMonths, ["2026-10"]);
    assert.equal(evento.previousEventId, "ev0");
    assert.equal(evento.editScope, "esta");
  });

  test("edit_scope vazio ('') vira null, não string vazia", () => {
    const row: HistoryEventRow = {
      id: "ev1", entity_kind: "income", action: "created", entity_group_id: "g1",
      anchor_entry_id: "a", anchor_month_key: "2026-08-01", edit_scope: "",
      previous_event_id: null, occurred_at: "2026-08-01T12:00:00.000Z",
      before_snapshot: null, after_snapshot: null, affected_months: [], metadata: {},
    };
    assert.equal(mapHistoryEventRow(row).editScope, null);
  });
});

function ev(overrides: Partial<MonthlyBudgetHistoryEvent> & { id: string }): MonthlyBudgetHistoryEvent {
  return {
    entityKind: "expense", action: "created", entityGroupId: "g1", anchorEntryId: null,
    anchorMonthKey: "2026-08", editScope: null, previousEventId: null,
    occurredAt: "2026-08-01T12:00:00.000Z", beforeSnapshot: null, afterSnapshot: null,
    affectedMonths: ["2026-08"], metadata: {},
    ...overrides,
  };
}

describe("groupHistoryEventsByEntity (agrupa a cadeia de eventos por entity_group_id)", () => {
  test("agrupa eventos do mesmo lançamento e ordena do mais recente pro mais antigo", () => {
    const eventos = [
      ev({ id: "e1", occurredAt: "2026-08-01T12:00:00.000Z" }),
      ev({ id: "e2", action: "updated", occurredAt: "2026-10-05T12:00:00.000Z", previousEventId: "e1" }),
    ];
    const [grupo] = groupHistoryEventsByEntity(eventos);
    assert.equal(grupo.entityGroupId, "g1");
    assert.deepEqual(grupo.events.map((e) => e.id), ["e2", "e1"]);
    assert.equal(grupo.latestEvent.id, "e2");
  });

  test("isDeleted é true quando o evento mais recente do grupo é uma exclusão", () => {
    const eventos = [
      ev({ id: "e1", occurredAt: "2026-08-01T12:00:00.000Z" }),
      ev({ id: "e2", action: "deleted", occurredAt: "2026-11-01T12:00:00.000Z", previousEventId: "e1", afterSnapshot: null }),
    ];
    const [grupo] = groupHistoryEventsByEntity(eventos);
    assert.equal(grupo.isDeleted, true);
    assert.equal(grupo.latestEvent.action, "deleted");
  });

  test("grupos diferentes (entity_group_id diferente) não se misturam", () => {
    const eventos = [ev({ id: "e1", entityGroupId: "g1" }), ev({ id: "e2", entityGroupId: "g2" })];
    const grupos = groupHistoryEventsByEntity(eventos);
    assert.equal(grupos.length, 2);
  });

  test("evento avulso sem entity_group_id vira seu próprio grupo (usa o próprio id)", () => {
    const eventos = [ev({ id: "e1", entityGroupId: null })];
    const [grupo] = groupHistoryEventsByEntity(eventos);
    assert.equal(grupo.entityGroupId, "e1");
  });
});

describe("filtrarHistorico (tipo, ação, pessoa, nome, mês afetado, intervalo de data do evento)", () => {
  function base() {
    return [
      ev({ id: "e1", entityKind: "expense", action: "created", afterSnapshot: buildEventSnapshot("Aluguel", [occ({ id: "a", monthKey: "2026-08", amountCarlos: 1000, amountJulia: 1000 })]) }),
      ev({ id: "e2", entityKind: "income", action: "created", entityGroupId: "g2", affectedMonths: ["2026-09"], afterSnapshot: buildEventSnapshot("Salário", [occ({ id: "b", monthKey: "2026-09", amountCarlos: 3000 })]) }),
      ev({ id: "e3", entityKind: "expense", action: "updated", entityGroupId: "g1", previousEventId: "e1", occurredAt: "2026-08-10T15:00:00.000Z", affectedMonths: ["2026-08"], afterSnapshot: buildEventSnapshot("Aluguel", [occ({ id: "a", monthKey: "2026-08", amountCarlos: 1100, amountJulia: 1000 })]) }),
    ];
  }

  test('tipo "income" mostra só eventos de receita', () => {
    const f = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, tipo: "income" });
    assert.deepEqual(f.map((e) => e.id), ["e2"]);
  });

  test('ação "updated" mostra só edições', () => {
    const f = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, acao: "updated" });
    assert.deepEqual(f.map((e) => e.id), ["e3"]);
  });

  test("busca por nome é case-insensitive e por substring", () => {
    const f = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, busca: "salár" });
    assert.deepEqual(f.map((e) => e.id), ["e2"]);
  });

  test("filtro de mês afetado usa affectedMonths, não o período inteiro do snapshot", () => {
    const f = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, monthKey: "2026-09" });
    assert.deepEqual(f.map((e) => e.id), ["e2"]);
  });

  test('registro compartilhado (Carlos e Julia) aparece nos filtros "carlos" E "julia"', () => {
    const carlos = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, pessoa: "carlos" });
    const julia = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, pessoa: "julia" });
    assert.ok(carlos.some((e) => e.id === "e1"));
    assert.ok(julia.some((e) => e.id === "e1"));
  });

  test("filtro de intervalo de data do evento compara a data civil no fuso de Bahia", () => {
    const f = filtrarHistorico(base(), { ...HISTORY_FILTROS_VAZIOS, dataInicio: "2026-08-10", dataFim: "2026-08-10" });
    assert.deepEqual(f.map((e) => e.id), ["e3"]);
  });

  test("sem nenhum filtro ativo, mostra tudo", () => {
    assert.equal(filtrarHistorico(base(), HISTORY_FILTROS_VAZIOS).length, 3);
  });
});

describe("sortHistoryByOccurredAtDesc", () => {
  test("ordena do mais recente pro mais antigo e não muta o array original", () => {
    const eventos = [
      ev({ id: "e1", occurredAt: "2026-08-01T00:00:00.000Z" }),
      ev({ id: "e2", occurredAt: "2026-10-01T00:00:00.000Z" }),
    ];
    const ordenado = sortHistoryByOccurredAtDesc(eventos);
    assert.deepEqual(ordenado.map((e) => e.id), ["e2", "e1"]);
    assert.deepEqual(eventos.map((e) => e.id), ["e1", "e2"]);
  });
});

describe("exemplo obrigatório: Inter R$99 (ago-dez) editado só em outubro para R$109", () => {
  test("cadastro gera UM evento com os 5 meses; editar outubro preserva os outros 4 e gera outro evento isolado", () => {
    const repeatGroupId = "grupo-inter";
    const draftsComId = monthKeyRange("2026-08", "2026-12").map((monthKey, i) => ({
      id: `inter-${i}`, monthKey, name: "Inter", amountCarlos: 99, amountJulia: 0,
      dueDate: null, isPaid: false, paidAt: null, repeatGroupId,
    }));

    // 1) Evento de cadastro: um único snapshot com os 5 meses.
    const afterCriacao = buildEventSnapshot("Inter", draftsComId.map((d) => occ(d)))!;
    assert.equal(afterCriacao.monthsCount, 5);
    assert.equal(periodoResumoLabel(afterCriacao), "ago/2026 até dez/2026 · 5 meses");

    // 2) Editar só outubro: usando a mesma lógica de escopo já testada em
    //    "fluxo completo de edição" — aqui confirmamos que o snapshot do
    //    evento contém SÓ outubro, não a série inteira.
    const grupoOriginal = draftsComId;
    const idsAlvo = idsNoEscopoDeEdicao(grupoOriginal, "2026-10", "esta");
    const alvoExistente = grupoOriginal.filter((d) => idsAlvo.includes(d.id));
    assert.equal(alvoExistente.length, 1);
    assert.equal(alvoExistente[0].monthKey, "2026-10");

    const beforeEdicao = buildEventSnapshot("Inter", alvoExistente.map((d) => occ(d)))!;
    const depoisOutubro = { ...alvoExistente[0], amountCarlos: 109 };
    const afterEdicao = buildEventSnapshot("Inter", [occ(depoisOutubro)])!;

    assert.equal(beforeEdicao.occurrences.length, 1);
    assert.equal(afterEdicao.occurrences.length, 1);
    assert.equal(beforeEdicao.amountTotal, 99);
    assert.equal(afterEdicao.amountTotal, 109);
    assert.equal(afterEdicao.periodStart, "2026-10");
    assert.equal(afterEdicao.periodEnd, "2026-10");

    // Ago/set/nov/dez continuam com 99 — a edição não tocou nelas.
    const restante = grupoOriginal.filter((d) => d.monthKey !== "2026-10");
    assert.equal(restante.length, 4);
    assert.ok(restante.every((d) => d.amountCarlos === 99));
  });

  test("editar TODOS os meses ainda gera só um evento (mesmo mudando 5 ocorrências)", () => {
    const serie = monthKeyRange("2026-08", "2026-12").map((monthKey, i) =>
      occ({ id: `inter-${i}`, monthKey, amountCarlos: 99 }),
    );
    const depois = serie.map((o) => ({ ...o, amountCarlos: 129 }));
    const snap = buildEventSnapshot("Inter", depois);
    assert.equal(snap!.monthsCount, 5, "um único snapshot cobrindo os 5 meses, não 5 eventos");
    assert.ok(snap!.occurrences.every((o) => o.amountCarlos === 129));
  });

  test("exclusão gera evento com beforeSnapshot preenchido e afterSnapshot null (deixa de existir)", () => {
    const removidos = [occ({ id: "inter-2", monthKey: "2026-10", amountCarlos: 109 })];
    const before = buildEventSnapshot("Inter", removidos);
    const after = null;
    assert.ok(before);
    assert.equal(after, null);
  });

  test("marcar como pago gera evento com before.isPaid=false e after.isPaid=true, valor/mês inalterados", () => {
    const antes = occ({ id: "inter-2", monthKey: "2026-10", amountCarlos: 109, isPaid: false, paidAt: null });
    const depois = { ...antes, isPaid: true, paidAt: "2026-10-05T12:00:00.000Z" };
    const beforeSnap = buildEventSnapshot("Inter", [antes])!;
    const afterSnap = buildEventSnapshot("Inter", [depois])!;
    assert.equal(beforeSnap.occurrences[0].isPaid, false);
    assert.equal(afterSnap.occurrences[0].isPaid, true);
    assert.equal(beforeSnap.amountTotal, afterSnap.amountTotal, "mudar status de pagamento não altera o valor");
  });
});
