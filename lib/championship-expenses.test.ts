import assert from "node:assert/strict";
import test from "node:test";
import {
  addDaysSaoPauloDateString,
  calculateExpenseSummary,
  calculateChampionshipDre,
  calculateCashflowCoverage,
  computeDreAndCoverageFromWallet,
  daysUntilDue,
  isExpenseOverdue,
  isExpenseDueSoon,
  parseCurrencyBR,
  validateExpenseInput,
  roundCurrency,
  type ChampionshipExpense,
} from "./championship-expenses";

const sampleExpenses: ChampionshipExpense[] = [
  {
    id: "e1",
    championshipId: "c1",
    organizadorId: "u1",
    categoria: "Premiação",
    nome: "Troféus e Medalhas",
    valor: 4500.50,
    status: "pago",
    dataVencimento: "2026-11-10",
    dataPagamento: "2026-11-09T12:00:00Z",
    observacao: "Pago via Pix",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-09T12:00:00Z",
  },
  {
    id: "e2",
    championshipId: "c1",
    organizadorId: "u1",
    categoria: "Arbitragem",
    nome: "Quadro de Juízes CBFv",
    valor: 3200.00,
    status: "pendente",
    dataVencimento: "2026-11-12",
    dataPagamento: null,
    observacao: "Pagar no dia da final",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "e3",
    championshipId: "c1",
    organizadorId: "u1",
    categoria: "Quadra & Estrutura",
    nome: "Tendas e Sonorização",
    valor: 5000.00,
    status: "pendente",
    dataVencimento: "2026-11-14",
    dataPagamento: null,
    observacao: null,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  },
];

test("calculateExpenseSummary correctly totals paid and pending expenses with category grouping", () => {
  assert.equal(roundCurrency(10.555), 10.56);
  const summary = calculateExpenseSummary(sampleExpenses);
  assert.equal(summary.total, 12700.50);
  assert.equal(summary.totalPagas, 4500.50);
  assert.equal(summary.totalPendentes, 8200.00);
  assert.equal(summary.count, 3);
  assert.equal(summary.countPagas, 1);
  assert.equal(summary.countPendentes, 2);

  assert.equal(summary.porCategoria.length, 3);
  // Highest category first
  assert.equal(summary.porCategoria[0].categoria, "Quadra & Estrutura");
  assert.equal(summary.porCategoria[0].total, 5000.00);
});

test("calculateChampionshipDre computes accurate net profit, paid profit, and profit margin", () => {
  const dre = calculateChampionshipDre({
    vendasBrutas: 50000.00,
    taxasPlataforma: 4000.00,
    receitaLiquida: 46000.00,
    expenses: sampleExpenses,
  });

  assert.equal(dre.vendasBrutas, 50000.00);
  assert.equal(dre.taxasPlataforma, 4000.00);
  assert.equal(dre.receitaLiquida, 46000.00);
  assert.equal(dre.despesasTotais, 12700.50);
  assert.equal(dre.despesasPagas, 4500.50);
  assert.equal(dre.despesasPendentes, 8200.00);

  // 46000 - 12700.50 = 33299.50
  assert.equal(dre.lucroLiquidoReal, 33299.50);
  // 46000 - 4500.50 = 41499.50
  assert.equal(dre.lucroRealPago, 41499.50);
  // (33299.50 / 50000) * 100 = 66.6%
  assert.equal(dre.margemLucroPercentual, 66.6);
  assert.equal(dre.status, "lucro");
});

test("calculateChampionshipDre detects break-even and loss correctly", () => {
  const breakEven = calculateChampionshipDre({
    vendasBrutas: 10000,
    taxasPlataforma: 800,
    receitaLiquida: 9200,
    expenses: [
      {
        ...sampleExpenses[0],
        valor: 9200,
      },
    ],
  });
  assert.equal(breakEven.lucroLiquidoReal, 0);
  assert.equal(breakEven.status, "empate");
  assert.equal(breakEven.margemLucroPercentual, 0);

  const loss = calculateChampionshipDre({
    vendasBrutas: 10000,
    taxasPlataforma: 800,
    receitaLiquida: 9200,
    expenses: [
      {
        ...sampleExpenses[0],
        valor: 12000,
      },
    ],
  });
  assert.equal(loss.lucroLiquidoReal, -2800);
  assert.equal(loss.status, "prejuizo");
  assert.equal(loss.margemLucroPercentual, -28);
});

