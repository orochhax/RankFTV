import assert from "node:assert/strict";
import test from "node:test";

import { PRACTICE_SETS } from "../components/admin/english-course/practice";
import { ROADMAP_DAYS } from "../components/admin/english-course/roadmap";

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
  const listening = ROADMAP_DAYS.flatMap((day) => day.activities)
    .filter((activity) => activity.kind === "listening");

  for (const activity of listening) {
    const resource = activity.resources?.[0];
    assert.ok(resource?.url.startsWith("https://www.youtube.com/watch?v="));
    assert.equal(typeof resource?.startSeconds, "number");
    assert.equal(typeof resource?.endSeconds, "number");
  }
});
