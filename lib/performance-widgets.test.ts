import test from "node:test";
import assert from "node:assert/strict";
import { academyDurationSeries, academyStreak, averageDuration, cumulativeContributions, investmentSummary, nextStudyItem, portfolioSeriesVariation, portfolioValueSeries, roadmapProgress, studyWeeklyStats } from "./performance-widgets";

test("academyStreak counts consecutive days and tolerates today not yet completed", () => {
  assert.equal(academyStreak(["2026-08-05", "2026-08-04", "2026-08-03"], "2026-08-05"), 3);
  assert.equal(academyStreak(["2026-08-04", "2026-08-03"], "2026-08-05"), 2);
  assert.equal(academyStreak(["2026-08-05", "2026-08-03"], "2026-08-05"), 1);
});

test("academy metrics calculate average duration and study weekly totals", () => {
  assert.equal(averageDuration([{ date: "2026-08-05", durationMinutes: 40 }, { date: "2026-08-06", durationMinutes: 60 }, { date: "2026-08-07", durationMinutes: null }]), 50);
  assert.deepEqual(studyWeeklyStats([{ date: "2026-08-03", durationMinutes: 60 }, { date: "2026-08-05", durationMinutes: 30 }], "2026-08-03", "2026-08-05"), { totalMinutes: 90, averageMinutes: 30, elapsedDays: 3 });
});

test("academy chart fills the last seven days and totals multiple workouts", () => {
  const chart = academyDurationSeries([
    { date: "2026-08-05", durationMinutes: 40 },
    { date: "2026-08-05", durationMinutes: 20 },
    { date: "2026-08-06", durationMinutes: 50 },
  ], "2026-08-06");

  assert.equal(chart.length, 7);
  assert.equal(chart[5].minutes, 60);
  assert.equal(chart[6].minutes, 50);
  assert.equal(chart[0].minutes, 0);
});

test("roadmap returns progress and first pending item", () => {
  const items = [
    { id: "1", roadmapId: "r", section: null, title: "A", description: null, orderIndex: 2, estimatedMinutes: null, status: "completed" as const, completedAt: null },
    { id: "2", roadmapId: "r", section: null, title: "B", description: null, orderIndex: 1, estimatedMinutes: null, status: "pending" as const, completedAt: null },
  ];
  assert.equal(roadmapProgress(items), 50);
  assert.equal(nextStudyItem(items)?.title, "B");
});

test("investment summary and monthly cumulative contributions are stable", () => {
  const contributions = [{ id: "1", date: "2026-08-01", amount: 100, institution: null, notes: null }, { id: "2", date: "2026-09-01", amount: 50, institution: null, notes: null }];
  assert.equal(investmentSummary(contributions, [{ date: "2026-09-02", totalValue: 170 }], [{ date: "2026-09-01", amount: 10 }]).returnPercent, 21.428571428571427);
  assert.deepEqual(cumulativeContributions(contributions).map((item) => item.cumulative), [100, 150]);
});

test("portfolio chart keeps the latest snapshot for each selected period", () => {
  const snapshots = [
    { date: "2026-07-31", totalValue: 900 },
    { date: "2026-08-03", totalValue: 1_000 },
    { date: "2026-08-05", totalValue: 1_100 },
    { date: "2026-08-10", totalValue: 1_250 },
  ];

  assert.deepEqual(portfolioValueSeries(snapshots, "day").map((item) => item.value), [900, 1_000, 1_100, 1_250]);
  assert.deepEqual(portfolioValueSeries(snapshots, "week").map((item) => item.value), [900, 1_100, 1_250]);
  assert.deepEqual(portfolioValueSeries(snapshots, "month").map((item) => item.value), [900, 1_250]);
  assert.deepEqual(portfolioSeriesVariation(portfolioValueSeries(snapshots, "month")), { amount: 350, percent: 38.88888888888889 });
});
