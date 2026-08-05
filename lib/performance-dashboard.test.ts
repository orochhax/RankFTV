import test from "node:test";
import assert from "node:assert/strict";
import { expandTaskOccurrences, habitMonthStats, monthGrid, resolveDashboardRange, taskProgress, type Task } from "@/lib/performance-dashboard";

const task = (overrides: Partial<Task> = {}): Task => ({ id: "task-1", title: "Ler", startDate: "2026-08-05", recurrenceType: "daily", recurrenceEndDate: "2026-08-07", active: true, ...overrides });

test("resolveDashboardRange usa segunda a domingo na semana", () => {
  assert.deepEqual(resolveDashboardRange("week", "2026-08-05"), { period: "week", from: "2026-08-03", to: "2026-08-09" });
});

test("resolveDashboardRange aceita personalizado valido", () => {
  assert.deepEqual(resolveDashboardRange("custom", "2026-08-05", "2026-08-01", "2026-08-03"), { period: "custom", from: "2026-08-01", to: "2026-08-03" });
});

test("expande recorrencia diaria inclusiva e cada log e independente", () => {
  const occurrences = expandTaskOccurrences([task()], [{ task_id: "task-1", occurrence_date: "2026-08-06", completed: true, completed_at: "now" }], resolveDashboardRange("custom", "2026-08-05", "2026-08-05", "2026-08-07"));
  assert.equal(occurrences.length, 3);
  assert.equal(occurrences.filter((item) => item.completed).length, 1);
  assert.deepEqual(taskProgress(occurrences), { completed: 1, total: 3, percent: 33 });
});

test("tarefa sem repeticao aparece somente na data inicial", () => {
  const occurrences = expandTaskOccurrences([task({ recurrenceType: "none", recurrenceEndDate: null })], [], resolveDashboardRange("custom", "2026-08-05", "2026-08-05", "2026-08-07"));
  assert.deepEqual(occurrences.map((item) => item.occurrenceDate), ["2026-08-05"]);
});

test("constancia mensal considera o mes atual ate hoje e calcula status", () => {
  const habit = { id: "habit-1", label: "Agua", tipo: "binario" as const, alvo: null, unidade: null, ordem: 1, ativo: true };
  const logs = ["2026-08-01", "2026-08-02", "2026-08-03"].map((data) => ({ habit_id: "habit-1", data, valor: 1 }));
  const stats = habitMonthStats(habit, logs, "2026-08", "2026-08-03");
  assert.deepEqual(stats, { completed: 3, eligible: 3, percent: 100, status: "good" });
});

test("heatmap mensal sempre forma semanas completas", () => {
  const weeks = monthGrid("2026-08");
  assert.equal(weeks.every((week) => week.length === 7), true);
  assert.equal(weeks.flat().filter(Boolean).length, 31);
});
