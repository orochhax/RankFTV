import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { PersonalFinanceEntry } from "@/lib/personal-finance";
import { parseBRLInput, resumoFinanceiroDoMes } from "@/lib/personal-finance";
import {
  buildInstallmentDrafts,
  resolveCalculatorPurchaseAmounts,
  simulateQuickPurchase,
  splitIntoInstallments,
} from "@/lib/personal-finance-purchase";

function entry(overrides: Partial<PersonalFinanceEntry> & { id: string }): PersonalFinanceEntry {
  return {
    person: "carlos",
    name: "Item",
    category: "Geral",
    entryDate: "2026-07-05",
    amount: 1000,
    type: "gasto",
    bank: "nubank",
    paymentMethod: "pix",
    isInstallment: false,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceDayMode: null,
    recurrenceDay: null,
    investmentYieldMode: null,
    investmentCdiPercent: null,
    sharedEntryGroupId: null,
    ...overrides,
  };
}

describe("resumoFinanceiroDoMes", () => {
  test("considera apenas renda menos gastos", () => {
    const resumo = resumoFinanceiroDoMes([
      entry({ id: "renda", type: "renda", amount: 5000 }),
      entry({ id: "gasto", type: "gasto", amount: 1200 }),
    ], [], "2026-07");

    assert.equal(resumo.renda, 5000);
    assert.equal(resumo.gastos, 1200);
    assert.equal(resumo.resultado, 3800);
  });

  test("investimentos não reduzem o resumo mensal", () => {
    const resumo = resumoFinanceiroDoMes([
      entry({ id: "renda", type: "renda", amount: 5000 }),
      entry({ id: "invest", type: "investimento", amount: 1000 }),
    ], [], "2026-07");

    assert.equal(resumo.resultado, 5000);
  });

  test("respeita filtros Carlos, Julia e Todos", () => {
    const entries = [
      entry({ id: "c-renda", person: "carlos", type: "renda", amount: 3000 }),
      entry({ id: "c-gasto", person: "carlos", type: "gasto", amount: 500 }),
      entry({ id: "j-renda", person: "julia", type: "renda", amount: 2000 }),
      entry({ id: "j-gasto", person: "julia", type: "gasto", amount: 800 }),
    ];

    assert.equal(resumoFinanceiroDoMes(entries, [], "2026-07", "carlos").resultado, 2500);
    assert.equal(resumoFinanceiroDoMes(entries, [], "2026-07", "julia").resultado, 1200);
    assert.equal(resumoFinanceiroDoMes(entries, [], "2026-07", "todos").resultado, 3700);
  });
});

describe("splitIntoInstallments", () => {
  test("R$ 600 em 3 parcelas gera R$ 200 por mês", () => {
    assert.deepEqual(splitIntoInstallments(600, 3), [200, 200, 200]);
  });

  test("parcelamento com centavos fecha exatamente o total", () => {
    const parts = splitIntoInstallments(100, 3);
    assert.deepEqual(parts, [33.34, 33.33, 33.33]);
    assert.equal(Math.round(parts.reduce((s, v) => s + v, 0) * 100), 10000);
  });
});

describe("parseBRLInput", () => {
  test("interpreta 125,00 como R$ 125,00", () => {
    assert.equal(parseBRLInput("125,00"), 125);
    assert.equal(parseBRLInput("R$ 125,00"), 125);
  });
});

describe("resolveCalculatorPurchaseAmounts", () => {
  test("em split personalizado, total 125 e uma parte 25 preenche a diferença", () => {
    const resolved = resolveCalculatorPurchaseAmounts({
      totalAmount: 125,
      person: "carlos_e_julia",
      splitMode: "personalizado",
      amountJulia: 25,
      hasAmountJulia: true,
    });

    assert.equal(resolved.totalAmount, 125);
    assert.equal(resolved.amountCarlos, 100);
    assert.equal(resolved.amountJulia, 25);
  });
});

