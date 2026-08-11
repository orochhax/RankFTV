import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sql = readFileSync(
  join(process.cwd(), "supabase", "performance-it-career-roadmaps.sql"),
  "utf8",
);

function functionDefinition(name: string): string {
  const definition = sql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION\\s+${name}\\s*\\([^)]*\\)[\\s\\S]*?END \\$\\$;`,
      "i",
    ),
  )?.[0];
  assert.ok(definition, `A migration deve definir ${name}.`);
  return definition;
}

function assertPreviousModuleGate(
  definition: string,
  moduleOrderReference: string,
): void {
  assert.match(
    definition,
    new RegExp(
      `previous_module\\.order_index < ${moduleOrderReference}[\\s\\S]*` +
        "pending_item\\.module_id = previous_module\\.id[\\s\\S]*" +
        "pending_item\\.counts_for_progress[\\s\\S]*" +
        "pending_item\\.status IS DISTINCT FROM 'completed'[\\s\\S]*" +
        "ORDER BY previous_module\\.order_index[\\s\\S]*LIMIT 1",
      "i",
    ),
  );
  assert.match(
    definition,
    /RAISE EXCEPTION 'Você precisa finalizar o módulo "%" primeiro', blocker_module_title/i,
  );
}

test("o RPC de tentativa aplica data e sequencia somente ao roadmap de TI", () => {
  const submit = functionDefinition("perf_submit_study_attempt");

  assert.match(submit, /SECURITY DEFINER/i);
  assert.match(submit, /SET search_path = public, pg_temp/i);
  assert.match(submit, /pg_advisory_xact_lock\(hashtextextended\(uid::text, 0\)\)/i);
  assert.match(submit, /target_item\.roadmap_kind = 'it_career'/i);
  assert.match(submit, /target_item\.content_role IS DISTINCT FROM 'assessment'/i);
  assert.match(
    submit,
    /target_item\.scheduled_date > \(now\(\) AT TIME ZONE 'America\/Bahia'\)::date/i,
  );
  assert.match(
    submit,
    /previous_item\.module_id = target_item\.module_id[\s\S]*previous_item\.content_role IN \('assessment', 'module_project', 'capstone'\)[\s\S]*previous_item\.order_index < target_item\.order_index[\s\S]*previous_item\.status IS DISTINCT FROM 'completed'/i,
  );
  assert.match(submit, /module\.order_index AS module_order_index/i);
  assertPreviousModuleGate(submit, "target_item\\.module_order_index");
  assert.match(submit, /INSERT INTO perf_study_assessment_attempt/i);

  const itGuard = submit.indexOf("target_item.roadmap_kind = 'it_career'");
  const sequenceGuard = submit.indexOf("previous_item.content_role IN");
  assert.ok(itGuard >= 0 && sequenceGuard > itGuard, "A sequencia nova deve ficar dentro do gate de TI.");
});

test("o RPC de checklist bloqueia confirmacao positiva de projeto fora da sequencia", () => {
  const toggle = functionDefinition("perf_toggle_study_check");

  assert.match(toggle, /SECURITY DEFINER/i);
  assert.match(toggle, /pg_advisory_xact_lock\(hashtextextended\(uid::text, 0\)\)/i);
  assert.match(
    toggle,
    /IF p_checked[\s\S]*target_item\.roadmap_kind = 'it_career'[\s\S]*target_item\.content_role IN \('module_project', 'capstone'\)/i,
  );
  assert.match(
    toggle,
    /previous_item\.module_id = target_item\.module_id[\s\S]*previous_item\.content_role IN \('assessment', 'module_project', 'capstone'\)[\s\S]*previous_item\.order_index < target_item\.order_index[\s\S]*previous_item\.status IS DISTINCT FROM 'completed'/i,
  );
  assert.match(toggle, /module\.order_index AS module_order_index/i);
  assertPreviousModuleGate(toggle, "target_item\\.module_order_index");
  assert.match(toggle, /INSERT INTO perf_study_check_progress/i);
  assert.match(toggle, /RETURN perf_recompute_study_item\(p_item_id, uid\)/i);
});

test("o trigger impede conclusao de gate de TI sem tentativa ou entregas", () => {
  const guard = functionDefinition("perf_guard_it_study_item_completion");

  assert.match(
    guard,
    /OLD\.content_role IN \('assessment', 'module_project', 'capstone'\)/i,
  );
  assert.match(
    guard,
    /NEW\.module_id IS DISTINCT FROM OLD\.module_id[\s\S]*NEW\.content_role IS DISTINCT FROM OLD\.content_role[\s\S]*NEW\.order_index IS DISTINCT FROM OLD\.order_index[\s\S]*NEW\.scheduled_date IS DISTINCT FROM OLD\.scheduled_date[\s\S]*NEW\.estimated_minutes IS DISTINCT FROM OLD\.estimated_minutes[\s\S]*NEW\.preparation_steps IS DISTINCT FROM OLD\.preparation_steps[\s\S]*NEW\.completion_checklist IS DISTINCT FROM OLD\.completion_checklist[\s\S]*NEW\.project_spec IS DISTINCT FROM OLD\.project_spec/i,
  );
  assert.match(guard, /gate_content_role := OLD\.content_role/i);
  assert.match(guard, /gate_roadmap_id := OLD\.roadmap_id/i);
  assert.match(guard, /gate_module_id := OLD\.module_id/i);
  assertPreviousModuleGate(guard, "gate_module_order_index");
  assert.match(
    guard,
    /previous_item\.module_id = gate_module_id[\s\S]*previous_item\.content_role IN \('assessment', 'module_project', 'capstone'\)/i,
  );
  assert.match(
    guard,
    /old_roadmap_kind IS DISTINCT FROM 'it_career'[\s\S]*NOT OLD\.counts_for_progress/i,
  );
  assert.match(
    guard,
    /advances_item := NEW\.status IS DISTINCT FROM OLD\.status[\s\S]*NEW\.status IN \('in_progress', 'completed'\)/i,
  );
  assert.match(
    guard,
    /NEW\.status IS DISTINCT FROM 'completed' OR NOT is_gate[\s\S]*RETURN NEW/i,
  );
  assert.match(guard, /FROM perf_study_assessment_attempt AS attempt/i);
  assert.match(guard, /question_count = 0 OR NOT answered/i);
  assert.match(guard, /FROM perf_study_check_progress AS progress/i);
  assert.match(guard, /required_checks = 0 OR checked_checks <> required_checks/i);
  assert.match(
    guard,
    /roadmap\.template_version[\s\S]*target_template_version[\s\S]*coalesce\(target_template_version, 0\) >= 4[\s\S]*NEW\.project_spec = '\{\}'::jsonb/i,
  );
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS perf_guard_it_study_item_completion_insert_trigger[\s\S]*CREATE TRIGGER perf_guard_it_study_item_completion_insert_trigger[\s\S]*BEFORE INSERT ON perf_study_roadmap_item/i,
  );
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS perf_guard_it_study_item_completion_update_trigger[\s\S]*CREATE TRIGGER perf_guard_it_study_item_completion_update_trigger[\s\S]*BEFORE UPDATE OF id, status, content_role, roadmap_id, user_id, module_id, order_index,[\s\S]*scheduled_date, estimated_minutes, counts_for_progress, preparation_steps,[\s\S]*completion_checklist, project_spec/i,
  );
});

test("qualquer item contabilizado pendente bloqueia modulo futuro, inclusive sem quiz", () => {
  const submit = functionDefinition("perf_submit_study_attempt");
  const toggle = functionDefinition("perf_toggle_study_check");
  const guard = functionDefinition("perf_guard_it_study_item_completion");

  for (const definition of [submit, toggle, guard]) {
    assert.match(
      definition,
      /AND EXISTS \([\s\S]*pending_item\.module_id = previous_module\.id[\s\S]*pending_item\.counts_for_progress[\s\S]*pending_item\.status IS DISTINCT FROM 'completed'[\s\S]*\)/i,
    );
  }

  assert.match(toggle, /target_item\.content_role IN \('module_project', 'capstone'\)/i);
  assert.match(
    guard,
    /new_roadmap_kind = 'it_career' AND NEW\.counts_for_progress/i,
  );
  assert.match(
    guard,
    /RAISE EXCEPTION 'A definicao de um item contabilizado de TI nao pode ser alterada'/i,
  );
});

test("a materializacao inicial nao trata pending ou in_progress como avanco do aluno", () => {
  const guard = functionDefinition("perf_guard_it_study_item_completion");
  const insertStart = guard.indexOf("  ELSE\n    SELECT roadmap.roadmap_kind");
  const insertEnd = guard.indexOf("\n  END IF;\n\n  is_gate :=", insertStart);

  assert.ok(insertStart >= 0 && insertEnd > insertStart, "O branch de INSERT deve ser explicito.");
  const insertBranch = guard.slice(insertStart, insertEnd);

  assert.match(
    insertBranch,
    /coalesce\(target_template_version, 0\) >= 4[\s\S]*NEW\.project_spec = '\{\}'::jsonb[\s\S]*RETURN NEW;/i,
  );
  assert.doesNotMatch(insertBranch, /NEW\.status/i);
  assert.doesNotMatch(insertBranch, /previous_module|pending_item|blocker_module_title/i);

  assert.match(
    guard.slice(insertEnd),
    /advances_item := NEW\.status IS DISTINCT FROM OLD\.status[\s\S]*NEW\.status IN \('in_progress', 'completed'\)/i,
  );
});

test("o recompute so inicia item de TI depois de tentativa ou checklist", () => {
  const recompute = functionDefinition("perf_recompute_study_item");
  const guard = functionDefinition("perf_guard_it_study_item_completion");

  assert.match(recompute, /JOIN perf_study_roadmap AS roadmap/i);
  assert.match(recompute, /roadmap\.roadmap_kind[\s\S]*target_roadmap_kind/i);
  assert.match(
    recompute,
    /EXISTS \([\s\S]*FROM perf_study_assessment_attempt AS attempt[\s\S]*\) OR EXISTS \([\s\S]*FROM perf_study_check_progress AS progress[\s\S]*\)[\s\S]*INTO has_interaction/i,
  );
  assert.match(
    recompute,
    /WHEN eligible THEN 'completed'[\s\S]*WHEN target_roadmap_kind = 'it_career' AND NOT has_interaction THEN 'pending'[\s\S]*ELSE 'in_progress'/i,
  );
  assert.match(recompute, /IF legacy AND NOT eligible THEN[\s\S]*RETURN true/i);
  assert.match(recompute, /SET search_path = public, pg_temp/i);
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION perf_recompute_study_item\(uuid, uuid\) FROM PUBLIC, authenticated;/i,
  );

  // Depois da criacao, um UPDATE pending -> in_progress continua consultando
  // todos os itens contabilizados dos modulos anteriores e pode ser bloqueado.
  assert.match(
    guard,
    /advances_item := NEW\.status IS DISTINCT FROM OLD\.status[\s\S]*NEW\.status IN \('in_progress', 'completed'\)[\s\S]*previous_module\.order_index < gate_module_order_index[\s\S]*pending_item\.counts_for_progress[\s\S]*RAISE EXCEPTION 'Você precisa finalizar o módulo "%" primeiro'/i,
  );
});

test("a classificacao de roadmap de TI nao pode ser rebaixada para burlar os gates", () => {
  const guard = functionDefinition("perf_guard_it_study_roadmap_kind");

  assert.match(guard, /NEW\.roadmap_kind IS DISTINCT FROM OLD\.roadmap_kind/i);
  assert.match(
    guard,
    /OLD\.roadmap_kind = 'it_career' OR NEW\.roadmap_kind = 'it_career'/i,
  );
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS perf_guard_it_study_roadmap_kind_trigger[\s\S]*CREATE TRIGGER perf_guard_it_study_roadmap_kind_trigger[\s\S]*BEFORE UPDATE OF roadmap_kind ON perf_study_roadmap/i,
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION perf_guard_it_study_roadmap_kind\(\) FROM PUBLIC, authenticated;/i,
  );
});

test("nao e possivel remover gate ou modulo de TI para pular a sequencia", () => {
  const guard = functionDefinition("perf_guard_it_study_structure_delete");

  assert.match(
    guard,
    /WHERE roadmap\.id = OLD\.roadmap_id[\s\S]*roadmap\.user_id = OLD\.user_id/i,
  );
  assert.match(guard, /IF target_roadmap_kind = 'it_career'/i);
  assert.match(guard, /RETURN OLD/i);
  assert.match(
    sql,
    /CREATE TRIGGER perf_guard_it_study_item_delete_trigger[\s\S]*BEFORE DELETE ON perf_study_roadmap_item[\s\S]*perf_guard_it_study_structure_delete\(\)/i,
  );
  assert.match(
    sql,
    /CREATE TRIGGER perf_guard_it_study_module_delete_trigger[\s\S]*BEFORE DELETE ON perf_study_roadmap_module[\s\S]*perf_guard_it_study_structure_delete\(\)/i,
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION perf_guard_it_study_structure_delete\(\) FROM PUBLIC, authenticated;/i,
  );
});

test("authenticated nao acessa gabarito nem altera progresso fora dos RPCs", () => {
  assert.match(
    sql,
    /REVOKE ALL ON TABLE perf_study_assessment_question FROM PUBLIC, authenticated;/i,
  );
  assert.match(
    sql,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE perf_study_check_progress FROM PUBLIC, authenticated;/i,
  );
  assert.match(sql, /GRANT SELECT ON TABLE perf_study_check_progress TO authenticated;/i);
  assert.match(
    sql,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE perf_study_assessment_attempt FROM PUBLIC, authenticated;/i,
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION perf_submit_study_attempt\(uuid, jsonb\) FROM PUBLIC;[\s\S]*GRANT EXECUTE ON FUNCTION perf_submit_study_attempt\(uuid, jsonb\) TO authenticated;/i,
  );
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION perf_toggle_study_check\(uuid, text, integer, boolean\) FROM PUBLIC;[\s\S]*GRANT EXECUTE ON FUNCTION perf_toggle_study_check\(uuid, text, integer, boolean\) TO authenticated;/i,
  );
  assert.doesNotMatch(
    sql,
    /GRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,120}perf_study_assessment_question[\s\S]{0,80}authenticated/i,
  );
});
