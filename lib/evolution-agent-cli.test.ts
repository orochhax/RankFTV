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

test("agente consulta os nomes reais das colunas editoriais de ideias", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /title_locked_by_user,notes/);
  assert.doesNotMatch(source, /locked_title,user_notes/);
});

test("agente fornece ao Codex fontes autorizadas sem exigir comando mutável", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /from\("yt_sources"\)\.select\("id,name,kind,url"\)/);
  assert.match(source, /activeSources: activeSources\.data \?\? \[\]/);
  assert.match(source, /Não execute npm run youtube:sources/);
  assert.match(source, /youtube nunca pode ser null/);
});

test("agente usa pré-validação local sem schema remoto limitante", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /await validateResearch\(job\.id, result\)/);
  assert.match(source, /tsx", "dist", "cli\.mjs"/);
  assert.match(source, /function runTsx/);
  assert.doesNotMatch(source, /--output-schema/);
  assert.doesNotMatch(source, /function npmCommand/);
});

test("prompt exige título em português e normaliza nulos antes do importador", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /Todo item\.title exibido na interface precisa estar em português/);
  assert.match(source, /aiRelevance como \{ score: inteiro entre 70 e 100, rationale: texto \}/);
  assert.match(source, /sourceOrigin com EXATAMENTE um destes valores: "primary", "market" ou "mixed"/);
  assert.match(source, /editorialProfile === null\) delete/);
  assert.match(source, /youtubeReferences === null\) delete/);
});
