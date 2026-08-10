import assert from "node:assert/strict";
import test from "node:test";
import { openAIReasoningEffort } from "./openai-config";

test("aceita os niveis de raciocinio suportados pela configuracao", () => {
  for (const effort of ["none", "low", "medium", "high", "xhigh", "max"] as const) {
    assert.equal(openAIReasoningEffort(effort), effort);
  }
});

test("normaliza o env e usa fallback seguro para valores invalidos", () => {
  assert.equal(openAIReasoningEffort(" HIGH "), "high");
  assert.equal(openAIReasoningEffort("invalido", "low"), "low");
  assert.equal(openAIReasoningEffort(undefined), "medium");
});
