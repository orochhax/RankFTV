import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/performance-scheduling-study-progress.sql", "utf8");
const hotfixSql = readFileSync("supabase/fix-study-roadmap-delete-cascade.sql", "utf8");

test("excluir roadmap nao tenta recalcular uma aula removida pelo cascade", () => {
  assert.match(sql, /IF NOT FOUND THEN RETURN false; END IF;/i);
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION perf_sync_study_question_change\(\)[\s\S]*?IF EXISTS \(SELECT 1 FROM perf_study_roadmap_item[\s\S]*?PERFORM perf_recompute_study_item/,
  );
  assert.doesNotMatch(
    sql,
    /CREATE OR REPLACE FUNCTION perf_sync_study_question_change\(\)[\s\S]*?RETURN coalesce\(NEW,OLD\)/,
  );
});

test("hotfix de exclusao pode ser aplicado sem repetir alteracoes de tabela", () => {
  assert.match(hotfixSql, /CREATE OR REPLACE FUNCTION perf_recompute_study_item/i);
  assert.match(hotfixSql, /CREATE OR REPLACE FUNCTION perf_sync_study_question_change/i);
  assert.match(hotfixSql, /IF NOT FOUND THEN RETURN false; END IF;/i);
  assert.doesNotMatch(hotfixSql, /ALTER TABLE|CREATE TRIGGER|DROP TRIGGER/i);
});
