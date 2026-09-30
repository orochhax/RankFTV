import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/production-championship-update-transaction.sql",
  "utf8",
);
const action = readFileSync(
  "app/painel/campeonatos/[id]/editar/actions.ts",
  "utf8",
);
const rollbackCheck = readFileSync(
  "supabase/manual-tests/championship-update-transaction-rollback.sql",
  "utf8",
);

test("a transacao bloqueia o campeonato e grava todas as partes no PostgreSQL", () => {
  assert.match(migration, /FOR UPDATE/i);
  assert.match(migration, /UPDATE public\.championships/i);
  assert.match(migration, /public\.championship_categories/i);
  assert.match(migration, /public\.championship_notices/i);
  assert.match(migration, /public\.championship_notice_deliveries/i);
  assert.match(migration, /public\.notifications/i);
  assert.match(migration, /championship\.updated_transactionally/i);
});

test("somente papeis de servidor e usuarios autenticados executam a funcao", () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon/i);
  assert.match(migration, /TO authenticated, service_role/i);
  assert.match(migration, /championship\.organizador_id = v_actor_id/i);
});

test("a action usa a RPC atomica e so processa emails depois do commit", () => {
  const updateAction = action.slice(action.indexOf("export async function updateChampionship"));
  const rpcPosition = updateAction.indexOf('"update_championship_transaction"');
  const deliveryPosition = updateAction.lastIndexOf("processPendingChampionshipNoticeDeliveries");
  assert.ok(rpcPosition > 0);
  assert.ok(deliveryPosition > rpcPosition);
  assert.doesNotMatch(updateAction, /\.from\("championships"\)\s*\.update\(/);
  assert.doesNotMatch(updateAction, /\.from\("championship_categories"\)\s*\.(?:insert|update|delete)\(/);
});

test("o teste manual nunca preserva dados", () => {
  assert.match(rollbackCheck, /CATEGORY_WRITE_FAILED/);
  assert.match(rollbackCheck, /ROLLBACK;/i);
  assert.match(rollbackCheck, /SELECT true AS rollback_integral_confirmado;\s*$/i);
});
