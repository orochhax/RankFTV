import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serviceSource = readFileSync(
  "lib/daily-life-analysis-service.ts",
  "utf8",
);
const cronSource = readFileSync(
  "app/api/cron/life-os-daily-analysis/route.ts",
  "utf8",
);
const actionsSource = readFileSync(
  "app/admin/performance/life-os-actions.ts",
  "utf8",
);

function assertDeterministicPagination(table: string, dateColumn: string) {
  const query = serviceSource.match(
    new RegExp(
      `from\\("${table}"\\)[\\s\\S]{0,3000}?\\.order\\("${dateColumn}"\\)[\\s\\S]{0,800}?\\.order\\("id"\\)[\\s\\S]{0,300}?\\.range\\(from, to\\)`,
    ),
  );
  assert.ok(
    query,
    `${table} must use stable date/id ordering and range pagination`,
  );
}

test("daily analysis paginates every potentially large history deterministically", () => {
  assert.match(serviceSource, /const METRICS_PAGE_SIZE = 500/);
  assert.match(serviceSource, /async function loadAllPages/);
  assertDeterministicPagination("perf_habit_log", "data");
  assertDeterministicPagination("perf_task_log", "occurrence_date");
  assertDeterministicPagination("perf_activity", "date");
  assert.match(
    serviceSource,
    /from\("perf_study_roadmap"\)[\s\S]{0,1000}?\.order\("created_at", \{ ascending: false \}\)[\s\S]{0,300}?\.order\("id"\)[\s\S]{0,300}?\.range\(from, to\)/,
  );
  assert.doesNotMatch(serviceSource, /perf_study_roadmap[\s\S]{0,500}?\.limit\(50\)/);
  assertDeterministicPagination("perf_portfolio_snapshot", "date");
  assertDeterministicPagination("perf_investment_contribution", "date");
  assertDeterministicPagination("perf_investment_withdrawal", "date");
  assertDeterministicPagination("perf_weight", "data");
  assertDeterministicPagination(
    "perf_study_assessment_attempt",
    "submitted_at",
  );
  assert.match(
    serviceSource,
    /from\("perf_study_roadmap_item"\)[\s\S]{0,3000}?\.order\("roadmap_id"\)[\s\S]*?\.order\("order_index"\)[\s\S]*?\.order\("id"\)[\s\S]*?\.range\(from, to\)/,
  );
});

test("investment collection includes withdrawals and the active versioned plan", () => {
  assert.match(serviceSource, /from\("perf_investment_withdrawal"\)/);
  assert.match(
    serviceSource,
    /from\("perf_investment_plan"\)[\s\S]*?\.eq\("active", true\)/,
  );
  assert.match(serviceSource, /from\("perf_investment_plan_revision"\)/);
  assert.match(
    serviceSource,
    /withdrawals: \(withdrawalsResult\.data \?\? \[\]\)\.map/,
  );
  assert.match(
    serviceSource,
    /investmentPlanRevisions: activeRevisionRows\.map/,
  );
  assert.match(serviceSource, /investments: investmentDataState/);
  assert.match(serviceSource, /investmentPlan: investmentPlanDataState/);
});