test("calculateCashflowCoverage checks whether wallet available balance covers pending expenses", () => {
  const covered = calculateCashflowCoverage({
    saldoDisponivel: 15000.00,
    despesasPendentes: 8200.00,
  });
  assert.equal(covered.coberto, true);
  assert.equal(covered.saldoAposDespesas, 6800.00);
  assert.equal(covered.diferenca, 6800.00);
  assert.equal(covered.percentualCobertura, 100);

  const deficient = calculateCashflowCoverage({
    saldoDisponivel: 5000.00,
    despesasPendentes: 8200.00,
  });
  assert.equal(deficient.coberto, false);
  assert.equal(deficient.saldoAposDespesas, -3200.00);
  assert.equal(deficient.diferenca, 3200.00);
  assert.equal(deficient.percentualCobertura, 61);
});

test("daysUntilDue, isExpenseOverdue, and isExpenseDueSoon work with timezone boundaries", () => {
  // Simulating today as 2026-11-11
  const fakeNow = new Date("2026-11-11T12:00:00Z");

  assert.equal(daysUntilDue("2026-11-11", fakeNow), 0);
  assert.equal(isExpenseOverdue("2026-11-11", fakeNow), false);
  assert.equal(isExpenseDueSoon("2026-11-11", fakeNow), true);

  assert.equal(daysUntilDue("2026-11-10", fakeNow), -1);
  assert.equal(isExpenseOverdue("2026-11-10", fakeNow), true);
  assert.equal(isExpenseDueSoon("2026-11-10", fakeNow), false);

  assert.equal(daysUntilDue("2026-11-13", fakeNow), 2);
  assert.equal(isExpenseOverdue("2026-11-13", fakeNow), false);
  assert.equal(isExpenseDueSoon("2026-11-13", fakeNow), true);

  assert.equal(daysUntilDue("2026-11-20", fakeNow), 9);
  assert.equal(isExpenseDueSoon("2026-11-20", fakeNow), false);
});

