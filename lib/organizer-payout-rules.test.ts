import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addBusinessDays,
  calculatePostEventReleaseDate,
  calculateOrganizerWithdrawalLimits,
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
});
