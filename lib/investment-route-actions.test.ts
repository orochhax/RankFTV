import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/admin/performance/investment-actions.ts", "utf8");
const ownerSource = readFileSync("lib/performance-owner.ts", "utf8");

test("investment actions remain server-only and authorize the Performance owner", () => {
  assert.match(source, /^"use server";/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /isPerformanceOwner\(supabase, user\)/);
  assert.doesNotMatch(source, /service[_-]?role/i);
  assert.doesNotMatch(source, /formData\.get\(["']user_id["']\)/i);

  for (const action of [
    "criarPlanoInvestimento",
    "revisarPlanoInvestimento",
    "fazerCheckinInvestimento",
    "registrarAporteInvestimento",
    "editarAporteInvestimento",
    "removerAporteInvestimento",
    "registrarRetiradaInvestimento",
    "editarRetiradaInvestimento",
    "removerRetiradaInvestimento",
  ]) {
    assert.match(
      source,
      new RegExp(`export async function ${action}[\\s\\S]*?const context = await requireOwner\\(\\);[\\s\\S]*?if \\(!context\\) return accessDenied\\(\\);`),
    );
  }

  assert.match(source, /export async function concluirPlanoInvestimento[\s\S]*?return closePlan\(planId, "completed"\)/);
  assert.match(source, /export async function arquivarPlanoInvestimento[\s\S]*?return closePlan\(planId, "archived"\)/);
  assert.match(source, /async function closePlan[\s\S]*?const context = await requireOwner\(\)/);

  assert.match(
    ownerSource,
    /if \(!adminEmail \|\| userEmail !== adminEmail\) return false;/,
  );
  assert.match(
    ownerSource,
    /from\("profiles"\)\.select\("role"\)\.eq\("id", user\.id\)\.maybeSingle\(\)/,
  );
  assert.match(ownerSource, /return data\?\.role === "ceo";/);
  assert.doesNotMatch(ownerSource, /adminEmail[^\n]*return true/);
});

test("investment actions convert human percentages and use atomic plan RPCs", () => {
  for (const field of [
    "annualReturnConservative",
    "annualReturnBase",
    "annualReturnFavorable",
    "annualInflation",
  ]) {
    assert.match(source, new RegExp(`${field} / 100`));
  }
  assert.match(source, /\.rpc\(\s*"perf_create_investment_plan"/);
  assert.match(source, /p_create_initial_snapshot:\s*createInitialSnapshot/);
  assert.match(source, /p_initial_snapshot_value:\s*parsed\.data\.baselineValue/);
  assert.match(source, /p_initial_snapshot_notes:\s*initialSnapshotNotes/);
  assert.match(source, /baselineForPlan = baselineValueInPlanMode\(parsed\.data\)/);
  assert.match(source, /rpcPlanPayload\(\{ \.\.\.parsed\.data, baselineValue: baselineForPlan \}\)/);
  assert.match(
    source,
    /createInitialSnapshot\s*\? "Plano e primeiro check-in salvos\. Sua rota foi calculada\."/,
  );
  assert.match(source, /\.rpc\(\s*"perf_create_investment_plan_revision"/);
  assert.match(source, /p_expected_version:\s*expectedVersion\.data/);
  assert.match(source, /\.rpc\("perf_close_investment_plan"/);
  assert.match(source, /\.refine\(\s*hasAtMostSixDecimalPlaces,/);
  assert.match(source, /value \* 1_000_000/);
  assert.match(
    source,
    /targetDate:\s*isValidCivilDate\(requestedTargetDate\)\s*\? lastDayOfMonth\(requestedTargetDate\)/,
  );
  assert.match(source, /\| "TARGET_NOT_REACHED"/);
  assert.match(
    source,
    /error\.code === "P0001"[\s\S]*?investment target not reached[\s\S]*?code: "TARGET_NOT_REACHED"/,
  );
});

test("movement updates and deletes are always scoped by id and owner", () => {
  for (const table of ["perf_investment_contribution", "perf_investment_withdrawal"]) {
    const mutations = source.match(new RegExp(`\\.from\\("${table}"\\)[\\s\\S]*?\\.(?:update|delete)\\([\\s\\S]*?\\.eq\\("id", parsedId\\.data\\)[\\s\\S]*?\\.eq\\("user_id", context\\.user\\.id\\)`, "g")) ?? [];
    assert.equal(mutations.length, 2);
  }
  assert.equal(source.match(/\.eq\("source", "manual"\)/g)?.length, 2);
  assert.equal(source.match(/\.is\("source_entry_id", null\)/g)?.length, 2);
  assert.doesNotMatch(source, /error:\s*error\.message/);
});

test("check-in replacement is explicit and future financial dates are rejected", () => {
  assert.match(source, /code:\s*"CHECKIN_EXISTS"/);
  assert.match(source, /replaceExisting:\s*booleanFormValue/);
  assert.match(source, /existing && !parsed\.data\.replaceExisting/);
  assert.match(source, /data do check-in n.o pode estar no futuro/i);
  assert.match(source, /data da movimenta..o n.o pode estar no futuro/i);
  assert.match(source, /Math\.abs\(rawVariationPercentage\) <= MAX_VARIATION_PERCENTAGE/);
  assert.match(source, /Number\.isFinite\(rawVariationPercentage\)/);
});

test("missing migration detection covers canonical route tables without treating conflicts as schema errors", () => {
  assert.match(
    source,
    /perf_investment_\(\?:plan\|contribution\|withdrawal\)\|perf_portfolio_snapshot/,
  );
  assert.match(source, /namesInvestmentRouteTable && explicitlyReportsMissingSchema/);
  const missingMigrationBody =
    source.match(/function isMissingMigration[\s\S]*?\n}/)?.[0] ?? "";
  assert.doesNotMatch(missingMigrationBody, /23505/);
});