describe("simulateQuickPurchase", () => {
  const baseEntries = [entry({ id: "salario", type: "renda", amount: 2000 })];

  test("compra de R$ 600 à vista reduz o mês atual", () => {
    const preview = simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 600,
      person: "carlos",
      splitMode: "igual",
      installmentTotal: 1,
      firstDateISO: "2026-07-13",
    });

    assert.equal(preview.length, 1);
    assert.equal(preview[0].beforeCombined, 2000);
    assert.equal(preview[0].impactCombined, 600);
    assert.equal(preview[0].afterCombined, 1400);
  });

  test("compra de R$ 600 em 3 parcelas projeta R$ 200 por mês", () => {
    const preview = simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 600,
      person: "carlos",
      splitMode: "igual",
      installmentTotal: 3,
      firstDateISO: "2026-07-13",
    });

    assert.deepEqual(preview.map((p) => p.monthKey), ["2026-07", "2026-08", "2026-09"]);
    assert.deepEqual(preview.map((p) => p.impactCombined), [200, 200, 200]);
  });

  test("compra compartilhada com valores personalizados preserva impactos individuais", () => {
    const preview = simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 300,
      person: "carlos_e_julia",
      splitMode: "personalizado",
      amountCarlos: 100,
      amountJulia: 200,
      installmentTotal: 1,
      firstDateISO: "2026-07-13",
    });

    assert.equal(preview[0].impactCarlos, 100);
    assert.equal(preview[0].impactJulia, 200);
    assert.equal(preview[0].impactCombined, 300);
  });

  test("alterar a data muda os meses projetados", () => {
    const julho = simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 600,
      person: "carlos",
      splitMode: "igual",
      installmentTotal: 2,
      firstDateISO: "2026-07-30",
    });
    const agosto = simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 600,
      person: "carlos",
      splitMode: "igual",
      installmentTotal: 2,
      firstDateISO: "2026-08-01",
    });

    assert.deepEqual(julho.map((p) => p.monthKey), ["2026-07", "2026-08"]);
    assert.deepEqual(agosto.map((p) => p.monthKey), ["2026-08", "2026-09"]);
  });

  test("simulação não grava no Supabase nem depende de action", () => {
    const before = baseEntries.length;
    simulateQuickPurchase({
      entries: baseEntries,
      overrides: [],
      totalAmount: 100,
      person: "carlos",
      splitMode: "igual",
      installmentTotal: 1,
      firstDateISO: "2026-07-13",
    });
    assert.equal(baseEntries.length, before);
  });
});

describe("buildInstallmentDrafts", () => {
  test("parcelas compartilhadas criam grupos por pessoa e por mês", () => {
    let id = 0;
    const drafts = buildInstallmentDrafts({
      allocations: [
        { person: "carlos", amount: 100 },
        { person: "julia", amount: 200 },
      ],
      installmentTotal: 2,
      firstDateISO: "2026-07-13",
      idFactory: () => `id-${++id}`,
    });

    assert.equal(drafts.length, 4);
    assert.equal(new Set(drafts.filter((d) => d.person === "carlos").map((d) => d.installmentGroupId)).size, 1);
    assert.equal(new Set(drafts.filter((d) => d.person === "julia").map((d) => d.installmentGroupId)).size, 1);
    assert.equal(new Set(drafts.filter((d) => d.installmentNumber === 1).map((d) => d.sharedEntryGroupId)).size, 1);
    assert.equal(new Set(drafts.filter((d) => d.installmentNumber === 2).map((d) => d.sharedEntryGroupId)).size, 1);
    assert.notEqual(drafts.find((d) => d.person === "carlos")!.installmentGroupId, drafts.find((d) => d.person === "julia")!.installmentGroupId);
    assert.notEqual(
      drafts.find((d) => d.installmentNumber === 1)!.sharedEntryGroupId,
      drafts.find((d) => d.installmentNumber === 2)!.sharedEntryGroupId,
    );
  });
});
