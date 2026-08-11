import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function actionSource(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`export async function ${name}`);
  const end = source.indexOf(`export async function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `Nao foi possivel localizar a action ${name}.`);
  return source.slice(start, end);
}

test("roadmap de TI guarda perguntas para os arquivos sem contabilizá-las no site", () => {
  const actions = read("app/admin/performance/life-os-actions.ts");
  const create = actionSource(actions, "criarRoadmapTiPredefinidoLifeOS", "ativarRoadmapEstudosLifeOS");
  assert.match(create, /content_role: topic\.role/);
  assert.match(create, /practice_exercises: officialTopic\.activities\.slice\(0, 8\)/);
  assert.match(create, /preparation_steps: officialTopic\.guidedStudy\.slice\(0, 8\)/);
  assert.match(create, /workspaceSchemaVersion: 2/);
  assert.match(create, /counts_for_progress: true/);
  assert.match(create, /content_role: "assessment"/);
  assert.match(create, /counts_for_progress: false, template_node_id: dailyQuiz\.id/);
  assert.match(create, /perf_study_assessment_question/);
  assert.match(create, /counts_for_progress: false, template_node_id: project\.id/);
  assert.match(create, /\.insert\(itemBatch, \{ defaultToNull: false \}\)/);
});

test("interface de TI exibe somente assuntos e subassuntos", () => {
  const workspace = read("components/performance/StudiesWorkspace.tsx");
  assert.match(workspace, /item\.contentRole === "topic" \|\| item\.contentRole === "review"/);
  assert.match(workspace, /item\.subtopics\.join\(" · "\)/);
  assert.match(workspace, /Sobre este módulo/);
  const start = workspace.indexOf("function ItTopicRow");
  const end = workspace.indexOf("function ItPracticalItem", start);
  const topic = workspace.slice(start, end);
  assert.doesNotMatch(topic, /ItAssessmentItem|ItPracticalItem|Questões do dia|Atividades depois|Assunto principal|O que estudar/);
});

test("pagina nao carrega perguntas de roadmaps de TI", () => {
  const page = read("app/admin/performance/page.tsx");
  assert.match(page, /const currentAssessmentItemIds = loadedRoadmapKind === "it_career" \? \[\] : studyItemIds/);
  assert.doesNotMatch(page, /correct_option|correct_order|privateQuestionsByItem/);
});

test("modulo seguinte depende somente dos assuntos contabilizados", () => {
  const actions = read("app/admin/performance/life-os-actions.ts");
  const workspace = read("components/performance/StudiesWorkspace.tsx");
  assert.match(actions, /async function previousItCareerModuleCompletionError/);
  assert.match(actions, /\.neq\("counts_for_progress", false\)/);
  assert.match(workspace, /function isItCareerModuleComplete/);
  assert.match(workspace, /requiredItems\.every\(\(item\) => item\.status === "completed"\)/);
  assert.match(workspace, /Você precisa finalizar o módulo \$\{blockedByModule\.title\} primeiro/);
});

test("migration converte snapshots antigos para progresso visual", () => {
  const sql = read("supabase/performance-it-career-workspaces.sql");
  assert.match(sql, /DISABLE TRIGGER perf_guard_it_study_item_completion_update_trigger/);
  assert.match(sql, /item\.content_role IS DISTINCT FROM 'topic'/);
  assert.match(sql, /item\.content_role IS DISTINCT FROM 'review'/);
  assert.match(sql, /SET counts_for_progress = false/);
  assert.match(sql, /ENABLE TRIGGER perf_guard_it_study_item_completion_update_trigger/);
});
