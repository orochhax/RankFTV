import assert from "node:assert/strict";
import test from "node:test";

import {
  mustReconcileWithoutCreating,
  payoutRetryStatusForBilling,
  refundProviderState,
  transferProviderState,
} from "./payment-provider-state";

test("payout is final only after the provider reports DONE", () => {
  assert.equal(transferProviderState("DONE"), "confirmed");
  assert.equal(transferProviderState("PENDING"), "pending");
  assert.equal(transferProviderState("BANK_PROCESSING"), "pending");
  assert.equal(transferProviderState("FAILED"), "failed");
  assert.equal(transferProviderState("CANCELLED"), "failed");
});

test("payout retries preserve Pix immediacy and card settlement windows", () => {
  assert.equal(payoutRetryStatusForBilling("registrations", "PIX"), "pendente");
  assert.equal(payoutRetryStatusForBilling("spectator_tickets", "CREDIT_CARD"), "aguardando_liquidacao");
  assert.equal(payoutRetryStatusForBilling("arena_attendance", "PIX"), "aguardando_liquidacao");
});

test("refund does not release domain inventory before provider acceptance", () => {
  assert.equal(refundProviderState("REFUNDED"), "confirmed");
  assert.equal(refundProviderState("REFUND_REQUESTED"), "pending");
  assert.equal(refundProviderState("PENDING"), "pending");
});

test("an uncertain transfer is reconciled without creating a replacement", () => {
  assert.equal(mustReconcileWithoutCreating({
    shouldExecute: true,
    previousStatus: "ambiguous",
    retryUncertainOperation: false,
  }), true);
  assert.equal(mustReconcileWithoutCreating({
    shouldExecute: true,
    previousStatus: "processing",
    retryUncertainOperation: false,
  }), true);
  assert.equal(mustReconcileWithoutCreating({
    shouldExecute: false,
    previousStatus: "processing",
    retryUncertainOperation: false,
  }), false);
  assert.equal(mustReconcileWithoutCreating({
    shouldExecute: true,
    previousStatus: "failed",
    retryUncertainOperation: false,
  }), false);
});
