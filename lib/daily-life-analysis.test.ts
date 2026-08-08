import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyLifeMetrics,
  buildFallbackDailyLifeNarrative,
  createDailyLifeAnalysis,
  dailyLifePromptInput,
  dailyLifeSystemInstructions,
  parseDailyLifeAnalysis,
  sanitizeDailyLifeNarrative,
  type DailyLifeNarrative,
  type DailyLifeMetricsInput,
} from "./daily-life-analysis";
import { addDays } from "./performance";

function baseInput(): DailyLifeMetricsInput {
  const analysisDate = "2026-08-06";
  const completedDates = Array.from({ length: 7 }, (_, index) =>
    addDays("2026-07-30", index),
  );
  return {
    analysisDate,
    timezone: "America/Bahia",
    profileName: "Carlos",
    trainingWeeklyTarget: null,
    targetWeight: null,
    habits: [
      {
        id: "habit-1",
        label: "Ler",
        type: "binario",
        target: 1,
        active: true,
        frequencyType: "daily",
      },
    ],
    habitLogs: completedDates.map((date) => ({
      habitId: "habit-1",
      date,
      value: 1,
    })),
    tasks: [
      {
        id: "task-1",
        title: "Estudar",
        startDate: "2026-07-23",
        recurrenceType: "daily",
        recurrenceEndDate: "2026-08-06",
        active: true,
      },
    ],
    taskLogs: completedDates.map((date) => ({
      taskId: "task-1",
      date,
      completed: true,
    })),
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
  input.activities = [
    {
      date: "2026-08-05",
      area: "estudos",
      durationMinutes: 60,
      status: "completed",
    },
  ];

  const metrics = buildDailyLifeMetrics(input);
  assert.equal(metrics.overall.score, null);
  assert.equal(metrics.overall.status, "insufficient_data");
  assert.deepEqual(metrics.overall.scoreBasis, []);
  assert.equal(metrics.consistency.streak, null);
});

test("fallback narrative remains evidence based and stored payload is parseable", () => {
  const metrics = buildDailyLifeMetrics(baseInput());
  const narrative = buildFallbackDailyLifeNarrative(metrics);
  const analysis = createDailyLifeAnalysis({
    metrics,
    narrative,
    generatedAt: "2026-08-06T08:00:00.000Z",
    generation: {
      mode: "fallback",
      model: null,
      promptVersion: "test",
      responseId: null,
    },
  });

  assert.match(narrative.summary, /100\/100/);
  assert.equal(parseDailyLifeAnalysis(analysis)?.analysisDate, "2026-08-06");
  assert.equal(parseDailyLifeAnalysis({ invalid: true }), null);
});

test("partial or failed sources stay unavailable instead of becoming zero performance", () => {
  const input = baseInput();
  input.tasks = [];
  input.taskLogs = [];
  input.trainingWeeklyTarget = 4;
  input.activities = [
    {
      date: "2026-08-05",
      area: "academia",
      durationMinutes: 50,
      status: "completed",
    },
  ];
  input.dataStates = { habits: "error", academy: "partial" };

  const metrics = buildDailyLifeMetrics(input);

  assert.equal(metrics.overall.score, null);
  assert.deepEqual(metrics.overall.scoreBasis, []);
  assert.deepEqual(metrics.habits.current, {
    completed: null,
    planned: null,
    percent: null,
  });
  assert.equal(metrics.academy.sessionsCurrent, null);
  assert.equal(metrics.academy.weeklyTarget, null);
  assert.ok(metrics.coverage.unavailable.includes("habitos"));
  assert.ok(metrics.coverage.partial.includes("academia"));
  assert.ok(!metrics.coverage.available.includes("habitos"));
  assert.ok(!metrics.coverage.available.includes("academia"));
});

