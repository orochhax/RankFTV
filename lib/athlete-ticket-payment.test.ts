import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  athleteTicketInitialBillingType,
  parseAthleteTicketPaymentChoice,
  shouldCreateAthleteTicketCharge,
} from "./athlete-ticket-payment";

test("aceita somente as formas oferecidas no checkout do ingresso de atleta", () => {
  assert.equal(parseAthleteTicketPaymentChoice("pix"), "pix");
  assert.equal(parseAthleteTicketPaymentChoice("cartao"), "cartao");
  assert.equal(parseAthleteTicketPaymentChoice("debito"), null);
  assert.equal(parseAthleteTicketPaymentChoice(""), null);
});

test("Pix e cartao criam a cobranca antes do checkout hospedado", () => {
  assert.equal(athleteTicketInitialBillingType("pix", false), "PIX");
  assert.equal(athleteTicketInitialBillingType("cartao", false), "CREDIT_CARD");
  assert.equal(shouldCreateAthleteTicketCharge(false), true);
});

test("ingresso gratuito nao cria cobranca no provedor", () => {
  assert.equal(athleteTicketInitialBillingType("pix", true), null);
  assert.equal(athleteTicketInitialBillingType("cartao", true), null);
  assert.equal(shouldCreateAthleteTicketCharge(true), false);
});

test("checkout cria a fatura antes de redirecionar o cartão", () => {
  const source = readFileSync(
    new URL("../app/campeonatos/[id]/comprar/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /shouldCreateAthleteTicketCharge\(isGratis\)/);
  assert.match(source, /method:\s*metodoPagamento === "pix" \? "pix" : "credito"/);
  assert.match(source, /billing_type:\s+athleteTicketInitialBillingType\(metodoPagamento, isGratis\)/);
});
