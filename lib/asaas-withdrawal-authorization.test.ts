import assert from "node:assert/strict";
import test from "node:test";
import {
  hasUniqueAuthorizableProviderRefund,
  isAuthorizableProviderRefundStatus,
  parsePixRefundAuthorization,
  parseWithdrawalAuthorization,
  sameMoney,
  withdrawalRecipientDigest,
} from "./asaas-withdrawal-authorization";

const valid = {
  type: "PIX_REFUND",
  pixRefund: {
    id: "06391ba9-cbf9-4926-8988-374ac5d71cae",
    payment: "pay_sq781w2wdf9qsly8",
    value: 23.99,
    status: "AWAITING_REQUEST",
    type: "CREDIT_REFUND",
  },
};

test("accepts only the expected Pix refund authorization shape", () => {
  assert.deepEqual(parsePixRefundAuthorization(valid), valid);
  assert.equal(parsePixRefundAuthorization({ ...valid, type: "TRANSFER" }), null);
  assert.equal(parsePixRefundAuthorization({ ...valid, pixRefund: { ...valid.pixRefund, value: -1 } }), null);
  assert.equal(parsePixRefundAuthorization({ ...valid, pixRefund: { ...valid.pixRefund, status: "DONE" } }), null);
});

test("accepts only pending Pix transfers", () => {
  const transfer = {
    type: "TRANSFER",
    transfer: {
      id: "0bed986c-737d-49bf-a1cc-beca916797c4",
      value: 20,
      status: "PENDING",
      operationType: "PIX",
      externalReference: "payout:test",
      bankAccount: { pixAddressKey: "financeiro@example.com" },
    },
  };
  assert.deepEqual(parseWithdrawalAuthorization(transfer), {
    type: "TRANSFER",
    transfer: {
      id: transfer.transfer.id,
      value: transfer.transfer.value,
      status: transfer.transfer.status,
      operationType: transfer.transfer.operationType,
      externalReference: transfer.transfer.externalReference,
      pixAddressKey: "financeiro@example.com",
    },
  });
  assert.equal(parseWithdrawalAuthorization({ ...transfer, transfer: { ...transfer.transfer, operationType: "TED" } }), null);
});

test("recipient digest is keyed, normalized and does not expose the Pix key", () => {
  const digest = withdrawalRecipientDigest(" Financeiro@Example.com ", "secret-for-test");
  assert.equal(digest, withdrawalRecipientDigest("financeiro@example.com", "secret-for-test"));
  assert.equal(digest.length, 64);
  assert.doesNotMatch(digest, /financeiro/i);
});

test("compares money in cents", () => {
  assert.equal(sameMoney(23.99, 23.99001), true);
  assert.equal(sameMoney(23.99, 24), false);
  assert.equal(sameMoney(undefined, 23.99), false);
});

test("authorizes only provider states that still await a decision", () => {
  assert.equal(isAuthorizableProviderRefundStatus("AWAITING_CRITICAL_ACTION_AUTHORIZATION"), true);
  assert.equal(isAuthorizableProviderRefundStatus("AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION"), true);
  assert.equal(isAuthorizableProviderRefundStatus("CANCELLED"), false);
  assert.equal(isAuthorizableProviderRefundStatus("REFUNDED"), false);
});

test("accepts the id-less shape returned by the payment-scoped refunds endpoint only when unique", () => {
  const expected = {
    refundId: "06391ba9-cbf9-4926-8988-374ac5d71cae",
    paymentId: "pay_sq781w2wdf9qsly8",
    value: 23.99,
  };
  assert.equal(hasUniqueAuthorizableProviderRefund([
    { status: "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION", value: 23.99 },
  ], expected), true);
  assert.equal(hasUniqueAuthorizableProviderRefund([
    { status: "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION", value: 23.99 },
    { status: "AWAITING_REQUEST", value: 23.99 },
  ], expected), false);
  assert.equal(hasUniqueAuthorizableProviderRefund([
    { status: "CANCELLED", value: 23.99 },
  ], expected), false);
  assert.equal(hasUniqueAuthorizableProviderRefund([
    { status: "AWAITING_REQUEST", value: 24 },
  ], expected), false);
});