test("study completion after the closed period does not rewrite scheduled adherence", () => {
  const input = baseInput();
  input.habits = [];
  input.habitLogs = [];
  input.tasks = [];
  input.taskLogs = [];
  input.roadmaps = [{ id: "roadmap-1", title: "SQL", status: "active" }];
  input.activities = [
    {
      date: "2026-08-05",
      area: "estudos",
      durationMinutes: 50,
      status: "completed",
      studyItemId: "item-1",
      title: "Sessao de SQL",
      type: "pomodoro",
      learning: "Pratiquei joins.",
    },
  ];
  input.studyItems = [
    {
      id: "item-1",
      roadmapId: "roadmap-1",
      title: "Joins",
      status: "completed",
      completedAt: "2026-08-06T12:00:00.000Z",
      scheduledDate: "2026-08-05",
      orderIndex: 0,
      estimatedMinutes: 45,
    },
  ];
  input.studyAttempts = [
    { itemId: "item-1", score: 90, submittedAt: "2026-08-05T20:00:00.000Z" },
  ];

  const metrics = buildDailyLifeMetrics(input);

  assert.equal(metrics.study.scheduledCurrent.planned, 1);
  assert.equal(metrics.study.scheduledCurrent.completedByPeriodEnd, 0);
  assert.equal(metrics.study.scheduledCurrent.percent, 0);
  assert.equal(metrics.study.completedStepsCurrent, 0);
  assert.equal(metrics.study.roadmapCompleted, 0);
  assert.equal(metrics.study.roadmapProgressPercent, 0);
  assert.equal(metrics.study.nextItem, "Joins");
  assert.equal(metrics.study.attemptsCurrent, 1);
  assert.equal(metrics.study.averageScoreCurrent, 90);
  assert.deepEqual(metrics.study.recentSessions, [
    {
      date: "2026-08-05",
      title: "Sessao de SQL",
      type: "pomodoro",
      durationMinutes: 50,
      learning: "Pratiquei joins.",
      itemTitle: "Joins",
    },
  ]);
  assert.equal(metrics.overall.score, 0);

  input.studyItems[0].completedAt = "2026-08-05T20:00:00.000Z";
  const completedInTime = buildDailyLifeMetrics(input);
  assert.equal(completedInTime.study.scheduledCurrent.completedByPeriodEnd, 1);
  assert.equal(completedInTime.study.scheduledCurrent.percent, 100);
  assert.equal(completedInTime.study.roadmapCompleted, 1);
  assert.equal(completedInTime.study.roadmapProgressPercent, 100);
  assert.equal(completedInTime.study.nextItem, null);
  assert.equal(completedInTime.overall.score, 100);
});

test("academy summary carries recent workout context without evaluating today", () => {
  const input = baseInput();
  input.activities = [
    {
      date: "2026-08-05",
      area: "academia",
      durationMinutes: 65,
      status: "completed",
      title: "Treino de pernas",
      type: "forca",
      metadata: { muscle_groups: ["quadriceps", "gluteos"] },
    },
    {
      date: "2026-08-06",
      area: "academia",
      durationMinutes: 20,
      status: "completed",
      title: "Treino de hoje",
    },
  ];

  const metrics = buildDailyLifeMetrics(input);

  assert.equal(metrics.academy.sessionsCurrent, 1);
  assert.deepEqual(metrics.academy.recentSessions, [
    {
      date: "2026-08-05",
      title: "Treino de pernas",
      type: "forca",
      durationMinutes: 65,
      muscleGroups: ["quadriceps", "gluteos"],
    },
  ]);
});

test("investment summary closes yesterday and separates flows from adjusted return", () => {
  const input = baseInput();
  input.habits = [];
  input.habitLogs = [];
  input.tasks = [];
  input.taskLogs = [];
  input.portfolioSnapshots = [
    { date: "2026-07-01", totalValue: 100_000 },
    { date: "2026-08-01", totalValue: 109_000 },
    { date: "2026-08-06", totalValue: 999_999 },
  ];
  input.contributions = [
    { date: "2026-07-15", amount: 10_000 },
    { date: "2026-08-03", amount: 2_000 },
    { date: "2026-08-06", amount: 999 },
  ];
  input.withdrawals = [
    { date: "2026-07-20", amount: 1_000 },
    { date: "2026-08-04", amount: 500 },
    { date: "2026-08-06", amount: 999 },
  ];
  input.investmentPlan = { id: "plan-1", name: "Independencia", active: true };
  input.investmentPlanRevisions = [
    {
      id: "revision-1",
      planId: "plan-1",
      version: 1,
      effectiveFrom: "2026-06-01",
      baselineDate: "2026-06-01",
      baselineValue: 100_000,
      targetValue: 200_000,
      targetDate: "2028-06-01",
      valueMode: "nominal",
      valueReferenceDate: "2026-06-01",
      plannedMonthlyContribution: 2_000,
      annualReturnConservative: 0.04,
      annualReturnBase: 0.06,
      annualReturnFavorable: 0.08,
      annualInflation: 0.04,
    },
  ];
  input.weights = [
    { date: "2026-08-05", weightKg: 80 },
    { date: "2026-08-06", weightKg: 70 },
  ];

  const metrics = buildDailyLifeMetrics(input);

  assert.equal(metrics.investments.asOfDate, "2026-08-05");
  assert.equal(metrics.investments.latestSnapshotDate, "2026-08-01");
  assert.equal(metrics.investments.snapshotAgeDays, 4);
  assert.equal(metrics.investments.observedPortfolioValue, 109_000);
  assert.equal(metrics.investments.estimatedPortfolioValue, 110_500);
  assert.equal(metrics.investments.contributions30Days, 12_000);
  assert.equal(metrics.investments.withdrawals30Days, 1_500);
  assert.equal(metrics.investments.netContributions30Days, 10_500);
  assert.equal(metrics.investments.plan?.targetValue, 200_000);
  assert.equal(metrics.investments.plan?.valueMode, "nominal");
  assert.equal(metrics.investments.latestSnapshotPeriod?.residualResult, 0);
  assert.equal(
    metrics.investments.latestSnapshotPeriod?.cashFlowAdjustedReturnPercent,
    0,
  );
  assert.equal("portfolioChange30DaysPercent" in metrics.investments, false);
  assert.equal(metrics.body.currentWeightKg, 80);

  const fallback = buildFallbackDailyLifeNarrative(metrics);
  assert.ok(fallback.priorities.some((item) => item.area === "investimentos"));
});

