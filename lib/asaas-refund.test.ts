import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { refundProviderState, refundProviderStatus, refundStatusFromRefunds } from "./payment-provider-state";

test("keeps a received payment pending while its Pix refund is processing", () => {
  assert.equal(refundStatusFromRefunds([{ status: "PENDING" }]), "REFUND_REQUESTED");
  assert.equal(
    refundStatusFromRefunds([{ status: "AWAITING_CRITICAL_ACTION_AUTHORIZATION" }]),
    "REFUND_REQUESTED",
  );
  assert.equal(
    refundStatusFromRefunds([{ status: "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION" }]),
    "REFUND_REQUESTED",
  );
});

test("confirms a refund only when Asaas reports DONE", () => {
  assert.equal(refundStatusFromRefunds([{ status: "DONE" }]), "REFUNDED");
});

test("treats a cancelled provider refund as a terminal failure", () => {
  assert.equal(refundStatusFromRefunds([{ status: "CANCELLED" }]), "REFUND_CANCELLED");
  assert.equal(refundProviderStatus([{ status: "CANCELLED" }]), "CANCELLED");
  assert.equal(refundProviderState("CANCELLED"), "failed");
});

test("a pending refund takes precedence over an older completed refund", () => {
  assert.equal(refundStatusFromRefunds([
    { status: "DONE" }, { status: "PENDING" },
  ]), "REFUND_REQUESTED");
});

test("refund reconciliation uses the provider's dedicated refund listing", () => {
  const asaas = readFileSync(path.join(process.cwd(), "lib/asaas.ts"), "utf8");
  const reconciliation = readFileSync(path.join(process.cwd(), "lib/financial-reconciliation.ts"), "utf8");
  const flows = readFileSync(path.join(process.cwd(), "lib/payment-flows.ts"), "utf8");

  assert.match(asaas, /\/payments\/\$\{asaasPaymentId\}\/refunds/);
  assert.match(reconciliation, /listarEstornosCobranca\(originalPaymentId\)/);
  assert.match(flows, /listarEstornosCobranca\(input\.originalPaymentId\)/);
});
