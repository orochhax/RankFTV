import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS,
  openAIReasoningEffort,
  openAIRoadmapMaxOutputTokens,
} from "./openai-config";

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

test("roadmaps extensos recebem um limite de saida compativel com o modelo configurado", () => {
  assert.equal(openAIRoadmapMaxOutputTokens(undefined), OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS);
  assert.equal(openAIRoadmapMaxOutputTokens(" 100000 "), 100_000);
  assert.equal(openAIRoadmapMaxOutputTokens("invalido"), OPENAI_ROADMAP_DEFAULT_MAX_OUTPUT_TOKENS);
  assert.equal(openAIRoadmapMaxOutputTokens("5000"), 30_000);
  assert.equal(openAIRoadmapMaxOutputTokens("200000"), 128_000);
});

test("a geracao em segundo plano usa o orcamento ampliado sem alongar a importacao sincrona", () => {
  const actionsSource = readFileSync(
    new URL("../app/admin/performance/life-os-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actionsSource, /responses\.parse\([\s\S]{0,1200}max_output_tokens: 30_000/);
  assert.match(actionsSource, /responses\.create\([\s\S]{0,1800}max_output_tokens: openAIRoadmapMaxOutputTokens\(process\.env\.OPENAI_ROADMAP_MAX_OUTPUT_TOKENS\)/);
});