test("validateExpenseInput strictly validates bounds, text lengths, currency and dates", () => {
  const valid = validateExpenseInput({
    nome: "Troféus das Finais",
    categoria: "Premiação",
    valor: "3500.50",
    status: "pendente",
    dataVencimento: "2026-11-15",
    observacao: "Entregar até as 10h",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.data?.valor, 3500.50);
  assert.equal(valid.data?.categoria, "Premiação");

  const invalid = validateExpenseInput({
    nome: "",
    categoria: "X",
    valor: -50,
    status: "invalid",
    dataVencimento: "2026-02-31", // invalid date
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((e) => e.includes("nome")));
  assert.ok(invalid.errors.some((e) => e.includes("categoria")));
  assert.ok(invalid.errors.some((e) => e.includes("valor")));
  assert.ok(invalid.errors.some((e) => e.includes("não existe no calendário")));
});

test("championship navigation includes despesas under Financeiro group", async () => {
  const { CHAMPIONSHIP_NAV_GROUPS } = await import("@/components/painel/championship-nav-items");
  const finGroup = CHAMPIONSHIP_NAV_GROUPS.find((g) => g.label === "Financeiro");
  assert.ok(finGroup, "Financeiro group must exist");
  const despesasItem = finGroup.items.find((i) => i.key === "despesas");
  assert.ok(despesasItem, "Despesas nav item must exist in Financeiro group");
  assert.equal(despesasItem.label, "Despesas");
  assert.equal(despesasItem.href("teste-slug"), "/painel/campeonatos/teste-slug/despesas");
});

test("SQL migration for championship expenses configures RLS and cascading deletion", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync("supabase/add-championship-expenses.sql", "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.championship_expenses/);
  assert.match(sql, /REFERENCES public\.championships\(id\) ON DELETE CASCADE/);
  assert.match(sql, /valor numeric\(10,\s*2\)\s+NOT NULL\s+CHECK\s*\(valor > 0\)/);
  assert.match(sql, /status text NOT NULL CHECK \(status IN \('pendente',\s*'pago'\)\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /CREATE POLICY championship_expenses_select/);
  assert.match(sql, /CREATE POLICY championship_expenses_insert/);
  assert.match(sql, /CREATE POLICY championship_expenses_update/);
  assert.match(sql, /CREATE POLICY championship_expenses_delete/);
});

test("expense reminders cron checks authorization, uses Auth email + TZ-safe window, and limits query scope", async () => {
  const { readFileSync } = await import("node:fs");
  const cronSource = readFileSync("app/api/cron/expense-reminders/route.ts", "utf8");
  assert.match(cronSource, /isCronAuthorized\(request\.headers\)/);
  assert.match(cronSource, /\.eq\("status", "pendente"\)/);
  assert.match(cronSource, /addDaysSaoPauloDateString/);
  assert.match(cronSource, /auth\.admin\.getUserById/);
  assert.match(cronSource, /enviarLembreteDespesa/);
  assert.match(cronSource, /idempotencyKey/);

  const templateSource = readFileSync("lib/email/templates.ts", "utf8");
  assert.match(templateSource, /escapeHtml\(opts\.painelUrl\)/);

  const actionsSource = readFileSync("app/painel/campeonatos/[id]/financeiro/actions.ts", "utf8");
  assert.match(actionsSource, /resolveWalletAccountingTotals/);
  assert.match(actionsSource, /reserve_organizer_withdrawal_receivables/);
});

test("addDaysSaoPauloDateString, parseCurrencyBR, validation edge cases and unified DRE helper", () => {
  assert.equal(addDaysSaoPauloDateString("2026-12-30", 3), "2027-01-02");
  assert.equal(addDaysSaoPauloDateString("2026-02-27", 3), "2026-03-02");
  assert.equal(addDaysSaoPauloDateString("2024-02-27", 3), "2024-03-01");

  assert.equal(parseCurrencyBR("1.500,50"), 1500.5);
  assert.equal(parseCurrencyBR("R$ 250,00"), 250);
  assert.equal(parseCurrencyBR("3500.50"), 3500.5);
  assert.equal(parseCurrencyBR("1,500.50"), 1500.5);
  assert.ok(Number.isNaN(parseCurrencyBR("   ")));

  const subCent = validateExpenseInput({
    nome: "Taxa",
    categoria: "Outros",
    valor: 0.004,
    status: "pendente",
    dataVencimento: "2026-11-15",
  });
  assert.equal(subCent.valid, false);

  const invalidLeap = validateExpenseInput({
    nome: "Taxa",
    categoria: "Outros",
    valor: 100,
    status: "pendente",
    dataVencimento: "2026-02-29",
  });
  assert.equal(invalidLeap.valid, false);

  const { dre, coverage } = computeDreAndCoverageFromWallet({
    totalInscricoesBruto: 11520,
    totalPlateiaBruto: 41550,
    lifetimeReceitaLiquida: 53070,
    saldoSacavelAgora: 25000,
    expenses: sampleExpenses,
  });
  assert.equal(dre.vendasBrutas, 53070);
  assert.equal(dre.taxasPlataforma, 0);
  assert.equal(dre.receitaLiquida, 53070);
  assert.equal(dre.despesasTotais, 12700.5);
  assert.equal(dre.lucroLiquidoReal, 40369.5);
  assert.equal(coverage.saldoDisponivel, 25000);
  assert.equal(coverage.despesasPendentes, 8200);
  assert.equal(coverage.coberto, true);
});

