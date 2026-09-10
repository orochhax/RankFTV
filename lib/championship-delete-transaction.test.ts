import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/production-championship-delete-transaction.sql",
  "utf8",
);
const action = readFileSync(
  "app/painel/campeonatos/[id]/editar/actions.ts",
  "utf8",
);
const rollbackCheck = readFileSync(
  "supabase/manual-tests/championship-delete-transaction-rollback.sql",
  "utf8",
);

test("a exclusao bloqueia o campeonato e executa todas as escritas na RPC", () => {
  assert.match(migration, /FOR UPDATE/i);
  assert.match(migration, /CHAMPIONSHIP_HAS_PURCHASE_HISTORY/);
  assert.match(migration, /DELETE FROM public\.bracket_matches/i);
  assert.match(migration, /DELETE FROM public\.bracket_participants/i);
  assert.match(migration, /DELETE FROM public\.teams/i);
  assert.match(migration, /to_regclass\('public\.championship_category_waitlist'\)/i);
  assert.match(migration, /USING p_championship_id/i);
  assert.match(migration, /DELETE FROM public\.championship_categories/i);
  assert.match(migration, /DELETE FROM public\.championships/i);
  assert.match(migration, /championship\.deleted_transactionally/i);
});

test("a RPC exige usuario autenticado e confirma a propriedade do campeonato", () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon/i);
  assert.match(migration, /TO authenticated, service_role/i);
  assert.match(migration, /championship\.organizador_id = v_actor_id/i);
});

test("a action valida o UUID e nao usa exclusoes administrativas sequenciais", () => {
  const deleteAction = action.slice(
    action.indexOf("export async function excluirCampeonato"),
    action.indexOf("export type CategoriaEditInput"),
  );
  assert.match(deleteAction, /championshipIdSchema\.safeParse/);
  assert.match(deleteAction, /"delete_championship_transaction"/);
  assert.doesNotMatch(deleteAction, /createAdminClient/);
  assert.doesNotMatch(deleteAction, /\.from\([^)]*\)\.delete/);
});

test("o teste de rollback usa fixture descartavel e termina sem preservar dados", () => {
  assert.match(rollbackCheck, /TESTE DESCARTAVEL - ROLLBACK/);
  assert.match(rollbackCheck, /EXPECTED_DELETE_FAILURE/);
  assert.doesNotMatch(rollbackCheck, /INSERT INTO public\.championship_category_waitlist/i);
  assert.match(rollbackCheck, /ROLLBACK;/i);
  assert.match(rollbackCheck, /SELECT true AS rollback_integral_confirmado;\s*$/i);
});
