import assert from "node:assert/strict";
import test from "node:test";
import {
  arenaDailyPaymentSchema,
  arenaRentalPaymentSchema,
  arenaStoredCardRemovalSchema,
  arenaStoredCardSchema,
  arenaSubscriptionPaymentSchema,
  athleteTicketCardPaymentSchema,
  registrationCardPaymentSchema,
} from "./payment-input-schemas";

const card = {
  numero: "4111111111111111",
  nomeTitular: "Pessoa de Teste",
  mesValidade: "12",
  anoValidade: "2030",
  cvv: "123",
  cep: "40000-000",
  numeroEndereco: "10",
};

test("aceita os formatos esperados dos pagamentos críticos", () => {
  assert.equal(registrationCardPaymentSchema.safeParse({
    registrationId: crypto.randomUUID(), tipo: "credito", parcelas: 2,
    telefone: "71999999999", complemento: "", ...card,
  }).success, true);
  assert.equal(athleteTicketCardPaymentSchema.safeParse({
    ticketId: crypto.randomUUID(), accessToken: "a".repeat(32), tipo: "debito",
    parcelas: 1, telefone: "71999999999", complemento: "", ...card,
  }).success, true);
  assert.equal(arenaRentalPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", data: "2026-10-10",
    hora: "14:30", cpf: "123.456.789-09", tipo: "credito", ...card,
  }).success, true);
  assert.equal(arenaDailyPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", data: "2026-10-10",
    cpf: "123.456.789-09", tipo: "debito", ...card,
  }).success, true);
  assert.equal(arenaSubscriptionPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", cpf: "123.456.789-09", ...card,
  }).success, true);
  assert.equal(arenaStoredCardSchema.safeParse({
    arenaId: crypto.randomUUID(), handle: "arena-teste", cpf: "123.456.789-09", ...card,
  }).success, true);
  assert.equal(arenaStoredCardRemovalSchema.safeParse({ arenaId: crypto.randomUUID() }).success, true);
});

test("recusa campos extras e formatos perigosos antes de chamar o provedor", () => {
  const result = registrationCardPaymentSchema.safeParse({
    registrationId: "nao-e-uuid", tipo: "credito", parcelas: 99,
    telefone: "1", complemento: "", extra: "nao permitido", ...card,
  });
  assert.equal(result.success, false);
  assert.equal(arenaStoredCardSchema.safeParse({
    arenaId: crypto.randomUUID(), handle: "arena-teste", cpf: "123.456.789-09",
    ...card, cvv: "123; DROP TABLE cards",
  }).success, false);
  assert.equal(arenaStoredCardRemovalSchema.safeParse({ arenaId: "todas" }).success, false);
});
