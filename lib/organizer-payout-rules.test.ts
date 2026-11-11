import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addBusinessDays,
  calculatePostEventReleaseDate,
  calculateOrganizerWithdrawalLimits,
  computeWithdrawableCashNow,
  resolveWalletAccountingTotals,
  validateWithdrawalRequestAmount,
  toBahiaDateString,
} from "./organizer-payout-rules";

describe("addBusinessDays", () => {
  it("adiciona dias úteis pulando fins de semana", () => {
    // Sexta-feira: 2026-11-20
    const sexta = new Date(2026, 10, 20, 12, 0, 0);
    const d2 = addBusinessDays(sexta, 2);
    // Sábado (21), Domingo (22), Segunda (23 = +1), Terça (24 = +2)
    assert.equal(toBahiaDateString(d2), "2026-11-24");
  });

  it("adiciona dias úteis no meio da semana", () => {
    // Segunda-feira: 2026-11-16
    const segunda = new Date(2026, 10, 16, 12, 0, 0);
    const d2 = addBusinessDays(segunda, 2);
    // Terça (+1), Quarta (+2)
    assert.equal(toBahiaDateString(d2), "2026-11-18");
  });
});

describe("calculatePostEventReleaseDate", () => {
  it("calcula D+2 dias úteis a partir de data_fim", () => {
    const release = calculatePostEventReleaseDate("2026-11-20");
    // Sexta-feira 20/11 -> Terça-feira 24/11
    assert.equal(toBahiaDateString(release), "2026-11-24");
  });
});

describe("calculateOrganizerWithdrawalLimits", () => {
  it("restringe adiantamento pré-evento em 70% com reserva de 30%", () => {
    const now = new Date("2026-11-10T12:00:00Z"); // 10 dias antes do fim do campeonato (20/11)
    const limits = calculateOrganizerWithdrawalLimits({
      totalNet: 1000,
      alreadyWithdrawn: 0,
      dataFim: "2026-11-20",
      now,
    });

    assert.equal(limits.isPostEvent, false);
    assert.equal(limits.totalNet, 1000);
    assert.equal(limits.advanceCap, 700);
    assert.equal(limits.securityReserveAmount, 300);
    assert.equal(limits.maxWithdrawableNow, 700);
  });

  it("deduz saques anteriores do teto de adiantamento", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const limits = calculateOrganizerWithdrawalLimits({
      totalNet: 1000,
      alreadyWithdrawn: 500,
      dataFim: "2026-11-20",
      now,
    });

    assert.equal(limits.isPostEvent, false);
    assert.equal(limits.advanceCap, 700);
    assert.equal(limits.maxWithdrawableNow, 200); // 700 - 500 = 200
  });

  it("libera 100% pós-evento (D+2 dias úteis após data_fim)", () => {
    const now = new Date("2026-11-25T12:00:00Z"); // Depois do prazo de liberação (24/11)
    const limits = calculateOrganizerWithdrawalLimits({
      totalNet: 1000,
      alreadyWithdrawn: 500,
      dataFim: "2026-11-20",
      now,
    });

    assert.equal(limits.isPostEvent, true);
    assert.equal(limits.securityReserveAmount, 0);
    assert.equal(limits.maxWithdrawableNow, 500); // 1000 - 500 = 500 restante
  });
});

