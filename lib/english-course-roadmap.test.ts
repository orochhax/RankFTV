import assert from "node:assert/strict";
import test from "node:test";

import { ASSESSMENT_QUESTIONS, JULIA_INITIAL_ANSWERS } from "../components/admin/english-course/assessment";
import { PRACTICE_SETS } from "../components/admin/english-course/practice";
import { LEARNER_INTERESTS, ROADMAP_DAYS, ROADMAP_DAYS_BY_LEARNER } from "../components/admin/english-course/roadmap";
import { JULIA_CALIBRATED_PROGRESS } from "../components/admin/english-course/storage";

test("first English cycle has four immersion pillars on all 35 days", () => {
  assert.equal(ROADMAP_DAYS.length, 35);
  assert.equal(ROADMAP_DAYS.flatMap((day) => day.activities).length, 140);

  for (const day of ROADMAP_DAYS) {
    assert.equal(day.activities.length, 4, `day ${day.day} should have four activities`);
    assert.ok(day.activities.some((activity) => activity.kind === "listening"), `day ${day.day} should include listening`);
    assert.ok(day.activities.some((activity) => activity.kind === "practice"), `day ${day.day} should include an on-site response`);
    assert.ok(day.activities.some((activity) => activity.kind === "speaking"), `day ${day.day} should include speaking`);
  }
});

test("interactive English activities have prepared on-site content", () => {
  const interactive = ROADMAP_DAYS.flatMap((day) => day.activities)
    .filter((activity) => activity.kind === "practice" || activity.kind === "speaking");

  for (const activity of interactive) {
    assert.ok(PRACTICE_SETS[activity.id], `${activity.id} should have prepared content`);
  }
});

test("listening activities use bounded YouTube segments", () => {
  const listening = Object.values(ROADMAP_DAYS_BY_LEARNER)
    .flatMap((days) => days)
    .flatMap((day) => day.activities)
    .filter((activity) => activity.kind === "listening");

  for (const activity of listening) {
    const resource = activity.resources?.[0];
    assert.ok(resource?.url.startsWith("https://www.youtube.com/watch?v="));
    assert.equal(typeof resource?.startSeconds, "number");
    assert.equal(typeof resource?.endSeconds, "number");
  }
});

test("Carlos and Julia receive separate interest-based immersion", () => {
  assert.equal(LEARNER_INTERESTS.carlos.length, 5);
  assert.equal(LEARNER_INTERESTS.julia.length, 5);

  const listeningUrls = (learner: keyof typeof ROADMAP_DAYS_BY_LEARNER) => new Set(
    ROADMAP_DAYS_BY_LEARNER[learner]
      .flatMap((day) => day.activities)
      .filter((activity) => activity.kind === "listening")
      .flatMap((activity) => activity.resources ?? [])
      .map((resource) => resource.url),
  );

  assert.notDeepEqual(listeningUrls("carlos"), listeningUrls("julia"));
  assert.ok([...listeningUrls("carlos")].some((url) => url.includes("tyvMjvvrq74")));
  assert.ok([...listeningUrls("julia")].some((url) => url.includes("qhlkMyJHvmA")));
  assert.ok([...listeningUrls("julia")].some((url) => url.includes("hhmNNs47PMo")));
});

test("Julia calibration matches her submitted placement answers", () => {
  const correct = ASSESSMENT_QUESTIONS.filter((question) => JULIA_INITIAL_ANSWERS[question.id] === question.correct).length;
  assert.equal(correct, 11);
  assert.deepEqual(Object.keys(JULIA_CALIBRATED_PROGRESS).sort(), ["day-2-lesson", "day-4-lesson", "day-5-lesson"]);
});
