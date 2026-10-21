import assert from "node:assert/strict";
import test from "node:test";
import { withBRLConversions } from "./visa-planner-currency";

test("os valores dos vistos usam a cotação salva em Gastos", () => {
  const text = "Por dia: € 122,10. Mínimo: € 1.098,90.";
  const atPreviousRate = withBRLConversions(text, 5.5991).replaceAll("\u00a0", " ");
  const atNewRate = withBRLConversions(text, 6.25).replaceAll("\u00a0", " ");

  assert.match(atPreviousRate, /€ 122,10 \(≈ R\$ 683,65\)/);
  assert.match(atPreviousRate, /€ 1\.098,90 \(≈ R\$ 6\.152,85\)/);
  assert.match(atNewRate, /€ 122,10 \(≈ R\$ 763,13\)/);
  assert.match(atNewRate, /€ 1\.098,90 \(≈ R\$ 6\.868,13\)/);
  assert.notEqual(atPreviousRate, atNewRate);
});

test("sem cotação válida o texto em euros continua legível", () => {
  assert.equal(withBRLConversions("Por dia: € 122,10.", 0), "Por dia: € 122,10.");
});
