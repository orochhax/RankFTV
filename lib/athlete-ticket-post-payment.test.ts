import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  athleteOrderReference,
  athletePaymentMethodLabel,
  athletePostPaymentState,
} from "./athlete-ticket-post-payment";

test("distingue pagamento pendente, em análise e confirmado", () => {
  assert.equal(athletePostPaymentState("pendente", false), "awaiting");
  assert.equal(athletePostPaymentState("pendente", true), "analysis");
  assert.equal(athletePostPaymentState("pago", false), "confirmed");
  assert.equal(athletePostPaymentState("pago", true), "confirmed");
});

test("mostra método e referência curta sem transformar o ID em credencial", () => {
  assert.equal(athletePaymentMethodLabel("pix"), "Pix");
  assert.equal(athletePaymentMethodLabel("cartao"), "Cartão");
  assert.equal(athleteOrderReference("8eb901fa-fd3b-424a-b797-414dbd4f59b1"), "#8EB901FA");
});

test("a confirmação reúne o resumo exigido sem expor a credencial no link", () => {
  const component = readFileSync(
    new URL("../components/campeonatos/IngressoAtletaPagamento.tsx", import.meta.url),
    "utf8",
  );

  for (const text of [
    "Aguardando pagamento",
    "Pagamento em análise",
    "Inscrição confirmada",
    "Resumo do pedido",
    "Credenciais enviadas para",
    "Ver meus ingressos",
    "Guarde este link privado",
  ]) assert.match(component, new RegExp(text));
  assert.match(component, /athleteOrderReference\(ticketId\)/);
  assert.doesNotMatch(component, /href=\{`[^`]*accessToken/);
});
