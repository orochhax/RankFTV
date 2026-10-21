import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fila da Central mantém escrita no servidor e leitura isolada por usuário", async () => {
  const sql = await readFile("supabase/20261021000100_evolution_ai_jobs.sql", "utf8");
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.evo_ai_jobs FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.evo_ai_jobs TO authenticated/);
  assert.match(sql, /USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.evo_claim_ai_job[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.evo_claim_ai_job[\s\S]*TO service_role/);
});

test("ações da fila autenticam o dono antes de usar o cliente administrativo", async () => {
  const actions = await readFile("app/admin/evolucao/actions.ts", "utf8");
  for (const action of ["requestAiRefresh", "approveAiRefresh", "discardAiRefresh"]) {
    const start = actions.indexOf(`export async function ${action}`);
    assert.notEqual(start, -1);
    const body = actions.slice(start, actions.indexOf("\nexport async function", start + 1) === -1 ? undefined : actions.indexOf("\nexport async function", start + 1));
    assert.ok(body.indexOf("requireEvolutionOwner()") < body.indexOf("createAdminClient()"));
  }
});

test("agente local recusa qualquer projeto Supabase fora de Production", async () => {
  const agent = await readFile("scripts/evolution-local-agent.mjs", "utf8");
  assert.match(agent, /url !== PRODUCTION_SUPABASE_URL/);
  assert.match(agent, /EVO_AGENT_REFUSED_NON_PRODUCTION_TARGET/);
  assert.doesNotMatch(agent, /console\.log\(.*(?:key|token|secret)/i);
});
