import assert from "node:assert/strict";
import test from "node:test";

import {
  asaasEventDomainStatus,
  asaasEventOrderingDecision,
  asaasEventRank,
  asaasWebhookEventId,
  isValidAsaasWebhookPayload,
} from "./asaas-webhook-core";

const confirmed = {
  id: "evt_confirmed_1",
  dateCreated: "2026-08-07T08:00:00Z",
  event: "PAYMENT_CONFIRMED",
  payment: {
    id: "pay_1",
    externalReference: "registration-id",
    status: "CONFIRMED",
    value: 150,
    billingType: "PIX",
  },
};

test("validates provider payload shape before database access", () => {
  assert.equal(isValidAsaasWebhookPayload(confirmed), true);
  assert.equal(isValidAsaasWebhookPayload({ event: "PAYMENT_CONFIRMED" }), false);
  assert.equal(isValidAsaasWebhookPayload({
    ...confirmed,
    payment: { ...confirmed.payment, value: Number.NaN },
  }), false);
});

test("maps confirmations and refunds to monotonic domain states", () => {
  assert.equal(asaasEventDomainStatus("PAYMENT_CONFIRMED"), "pago");
  assert.equal(asaasEventDomainStatus("PAYMENT_REFUNDED"), "estornado");
  assert.equal(asaasEventDomainStatus("PAYMENT_CREATED"), null);
  assert.ok((asaasEventRank("PAYMENT_REFUNDED") ?? 0) > (asaasEventRank("PAYMENT_CONFIRMED") ?? 0));
});

test("rejects duplicate-rank and out-of-order regressions", () => {
  assert.equal(asaasEventOrderingDecision({ incomingRank: 30, highestRank: 30, sameRankAlreadyCommitted: true }), "duplicate_rank");
  assert.equal(asaasEventOrderingDecision({ incomingRank: 30, highestRank: 50, sameRankAlreadyCommitted: false }), "out_of_order");
  assert.equal(asaasEventOrderingDecision({ incomingRank: 50, highestRank: 30, sameRankAlreadyCommitted: false }), "process");
});

test("event identity is stable when Asaas omits its event id", () => {
  const withoutId = { ...confirmed, id: undefined };
  assert.equal(asaasWebhookEventId(withoutId), asaasWebhookEventId(withoutId));
  assert.notEqual(
    asaasWebhookEventId(withoutId),
    asaasWebhookEventId({ ...withoutId, event: "PAYMENT_REFUNDED" }),
  );
});
