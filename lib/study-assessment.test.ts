import test from "node:test";
import assert from "node:assert/strict";
import { isStudyAnswerCorrect, validOrderingAnswer, validStudyAnswer } from "./study-assessment";

test("multiple choice validates one option and grades it", () => {
  const question = { questionType: "multiple_choice" as const, optionCount: 4, correctOptionIndex: 2, correctOrder: [] };
  assert.equal(validStudyAnswer(2, question), true);
  assert.equal(validStudyAnswer([2], question), false);
  assert.equal(isStudyAnswerCorrect(2, question), true);
  assert.equal(isStudyAnswerCorrect(1, question), false);
});

test("ordering requires a complete permutation without duplicates", () => {
  assert.equal(validOrderingAnswer([1, 3, 2, 0], 4), true);
  assert.equal(validOrderingAnswer([1, 3, 3, 0], 4), false);
  assert.equal(validOrderingAnswer([1, 2, 0], 4), false);
  assert.equal(validOrderingAnswer([1, 2, 3, 4], 4), false);
});

test("ordering is correct only when every position matches", () => {
  const question = { questionType: "ordering" as const, optionCount: 4, correctOptionIndex: null, correctOrder: [1, 3, 2, 0] };
  assert.equal(isStudyAnswerCorrect([1, 3, 2, 0], question), true);
  assert.equal(isStudyAnswerCorrect([1, 2, 3, 0], question), false);
});
