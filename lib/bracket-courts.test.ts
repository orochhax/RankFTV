import assert from "node:assert/strict";
import test from "node:test";
import { courtNumberForMatch, normalizeCourtConfiguration } from "./bracket-courts";

test("uma unica quadra recebe todas as partidas", () => {
  for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
    assert.equal(courtNumberForMatch(
      { totalCourts: 1, primaryCourtNumber: 1 },
      { roundIndex, matchIndex: 3, totalRounds: 4, secondaryMatch: roundIndex === 0 },
    ), 1);
  }
});

test("final e semifinais usam a unica quadra principal", () => {
  const config = { totalCourts: 4, primaryCourtNumber: 3 };
  assert.equal(courtNumberForMatch(config, { roundIndex: 3, matchIndex: 0, totalRounds: 4 }), 3);
  assert.equal(courtNumberForMatch(config, { roundIndex: 2, matchIndex: 0, totalRounds: 4 }), 3);
  assert.equal(courtNumberForMatch(config, { roundIndex: 2, matchIndex: 1, totalRounds: 4 }), 3);
});

test("terceiro lugar e futura repescagem usam quadra secundaria", () => {
  const config = { totalCourts: 3, primaryCourtNumber: 1 };
  assert.equal(courtNumberForMatch(config, { roundIndex: 4, matchIndex: 0, totalRounds: 4, secondaryMatch: true }), 2);
  assert.equal(courtNumberForMatch(config, { roundIndex: 4, matchIndex: 1, totalRounds: 4, secondaryMatch: true }), 3);
});

test("configuracao invalida e limitada sem deixar partidas sem quadra", () => {
  assert.deepEqual(normalizeCourtConfiguration({ totalCourts: 0, primaryCourtNumber: 99 }), {
    totalCourts: 1,
    primaryCourtNumber: 1,
  });
});
