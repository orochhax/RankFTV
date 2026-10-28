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
      plannedMinutes: 240,
      courses: [],
      sections: [{
        title: "Prática e entrega",
        tasks: [120, 45, 15].map((duration) => ({ id: `d${index + 1}-${duration}`, label: "Entrega", kind: "entrega" as const, durationMinutes: duration })),
      }],
    })),
  };
}

test("desbloqueia M1 apenas com práticas principais e confirmações", () => {
  const completed = new Set<string>();
  for (let day = 1; day <= 10; day += 1) {
    completed.add(`d${day}-120`);
    completed.add(`d${day}-45`);
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
    completed.add(`d${day}-120`);
    completed.add(`d${day}-45`);
  }
  serviceUnlockStages[1].confirmations.forEach((_, index) => completed.add(serviceConfirmationId("m2", index)));
  const result = assessServiceUnlocks(roadmap(), completed);
  assert.equal(result[1].status, "bloqueado");
});