test("fallback uses study evidence and never turns unavailable areas into claims", () => {
  const input = baseInput();
  input.habits = [];
  input.habitLogs = [];
  input.tasks = [];
  input.taskLogs = [];
  input.roadmaps = [{ id: "roadmap-1", title: "Dados", status: "active" }];
  input.studyItems = [
    {
      id: "item-1",
      roadmapId: "roadmap-1",
      title: "Modelagem",
      status: "pending",
      completedAt: null,
      scheduledDate: "2026-08-05",
      orderIndex: 0,
    },
  ];
  input.dataStates = { investments: "error" };
  const metrics = buildDailyLifeMetrics(input);
  const fallback = buildFallbackDailyLifeNarrative(metrics);

  assert.ok(fallback.alerts.some((item) => item.area === "estudos"));
  assert.ok(fallback.priorities.some((item) => item.area === "estudos"));
  assert.ok(!fallback.wins.some((item) => item.area === "investimentos"));
  assert.ok(!fallback.alerts.some((item) => item.area === "investimentos"));
  assert.ok(!fallback.priorities.some((item) => item.area === "investimentos"));
});

test("sanitizer removes unsupported model claims and prompt treats JSON text as data", () => {
  const input = baseInput();
  input.habits = [];
  input.habitLogs = [];
  input.tasks = [];
  input.taskLogs = [];
  input.dataStates = { investments: "migration_missing" };
  const metrics = buildDailyLifeMetrics(input);
  const narrative: DailyLifeNarrative = {
    headline: "Teste",
    summary: "Teste",
    comparison: "Teste",
    wins: [
      {
        area: "investimentos",
        title: "Lucro",
        evidence: "Rentabilidade inventada de 20%.",
      },
    ],
    alerts: [
      {
        area: "investimentos",
        title: "Risco",
        evidence: "Sem base.",
        impact: "Sem base.",
      },
    ],
    priorities: [
      {
        area: "investimentos",
        title: "Compre",
        action: "Compre um ativo.",
        why: "Sem base.",
      },
    ],
    closingMessage: "Teste",
  };

  const sanitized = sanitizeDailyLifeNarrative(metrics, narrative);
  assert.deepEqual(sanitized.wins, []);
  assert.deepEqual(sanitized.alerts, []);
  assert.ok(sanitized.priorities.length > 0);
  assert.ok(
    sanitized.priorities.every((item) => item.area !== "investimentos"),
  );
  assert.match(
    dailyLifePromptInput(metrics),
    /Areas parciais ou indisponiveis/,
  );
  assert.match(dailyLifeSystemInstructions(), /dado nao confiavel/);
  assert.notEqual(sanitized.summary, narrative.summary);
});

test("historical inactive commitments remain scheduled when they have an end date", () => {
  const input = baseInput();
  input.habits[0] = {
    ...input.habits[0],
    active: false,
    endDate: "2026-08-05",
  };
  input.tasks[0] = {
    ...input.tasks[0],
    active: false,
    recurrenceEndDate: "2026-08-05",
  };

  const metrics = buildDailyLifeMetrics(input);

  assert.equal(metrics.habits.current.percent, 100);
  assert.equal(metrics.tasks.current.percent, 100);
  assert.equal(metrics.overall.score, 100);
});

test("a newly created habit is not counted before its start date", () => {
  const input = baseInput();
  input.tasks = [];
  input.taskLogs = [];
  input.habits[0].startDate = "2026-08-05";
  input.habitLogs = [{ habitId: "habit-1", date: "2026-08-05", value: 1 }];

  const metrics = buildDailyLifeMetrics(input);

  assert.deepEqual(metrics.habits.current, {
    completed: 1,
    planned: 1,
    percent: 100,
  });
  assert.equal(metrics.overall.score, 100);
});
