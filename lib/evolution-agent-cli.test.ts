import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agente local usa somente opções suportadas pelo Codex exec", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /"exec", "--ephemeral", "--ignore-user-config", "--search"/);
  assert.match(source, /"--sandbox", "read-only"/);
  assert.doesNotMatch(source, /--ask-for-approval/);
});

test("falhas estruturadas preservam uma mensagem sanitizada para diagnóstico", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /"message" in record/);
  assert.match(source, /"code" in record/);
  assert.match(source, /\[url removida\]/);
});
