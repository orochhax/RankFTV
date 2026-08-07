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

test("the payout cron retries pending Pix without bypassing card settlement", () => {
  const cron = source("app/api/cron/repasse-liquidacao/route.ts");
  const pendingPixQueries = cron.match(
    /\.eq\("repasse_status", "pendente"\)\s*\.eq\("billing_type", "PIX"\)/g,
  ) ?? [];
  assert.equal(pendingPixQueries.length, 2);
  assert.match(cron, /\.lte\("repasse_data_prevista", agora\)/);
  assert.match(cron, /\.eq\("repasse_status", originalStatus\)/);
});
