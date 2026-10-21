import assert from "node:assert/strict";
import test from "node:test";
import { dueYoutubeScheduleKey, scoreYoutubeOpportunity } from "@/lib/youtube/domain";

test("youtube opportunity score respects the configured weights", () => {
  const score = scoreYoutubeOpportunity({
    novelty: 100,
    impact: 0,
    audience: 0,
    momentum: 0,
    lowCompetition: 0,
    brazilRelevance: 0,
    demonstrability: 0,
    urgency: 0,
  }, {
    novelty: 100,
    impact: 0,
    audience: 0,
    momentum: 0,
    lowCompetition: 0,
    brazilRelevance: 0,
    demonstrability: 0,
    urgency: 0,
  });
  assert.equal(score, 100);
});

test("youtube schedule emits one idempotency key inside its time window", () => {
  const now = new Date("2026-10-20T11:05:00.000Z");
  const key = dueYoutubeScheduleKey(now, ["08:00", "14:00", "20:00"], new Set(), "America/Bahia");
  assert.equal(key, "2026-10-20@08:00");
  assert.equal(dueYoutubeScheduleKey(now, ["08:00"], new Set([key!]), "America/Bahia"), null);
});
