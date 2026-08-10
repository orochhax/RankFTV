import assert from "node:assert/strict";
import test from "node:test";
import { habitCurrentStreak } from "./performance-analytics";
import { habitMonthStats } from "./performance-dashboard";
import { habitEndDateAfterOccurrences, habitScheduleSummary, isHabitScheduled, type Habit } from "./performance";

const habit: Habit = { id: "h1", label: "Futevôlei", tipo: "binario", alvo: null, unidade: null, ordem: 0, ativo: true, frequencyType: "custom_weekdays", weekdays: [2, 4] };

test("frequência personalizada planeja somente os dias escolhidos", () => {
  assert.equal(isHabitScheduled(habit, "2026-08-11"), true); // terça
  assert.equal(isHabitScheduled(habit, "2026-08-12"), false);
  assert.equal(isHabitScheduled(habit, "2026-08-13"), true); // quinta
  assert.equal(habitScheduleSummary(habit), "terça, quinta");
});

test("histórico de agenda preserva a regra vigente em cada data", () => {
  const changed: Habit = { ...habit, schedulePeriods: [
    { frequencyType: "weekdays", weekdays: [], effectiveFrom: "2026-08-01", effectiveTo: "2026-08-09" },
    { frequencyType: "custom_weekdays", weekdays: [2, 4], effectiveFrom: "2026-08-10", effectiveTo: null },
  ] };
  assert.equal(isHabitScheduled(changed, "2026-08-07"), true);
  assert.equal(isHabitScheduled(changed, "2026-08-08"), false);
  assert.equal(isHabitScheduled(changed, "2026-08-11"), true);
});

test("dias de folga não entram no denominador mensal", () => {
  const stats = habitMonthStats(habit, [{ habit_id: "h1", data: "2026-08-11", valor: 1 }], "2026-08", "2026-08-13");
  assert.deepEqual(stats, { completed: 1, eligible: 4, percent: 25, status: "bad" });
});

test("dias não planejados não quebram sequência", () => {
  const logs = ["2026-08-04", "2026-08-06", "2026-08-11", "2026-08-13"].map((data) => ({ habit_id: "h1", data, valor: 1 }));
  assert.equal(habitCurrentStreak(habit, logs, "2026-08-13"), 4);
});

test("encerramento automático conta apenas os dias planejados", () => {
  assert.equal(habitEndDateAfterOccurrences("2026-08-10", "daily", [], 20), "2026-08-29");
  assert.equal(habitEndDateAfterOccurrences("2026-08-10", "custom_weekdays", [2, 4], 4), "2026-08-20");
});
