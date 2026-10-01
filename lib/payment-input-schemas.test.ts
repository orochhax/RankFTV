import assert from "node:assert/strict";
import test from "node:test";
import {
  arenaDailyPaymentSchema,
  arenaRentalPaymentSchema,
  arenaStoredCardRemovalSchema,
} from "./payment-input-schemas";

test("aceita os formatos esperados dos pagamentos hospedados", () => {
  assert.equal(arenaRentalPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", data: "2026-10-10",
    hora: "14:30", cpf: "123.456.789-09", tipo: "credito",
  }).success, true);
  assert.equal(arenaDailyPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", data: "2026-10-10",
    cpf: "123.456.789-09", tipo: "credito",
  }).success, true);
  assert.equal(arenaStoredCardRemovalSchema.safeParse({ arenaId: crypto.randomUUID() }).success, true);
});

test("recusa campos de cartão e identificadores perigosos", () => {
  assert.equal(arenaRentalPaymentSchema.safeParse({
    planId: crypto.randomUUID(), handle: "arena-teste", data: "2026-10-10",
    hora: "14:30", cpf: "123.456.789-09", tipo: "credito", cvv: "123",
  }).success, false);
  assert.equal(arenaStoredCardRemovalSchema.safeParse({ arenaId: "todas" }).success, false);
});
