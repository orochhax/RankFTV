import assert from "node:assert/strict";
import test from "node:test";

import { refundStatusFromRefunds } from "./payment-provider-state";

test("keeps a received payment pending while its Pix refund is processing", () => {
  assert.equal(refundStatusFromRefunds([{ status: "PENDING" }]), "REFUND_REQUESTED");
});

test("confirms a refund only when Asaas reports DONE", () => {
  assert.equal(refundStatusFromRefunds([{ status: "DONE" }]), "REFUNDED");
  assert.equal(refundStatusFromRefunds([{ status: "CANCELLED" }]), null);
});

test("a pending refund takes precedence over an older completed refund", () => {
  assert.equal(refundStatusFromRefunds([
    { status: "DONE" }, { status: "PENDING" },
  ]), "REFUND_REQUESTED");
});
