import assert from "node:assert/strict";
import test from "node:test";
import { createDoubleEliminationPlan } from "./double-elimination";

test("16 duplas classificam duas pela principal e duas pela repescagem antes das semifinais", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.filter((match) => match.key.startsWith("w-")).length, 14);
  assert.equal(plan.filter((match) => match.section === "losers").length, 12);
  assert.equal(plan.filter((match) => match.key.startsWith("semi-")).length, 2);
  assert.equal(plan.filter((match) => match.key === "final").length, 1);
  assert.equal(plan.filter((match) => match.section === "third_place").length, 1);
  assert.equal(plan.length, 30);
});

test("os dois classificados superiores entram nas semifinais", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.find((match) => match.key === "w-2-0")?.nextWinnerKey, "semi-0");
  assert.equal(plan.find((match) => match.key === "w-2-1")?.nextWinnerKey, "semi-1");
});

test("os dois classificados da repescagem voltam cruzados para a fase principal", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 16 }, (_, index) => `p-${index}`));
  assert.equal(plan.find((match) => match.key === "l-3-0")?.nextWinnerKey, "semi-1");
  assert.equal(plan.find((match) => match.key === "l-3-1")?.nextWinnerKey, "semi-0");
  assert.equal(plan.find((match) => match.key === "l-3-0")?.nextWinnerSlot, "b");
});

test("semifinais alimentam a final e a disputa de terceiro lugar", () => {
  const plan = createDoubleEliminationPlan(Array.from({ length: 8 }, (_, index) => `p-${index}`));
  const semifinal = plan.find((match) => match.key === "semi-0");
  assert.equal(semifinal?.nextWinnerKey, "final");
  assert.equal(semifinal?.nextLoserKey, "third-place");
});
