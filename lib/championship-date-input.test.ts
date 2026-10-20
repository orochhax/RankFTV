import assert from "node:assert/strict";
import test from "node:test";
import {
  championshipEndDateMinimum,
  reconcileChampionshipEndDate,
} from "./championship-date-input";

test("event end date accepts the same day as its start date", () => {
  assert.equal(championshipEndDateMinimum("2026-10-16"), "2026-10-16");
  assert.equal(reconcileChampionshipEndDate("2026-10-16", "2026-10-16"), "2026-10-16");
});

test("event end date removes a selected date that becomes earlier than the start", () => {
  assert.equal(reconcileChampionshipEndDate("2026-10-16", "2026-10-15"), "");
  assert.equal(reconcileChampionshipEndDate("2026-10-16", "2026-10-17"), "2026-10-17");
  assert.equal(championshipEndDateMinimum(""), undefined);
});