test("legacy contribution fallback is restricted to a missing canonical relation", () => {
  assert.match(serviceSource, /function isMissingRelation/);
  const fallbackBranch = serviceSource.match(
    /if \(isMissingRelation\(contributionsResult\.error\)\) \{[\s\S]*?canonicalContributionState = "migration_missing";[\s\S]*?\n  \}/,
  )?.[0];
  assert.ok(fallbackBranch);
  assert.match(fallbackBranch, /from\("personal_finance_entries"\)/);
  assert.doesNotMatch(
    serviceSource,
    /if \(contributionsResult\.error\) \{[\s\S]*?personal_finance_entries/,
  );
  assert.match(serviceSource, /error\.code === "42P01"/);
  assert.match(serviceSource, /error\.code === "PGRST205"/);
});

test("partial reads are explicit instead of silently becoming zero", () => {
  assert.match(serviceSource, /studyOptionalState = "partial"/);
  assert.match(
    serviceSource,
    /habits:[\s\S]{0,100}?habitsResult\.error \|\| habitLogsResult\.error/,
  );
  assert.match(
    serviceSource,
    /tasks:[\s\S]{0,100}?tasksResult\.error \|\| taskLogsResult\.error/,
  );
  assert.match(
    serviceSource,
    /academy: mergeState\([\s\S]{0,30}?activityState/,
  );
  assert.match(
    serviceSource,
    /study: mergeState\([\s\S]{0,100}?activityState,[\s\S]{0,50}?studyBaseState,[\s\S]{0,50}?studyOptionalState/,
  );
  assert.match(serviceSource, /missingAreas = \[/);
  assert.match(serviceSource, /dataStates,/);
});

test("archived habits and tasks retain their historical scheduling boundary", () => {
  assert.match(serviceSource, /function historicalEndDate/);
  assert.match(
    serviceSource,
    /const boundary = addDays\(localDate\(updated, timezone\), -1\)/,
  );
  assert.match(
    serviceSource,
    /from\("perf_habit"\)[\s\S]{0,600}?created_at, updated_at[\s\S]{0,300}?\.eq\("user_id", userId\)[\s\S]{0,100}?\.order\("ordem"\)/,
  );
  assert.match(
    serviceSource,
    /from\("perf_task"\)[\s\S]{0,600}?updated_at[\s\S]{0,300}?\.eq\("user_id", userId\)[\s\S]{0,200}?\.lte\("start_date", analysisDate\)/,
  );
  assert.doesNotMatch(serviceSource, /\.eq\("ativo", true\)/);
  assert.doesNotMatch(
    serviceSource,
    /\.eq\("active", true\)[\s\S]{0,100}?\.lte\("start_date", analysisDate\)/,
  );
  assert.match(serviceSource, /endDate: historicalEndDate/);
  assert.match(
    serviceSource,
    /row\.start_date \?\? timestampLocalDate\(row\.created_at, timezone\)/,
  );
  assert.match(serviceSource, /recurrenceEndDate: historicalEndDate/);
});

test("daily idempotency is keyed by evaluated day and current prompt version", () => {
  assert.match(
    serviceSource,
    /const evaluationDate = addDays\(analysisDate, -1\)/,
  );
  assert.match(serviceSource, /\.eq\("analysis_end", evaluationDate\)/);
  assert.match(
    serviceSource,
    /existingAnalysis\?\.generation\.promptVersion ===[\s\S]{0,100}?DAILY_LIFE_ANALYSIS_PROMPT_VERSION &&[\s\S]{0,50}?!input\.force/,
  );
  assert.match(serviceSource, /analysis_end: analysis\.evaluationDate/);
  assert.match(
    serviceSource,
    /\.eq\("analysis_end", analysis\.evaluationDate\)/,
  );
  assert.match(
    serviceSource,
    /promptVersion: DAILY_LIFE_ANALYSIS_PROMPT_VERSION/,
  );
  assert.match(serviceSource, /warning,/);
  assert.match(serviceSource, /credit_balance_exhausted/);
  assert.match(serviceSource, /insufficient_quota/);
  assert.match(serviceSource, /Creditos da OpenAI esgotados/);
});

test("cron requires the configured email to also own a CEO profile and reports failures as 500", () => {
  assert.match(cronSource, /ADMIN_EMAIL/);
  assert.match(
    cronSource,
    /\.eq\("id", owner\.id\)[\s\S]*?\.eq\("role", "ceo"\)[\s\S]*?\.maybeSingle\(\)/,
  );
  assert.doesNotMatch(cronSource, /const \{ data: ceos/);
  assert.doesNotMatch(cronSource, /ceos\?\.length === 1/);
  assert.match(cronSource, /\{ status: ok \? 200 : 500 \}/);
  assert.match(cronSource, /warning: result\.warning/);
});

test("manual generation reads the user performance timezone", () => {
  const action = actionsSource.match(
    /export async function gerarInsightLifeOS\(\)[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(action);
  assert.match(action, /from\("perf_profile"\)/);
  assert.match(action, /select\("timezone"\)/);
  assert.match(
    action,
    /timezone: performanceProfile\?\.timezone \?\? "America\/Bahia"/,
  );
  assert.match(action, /force: true/);
});
