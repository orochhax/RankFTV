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

test("agente fornece ao Codex a lista de fontes autorizadas sem exigir comando mutável", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /from\("yt_sources"\)\.select\("id,name,kind,url"\)/);
  assert.match(source, /activeSources: activeSources\.data \?\? \[\]/);
  assert.match(source, /Não execute npm run youtube:sources/);
  assert.match(source, /youtube nunca pode ser null/);
});

test("agente usa schema de saída e executa scripts TypeScript sem npm.cmd", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(source, /"--output-schema", outputSchemaPath/);
  assert.match(source, /tsx", "dist", "cli\.mjs"/);
  assert.match(source, /function runTsx/);
  assert.doesNotMatch(source, /function npmCommand/);
});

test("schema do agente exige título de notícia em português", async () => {
  const schema = JSON.parse(await readFile("scripts/evolution-agent-output.schema.json", "utf8"));
  assert.match(schema.$defs.item.properties.title.pattern, /como\|da\|das\|de\|do\|dos/);
});

test("schema estruturado exige campos opcionais como null e o agente os remove antes do importador", async () => {
  const source = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  const schema = JSON.parse(await readFile("scripts/evolution-agent-output.schema.json", "utf8"));
  assert.ok(schema.$defs.import.required.includes("editorialProfile"));
  assert.ok(schema.$defs.item.required.includes("entity"));
  assert.ok(schema.$defs.idea.required.includes("youtubeReferences"));
  assert.match(source, /editorialProfile === null\) delete/);
  assert.match(source, /youtubeReferences === null\) delete/);
});

test("schema estruturado não usa const e exige todas as propriedades declaradas", async () => {
  const schema = JSON.parse(await readFile("scripts/evolution-agent-output.schema.json", "utf8"));
  const checkObject = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const record = value as { properties?: Record<string, unknown>; required?: string[]; const?: unknown; items?: unknown };
    assert.equal(record.const, undefined);
    if (record.properties) {
      assert.deepEqual([...record.required ?? []].sort(), Object.keys(record.properties).sort());
      Object.values(record.properties).forEach(checkObject);
    }
    checkObject(record.items);
  };
  checkObject(schema);
  Object.values(schema.$defs).forEach(checkObject);
});

test("schema estruturado usa padrão de URL compatível em vez de format uri", async () => {
  const raw = await readFile("scripts/evolution-agent-output.schema.json", "utf8");
  const schema = JSON.parse(raw);
  assert.doesNotMatch(raw, /"format": "uri"/);
  assert.equal(schema.$defs.url.pattern, "^https?://");
});
