import test from "node:test";
import assert from "node:assert/strict";
import { consistencyStatus, habitChartData, monthlyContributionSeries, parseStudyRoadmapMarkdown } from "./performance-analytics";
import type { Habit } from "./performance";
import type { TaskOccurrence } from "./performance-dashboard";

const habits: Habit[] = [
  { id: "gym", label: "Academia", tipo: "binario", alvo: null, unidade: null, ordem: 0, ativo: true },
  { id: "water", label: "Agua", tipo: "numerico", alvo: 2, unidade: "L", ordem: 1, ativo: true },
];

test("consistency balances habits and tasks without rewarding task volume", () => {
  const logs = [
    { habit_id: "gym", data: "2026-08-04", valor: 1 },
    { habit_id: "water", data: "2026-08-04", valor: 2 },
    { habit_id: "gym", data: "2026-08-05", valor: 1 },
    { habit_id: "water", data: "2026-08-05", valor: 2 },
  ];
  const tasks = Array.from({ length: 10 }, (_, index): TaskOccurrence => ({
    id: `t${index}`, title: "Tarefa", startDate: "2026-08-04", recurrenceType: "none", recurrenceEndDate: null,
    active: true, occurrenceDate: "2026-08-04", completed: index < 3, completedAt: null,
  }));
  assert.equal(consistencyStatus(habits, logs, tasks, "2026-08-05").streak, 1);
});

test("habit chart aggregates days, weeks and months", () => {
  const logs = [
    { habit_id: "gym", data: "2026-08-04", valor: 1 },
    { habit_id: "water", data: "2026-08-04", valor: 2 },
    { habit_id: "gym", data: "2026-08-05", valor: 1 },
  ];
  const week = habitChartData(habits, logs, "2026-08-05", "week");
  assert.equal(week.at(-2)?.total, 2);
  assert.equal(week.at(-1)?.total, 1);
  assert.ok(habitChartData(habits, logs, "2026-08-05", "month").length <= 5);
});

test("roadmap parser turns dated markdown checkboxes into scheduled items", () => {
  const parsed = parseStudyRoadmapMarkdown("## Dia 3 - Condicionais - 05/08/2026\n### Nucleo essencial\n1. [ ] Implementar regras\n### Desafio opcional\n- [x] Testar limites");
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].scheduledDate, "2026-08-05");
  assert.equal(parsed.items[0].itemKind, "core");
  assert.equal(parsed.items[1].itemKind, "challenge");
});

test("monthly contributions are summed by month", () => {
  const result = monthlyContributionSeries([
    { id: "1", date: "2026-08-01", amount: 100, institution: null, notes: null },
    { id: "2", date: "2026-08-20", amount: 50, institution: null, notes: null },
  ]);
  assert.equal(result[0].value, 150);
});
