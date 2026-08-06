import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyLifeMetrics,
  buildFallbackDailyLifeNarrative,
  createDailyLifeAnalysis,
  parseDailyLifeAnalysis,
  type DailyLifeMetricsInput,
} from "./daily-life-analysis";
import { addDays } from "./performance";

function baseInput(): DailyLifeMetricsInput {
  const analysisDate = "2026-08-06";
  const completedDates = Array.from({ length: 7 }, (_, index) => addDays("2026-07-30", index));
  return {
    analysisDate,
    timezone: "America/Bahia",
    profileName: "Carlos",
    trainingWeeklyTarget: null,
    targetWeight: null,
    habits: [{ id: "habit-1", label: "Ler", type: "binario", target: 1, active: true, frequencyType: "daily" }],
    habitLogs: completedDates.map((date) => ({ habitId: "habit-1", date, value: 1 })),
    tasks: [{ id: "task-1", title: "Estudar", startDate: "2026-07-23", recurrenceType: "daily", recurrenceEndDate: "2026-08-06", active: true }],
    taskLogs: completedDates.map((date) => ({ taskId: "task-1", date, completed: true })),
    activities: [],
    goals: [],
    events: [],
    roadmaps: [],
    studyItems: [],
    portfolioSnapshots: [],
    contributions: [],
    weights: [],
  };
}

test("daily analysis evaluates the closed day instead of penalizing the new morning", () => {
  const metrics = buildDailyLifeMetrics(baseInput());

  assert.equal(metrics.evaluationDate, "2026-08-05");
  assert.equal(metrics.overall.score, 100);
  assert.equal(metrics.overall.previousScore, 0);
  assert.equal(metrics.overall.trend, "up");
  assert.equal(metrics.consistency.streak, 7);
  assert.equal(metrics.habits.today.percent, 0);
});

test("daily analysis only scores areas backed by measurable plans", () => {
  const input = baseInput();
  input.habits = [];
  input.habitLogs = [];
  input.tasks = [];
  input.taskLogs = [];
  input.activities = [{ date: "2026-08-05", area: "estudos", durationMinutes: 60, status: "completed" }];

  const metrics = buildDailyLifeMetrics(input);
  assert.equal(metrics.overall.score, null);
  assert.equal(metrics.overall.status, "insufficient_data");
  assert.deepEqual(metrics.overall.scoreBasis, []);
});

test("fallback narrative remains evidence based and stored payload is parseable", () => {
  const metrics = buildDailyLifeMetrics(baseInput());
  const narrative = buildFallbackDailyLifeNarrative(metrics);
  const analysis = createDailyLifeAnalysis({
    metrics,
    narrative,
    generatedAt: "2026-08-06T08:00:00.000Z",
    generation: { mode: "fallback", model: null, promptVersion: "test", responseId: null },
  });

  assert.match(narrative.summary, /100\/100/);
  assert.equal(parseDailyLifeAnalysis(analysis)?.analysisDate, "2026-08-06");
  assert.equal(parseDailyLifeAnalysis({ invalid: true }), null);
});
