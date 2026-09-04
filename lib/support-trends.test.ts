import test from "node:test";
import assert from "node:assert/strict";
import { buildSupportTrend } from "./support-trends";

test("buildSupportTrend fills empty days and groups privacy-safe counters", () => {
  const result = buildSupportTrend([
    { metric: "emailDelivered", occurredAt: "2026-09-03T10:00:00Z" },
    { metric: "emailDelivered", occurredAt: "2026-09-03T11:00:00Z" },
    { metric: "ticketRecovered", occurredAt: "2026-09-04T01:00:00Z" },
    { metric: "linkInvalidated", occurredAt: null },
  ], 3, new Date("2026-09-04T20:00:00Z"));

  assert.deepEqual(result.map((point) => point.day), ["2026-09-02", "2026-09-03", "2026-09-04"]);
  assert.equal(result[1].emailDelivered, 2);
  assert.equal(result[2].ticketRecovered, 1);
  assert.equal(result[0].assistedChange, 0);
});
