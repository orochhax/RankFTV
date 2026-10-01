import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(name: string) {
  return readFileSync(path.join(process.cwd(), name), "utf8");
}

test("payout retry references are resolved before any provider transfer", () => {
  const paymentFlows = source("lib/payment-flows.ts");
  assert.match(paymentFlows, /financial_resolve_transfer_reference/);
  assert.match(paymentFlows, /retryUncertainOperation:\s*false/);
  assert.match(paymentFlows, /buscarTransferenciaPorReferencia\(externalReference\)/);
});

test("championship payouts are promoted to the organizer wallet without automatic transfer", () => {
  const cron = source("app/api/cron/repasse-liquidacao/route.ts");
  assert.match(cron, /const championshipSources = \["registrations", "athlete_tickets", "spectator_tickets"\]/);
  assert.match(cron, /update\(\{ repasse_status: "disponivel", repasse_erro: null \}\)/);
  assert.match(cron, /\.lte\("repasse_data_prevista", agora\)/);
  assert.doesNotMatch(cron, /executarRepasse(?:AtletaTicket|Espectador)?/);
});
