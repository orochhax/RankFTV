import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("a migration identifica o formato TI, persiste project_spec e protege a hierarquia", () => {
  const sql = read("supabase/performance-it-career-roadmaps.sql");
  assert.match(sql, /roadmap_kind IN \('language', 'it_career', 'legacy_skill', 'legacy_unknown'\)/);
  assert.match(sql, /source IN \('manual', 'import', 'ai', 'template'\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS project_spec jsonb/i);
  assert.match(sql, /jsonb_typeof\(project_spec\) = 'object'/i);
  assert.match(sql, /perf_study_item_project_spec_valid[\s\S]*\) IS TRUE\s*\);/i);
  assert.match(sql, /perf_activate_study_roadmap[\s\S]*SET search_path = public, pg_temp/i);
  assert.match(sql, /FOREIGN KEY \(parent_item_id, user_id, roadmap_id\)/);
  assert.match(sql, /REFERENCES perf_study_roadmap_item\(id, user_id, roadmap_id\)/);
  assert.match(sql, /FOREIGN KEY \(roadmap_id, user_id\)/);
  assert.match(sql, /FOREIGN KEY \(module_id, user_id, roadmap_id\)/);
  assert.match(sql, /FOREIGN KEY \(item_id, user_id\)/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION perf_activate_study_roadmap/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /auth\.uid\(\)/);
});

test("a limpeza antiga exige allowlists explícitas e nunca varre todas as skills", () => {
  const sql = read("supabase/cleanup-legacy-it-roadmaps.sql");
  assert.match(sql, /cleanup_legacy_it_approved_targets/);
  assert.match(sql, /cleanup_legacy_it_approved_generation_targets/);
  assert.match(sql, /Listas de aprovacao vazias/);
  assert.match(sql, /approved\.user_id = roadmap\.user_id/);
  assert.match(sql, /approved\.user_id = generation\.user_id/);
  assert.doesNotMatch(sql, /DELETE FROM perf_study_roadmap_generation AS generation\s+WHERE generation\.origin = 'ai'/);
});

test("o servidor recebe interesses, força desafios e reserva IA para idiomas", () => {
  const actions = read("app/admin/performance/life-os-actions.ts");
  assert.match(actions, /export async function criarRoadmapTiPredefinidoLifeOS/);
  assert.match(actions, /const interestIds = formValues\(formData, "interest_ids", 3\)/);
  assert.match(actions, /formValues\(formData, "interest_ids", 4\)\.length > 3/);
  assert.match(actions, /interestIds:/);
  assert.match(actions, /includeModuleProjects: true/);
  assert.match(actions, /buildItCareerPlan\(setup\)/);
  assert.match(actions, /export async function obterConfiguracaoRoadmapTiLifeOS/);
  assert.match(actions, /export async function previsualizarRoadmapTiLifeOS/);
  assert.match(actions, /buildItCareerPreview\(parseItCareerPreviewInput\(value\)\)/);
  assert.match(actions, /topicsForItCareer\(career\.id, level\)\.map/);
  assert.match(actions, /source: "template"/);
  assert.match(actions, /roadmap_kind: "it_career"/);
  assert.match(actions, /project_spec: (?:projectSpec|project\.projectSpec)/);
  assert.match(actions, /rpc\("perf_activate_study_roadmap"/);
  assert.match(actions, /if \(roadmapType !== "language"\)/);
  assert.match(actions, /isLanguageRoadmapExport\(imported\)/);
  assert.match(actions, /roadmap_kind: "language"/);
});

test("o wizard envia interest_ids em ordem e apresenta desafios como obrigatórios", () => {
  const wizard = read("components/performance/ItCareerRoadmapWizard.tsx");
  const actions = read("app/admin/performance/life-os-actions.ts");

  for (const field of [
    "career_id",
    "current_level",
    "mastered_topic_ids",
    "mastered_topic_policy",
    "target_level",
    "objective",
    "application_intent",
    "target_role",
    "job_preparation",
    "interest_ids",
    "include_daily_questions",
    "include_module_projects",
    "include_capstone",
  ]) {
    assert.match(wizard, new RegExp(`name="${field}"`));
  }

  assert.match(wizard, /selectedInterestIds\.map/);
  assert.match(wizard, /obterConfiguracaoRoadmapTiLifeOS/);
  assert.match(wizard, /previsualizarRoadmapTiLifeOS/);
  assert.doesNotMatch(wizard, /@\/lib\/it-career-roadmaps/);
  assert.doesNotMatch(wizard, /buildItCareer(?:Plan|Preview)/);
  assert.doesNotMatch(wizard, /itCareerCatalogs|topicsForItCareer|correctOptionIndex|correctOrder/);
  assert.match(wizard, /window\.setTimeout\(\(\) =>/);
  assert.match(wizard, /requestId !== previewRequestId\.current/);
  assert.match(wizard, /function addCalendarMonths/);
  assert.match(wizard, /function previousCalendarDay/);
  assert.match(wizard, /Escolha de 1 a 3 temas/);
  assert.match(wizard, /O primeiro será o contexto principal; os demais serão alternados/);
  assert.match(wizard, /Produto final já definido e contextualizado pelo seu primeiro tema de interesse/);
  assert.match(wizard, /Desafio por módulo/);
  assert.match(wizard, />Obrigatório</);
  assert.match(wizard, /Produto já definido, com funcionalidades, dados, requisitos, entregas e critérios de avaliação/);
  assert.match(actions, /includeDailyQuestions: true/);
  assert.doesNotMatch(wizard, /include_topic_activities/);
  assert.doesNotMatch(wizard, /include_assessments/);
});

test("a versão 4 agenda questões, gera specs guiadas e estima conclusão com margem", () => {
  const catalog = read("lib/it-career-roadmaps.ts");
  const wizard = read("components/performance/ItCareerRoadmapWizard.tsx");
  const actions = read("app/admin/performance/life-os-actions.ts");

  assert.match(catalog, /schemaVersion: 4/);
  assert.match(catalog, /version: 4/);
  assert.match(catalog, /itCareerInterestOptions/);
  assert.match(catalog, /interestIds: ItCareerInterestId\[\]/);
  assert.match(catalog, /projectSpec: ItCareerProjectSpec/);
  assert.match(catalog, /function guidedArtifact/);
  assert.match(catalog, /projectKind: "module_challenge" \| "capstone"/);
  assert.match(catalog, /evaluationCriteria/);
  assert.match(catalog, /weightPercent/);
  assert.match(catalog, /dailyQuestionPolicy/);
  assert.match(catalog, /dailyQuizzes/);
  assert.match(catalog, /const bufferMinutes = Math\.ceil\(totalEstimatedMinutes \* 0\.25\)/);
  assert.match(catalog, /não comprova senioridade profissional/);
  assert.match(actions, /plannedEstimatedMinutes: plan\.totalEstimatedMinutes/);
  assert.match(actions, /dailyQuizMaterializations/);
  assert.match(actions, /scheduled_date: dailyQuiz\.scheduledDate/);
  assert.match(wizard, /Questões diárias/);
  assert.match(wizard, /Prazo insuficiente/);
  assert.match(wizard, /border-red-400\/40 bg-red-500\/10/);
  assert.match(wizard, /tone=\{deadlineIsShort \? "danger" : "default"\}/);
});
