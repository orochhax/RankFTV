import assert from "node:assert/strict";
import test from "node:test";
import {
  computeFinancialHealthScore,
  isYmdWithinRange,
  sanitizeReportFields,
  sanitizeReportSections,
  toSaoPauloYmd,
} from "./financial-cockpit";
import type { CashflowCoverage, ChampionshipDre, ChampionshipExpense } from "./championship-expenses";

function baseDre(overrides: Partial<ChampionshipDre> = {}): ChampionshipDre {
  return {
    vendasBrutas: 10000,
    taxasPlataforma: 1000,
    receitaLiquida: 9000,
    despesasTotais: 2000,
    despesasPagas: 2000,
    despesasPendentes: 0,
    lucroLiquidoReal: 7000,
    lucroRealPago: 7000,
    margemLucroPercentual: 77.8,
    status: "lucro",
    ...overrides,
  };
}

function baseCoverage(overrides: Partial<CashflowCoverage> = {}): CashflowCoverage {
  return {
    saldoDisponivel: 7000,
    despesasPendentes: 0,
    saldoAposDespesas: 7000,
    coberto: true,
    diferenca: 7000,
    percentualCobertura: 100,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<ChampionshipExpense> = {}): ChampionshipExpense {
  return {
    id: "exp-1",
    championshipId: "champ-1",
    organizadorId: "org-1",
    categoria: "Quadra & Estrutura",
    nome: "Tendas",
    valor: 1500,
    status: "pendente",
    dataVencimento: "2026-11-20",
    dataPagamento: null,
    observacao: null,
    createdAt: "2026-11-10T12:00:00Z",
    updatedAt: "2026-11-10T12:00:00Z",
    ...overrides,
  };
}

test("computeFinancialHealthScore scores high when margin, cash coverage, bills and conversion are strong", () => {
  const res = computeFinancialHealthScore({
    dre: baseDre(),
    coverage: baseCoverage(),
    expenses: [makeExpense({ status: "pago" })],
    paidCount: 25,
    pendingCount: 1,
    refundedCount: 0,
    hasPixKey: true,
    isElite: true,
    now: new Date("2026-11-11T15:00:00-03:00"),
  });

  assert.ok(res.score >= 90, `Expected >= 90, got ${res.score}`);
  assert.equal(res.band, "excelente");
  assert.equal(res.tone, "emerald");
  assert.equal(res.pillars.length, 4);
});

test("computeFinancialHealthScore flags overdue bills, cash gap and missing Pix key cleanly", () => {
  const res = computeFinancialHealthScore({
    dre: baseDre({
      receitaLiquida: 2000,
      despesasTotais: 3500,
      despesasPagas: 0,
      despesasPendentes: 3500,
      lucroLiquidoReal: -1500,
      margemLucroPercentual: -75,
      status: "prejuizo",
    }),
    coverage: baseCoverage({
      saldoDisponivel: 500,
      despesasPendentes: 3500,
      saldoAposDespesas: -3000,
      coberto: false,
      diferenca: 3000,
      percentualCobertura: 14,
    }),
    expenses: [
      makeExpense({ id: "exp-a", status: "pendente", dataVencimento: "2026-11-05", valor: 2000 }),
      makeExpense({ id: "exp-b", status: "pendente", dataVencimento: "2026-11-08", valor: 1500 }),
    ],
    paidCount: 4,
    pendingCount: 3,
    refundedCount: 2,
    hasPixKey: false,
    isElite: false,
    now: new Date("2026-11-11T15:00:00-03:00"),
  });

  assert.ok(res.score < 30, `Expected < 30, got ${res.score}`);
  assert.equal(res.band, "critico");
  assert.ok(res.insights.some((i) => i.id === "overdue-expenses" && i.severity === "danger"));
  assert.ok(res.insights.some((i) => i.id === "cash-gap"));
  assert.ok(res.insights.some((i) => i.id === "missing-pix"));
});

test("toSaoPauloYmd and isYmdWithinRange convert UTC midnight boundary to America/Sao_Paulo correctly", () => {
  // 2026-11-12T01:30:00Z is still 2026-11-11 22:30 in Sao Paulo
  assert.equal(toSaoPauloYmd("2026-11-12T01:30:00Z"), "2026-11-11");
  assert.equal(toSaoPauloYmd("2026-11-11"), "2026-11-11");
  assert.equal(isYmdWithinRange("2026-11-11", "2026-11-10", "2026-11-11"), true);
  assert.equal(isYmdWithinRange("2026-11-12", "2026-11-10", "2026-11-11"), false);
});

test("report section and field sanitizers enforce allowlist and safe defaults", () => {
  assert.deepEqual(sanitizeReportSections("inscricoes,despesas,evil"), ["inscricoes", "despesas"]);
  assert.deepEqual(sanitizeReportSections("unknown"), ["inscricoes", "plateia", "despesas", "repasses"]);
  assert.deepEqual(sanitizeReportFields("origem,valorBruto,password"), ["origem", "valorBruto"]);
  assert.equal(sanitizeReportFields("").length, 7);
});
