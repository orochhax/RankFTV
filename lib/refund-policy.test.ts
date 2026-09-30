import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { decideRefundPolicy } from "./refund-policy";

const base = {
  purchasedAt: "2026-08-01T12:00:00-03:00",
  eventStartDate: "2026-09-10",
  checkedIn: false,
  paymentStatus: "pago",
  hasProviderCharge: true,
};

test("allows a full refund through the seventh exact day", () => {
  const decision = decideRefundPolicy({
    ...base,
    now: new Date("2026-08-08T12:00:00-03:00"),
  });

  assert.equal(decision.code, "full_refund");
  assert.equal(decision.refundMode, "full");
  assert.equal(decision.allowed, true);
});

test("the seven-day full refund takes priority even inside the 72-hour window", () => {
  const decision = decideRefundPolicy({
    ...base,
    purchasedAt: "2026-09-08T12:00:00-03:00",
    now: new Date("2026-09-09T12:00:00-03:00"),
  });

  assert.equal(decision.code, "full_refund");
  assert.equal(decision.allowed, true);
});

test("allows only the base-value refund after seven days and before the cutoff", () => {
  const decision = decideRefundPolicy({
    ...base,
    now: new Date("2026-09-01T12:00:00-03:00"),
  });

  assert.equal(decision.code, "partial_refund");
  assert.equal(decision.refundMode, "partial");
  assert.equal(decision.partialRefundDeadlineAt, "2026-09-07T03:00:00.000Z");
});

test("blocks a voluntary cancellation after the 72-hour cutoff", () => {
  const decision = decideRefundPolicy({
    ...base,
    now: new Date("2026-09-07T00:00:01-03:00"),
  });

  assert.equal(decision.code, "blocked_late");
  assert.equal(decision.allowed, false);
});

test("blocks any self-service refund after check-in or after the event starts", () => {
  assert.equal(decideRefundPolicy({
    ...base,
    checkedIn: true,
    now: new Date("2026-08-02T12:00:00-03:00"),
  }).code, "blocked_checked_in");

  assert.equal(decideRefundPolicy({
    ...base,
    now: new Date("2026-09-10T00:00:00-03:00"),
  }).code, "blocked_event_started");
});

test("allows an unpaid order to be cancelled before the event", () => {
  const decision = decideRefundPolicy({
    ...base,
    paymentStatus: "pendente",
    hasProviderCharge: false,
    now: new Date("2026-09-09T12:00:00-03:00"),
  });

  assert.equal(decision.code, "cancel_without_charge");
  assert.equal(decision.refundMode, "none");
});

test("fails closed when the event date is missing", () => {
  const decision = decideRefundPolicy({
    ...base,
    eventStartDate: null,
    now: new Date("2026-08-02T12:00:00-03:00"),
  });

  assert.equal(decision.code, "blocked_invalid_dates");
  assert.equal(decision.allowed, false);
});

test("all three refund mutations revalidate the policy from trusted persisted data", () => {
  const actionFiles = [
    "app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions.ts",
    "app/campeonatos/[id]/plateia/ingresso/[ticketId]/actions.ts",
    "app/minhas-inscricoes/[champId]/reembolso/actions.ts",
  ];

  for (const file of actionFiles) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    assert.match(source, /decideRefundPolicy/);
    assert.match(source, /data_inicio/);
    assert.match(source, /checked_in/);
    assert.match(source, /refundPolicyError/);
  }
});
