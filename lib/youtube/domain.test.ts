import assert from "node:assert/strict";
import test from "node:test";
import { computeLiveNewsOpportunityScore, dueYoutubeScheduleKey, scoreYoutubeOpportunity } from "@/lib/youtube/domain";

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

test("computeLiveNewsOpportunityScore limita notícias corporativas sem vídeo prático e aplica decaimento por idade", () => {
  const now = new Date("2026-11-06T18:00:00.000Z");
  const corporateChipNews = computeLiveNewsOpportunityScore({
    title: "IA acelera simulações e decisões na fabricação de chips",
    opportunity_score: 82,
    published_at: "2026-11-05T12:00:00.000Z",
    collected_at: "2026-11-05T12:00:00.000Z",
  }, now);
  const freshClaudeLaunch = computeLiveNewsOpportunityScore({
    title: "Anthropic lança novas Skills e agentes de código no Claude",
    opportunity_score: 90,
    published_at: "2026-11-06T12:00:00.000Z",
    collected_at: "2026-11-06T12:00:00.000Z",
  }, now);
  const oldNews = computeLiveNewsOpportunityScore({
    title: "Guia compara sete ferramentas de vídeo com IA",
    opportunity_score: 78,
    published_at: "2026-10-25T12:00:00.000Z",
    collected_at: "2026-10-25T12:00:00.000Z",
  }, now);

  assert.ok(corporateChipNews !== null && corporateChipNews <= 64);
  assert.ok(freshClaudeLaunch !== null && freshClaudeLaunch >= 90);
  assert.ok(oldNews !== null && oldNews < 70);
});
