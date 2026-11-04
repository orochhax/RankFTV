import assert from "node:assert/strict";
import test from "node:test";
import { assessServiceUnlocks, serviceConfirmationId, serviceUnlockStages } from "./service-unlocks";
import type { RoadmapSnapshot } from "./types";

function roadmap(): RoadmapSnapshot {
  return {
    generatedAt: "2026-10-27T00:00:00.000Z",
    sourcePath: "test.md",
    period: { start: "2026-10-28", end: "2027-01-25" },
    totalBusinessDays: 60,
    days: Array.from({ length: 60 }, (_, index) => ({
      id: `dia-${index + 1}`,
      dayNumber: index + 1,
      date: "2026-10-27",
      weekday: "terça-feira",
      plannedMinutes: 60,
      courses: [],
      sections: [{
        title: "Data Science",
        tasks: [{ id: `d${index + 1}`, label: "Aula", kind: "aula" as const, durationMinutes: 60 }],
      }],
    })),
  };
}

test("desbloqueia M1 apenas com aulas concluídas e confirmações", () => {
  const completed = new Set<string>();
  for (let day = 1; day <= 10; day += 1) {
    completed.add(`d${day}`);
  }
  let result = assessServiceUnlocks(roadmap(), completed);
  assert.equal(result[0].status, "revisao");
  serviceUnlockStages[0].confirmations.forEach((_, index) => completed.add(serviceConfirmationId("m1", index)));
  result = assessServiceUnlocks(roadmap(), completed);
  assert.equal(result[0].status, "desbloqueado");
  assert.equal(result[0].progress, 100);
});

test("mantém estágio bloqueado quando o pré-requisito não foi desbloqueado", () => {
  const completed = new Set<string>();
  for (let day = 11; day <= 22; day += 1) {
    completed.add(`d${day}`);
  }
  serviceUnlockStages[1].confirmations.forEach((_, index) => completed.add(serviceConfirmationId("m2", index)));
  const result = assessServiceUnlocks(roadmap(), completed);
  assert.equal(result[1].status, "bloqueado");
});
