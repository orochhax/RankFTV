import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  athleteTicketInitialBillingType,
  parseAthleteTicketPaymentChoice,
  shouldCreateAthleteTicketPixCharge,
} from "./athlete-ticket-payment";

test("aceita somente as formas oferecidas no checkout do ingresso de atleta", () => {
  assert.equal(parseAthleteTicketPaymentChoice("pix"), "pix");
  assert.equal(parseAthleteTicketPaymentChoice("cartao"), "cartao");
  assert.equal(parseAthleteTicketPaymentChoice("debito"), null);
  assert.equal(parseAthleteTicketPaymentChoice(""), null);
});

test("Pix cria cobranca imediatamente e cartao aguarda os dados do titular", () => {
  assert.equal(athleteTicketInitialBillingType("pix", false), "PIX");
  assert.equal(shouldCreateAthleteTicketPixCharge("pix", false), true);
  assert.equal(athleteTicketInitialBillingType("cartao", false), "CREDIT_CARD");
  assert.equal(shouldCreateAthleteTicketPixCharge("cartao", false), false);
});

test("ingresso gratuito nao cria cobranca no provedor", () => {
  assert.equal(athleteTicketInitialBillingType("pix", true), null);
  assert.equal(athleteTicketInitialBillingType("cartao", true), null);
  assert.equal(shouldCreateAthleteTicketPixCharge("pix", true), false);
  assert.equal(shouldCreateAthleteTicketPixCharge("cartao", true), false);
});

test("checkout adia a chamada ao provedor quando a escolha e cartao", () => {
  const source = readFileSync(
    new URL("../app/campeonatos/[id]/comprar/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /shouldCreateAthleteTicketPixCharge\(metodoPagamento, isGratis\)/);
  assert.match(source, /billing_type:\s+athleteTicketInitialBillingType\(metodoPagamento, isGratis\)/);
});
