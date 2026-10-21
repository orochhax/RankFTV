import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeEvolutionScore, computeStudyWeek, weekRange } from "./metrics";

describe("Central de Evolução — semana de segunda a domingo", () => {
  it("calcula a semana inclusive quando a data é domingo", () => {
    assert.deepEqual(weekRange("2026-10-25"), { start: "2026-10-19", end: "2026-10-25" });
  });
});

describe("Central de Evolução — dívida de estudo", () => {
  it("mantém a falha original e permite pagar a dívida depois", () => {
    const result = computeStudyWeek([
      { id: "1", studyDate: "2026-10-19", minutes: 60, source: "manual" },
      { id: "2", studyDate: "2026-10-20", minutes: 180, source: "manual" },
    ], "2026-10-20");

    assert.deepEqual(result.failedWeekdays, ["2026-10-19"]);
    assert.equal(result.outstandingDebtMinutes, 0);
    assert.equal(result.days[1].extraAppliedToDebtMinutes, 60);
  });

  it("usa o fim de semana para pagar dívida sem apagar o dia falho", () => {
    const result = computeStudyWeek([
      { id: "1", studyDate: "2026-10-19", minutes: 90, source: "manual" },
      { id: "2", studyDate: "2026-10-20", minutes: 120, source: "manual" },
      { id: "3", studyDate: "2026-10-21", minutes: 120, source: "manual" },
      { id: "4", studyDate: "2026-10-22", minutes: 120, source: "manual" },
      { id: "5", studyDate: "2026-10-23", minutes: 120, source: "manual" },
      { id: "6", studyDate: "2026-10-24", minutes: 30, source: "manual" },
    ], "2026-10-24");

    assert.equal(result.outstandingDebtMinutes, 0);
    assert.deepEqual(result.failedWeekdays.slice(0, 1), ["2026-10-19"]);
    assert.equal(result.days[5].extraAppliedToDebtMinutes, 30);
  });
});

describe("Central de Evolução — score", () => {
  it("aplica os pesos 50/30/20 sem incluir RankFTV", () => {
    const study = computeStudyWeek([
      ...Array.from({ length: 5 }, (_, index) => ({
        id: String(index),
        studyDate: `2026-10-${19 + index}`,
        minutes: 120,
        source: "manual" as const,
      })),
    ], "2026-10-23");
    const score = computeEvolutionScore({
      study,
      videoPublished: true,
      trainingDays: 6,
      expectedTrainingDays: 6,
      weightLogged: true,
    });

    assert.deepEqual(score, { total: 100, dataScience: 50, rochaTech: 30, instaShape: 20 });
  });
});
