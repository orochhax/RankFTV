import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildRefundTimeline } from "./refund-timeline";

test("pending refund does not announce ticket cancellation early", () => {
  const timeline = buildRefundTimeline({
    refundStatus: "provider_created",
    requestedAt: "2026-08-28T18:05:00-03:00",
    completedAt: null,
    cancelledAt: "2026-08-28T20:45:00-03:00",
  });

  assert.deepEqual(timeline, [
    { key: "requested", date: "2026-08-28T18:05:00-03:00" },
    { key: "awaiting", date: null },
  ]);
});

test("confirmed refund ends with cancellation and monotonic event dates", () => {
  const timeline = buildRefundTimeline({
    refundStatus: "refunded",
    requestedAt: "2026-08-28T18:05:00-03:00",
    completedAt: "2026-08-28T21:10:00-03:00",
    cancelledAt: "2026-08-28T20:45:00-03:00",
  });

  assert.deepEqual(timeline, [
    { key: "requested", date: "2026-08-28T18:05:00-03:00" },
    { key: "completed", date: "2026-08-28T21:10:00-03:00" },
    { key: "cancelled", date: "2026-08-28T21:10:00-03:00" },
  ]);
});

test("cancellation without a refund keeps its own event date", () => {
  assert.deepEqual(buildRefundTimeline({
    refundStatus: null,
    requestedAt: null,
    completedAt: null,
    cancelledAt: "2026-08-28T20:45:00-03:00",
  }), [
    { key: "cancelled", date: "2026-08-28T20:45:00-03:00" },
  ]);
});

test("public refund panel uses provider-neutral wording", () => {
  const panel = readFileSync(
    path.join(process.cwd(), "components/ingressos/RefundStatusPanel.tsx"),
    "utf8",
  );

  assert.doesNotMatch(panel, /Asaas/i);
  assert.match(panel, /Aguardando confirmação do reembolso/);
  assert.match(panel, /Processamento do reembolso confirmado/);
  assert.match(panel, /O cancelamento foi finalizado/);
});
