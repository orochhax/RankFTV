import assert from "node:assert/strict";
import test from "node:test";
import { availableCategorySpots } from "./category-availability";

test("uses the category limit when there is no limited active tier", () => {
  assert.equal(availableCategorySpots(12, 5, undefined), 7);
});

test("uses the active tier limit when the category has no pair limit", () => {
  assert.equal(availableCategorySpots(null, 0, { quantidadeMaxima: 20, vendidos: 13 }), 7);
});

test("uses the tightest limit between category and active tier", () => {
  assert.equal(availableCategorySpots(12, 5, { quantidadeMaxima: 20, vendidos: 15 }), 5);
});

test("never exposes a negative number of available spots", () => {
  assert.equal(availableCategorySpots(4, 6, { quantidadeMaxima: 3, vendidos: 5 }), 0);
});