describe("validateWithdrawalRequestAmount", () => {
  const preEventDate = new Date("2026-11-10T12:00:00Z");

  it("permite saque dentro dos 70% de adiantamento pré-evento", () => {
    const result = validateWithdrawalRequestAmount({
      requestedAmount: 400,
      totalNet: 1000,
      alreadyWithdrawn: 0,
      dataFim: "2026-11-20",
      now: preEventDate,
    });

    assert.equal(result.allowed, true);
  });

  it("bloqueia saque que ultrapassa o teto de 70% e protege os 30% de reserva", () => {
    const result = validateWithdrawalRequestAmount({
      requestedAmount: 800,
      totalNet: 1000,
      alreadyWithdrawn: 0,
      dataFim: "2026-11-20",
      now: preEventDate,
    });

    assert.equal(result.allowed, false);
    assert.match(result.message ?? "", /Reserva Técnica de 30%/);
  });

  it("bloqueia quando organizador já sacou os 70%", () => {
    const result = validateWithdrawalRequestAmount({
      requestedAmount: 50,
      totalNet: 1000,
      alreadyWithdrawn: 700,
      dataFim: "2026-11-20",
      now: preEventDate,
    });

    assert.equal(result.allowed, false);
    assert.match(result.message ?? "", /já atingiu o limite de adiantamento pré-evento/);
  });

  it("libera saque de até 100% no pós-evento", () => {
    const postEventDate = new Date("2026-11-25T12:00:00Z");
    const result = validateWithdrawalRequestAmount({
      requestedAmount: 300,
      totalNet: 1000,
      alreadyWithdrawn: 700,
      dataFim: "2026-11-20",
      now: postEventDate,
    });

    assert.equal(result.allowed, true);
  });

  it("preserva o faturamento líquido histórico ao calcular o segundo saque e o acerto final pós-evento", () => {
    // RPC devolve totalNet apenas dos recebíveis não pagos (available + pending + reserved)
    const totalsPre = resolveWalletAccountingTotals({
      totalNet: 500, // 400 available + 100 reserved
      available: 400,
      pending: 0,
      reserved: 100,
      withdrawn: 500,
    });
    assert.equal(totalsPre.lifetimeTotalNet, 1000);
    assert.equal(totalsPre.totalCommitted, 600);

    const preEventDate = new Date("2026-11-18T12:00:00Z");
    const limitsPre = calculateOrganizerWithdrawalLimits({
      totalNet: totalsPre.lifetimeTotalNet,
      alreadyWithdrawn: totalsPre.totalCommitted,
      dataFim: "2026-11-20",
      now: preEventDate,
    });
    assert.equal(limitsPre.advanceCap, 700);
    assert.equal(limitsPre.maxWithdrawableNow, 100);
    assert.equal(computeWithdrawableCashNow({ available: totalsPre.available, maxWithdrawableNow: limitsPre.maxWithdrawableNow }), 100);

    const secondWithdrawalOk = validateWithdrawalRequestAmount({
      requestedAmount: 100,
      totalNet: totalsPre.lifetimeTotalNet,
      alreadyWithdrawn: totalsPre.totalCommitted,
      dataFim: "2026-11-20",
      now: preEventDate,
    });
    assert.equal(secondWithdrawalOk.allowed, true);

    const overCapBlocked = validateWithdrawalRequestAmount({
      requestedAmount: 101,
      totalNet: totalsPre.lifetimeTotalNet,
      alreadyWithdrawn: totalsPre.totalCommitted,
      dataFim: "2026-11-20",
      now: preEventDate,
    });
    assert.equal(overCapBlocked.allowed, false);

    // Pós-evento após já ter sacado 70% (700 sacado, 300 restante na carteira)
    const totalsPost = resolveWalletAccountingTotals({
      totalNet: 300,
      available: 300,
      pending: 0,
      reserved: 0,
      withdrawn: 700,
    });
    assert.equal(totalsPost.lifetimeTotalNet, 1000);
    assert.equal(totalsPost.totalCommitted, 700);

    const postEventDate = new Date("2026-11-25T12:00:00Z");
    const finalReleaseOk = validateWithdrawalRequestAmount({
      requestedAmount: 300,
      totalNet: totalsPost.lifetimeTotalNet,
      alreadyWithdrawn: totalsPost.totalCommitted,
      dataFim: "2026-11-20",
      now: postEventDate,
    });
    assert.equal(finalReleaseOk.allowed, true);
  });
});
