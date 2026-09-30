import assert from "node:assert/strict";
import test from "node:test";
import { buildFunnelReport } from "./public-funnel-report";

test("funnel report measures reach, conversion and completion time per version", () => {
  const report = buildFunnelReport([
    { sessionId: "a", eventName: "championship_viewed", experienceVersion: "discovery_v2", occurredAt: "2026-09-04T12:00:00Z" },
    { sessionId: "a", eventName: "payment_confirmed", experienceVersion: "discovery_v2", occurredAt: "2026-09-04T12:10:00Z" },
    { sessionId: "b", eventName: "championship_viewed", experienceVersion: "discovery_v2", occurredAt: "2026-09-04T13:00:00Z" },
  ])[0];
  assert.equal(report.sessions, 2);
  assert.equal(report.completionPercent, 50);
  assert.equal(report.medianCompletionMinutes, 10);
});
