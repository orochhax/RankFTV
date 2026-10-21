import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agente local usa somente opções suportadas pelo Codex exec", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /"exec", "--ephemeral", "--ignore-user-config"/);
  assert.match(source, /"--sandbox", "read-only"/);
  assert.doesNotMatch(source, /--ask-for-approval/);
  assert.doesNotMatch(source, /"--search"/);
});

test("agente Windows chama o entrypoint do Codex sem o wrapper do PowerShell", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /command: process\.execPath/);
  assert.match(source, /"node_modules", "@openai", "codex", "bin", "codex\.js"/);
  assert.doesNotMatch(source, /prefix: \["-NoProfile"/);
});

test("falhas estruturadas preservam uma mensagem sanitizada para diagnóstico", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /"message" in record/);
  assert.match(source, /"code" in record/);
  assert.match(source, /\[url removida\]/);
});
