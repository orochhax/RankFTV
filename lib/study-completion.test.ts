import assert from "node:assert/strict";
import test from "node:test";
import { studyCompletionPolicy } from "./study-completion";

test("checks incompletos impedem conclusão", () => {
  assert.equal(studyCompletionPolicy({ requiredChecks: 3, checkedChecks: 2, questionIds: [], attempts: [] }).eligible, false);
});

test("todas as respostas contam mesmo quando erradas", () => {
  const result = studyCompletionPolicy({ requiredChecks: 2, checkedChecks: 2, questionIds: ["q1", "q2"], attempts: [{ answers: { q1: 3, q2: 0 } }] });
  assert.equal(result.completed, true);
});

test("pergunta atual ausente impede conclusão", () => {
  assert.equal(studyCompletionPolicy({ requiredChecks: 1, checkedChecks: 1, questionIds: ["q1", "q2"], attempts: [{ answers: { q1: 1 } }] }).eligible, false);
});

test("desmarcar requisito revoga conclusão não legada", () => {
  assert.equal(studyCompletionPolicy({ requiredChecks: 2, checkedChecks: 1, questionIds: [], attempts: [] }).completed, false);
});

test("etapa sem gates permanece manual e conclusão legada é preservada", () => {
  assert.deepEqual(studyCompletionPolicy({ requiredChecks: 0, checkedChecks: 0, questionIds: [], attempts: [] }), { eligible: false, completed: false, manual: true });
  assert.equal(studyCompletionPolicy({ requiredChecks: 2, checkedChecks: 0, questionIds: [], attempts: [], legacyCompletionPreserved: true }).completed, true);
});
