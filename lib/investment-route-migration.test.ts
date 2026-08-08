import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/performance-investment-route.sql", "utf8");
const createPlanFunction =
  sql.match(
    /CREATE OR REPLACE FUNCTION public\.perf_create_investment_plan\([\s\S]*?\$\$;/i,
  )?.[0] ?? "";
const createRevisionFunction =
  sql.match(
    /CREATE OR REPLACE FUNCTION public\.perf_create_investment_plan_revision\([\s\S]*?\$\$;/i,
  )?.[0] ?? "";
const closePlanFunction =
  sql.match(
    /CREATE OR REPLACE FUNCTION public\.perf_close_investment_plan\([\s\S]*?\$\$;/i,
  )?.[0] ?? "";
const legacyRevisionDrop =
  sql.match(
    /DROP FUNCTION IF EXISTS public\.perf_create_investment_plan_revision\([\s\S]*?\);/i,
  )?.[0] ?? "";

test("investment route migration is additive and preserves canonical movement tables", () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.perf_investment_plan\s*\(/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.perf_investment_plan_revision\s*\(/i);
  assert.doesNotMatch(sql, /DROP\s+TABLE|TRUNCATE\s+TABLE|ALTER\s+TABLE[\s\S]*?DROP\s+COLUMN|DELETE\s+FROM\s+public\.perf_(?:portfolio_snapshot|investment_contribution|investment_withdrawal)/i);
  assert.doesNotMatch(
    sql,
    /INSERT\s+INTO\s+public\.perf_(?:investment_contribution|investment_withdrawal)/i,
  );
  assert.match(
    createPlanFunction,
    /INSERT INTO public\.perf_investment_plan[\s\S]*?INSERT INTO public\.perf_investment_plan_revision[\s\S]*?IF p_create_initial_snapshot THEN[\s\S]*?INSERT INTO public\.perf_portfolio_snapshot/i,
  );
});

test("investment plans keep one active destination and immutable ordered revisions", () => {
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS perf_investment_plan_one_active_idx[\s\S]*?ON public\.perf_investment_plan\(user_id\)[\s\S]*?WHERE active/i);
  assert.match(sql, /UNIQUE\s*\(plan_id,\s*version\)/i);
  assert.match(sql, /CHECK\s*\(version > 0\)/i);
  assert.match(sql, /annual_return_conservative <= annual_return_base[\s\S]*?annual_return_base <= annual_return_favorable/i);
  assert.match(sql, /annual_return_conservative > -1[\s\S]*?annual_inflation > -1/i);
  assert.match(sql, /CREATE TRIGGER perf_investment_revision_immutable[\s\S]*?BEFORE UPDATE ON public\.perf_investment_plan_revision/i);
  assert.match(sql, /FOREIGN KEY \(plan_id, user_id\)[\s\S]*?REFERENCES public\.perf_investment_plan\(id, user_id\)[\s\S]*?ON DELETE CASCADE/i);
});

test("investment route tables are owner scoped and expose only reads directly", () => {
  assert.match(sql, /ALTER TABLE public\.perf_investment_plan ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /ALTER TABLE public\.perf_investment_plan_revision ENABLE ROW LEVEL SECURITY/i);
  const ownerPolicies = sql.match(/CREATE POLICY owner_all[\s\S]*?USING \(user_id = auth\.uid\(\)\)[\s\S]*?WITH CHECK \(user_id = auth\.uid\(\)\)/gi) ?? [];
  assert.equal(ownerPolicies.length, 2);
  assert.match(sql, /REVOKE ALL ON TABLE public\.perf_investment_plan FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.perf_investment_plan_revision FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT SELECT ON TABLE public\.perf_investment_plan TO authenticated/i);
  assert.match(sql, /GRANT SELECT ON TABLE public\.perf_investment_plan_revision TO authenticated/i);
  assert.doesNotMatch(sql, /GRANT\s+(?:INSERT|UPDATE|DELETE)[^;]*perf_investment_plan/i);
});

test("plan RPCs authenticate, validate and serialize creation and revisioning", () => {
  for (const functionName of [
    "perf_create_investment_plan",
    "perf_create_investment_plan_revision",
    "perf_close_investment_plan",
  ]) {
    assert.match(sql, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`, "i"));
  }
  const definerFunctions = sql.match(/SECURITY DEFINER\s+SET search_path = public/gi) ?? [];
  assert.equal(definerFunctions.length, 3);
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/i);
  const ownerChecks =
    sql.match(/FROM public\.profiles\s+WHERE id = v_user_id AND role = 'ceo'/gi) ?? [];
  assert.equal(ownerChecks.length, 3);
  assert.match(sql, /INSERT INTO public\.perf_investment_plan[\s\S]*?INSERT INTO public\.perf_investment_plan_revision/i);
  assert.match(sql, /FROM public\.perf_investment_plan[\s\S]*?WHERE id = p_plan_id AND user_id = v_user_id[\s\S]*?FOR UPDATE/i);
  assert.match(
    sql,
    /FOR UPDATE;[\s\S]*?SELECT effective_from, value_mode, value_reference_date[\s\S]*?ORDER BY version DESC[\s\S]*?p_effective_from NOT IN \(v_today, v_next_month\)[\s\S]*?p_effective_from < v_latest_effective_from/i,
  );
  assert.match(
    sql,
    /p_value_mode IS DISTINCT FROM v_latest_value_mode[\s\S]*?p_value_reference_date IS DISTINCT FROM v_latest_reference_date/i,
  );
  assert.match(
    createPlanFunction,
    /p_create_initial_snapshot boolean[\s\S]*?IF p_create_initial_snapshot THEN[\s\S]*?INSERT INTO public\.perf_portfolio_snapshot/i,
  );
  assert.match(createPlanFunction, /p_initial_snapshot_value numeric/i);
  assert.match(
    createPlanFunction,
    /INSERT INTO public\.perf_portfolio_snapshot[\s\S]*?v_user_id, p_baseline_date, p_initial_snapshot_value/i,
  );
  assert.match(createPlanFunction, /p_effective_from <> v_today/i);
  assert.match(
    createPlanFunction,
    /p_create_initial_snapshot AND EXISTS[\s\S]*?FROM public\.perf_portfolio_snapshot[\s\S]*?WHERE user_id = v_user_id/i,
  );
  assert.match(createPlanFunction, /p_create_initial_snapshot AND p_baseline_date <> v_today/i);
  assert.match(sql, /CURRENT_TIMESTAMP AT TIME ZONE 'America\/Bahia'/i);
  assert.match(sql, /COALESCE\(MAX\(version\), 0\) \+ 1/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.perf_create_investment_plan[\s\S]*?FROM PUBLIC, anon/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.perf_create_investment_plan[\s\S]*?TO authenticated/i);
});

test("concurrent revisions use the locked latest version as an optimistic token", () => {
  assert.match(legacyRevisionDrop, /\(\s*uuid,/i);
  assert.doesNotMatch(legacyRevisionDrop, /integer/i);
  assert.match(createRevisionFunction, /p_expected_version integer/i);
  const planLock = createRevisionFunction.indexOf("FOR UPDATE;");
  const latestRevisionRead = createRevisionFunction.indexOf(
    "SELECT effective_from, value_mode, value_reference_date, version",
  );
  const versionCheck = createRevisionFunction.indexOf(
    "p_expected_version <> v_latest_version",
  );
  const nextVersion = createRevisionFunction.indexOf(
    "SELECT COALESCE(MAX(version), 0) + 1",
  );
  const revisionInsert = createRevisionFunction.indexOf(
    "INSERT INTO public.perf_investment_plan_revision",
  );

  assert.ok(planLock >= 0);
  assert.ok(latestRevisionRead > planLock);
  assert.ok(versionCheck > latestRevisionRead);
  assert.ok(nextVersion > versionCheck);
  assert.ok(revisionInsert > nextVersion);
  assert.match(
    createRevisionFunction,
    /IF v_latest_version IS NULL[\s\S]*?p_expected_version IS NULL[\s\S]*?ERRCODE = '40001'/i,
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.perf_create_investment_plan_revision\([\s\S]*?text, integer\s*\)[\s\S]*?TO authenticated/i,
  );
});

test("completion is serialized and validated against today's effective target", () => {
  const planLock = closePlanFunction.indexOf("FOR UPDATE;");
  const movementLocks = closePlanFunction.indexOf(
    "LOCK TABLE public.perf_portfolio_snapshot IN SHARE MODE;",
  );
  const effectiveRevisionRead = closePlanFunction.indexOf(
    "AND effective_from <= v_today",
  );
  const snapshotRead = closePlanFunction.indexOf(
    "FROM public.perf_portfolio_snapshot",
  );
  const planUpdate = closePlanFunction.indexOf(
    "UPDATE public.perf_investment_plan",
  );

  assert.ok(planLock >= 0);
  assert.ok(movementLocks > planLock);
  assert.ok(effectiveRevisionRead > movementLocks);
  assert.ok(snapshotRead > effectiveRevisionRead);
  assert.ok(planUpdate > snapshotRead);
  assert.match(
    closePlanFunction,
    /ORDER BY effective_from DESC, version DESC[\s\S]*?LIMIT 1/i,
  );
  assert.match(
    closePlanFunction,
    /WHERE user_id = v_user_id AND date <= v_today[\s\S]*?ORDER BY date DESC/i,
  );
  assert.match(
    closePlanFunction,
    /FROM public\.perf_investment_contribution[\s\S]*?date > v_snapshot_date[\s\S]*?date <= v_today/i,
  );
  assert.match(
    closePlanFunction,
    /FROM public\.perf_investment_withdrawal[\s\S]*?date > v_snapshot_date[\s\S]*?date <= v_today/i,
  );
  assert.equal(
    closePlanFunction.match(/WHEN v_value_mode = 'real' THEN/gi)?.length,
    2,
  );
  assert.match(
    closePlanFunction,
    /v_current_value := v_snapshot_value \+ v_contribution_value - v_withdrawal_value/i,
  );
  assert.match(
    closePlanFunction,
    /IF v_current_value < v_target_value THEN[\s\S]*?ERRCODE = 'P0001'[\s\S]*?MESSAGE = 'investment target not reached'/i,
  );
  assert.match(
    closePlanFunction,
    /IF p_status = 'completed' THEN[\s\S]*?END IF;[\s\S]*?UPDATE public\.perf_investment_plan/i,
  );
});
