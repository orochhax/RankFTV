"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addDays, hojeISO } from "@/lib/performance";
import { parseEventRecurrenceRule } from "@/lib/event-recurrence";
import { portfolioVariation } from "@/lib/performance-life-os";
import { getOpenAIClient } from "@/lib/openai";
import { openAIReasoningEffort, openAIRoadmapMaxOutputTokens } from "@/lib/openai-config";
import { generateDailyLifeAnalysis } from "@/lib/daily-life-analysis-service";
import { isStudyAnswerCorrect, validStudyAnswer, type SubmittedStudyAnswer } from "@/lib/study-assessment";
import { isPerformanceOwner } from "@/lib/performance-owner";
import {
  buildItCareerPlan,
  buildItCareerPreview,
  itCareerCatalogs,
  itCareerCurrentLevelIds,
  itCareerCurrentLevelLabels,
  itCareerIds,
  itCareerInterestIds,
  itCareerInterestOptions,
  itCareerLevelIds,
  itCareerLevelLabels,
  topicsForItCareer,
  type ItCareerCurrentLevelId,
  type ItCareerDailyQuizSession,
  type ItCareerId,
  type ItCareerInterestId,
  type ItCareerLevelId,
  type ItCareerPlanSetup,
  type ItKnownTopicPolicy,
} from "@/lib/it-career-roadmaps";
import { officialItCareerTemplate } from "@/lib/it-career-official-templates";
import {
  ROADMAP_IMPORT_MAX_BYTES,
} from "@/lib/performance-analytics";
import {
  buildImportedRoadmapPlan,
  buildRoadmapPlan,
  generatedRoadmapSchema,
  languageRoadmapSystemInstructions,
  ROADMAP_AI_DAILY_LIMIT,
  ROADMAP_AI_PROMPT_VERSION,
  ROADMAP_IMPORT_AI_MAX_CHARS,
  ROADMAP_IMPORT_PROMPT_VERSION,
  prepareRoadmapImportSource,
  roadmapAiAnswersSchema,
  roadmapDailyLimitReached,
  roadmapDraftStats,
  roadmapGenerationPlanSchema,
  roadmapGoalFromContext,
  roadmapHorizon,
  roadmapImportPromptInput,
  roadmapImportSystemInstructions,
  roadmapLanguageFormats,
  roadmapPromptInput,
  roadmapSystemInstructions,
  type GenerateRoadmapResult,
  type RoadmapAiAnswers,
  type RoadmapDraftDetail,
} from "@/lib/study-roadmap-ai";

type Res = { ok: boolean; error?: string };

async function requireCeo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) return null;
  return { supabase, user, isAdmin: true as const };
}

async function requireRoadmapAiUser() {
  return requireCeo();
}

function reval() {
  revalidatePath("/admin/performance");
  revalidatePath("/admin/performance/calendario");
}
function text(formData: FormData, key: string, max = 200): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}
function number(formData: FormData, key: string): number | null {
  const value = Number(String(formData.get(key) ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function integer(formData: FormData, key: string, minimum = 0): number | null {
  const value = number(formData, key);
  return value != null && Number.isInteger(value) && value >= minimum ? value : null;
}

function formValues(formData: FormData, key: string, max = 100): string[] {
  return [...new Set(formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean))].slice(0, max);
}

function insertBatches<T>(values: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) batches.push(values.slice(index, index + size));
  return batches;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

/**
 * A importacao e limitada aos exports de idioma. Um JSON de carreira de TI
 * inclui metadados deterministas e jamais deve voltar ao normalizador com IA.
 */
function isLanguageRoadmapExport(payload: unknown): boolean {
  if (!isPlainRecord(payload) || payload.roadmapKind !== "language" || payload.version !== 4) return false;
  if (hasValue(payload.exportKind) && payload.exportKind !== "rankftv-language-roadmap") return false;
  if (hasValue(payload.templateKey) || hasValue(payload.templateVersion) || hasValue(payload.targetTechnicalLevel)) return false;
  if (typeof payload.title !== "string" || !payload.title.trim() || !Array.isArray(payload.sections) || !payload.sections.length || payload.sections.length > 100) return false;

  return payload.sections.every((section) => {
    if (!isPlainRecord(section) || typeof section.title !== "string" || !section.title.trim() || !Array.isArray(section.items) || !section.items.length) return false;
    if (["moduleKind", "moduleCode", "levelCode", "templateNodeId"].some((key) => hasValue(section[key]))) return false;

    return section.items.every((item) => {
      if (!isPlainRecord(item) || typeof item.title !== "string" || !item.title.trim()) return false;
      if (["parentItemId", "contentRole", "itemCode", "levelCode", "templateNodeId"].some((key) => hasValue(item[key]))) return false;
      return !Array.isArray(item.subtopics) || item.subtopics.length === 0;
    });
  });
}

function isLanguageRoadmapGeneration(origin: unknown, answers: unknown): boolean {
  if (!isPlainRecord(answers) || answers.roadmapType !== "language") return false;
  if (origin === "ai") return roadmapAiAnswersSchema.safeParse(answers).success;
  return origin === "import" && answers.source === "import";
}

function normalizedRoadmapTitle(value: string): string | null {
  const title = value.trim().replace(/\s+/g, " ").slice(0, 160);
  return title.length >= 3 ? title : null;
}

async function setActiveStudyRoadmap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  roadmapId: string,
): Promise<Res> {
  const { data: target, error: targetError } = await supabase
    .from("perf_study_roadmap")
    .select("id")
    .eq("id", roadmapId)
    .eq("user_id", userId)
    .maybeSingle();
  if (targetError || !target) return { ok: false, error: targetError?.message ?? "Roadmap nao encontrado." };

  const { error: archiveError } = await supabase
    .from("perf_study_roadmap")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("id", roadmapId);
  if (archiveError) return { ok: false, error: archiveError.message };

  const { error: activateError } = await supabase
    .from("perf_study_roadmap")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", roadmapId)
    .eq("user_id", userId);
  if (activateError) return { ok: false, error: activateError.message };
  return { ok: true };
}

export async function criarEventoLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title");
  const startAt = text(formData, "start_at", 40);
  const endAt = text(formData, "end_at", 40);
  if (!title || !startAt || !endAt) return { ok: false, error: "Nome, início e fim são obrigatórios." };
  const allDay = formData.get("all_day") === "on";
  let start = new Date(startAt); let end = new Date(endAt);
  if (allDay) { start = new Date(`${startAt.slice(0, 10)}T00:00:00-03:00`); end = new Date(`${addDays(endAt.slice(0, 10), 1)}T00:00:00-03:00`); }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return { ok: false, error: "O fim precisa ser depois do início." };
  const status = text(formData, "status", 30) ?? "planned";
  if (!["planned", "in_progress", "completed", "cancelled"].includes(status)) return { ok: false, error: "Status inválido." };
  const recurrenceInput = text(formData, "recurrence_rule", 3000);
  let recurrenceRule = null;
  try { recurrenceRule = parseEventRecurrenceRule(recurrenceInput ? JSON.parse(recurrenceInput) : null); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Repetição inválida." }; }
  if (recurrenceInput && !recurrenceRule) return { ok: false, error: "Repetição inválida." };
  const { error } = await ctx.supabase.from("perf_event").insert({
    user_id: ctx.user.id, title, description: text(formData, "description", 2000), start_at: start.toISOString(), end_at: end.toISOString(),
    all_day: allDay, status, source: "manual", location: text(formData, "location"), link: text(formData, "link", 500),
    recurrence_rule: recurrenceRule, recurrence_group_id: recurrenceRule ? randomUUID() : null,
  });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarEventoLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Evento invalido." };
  const title = text(formData, "title");
  const startAt = text(formData, "start_at", 40);
  const endAt = text(formData, "end_at", 40);
  if (!title || !startAt || !endAt) return { ok: false, error: "Nome, inicio e fim sao obrigatorios." };
  const allDay = formData.get("all_day") === "on";
  let start = new Date(startAt);
  let end = new Date(endAt);
  if (allDay) { start = new Date(`${startAt.slice(0, 10)}T00:00:00-03:00`); end = new Date(`${addDays(endAt.slice(0, 10), 1)}T00:00:00-03:00`); }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { ok: false, error: "O fim precisa ser depois do inicio." };
  }
  const recurrenceInput = text(formData, "recurrence_rule", 3000);
  let recurrenceRule = null;
  try { recurrenceRule = parseEventRecurrenceRule(recurrenceInput ? JSON.parse(recurrenceInput) : null); }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Repetição inválida." }; }
  if (recurrenceInput && !recurrenceRule) return { ok: false, error: "Repetição inválida." };
  const { error } = await ctx.supabase.from("perf_event").update({
    title,
    description: text(formData, "description", 2000),
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    location: text(formData, "location"),
    link: text(formData, "link", 500),
    all_day: allDay,
    recurrence_rule: recurrenceRule,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("user_id", ctx.user.id).eq("active", true);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function criarCategoriaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const name = text(formData, "name", 80);
  if (!name) return { ok: false, error: "Informe o nome da categoria." };
  const { error } = await ctx.supabase.from("perf_category").insert({ user_id: ctx.user.id, name, type: text(formData, "type", 30) ?? "general", area: text(formData, "area", 30), color: text(formData, "color", 20) });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerCategoriaLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Categoria inválida." };
  const { error } = await ctx.supabase.from("perf_category").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function criarTarefaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title", 160);
  const startDate = text(formData, "start_date", 10);
  const repeat = formData.get("recurrence_type") === "daily";
  const endDate = repeat ? text(formData, "recurrence_end_date", 10) : null;
  if (!title || !startDate) return { ok: false, error: "Nome e data sao obrigatorios." };
  if (repeat && (!endDate || endDate < startDate)) return { ok: false, error: "Informe uma data final valida para a repeticao." };
  const { error } = await ctx.supabase.from("perf_task").insert({ user_id: ctx.user.id, title, start_date: startDate, recurrence_type: repeat ? "daily" : "none", recurrence_end_date: endDate });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarTarefaLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Tarefa invalida." };
  const title = text(formData, "title", 160); const startDate = text(formData, "start_date", 10);
  const repeat = formData.get("recurrence_type") === "daily"; const endDate = repeat ? text(formData, "recurrence_end_date", 10) : null;
  if (!title || !startDate || (repeat && (!endDate || endDate < startDate))) return { ok: false, error: "Dados invalidos para a tarefa." };
  const { error } = await ctx.supabase.from("perf_task").update({ title, start_date: startDate, recurrence_type: repeat ? "daily" : "none", recurrence_end_date: endDate, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerTarefaLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Tarefa invalida." };
  const { error } = await ctx.supabase.from("perf_task").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function registrarTarefaLifeOS(taskId: string, date: string, completed: boolean): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !taskId || !date) return { ok: false, error: "Ocorrencia invalida." };
  const { error } = await ctx.supabase.from("perf_task_log").upsert({ user_id: ctx.user.id, task_id: taskId, occurrence_date: date, completed, completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: "task_id,occurrence_date" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function atualizarStatusEventoLifeOS(id: string, status: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id || !["planned", "in_progress", "completed", "cancelled"].includes(status)) return { ok: false, error: "Dados inválidos." };
  const { error } = await ctx.supabase.from("perf_event").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerEventoLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Evento inválido." };
  const { error } = await ctx.supabase.from("perf_event").update({ active: false, status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function criarAtividadeLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title"); const date = text(formData, "date", 10); const area = text(formData, "area", 30);
  if (!title || !date || !area) return { ok: false, error: "Área, título e data são obrigatórios." };
  const duration = number(formData, "duration_minutes"); const intensity = number(formData, "intensity");
  if (duration != null && (!Number.isInteger(duration) || duration <= 0)) return { ok: false, error: "Duração inválida." };
  if (intensity != null && (intensity < 1 || intensity > 10)) return { ok: false, error: "Intensidade deve ficar entre 1 e 10." };
  const { error } = await ctx.supabase.from("perf_activity").insert({ user_id: ctx.user.id, title, date, area, type: text(formData, "type", 50), duration_minutes: duration, intensity, status: "completed", result: text(formData, "result", 1000), learning: text(formData, "learning", 1000), notes: text(formData, "notes", 2000) });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerAtividadeLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Atividade inválida." };
  const { error } = await ctx.supabase.from("perf_activity").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

async function studySessionPayload(
  ctx: NonNullable<Awaited<ReturnType<typeof requireCeo>>>,
  formData: FormData,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: string }> {
  const date = text(formData, "date", 10);
  const source = text(formData, "source", 20) === "pomodoro" ? "pomodoro" : "manual";
  const focusMinutes = integer(formData, "focus_minutes", 1);
  const shortBreakMinutes = integer(formData, "short_break_minutes", 0);
  const longBreakMinutes = integer(formData, "long_break_minutes", 0);
  const cyclesCompleted = integer(formData, "cycles_completed", 0);
  const moduleIds = formValues(formData, "module_ids", 30);
  const itemIds = formValues(formData, "item_ids", 100);
  const subjectLabels = formValues(formData, "subject_labels", 30).map((value) => value.slice(0, 160));
  const roadmapId = text(formData, "roadmap_id", 36);
  const customTitle = text(formData, "title", 240);
  const title = customTitle ?? subjectLabels.join(", ").slice(0, 240);
  if (!title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Informe o assunto e uma data valida." };
  if (focusMinutes == null || shortBreakMinutes == null || longBreakMinutes == null || cyclesCompleted == null) return { ok: false, error: "Os tempos da sessao precisam ser numeros inteiros validos." };

  if (roadmapId) {
    const { data: roadmap } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("id", roadmapId).eq("user_id", ctx.user.id).maybeSingle();
    if (!roadmap) return { ok: false, error: "O roadmap selecionado nao pertence a esta conta." };
  }
  if (moduleIds.length) {
    const { data } = await ctx.supabase.from("perf_study_roadmap_module").select("id").eq("user_id", ctx.user.id).in("id", moduleIds);
    if ((data ?? []).length !== moduleIds.length) return { ok: false, error: "Um dos modulos selecionados nao foi encontrado." };
  }
  if (itemIds.length) {
    const { data } = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("user_id", ctx.user.id).in("id", itemIds);
    if ((data ?? []).length !== itemIds.length) return { ok: false, error: "Um dos assuntos selecionados nao foi encontrado." };
  }

  const totalMinutes = focusMinutes + shortBreakMinutes + longBreakMinutes;
  return {
    ok: true,
    value: {
      title,
      date,
      area: "estudos",
      type: source,
      duration_minutes: focusMinutes,
      status: "completed",
      notes: text(formData, "notes", 2000),
      metadata: {
        study_session: {
          source,
          focus_minutes: focusMinutes,
          short_break_minutes: shortBreakMinutes,
          long_break_minutes: longBreakMinutes,
          total_minutes: totalMinutes,
          cycles_completed: cyclesCompleted,
          roadmap_id: roadmapId,
          module_ids: moduleIds,
          item_ids: itemIds,
          subject_labels: subjectLabels,
          started_at: text(formData, "started_at", 40),
          ended_at: text(formData, "ended_at", 40),
        },
      },
    },
  };
}

export async function salvarSessaoEstudoLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const payload = await studySessionPayload(ctx, formData);
  if (!payload.ok) return payload;
  const { error } = await ctx.supabase.from("perf_activity").insert({ user_id: ctx.user.id, ...payload.value });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function editarSessaoEstudoLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Sessao invalida." };
  const payload = await studySessionPayload(ctx, formData);
  if (!payload.ok) return payload;
  const { error } = await ctx.supabase.from("perf_activity").update({ ...payload.value, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id).eq("area", "estudos");
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function removerSessaoEstudoLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Sessao invalida." };
  const { error } = await ctx.supabase.from("perf_activity").delete().eq("id", id).eq("user_id", ctx.user.id).eq("area", "estudos");
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function criarTreinoAcademiaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const templateId = text(formData, "template_id", 36);
  let title = text(formData, "title", 160);
  let muscleGroups = formData.getAll("muscle_groups").map(String).filter((value) => ACADEMY_MUSCLES.has(value));
  if (templateId) {
    const { data: template, error: templateError } = await ctx.supabase
      .from("perf_academy_workout_template")
      .select("name, muscle_groups")
      .eq("id", templateId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    if (templateError || !template) return { ok: false, error: "Treino pre-configurado nao encontrado." };
    title = template.name;
    muscleGroups = Array.isArray(template.muscle_groups)
      ? template.muscle_groups.filter((value: unknown): value is string => typeof value === "string" && ACADEMY_MUSCLES.has(value))
      : [];
  }
  const date = text(formData, "date", 10); const duration = number(formData, "duration_minutes");
  if (!title || !date) return { ok: false, error: "Nome e data sao obrigatorios." };
  if (duration != null && (!Number.isInteger(duration) || duration <= 0)) return { ok: false, error: "Duracao invalida." };
  if (!muscleGroups.length) return { ok: false, error: "Selecione pelo menos um grupo muscular." };
  const { error } = await ctx.supabase.from("perf_activity").insert({ user_id: ctx.user.id, title, date, area: "academia", type: text(formData, "type", 50), duration_minutes: duration, status: "completed", notes: text(formData, "notes", 2000), metadata: { muscle_groups: muscleGroups, ...(templateId ? { workout_template_id: templateId } : {}) } });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarTreinoAcademiaLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Treino invalido." };
  const title = text(formData, "title", 160); const date = text(formData, "date", 10); const duration = number(formData, "duration_minutes");
  if (!title || !date || (duration != null && (!Number.isInteger(duration) || duration <= 0))) return { ok: false, error: "Dados invalidos para o treino." };
  const muscleGroups = formData.getAll("muscle_groups").map(String).filter((value) => ACADEMY_MUSCLES.has(value));
  if (!muscleGroups.length) return { ok: false, error: "Selecione pelo menos um grupo muscular." };
  const { error } = await ctx.supabase.from("perf_activity").update({ title, date, type: text(formData, "type", 50), duration_minutes: duration, notes: text(formData, "notes", 2000), metadata: { muscle_groups: muscleGroups }, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id).eq("area", "academia");
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerTreinoAcademiaLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Treino invalido." };
  const { error } = await ctx.supabase.from("perf_activity").delete().eq("id", id).eq("user_id", ctx.user.id).eq("area", "academia");
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

const ACADEMY_MUSCLES = new Set(["peito", "ombros", "biceps", "triceps", "antebracos", "abdomen", "costas", "gluteos", "quadriceps", "posteriores", "panturrilhas"]);

function academyMuscleGroups(formData: FormData): string[] {
  return [...new Set(formData.getAll("muscle_groups").map(String).filter((value) => ACADEMY_MUSCLES.has(value)))];
}

export async function criarModeloTreinoAcademiaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const name = text(formData, "name", 160);
  const muscleGroups = academyMuscleGroups(formData);
  if (!name) return { ok: false, error: "Informe o nome do treino pre-configurado." };
  if (!muscleGroups.length) return { ok: false, error: "Selecione pelo menos um grupo muscular." };
  const { error } = await ctx.supabase.from("perf_academy_workout_template").insert({ user_id: ctx.user.id, name, muscle_groups: muscleGroups });
  if (error?.code === "23505") return { ok: false, error: "Ja existe um treino pre-configurado com esse nome." };
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarModeloTreinoAcademiaLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Treino pre-configurado invalido." };
  const name = text(formData, "name", 160);
  const muscleGroups = academyMuscleGroups(formData);
  if (!name || !muscleGroups.length) return { ok: false, error: "Informe o nome e pelo menos um grupo muscular." };
  const { error } = await ctx.supabase.from("perf_academy_workout_template").update({ name, muscle_groups: muscleGroups, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error?.code === "23505") return { ok: false, error: "Ja existe um treino pre-configurado com esse nome." };
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerModeloTreinoAcademiaLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Treino pre-configurado invalido." };
  const { error } = await ctx.supabase.from("perf_academy_workout_template").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function salvarDadosAcademiaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const height = number(formData, "height_cm");
  const weight = number(formData, "current_weight");
  const target = number(formData, "target_weight");
  const date = text(formData, "weight_date", 10) ?? hojeISO();
  if (height == null || height < 100 || height > 250) return { ok: false, error: "Informe uma altura valida entre 100 e 250 cm." };
  if (weight == null || weight < 30 || weight > 350) return { ok: false, error: "Informe um peso atual valido." };
  if (target == null || target < 30 || target > 350) return { ok: false, error: "Informe uma meta de peso valida." };
  const { error: profileError } = await ctx.supabase.from("perf_profile").upsert({ user_id: ctx.user.id, altura_cm: Math.round(height), peso_meta: target, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (profileError) return { ok: false, error: profileError.message };
  const { error: weightError } = await ctx.supabase.from("perf_weight").upsert({ user_id: ctx.user.id, data: date, peso_kg: weight }, { onConflict: "user_id,data" });
  if (weightError) return { ok: false, error: weightError.message };
  reval(); return { ok: true };
}

export async function criarRoadmapEstudosLifeOS(formData: FormData): Promise<Res & { id?: string }> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title", 160);
  if (!title) return { ok: false, error: "Informe o nome do roadmap." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap").insert({ user_id: ctx.user.id, title, description: text(formData, "description", 2000), status: "archived", source: "manual", start_date: text(formData, "start_date", 10) ?? hojeISO(), target_date: text(formData, "target_date", 10) }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const activation = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, data.id);
  if (!activation.ok) {
    await ctx.supabase.from("perf_study_roadmap").delete().eq("id", data.id).eq("user_id", ctx.user.id);
    return activation;
  }
  reval(); return { ok: true, id: data.id };
}

const IT_ROADMAP_OBJECTIVES = new Set(["learning", "first_job", "career_change", "current_job", "freelance"]);
const IT_APPLICATION_INTENTS = new Set(["none", "after_roadmap", "applying_now"]);

function booleanField(formData: FormData, key: string): boolean {
  return formData.get(key) === "true";
}

function itRoadmapPersistenceError(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? "";
  if (error?.code === "PGRST202" || error?.code === "PGRST204" || /roadmap_kind|template_key|content_role|module_kind|parent_item_id|project_spec|perf_activate_study_roadmap/i.test(message)) {
    return "Execute a migration performance-it-career-roadmaps.sql antes de criar uma carreira de TI.";
  }
  return message || "Nao foi possivel salvar o roadmap predefinido.";
}

function isMissingStudyContentRole(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? "";
  return /content_role/i.test(message) && ["42703", "PGRST204"].includes(error?.code ?? "");
}

type StudyModuleGateContext = NonNullable<Awaited<ReturnType<typeof requireCeo>>>;

async function previousItCareerModuleCompletionError(
  ctx: StudyModuleGateContext,
  item: { roadmap_id: string | null; module_id: string | null },
): Promise<string | null> {
  if (!item.roadmap_id || !item.module_id) return null;

  const roadmapLookup = await ctx.supabase.from("perf_study_roadmap")
    .select("roadmap_kind")
    .eq("id", item.roadmap_id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (roadmapLookup.error) {
    const missingRoadmapKind = /roadmap_kind/i.test(roadmapLookup.error.message ?? "")
      && ["42703", "PGRST204"].includes(roadmapLookup.error.code ?? "");
    return missingRoadmapKind ? null : roadmapLookup.error.message;
  }
  if (roadmapLookup.data?.roadmap_kind !== "it_career") return null;

  const currentModuleLookup = await ctx.supabase.from("perf_study_roadmap_module")
    .select("id, order_index")
    .eq("id", item.module_id)
    .eq("roadmap_id", item.roadmap_id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (currentModuleLookup.error) return currentModuleLookup.error.message;
  if (!currentModuleLookup.data) return "Modulo do roadmap nao encontrado.";

  const previousModulesLookup = await ctx.supabase.from("perf_study_roadmap_module")
    .select("id, title, order_index")
    .eq("roadmap_id", item.roadmap_id)
    .eq("user_id", ctx.user.id)
    .lt("order_index", currentModuleLookup.data.order_index)
    .order("order_index", { ascending: true });
  if (previousModulesLookup.error) return previousModulesLookup.error.message;
  const previousModules = previousModulesLookup.data ?? [];
  if (!previousModules.length) return null;

  const previousModuleIds = previousModules.map((module) => module.id);
  const pendingItemsLookup = await ctx.supabase.from("perf_study_roadmap_item")
    .select("module_id")
    .eq("roadmap_id", item.roadmap_id)
    .eq("user_id", ctx.user.id)
    .in("module_id", previousModuleIds)
    .neq("counts_for_progress", false)
    .neq("status", "completed");
  if (pendingItemsLookup.error) return pendingItemsLookup.error.message;

  const pendingModuleIds = new Set((pendingItemsLookup.data ?? []).map((pendingItem) => pendingItem.module_id));
  const blockingModule = previousModules.find((module) => pendingModuleIds.has(module.id));
  return blockingModule
    ? `Você precisa finalizar o módulo ${blockingModule.title} primeiro.`
    : null;
}

type ItCareerWizardPreviewInput = {
  careerId: string;
  currentLevel: string;
  targetLevel: string;
  interestIds: string[];
  knownTopicIds: string[];
  knownTopicPolicy: string;
  includeDailyQuestions: true;
  includeModuleProjects: true;
  includeCapstone: boolean;
  jobPreparation: boolean;
  objective: string;
  applicationIntent: string;
  targetRole: string;
  startDate: string;
  timelineMode: string;
  durationMonths: number;
  deadline: string;
  availableDays: string[];
  minutesPerDay: number;
};

function previewStringArray(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value) || value.length > maximum) return [];
  return value.flatMap((entry) => typeof entry === "string" && entry.trim() ? [entry.trim()] : []);
}

function parseItCareerPreviewInput(value: unknown): ItCareerPlanSetup {
  if (!isPlainRecord(value)) throw new Error("Configuracao da previa invalida.");
  const input = value as Partial<ItCareerWizardPreviewInput>;
  const interestIds = previewStringArray(input.interestIds, 3);
  const knownTopicIds = previewStringArray(input.knownTopicIds, 500);
  const availableDays = previewStringArray(input.availableDays, 7);
  const careerId = typeof input.careerId === "string" ? input.careerId : "";
  const currentLevel = typeof input.currentLevel === "string" ? input.currentLevel : "";
  const targetLevel = typeof input.targetLevel === "string" ? input.targetLevel : "";
  const knownTopicPolicy = typeof input.knownTopicPolicy === "string" ? input.knownTopicPolicy : "";
  const objective = typeof input.objective === "string" ? input.objective : "";
  const applicationIntent = typeof input.applicationIntent === "string" ? input.applicationIntent : "";
  const timelineMode = typeof input.timelineMode === "string" ? input.timelineMode : "";

  if (!itCareerIds.includes(careerId as ItCareerId)) throw new Error("Escolha uma carreira de TI valida.");
  if (!itCareerCurrentLevelIds.includes(currentLevel as ItCareerCurrentLevelId)) throw new Error("Informe seu nivel atual.");
  if (!itCareerLevelIds.includes(targetLevel as ItCareerLevelId)) throw new Error("Escolha a profundidade de conteudo que deseja estudar.");
  if (!itCareerInterestIds.every((id) => typeof id === "string") || interestIds.some((id) => !itCareerInterestIds.includes(id as ItCareerInterestId))) {
    throw new Error("Escolha apenas assuntos de interesse validos.");
  }
  if (!IT_ROADMAP_OBJECTIVES.has(objective)) throw new Error("Escolha seu objetivo com esta carreira.");
  if (!IT_APPLICATION_INTENTS.has(applicationIntent)) throw new Error("Informe se pretende se candidatar a vagas.");
  if (!['skip', 'validate'].includes(knownTopicPolicy)) throw new Error("Escolha como tratar os assuntos que ja domina.");
  if (!['duration', 'deadline'].includes(timelineMode)) throw new Error("Escolha como deseja informar o prazo.");

  return {
    careerId,
    currentLevel,
    targetLevel,
    interestIds: interestIds as ItCareerInterestId[],
    knownTopicIds,
    knownTopicPolicy: knownTopicPolicy as ItKnownTopicPolicy,
    includeActivities: false,
    includeDailyQuestions: true,
    includeModuleProjects: true,
    includeAssessments: false,
    includeCapstone: input.includeCapstone === true,
    jobPreparation: input.jobPreparation === true,
    objective: objective as NonNullable<ItCareerPlanSetup["objective"]>,
    applicationIntent: applicationIntent as NonNullable<ItCareerPlanSetup["applicationIntent"]>,
    targetRole: typeof input.targetRole === "string" ? input.targetRole.trim().slice(0, 200) : "",
    startDate: typeof input.startDate === "string" ? input.startDate.slice(0, 10) : "",
    timelineMode: timelineMode as "duration" | "deadline",
    durationMonths: Number.isInteger(input.durationMonths) ? Number(input.durationMonths) : 0,
    deadline: typeof input.deadline === "string" ? input.deadline.slice(0, 10) : "",
    availableDays,
    minutesPerDay: Number.isInteger(input.minutesPerDay) ? Number(input.minutesPerDay) : 0,
  };
}

/** Somente metadados publicos; nunca envia perguntas, explicacoes ou gabaritos. */
export async function obterConfiguracaoRoadmapTiLifeOS() {
  try {
    const ctx = await requireCeo();
    if (!ctx) return { ok: false as const, error: "Acesso negado." };

    const topicsByCareerAndLevel = Object.fromEntries(itCareerCatalogs.map((career) => [
      career.id,
      Object.fromEntries(itCareerCurrentLevelIds.map((level) => [
        level,
        topicsForItCareer(career.id, level).map((topic) => ({
          id: topic.id,
          label: topic.title,
          moduleLabel: topic.moduleLabel,
          levelLabel: topic.levelLabel,
        })),
      ])),
    ]));

    return {
      ok: true as const,
      configuration: {
        careers: itCareerCatalogs.map((career) => ({ id: career.id, label: career.title, description: career.description })),
        currentLevelIds: [...itCareerCurrentLevelIds],
        currentLevelLabels: { ...itCareerCurrentLevelLabels },
        targetLevelIds: [...itCareerLevelIds],
        targetLevelLabels: { ...itCareerLevelLabels },
        interestOptions: itCareerInterestOptions.map((interest) => ({ ...interest })),
        topicsByCareerAndLevel,
      },
    };
  } catch {
    return { ok: false as const, error: "Nao foi possivel carregar a configuracao do roadmap." };
  }
}

/** Calcula a previa no servidor e projeta apenas os campos exibidos pelo wizard. */
export async function previsualizarRoadmapTiLifeOS(value: unknown) {
  try {
    const ctx = await requireCeo();
    if (!ctx) return { ok: false as const, error: "Acesso negado." };
    const plan = buildItCareerPreview(parseItCareerPreviewInput(value));
    return {
      ok: true as const,
      preview: {
        title: plan.title,
        description: plan.description,
        totalEstimatedMinutes: plan.totalEstimatedMinutes,
        bufferMinutes: plan.bufferMinutes,
        recommendedEstimatedMinutes: plan.recommendedEstimatedMinutes,
        recommendedTargetDate: plan.recommendedTargetDate,
        deadlineWarning: plan.deadlineWarning,
        milestones: plan.milestones.map((milestone) => ({
          levelId: milestone.level,
          label: milestone.levelLabel,
          estimatedMinutes: milestone.cumulativeRecommendedEstimatedMinutes,
          targetDate: milestone.recommendedTargetDate,
        })),
        dailyQuestionPolicy: { ...plan.dailyQuestionPolicy },
        modules: plan.modules.map((module) => ({
          id: module.id,
          title: module.title,
          levelId: module.level,
          levelLabel: module.levelLabel,
          estimatedMinutes: module.estimatedMinutes,
          topics: module.topics.map((topic) => ({ id: topic.id, title: topic.title, subtopics: [...topic.subtopics] })),
          project: module.project ? {
            id: module.project.id,
            title: module.project.title,
            estimatedMinutes: module.project.estimatedMinutes,
            projectSpec: {
              productDefinition: module.project.projectSpec.productDefinition,
              data: { sourceLabel: module.project.projectSpec.data.sourceLabel },
              functionalities: [...module.project.projectSpec.functionalities],
              deliverables: [...module.project.projectSpec.deliverables],
              evaluationCriteria: module.project.projectSpec.evaluationCriteria.map((criterion) => ({ id: criterion.id })),
            },
          } : null,
        })),
      },
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Nao foi possivel montar a previa deste roadmap." };
  }
}

export async function criarRoadmapTiPredefinidoLifeOS(formData: FormData): Promise<Res & { id?: string }> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };

  const careerId = text(formData, "career_id", 80) ?? "";
  const currentLevel = text(formData, "current_level", 30) ?? "";
  const targetLevel = text(formData, "target_level", 30) ?? "";
  const knownTopicPolicy = text(formData, "mastered_topic_policy", 20) ?? "validate";
  const objective = text(formData, "objective", 30) ?? "";
  const applicationIntent = text(formData, "application_intent", 30) ?? "none";
  const targetRole = applicationIntent === "none" ? "" : text(formData, "target_role", 200) ?? "";
  const jobPreparation = applicationIntent !== "none" && booleanField(formData, "job_preparation");
  const timelineMode = text(formData, "timeline_mode", 20) ?? "duration";
  const durationMonths = integer(formData, "duration_months", 1) ?? 0;
  const deadline = text(formData, "deadline", 10) ?? "";
  const startDate = text(formData, "start_date", 10) ?? "";
  const minutesPerDay = integer(formData, "minutes_per_day", 1) ?? 0;
  const availableDays = formValues(formData, "available_days", 7);
  const knownTopicIds = formValues(formData, "mastered_topic_ids", 500);
  const interestIds = formValues(formData, "interest_ids", 3);
  const tooManyInterestIds = formValues(formData, "interest_ids", 4).length > 3;

  if (!itCareerIds.includes(careerId as ItCareerId)) return { ok: false, error: "Escolha uma carreira de TI valida." };
  if (!itCareerCurrentLevelIds.includes(currentLevel as ItCareerCurrentLevelId)) return { ok: false, error: "Informe seu nivel atual." };
  if (!itCareerLevelIds.includes(targetLevel as ItCareerLevelId)) return { ok: false, error: "Escolha a profundidade de conteúdo que deseja estudar." };
  if (!["skip", "validate"].includes(knownTopicPolicy)) return { ok: false, error: "Escolha como tratar os assuntos que ja domina." };
  if (!IT_ROADMAP_OBJECTIVES.has(objective)) return { ok: false, error: "Escolha seu objetivo com esta carreira." };
  if (!IT_APPLICATION_INTENTS.has(applicationIntent)) return { ok: false, error: "Informe se pretende se candidatar a vagas." };
  if (applicationIntent !== "none" && targetRole.length < 2) return { ok: false, error: "Informe o cargo ou funcao desejada." };
  if (!['duration', 'deadline'].includes(timelineMode)) return { ok: false, error: "Escolha como deseja informar o prazo." };
  if (interestIds.length < 1 || tooManyInterestIds) return { ok: false, error: "Escolha de um a tres assuntos de interesse." };
  if (interestIds.some((id) => !itCareerInterestIds.includes(id as ItCareerInterestId))) return { ok: false, error: "Escolha apenas assuntos de interesse validos." };

  const setup: ItCareerPlanSetup = {
    careerId,
    currentLevel,
    targetLevel,
    interestIds: interestIds as ItCareerInterestId[],
    knownTopicIds,
    knownTopicPolicy: knownTopicPolicy as ItKnownTopicPolicy,
    includeActivities: false,
    includeDailyQuestions: true,
    includeModuleProjects: true,
    includeAssessments: false,
    includeCapstone: booleanField(formData, "include_capstone"),
    jobPreparation,
    objective: objective as NonNullable<ItCareerPlanSetup["objective"]>,
    applicationIntent: applicationIntent as NonNullable<ItCareerPlanSetup["applicationIntent"]>,
    targetRole,
    startDate,
    timelineMode: timelineMode as "duration" | "deadline",
    durationMonths,
    deadline,
    availableDays,
    minutesPerDay,
  };

  let plan;
  try {
    plan = buildItCareerPlan(setup);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel montar este roadmap." };
  }
  const officialTemplate = officialItCareerTemplate(careerId as ItCareerId, targetLevel as ItCareerLevelId);
  if (!officialTemplate) return { ok: false, error: "O template oficial desta carreira e nível não está disponível." };

  const roadmapId = randomUUID();
  const now = new Date().toISOString();
  const storedSetup = {
    ...setup,
    objective,
    applicationIntent,
    targetRole,
    jobPreparation,
    deadlineWarning: plan.deadlineWarning,
    plannedEstimatedMinutes: plan.totalEstimatedMinutes,
    bufferMinutes: plan.bufferMinutes,
    recommendedEstimatedMinutes: plan.recommendedEstimatedMinutes,
    recommendedTargetDate: plan.recommendedTargetDate,
    milestones: plan.milestones,
    firstProfessionalMilestoneLabel: plan.professionalMilestone.firstLabel,
    nextProfessionalMilestoneLabel: plan.professionalMilestone.nextLabel,
    dailyQuestionPolicy: plan.dailyQuestionPolicy,
    estimationScope: "curriculum_completion",
    officialTemplateSchemaVersion: officialTemplate.schemaVersion,
    officialTemplateTitle: officialTemplate.title,
    workspaceSchemaVersion: 2,
    workspaceDelivery: "authenticated_download",
  };
  const { error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({
    id: roadmapId,
    user_id: ctx.user.id,
    title: plan.title,
    description: plan.description,
    status: "archived",
    source: "template",
    roadmap_kind: "it_career",
    template_key: plan.templateKey,
    template_version: plan.templateVersion,
    target_level: plan.targetLevel,
    setup: storedSetup,
    start_date: plan.startDate,
    target_date: plan.targetDate,
    recommended_target_date: plan.recommendedTargetDate,
    difficulty_level: plan.targetLevel === "foundation" || plan.targetLevel === "junior" ? "introductory" : plan.targetLevel === "mid" ? "intermediate" : "advanced",
    total_estimated_minutes: plan.totalEstimatedMinutes,
    created_at: now,
    updated_at: now,
  });
  if (roadmapError) return { ok: false, error: itRoadmapPersistenceError(roadmapError) };

  const rollback = async (message: string): Promise<Res> => {
    const { error: cleanupError } = await ctx.supabase.from("perf_study_roadmap").delete().eq("id", roadmapId).eq("user_id", ctx.user.id);
    return { ok: false, error: cleanupError ? `${message} A limpeza automatica tambem falhou: ${cleanupError.message}` : message };
  };

  const officialTopicById = new Map(
    officialTemplate.phases.flatMap((phase) => phase.modules.flatMap((module) => module.topics))
      .map((topic) => [topic.id, topic] as const),
  );

  const moduleIds = new Map<string, string>();
  const moduleRows = plan.modules.map((roadmapModule, index) => {
    const id = randomUUID();
    moduleIds.set(roadmapModule.id, id);
    return {
      id,
      user_id: ctx.user.id,
      roadmap_id: roadmapId,
      title: roadmapModule.title,
      objective: roadmapModule.objective,
      success_criteria: roadmapModule.successCriteria,
      topics: roadmapModule.topics.map((topic) => topic.title),
      order_index: index,
      estimated_minutes: roadmapModule.estimatedMinutes,
      module_kind: roadmapModule.moduleKind,
      module_code: `M${index + 1}`,
      level_code: roadmapModule.level,
      template_node_id: roadmapModule.id,
    };
  });
  for (const moduleBatch of insertBatches(moduleRows, 100)) {
    const { error: moduleError } = await ctx.supabase.from("perf_study_roadmap_module").insert(moduleBatch);
    if (moduleError) return rollback(itRoadmapPersistenceError(moduleError));
  }

  let orderIndex = 0;
  const itemRows: Array<Record<string, unknown>> = [];
  const questionRows: Array<Record<string, unknown>> = [];
  const topicItemRows = new Map<string, Record<string, unknown>>();
  const topicItemOrder: Array<{ moduleOrder: number; topicOrder: number; topicId: string }> = [];
  const projectItemRows = new Map<string, Record<string, unknown>>();
  const dailyQuizMaterializations: Array<{
    dailyQuiz: ItCareerDailyQuizSession;
    dailyQuizIndex: number;
    moduleId: string;
    moduleOrder: number;
    moduleTitle: string;
    topicCode: string;
    topicId: string;
    topicOrder: number;
    topicTitle: string;
    level: ItCareerLevelId;
  }> = [];
  for (const [moduleOrder, roadmapModule] of plan.modules.entries()) {
    const moduleId = moduleIds.get(roadmapModule.id);
    if (!moduleId) return rollback("Nao foi possivel vincular um dos modulos predefinidos.");
    for (const [topicOrder, topic] of roadmapModule.topics.entries()) {
      const officialTopic = officialTopicById.get(topic.id);
      if (!officialTopic) return rollback(`O assunto oficial ${topic.title} não foi encontrado no template versionado.`);
      const topicId = randomUUID();
      topicItemRows.set(topicId, {
        id: topicId, user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: null,
        section: roadmapModule.title, title: topic.title, description: topic.competence, estimated_minutes: topic.estimatedMinutes,
        preparation_steps: officialTopic.guidedStudy.slice(0, 8), practice_exercises: officialTopic.activities.slice(0, 8),
        reflection_questions: [], completion_checklist: [], evidence_prompt: officialTopic.evidence,
        item_kind: topic.role === "review" ? "reinforcement" : "core", content_role: topic.role, item_code: topic.code, level_code: roadmapModule.level,
        counts_for_progress: true, template_node_id: topic.id, subtopics: topic.subtopics,
      });
      topicItemOrder.push({ moduleOrder, topicOrder, topicId });
      const requiresDailyQuizzes = roadmapModule.id !== "career-preparation";
      if (requiresDailyQuizzes && !topic.dailyQuizzes.length) return rollback(`O catalogo de ${topic.title} nao possui perguntas para as sessoes de estudo.`);
      for (const [dailyQuizIndex, dailyQuiz] of topic.dailyQuizzes.entries()) {
        dailyQuizMaterializations.push({ dailyQuiz, dailyQuizIndex, moduleId, moduleOrder, moduleTitle: roadmapModule.title, topicCode: topic.code, topicId, topicOrder, topicTitle: topic.title, level: roadmapModule.level });
      }
    }
    if (roadmapModule.project) {
      const project = roadmapModule.project;
      const projectSpec = project.projectSpec;
      projectItemRows.set(moduleId, {
        id: randomUUID(), user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: null,
        section: roadmapModule.title, title: projectSpec.projectTitle,
        description: `${projectSpec.productDefinition}\n\nProblema: ${projectSpec.problemStatement}\n\nPublico: ${projectSpec.targetAudience}`,
        requirements: projectSpec.mandatoryRequirements.join("\n"), workspace: null, preparation_steps: [], instructions: projectSpec.submissionInstructions.join("\n"),
        practice_exercises: projectSpec.deliverables, reflection_questions: [], completion_checklist: projectSpec.deliverables.slice(0, 8), evidence_prompt: null,
        completion_criteria: projectSpec.evaluationCriteria.map((criterion) => `${criterion.label} (${criterion.weightPercent}%): ${criterion.description}`).join("\n"),
        project_spec: projectSpec, estimated_minutes: project.estimatedMinutes,
        item_kind: "project", content_role: roadmapModule.moduleKind === "capstone" ? "capstone" : "module_project", item_code: roadmapModule.moduleKind === "capstone" ? "TCC" : `${moduleOrder + 1}.P`, level_code: roadmapModule.level,
        // Projetos e atividades vivem no workspace da IDE. No site, somente
        // assuntos/revisoes compoem o progresso e o desbloqueio de modulos.
        counts_for_progress: false, template_node_id: project.id, subtopics: [],
      });
    }
  }

  dailyQuizMaterializations.sort((left, right) => left.dailyQuiz.scheduledDate.localeCompare(right.dailyQuiz.scheduledDate)
    || left.moduleOrder - right.moduleOrder
    || left.topicOrder - right.topicOrder
    || left.dailyQuiz.sessionIndex - right.dailyQuiz.sessionIndex
    || left.dailyQuiz.id.localeCompare(right.dailyQuiz.id));
  const lastDailyQuizIndexByModule = new Map<string, number>();
  dailyQuizMaterializations.forEach((entry, index) => lastDailyQuizIndexByModule.set(entry.moduleId, index));
  const appendedTopicIds = new Set<string>();
  const appendedProjectModuleIds = new Set<string>();
  const appendedQuizlessModuleOrders = new Set<number>();
  const appendItemRow = (row: Record<string, unknown>) => itemRows.push({ ...row, status: "pending", order_index: orderIndex++ });
  const appendQuizlessModulesBefore = (exclusiveModuleOrder: number) => {
    for (const [moduleOrder, roadmapModule] of plan.modules.entries()) {
      if (moduleOrder >= exclusiveModuleOrder || appendedQuizlessModuleOrders.has(moduleOrder)) continue;
      const moduleId = moduleIds.get(roadmapModule.id);
      if (!moduleId || lastDailyQuizIndexByModule.has(moduleId)) continue;

      topicItemOrder
        .filter((entry) => entry.moduleOrder === moduleOrder)
        .sort((left, right) => left.topicOrder - right.topicOrder)
        .forEach(({ topicId }) => {
          if (appendedTopicIds.has(topicId)) return;
          const topicRow = topicItemRows.get(topicId);
          if (topicRow) appendItemRow(topicRow);
          appendedTopicIds.add(topicId);
        });
      const projectRow = projectItemRows.get(moduleId);
      if (projectRow) {
        appendItemRow(projectRow);
        appendedProjectModuleIds.add(moduleId);
      }
      appendedQuizlessModuleOrders.add(moduleOrder);
    }
  };
  for (const [dailyOrder, materialization] of dailyQuizMaterializations.entries()) {
      appendQuizlessModulesBefore(materialization.moduleOrder);
      const { dailyQuiz, dailyQuizIndex, moduleId, moduleTitle, topicCode, topicId, topicTitle, level } = materialization;
      const scheduledWeekday = /^\d{4}-\d{2}-\d{2}$/.test(dailyQuiz.scheduledDate)
        ? new Date(`${dailyQuiz.scheduledDate}T12:00:00Z`).getUTCDay()
        : -1;
      if (
        dailyQuiz.scheduledDate < plan.startDate
        || !availableDays.includes(String(scheduledWeekday))
        || dailyQuiz.questions.length !== plan.dailyQuestionPolicy.questionsPerStudyDay
        || dailyQuiz.questions.length > 20
      ) return rollback(`O catalogo de ${topicTitle} possui uma sessao de perguntas diarias invalida.`);
      if (!appendedTopicIds.has(topicId)) {
        const topicRow = topicItemRows.get(topicId);
        if (!topicRow) return rollback(`Nao foi possivel materializar o assunto ${topicTitle}.`);
        appendItemRow(topicRow);
        appendedTopicIds.add(topicId);
      }
      const assessmentId = randomUUID();
      appendItemRow({
        id: assessmentId, user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: topicId,
        section: moduleTitle, title: dailyQuiz.title,
        description: "Perguntas predefinidas para praticar nos arquivos do workspace da IDE.",
        estimated_minutes: dailyQuiz.estimatedMinutes, item_kind: "quiz", content_role: "assessment",
        item_code: `${topicCode}.Q${dailyQuizIndex + 1}`, level_code: level, scheduled_date: dailyQuiz.scheduledDate,
        counts_for_progress: false, template_node_id: dailyQuiz.id, subtopics: [],
      });
      dailyQuiz.questions.forEach((question, questionIndex) => questionRows.push({
        user_id: ctx.user.id,
        item_id: assessmentId,
        question_type: question.type,
        prompt: question.prompt,
        options: question.options,
        correct_option: question.type === "multiple_choice" ? question.correctOptionIndex : null,
        correct_order: question.type === "ordering" ? question.correctOrder : [],
        explanation: question.explanation,
        order_index: questionIndex,
      }));
      if (lastDailyQuizIndexByModule.get(moduleId) === dailyOrder) {
        const projectRow = projectItemRows.get(moduleId);
        if (projectRow) {
          appendItemRow(projectRow);
          appendedProjectModuleIds.add(moduleId);
        }
      }
  }
  appendQuizlessModulesBefore(plan.modules.length);
  topicItemOrder
    .sort((left, right) => left.moduleOrder - right.moduleOrder || left.topicOrder - right.topicOrder)
    .forEach(({ topicId }) => {
      if (appendedTopicIds.has(topicId)) return;
      const topicRow = topicItemRows.get(topicId);
      if (topicRow) appendItemRow(topicRow);
    });
  plan.modules.forEach((roadmapModule) => {
    const moduleId = moduleIds.get(roadmapModule.id);
    if (!moduleId || appendedProjectModuleIds.has(moduleId)) return;
    const projectRow = projectItemRows.get(moduleId);
    if (projectRow) appendItemRow(projectRow);
  });

  for (const itemBatch of insertBatches(itemRows, 200)) {
    const { error: itemError } = await ctx.supabase
      .from("perf_study_roadmap_item")
      .insert(itemBatch, { defaultToNull: false });
    if (itemError) return rollback(itRoadmapPersistenceError(itemError));
  }
  for (const questionBatch of insertBatches(questionRows, 250)) {
    const { error: questionError } = await createAdminClient().from("perf_study_assessment_question").insert(questionBatch);
    if (questionError) return rollback(questionError.message);
  }
  const { error: activationError } = await ctx.supabase.rpc("perf_activate_study_roadmap", { p_roadmap_id: roadmapId });
  if (activationError) return rollback(itRoadmapPersistenceError(activationError));
  reval();
  return { ok: true, id: roadmapId };
}

export async function ativarRoadmapEstudosLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  const result = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, id);
  if (result.ok) reval();
  return result;
}

export async function renomearRoadmapEstudosLifeOS(id: string, value: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  const title = normalizedRoadmapTitle(value);
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  if (!title) return { ok: false, error: "Informe um nome com pelo menos 3 caracteres." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap").update({ title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Roadmap nao encontrado." };
  reval();
  return { ok: true };
}

export async function removerRoadmapEstudosLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  const { data: roadmap, error: lookupError } = await ctx.supabase.from("perf_study_roadmap").select("id, status").eq("id", id).eq("user_id", ctx.user.id).maybeSingle();
  if (lookupError || !roadmap) return { ok: false, error: lookupError?.message ?? "Roadmap nao encontrado." };
  const { error } = await ctx.supabase.from("perf_study_roadmap").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  if (roadmap.status === "active") {
    const { data: replacement } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("user_id", ctx.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (replacement?.id) await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, replacement.id);
  }
  reval();
  return { ok: true };
}

export async function criarItemEstudoLifeOS(roadmapId: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !roadmapId) return { ok: false, error: "Roadmap invalido." };
  const title = text(formData, "title", 160); const orderIndex = number(formData, "order_index") ?? 0; const estimated = number(formData, "estimated_minutes");
  if (!title) return { ok: false, error: "Informe o nome da materia." };
  const { data: roadmap } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("id", roadmapId).eq("user_id", ctx.user.id).maybeSingle();
  if (!roadmap) return { ok: false, error: "Roadmap nao encontrado." };
  const kind = text(formData, "item_kind", 20) ?? "general";
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").insert({ user_id: ctx.user.id, roadmap_id: roadmapId, title, section: text(formData, "section", 120), description: text(formData, "description", 2000), order_index: Math.max(0, Math.round(orderIndex)), estimated_minutes: estimated, scheduled_date: text(formData, "scheduled_date", 10), item_kind: STUDY_ITEM_KINDS.has(kind) ? kind : "general" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarItemEstudoLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Materia invalida." };
  const title = text(formData, "title", 160); const estimated = number(formData, "estimated_minutes");
  if (!title) return { ok: false, error: "Informe o nome da materia." };
  const kind = text(formData, "item_kind", 20) ?? "general";
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").update({ title, section: text(formData, "section", 120), description: text(formData, "description", 2000), order_index: Math.max(0, Math.round(number(formData, "order_index") ?? 0)), estimated_minutes: estimated, scheduled_date: text(formData, "scheduled_date", 10), item_kind: STUDY_ITEM_KINDS.has(kind) ? kind : "general", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function atualizarStatusEstudoLifeOS(id: string, status: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id || !["pending", "in_progress", "completed"].includes(status)) return { ok: false, error: "Status invalido." };
  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item")
    .select("roadmap_id, module_id, preparation_steps, completion_checklist")
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Etapa não encontrada." };
  if (status !== "pending") {
    const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
    if (moduleGateError) return { ok: false, error: moduleGateError };
  }
  const { count } = await createAdminClient().from("perf_study_assessment_question").select("id", { count: "exact", head: true }).eq("item_id", id).eq("user_id", ctx.user.id);
  const hasChecks = (Array.isArray(item.preparation_steps) && item.preparation_steps.length > 0) || (Array.isArray(item.completion_checklist) && item.completion_checklist.length > 0);
  if (hasChecks || (count ?? 0) > 0) return { ok: false, error: "Esta aula é concluída automaticamente após todos os checks e respostas." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function alternarCheckEstudoLifeOS(itemId: string, group: "preparation" | "completion", index: number, checked: boolean): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !itemId || !["preparation", "completion"].includes(group) || !Number.isInteger(index) || index < 0) return { ok: false, error: "Checklist inválido." };
  if (checked) {
    const itemLookup = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id, roadmap_id, module_id, order_index, content_role")
      .eq("id", itemId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    const item = itemLookup.data;
    if (itemLookup.error) {
      if (!isMissingStudyContentRole(itemLookup.error)) return { ok: false, error: itemLookup.error.message };
      const legacyItemLookup = await ctx.supabase.from("perf_study_roadmap_item")
        .select("id, roadmap_id")
        .eq("id", itemId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (legacyItemLookup.error) return { ok: false, error: legacyItemLookup.error.message };
      if (!legacyItemLookup.data?.roadmap_id) return { ok: false, error: "Etapa nao encontrada." };
      const legacyRoadmapLookup = await ctx.supabase.from("perf_study_roadmap")
        .select("source")
        .eq("id", legacyItemLookup.data.roadmap_id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (legacyRoadmapLookup.error) return { ok: false, error: legacyRoadmapLookup.error.message };
      if (!legacyRoadmapLookup.data || legacyRoadmapLookup.data.source === "template") {
        return { ok: false, error: "Execute a migration performance-it-career-roadmaps.sql antes de marcar este desafio." };
      }
    } else if (!item) {
      return { ok: false, error: "Etapa nao encontrada." };
    } else {
      const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
      if (moduleGateError) return { ok: false, error: moduleGateError };
    }
    if (item && ["module_project", "capstone"].includes(item.content_role ?? "") && item.roadmap_id) {
      const { data: earlierPendingGate, error: gateError } = await ctx.supabase.from("perf_study_roadmap_item")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("roadmap_id", item.roadmap_id)
        .in("content_role", ["assessment", "module_project", "capstone"])
        .lt("order_index", item.order_index)
        .neq("status", "completed")
        .limit(1)
        .maybeSingle();
      if (gateError) return { ok: false, error: gateError.message };
      if (earlierPendingGate) return { ok: false, error: "Conclua primeiro as questões e o desafio anterior deste roadmap." };
    }
  }
  const { error } = await ctx.supabase.rpc("perf_toggle_study_check", { p_item_id: itemId, p_group: group, p_index: index, p_checked: checked });
  if (error) return { ok: false, error: error.message.includes("Could not find") ? "Aplique a migration de progresso dos estudos antes de marcar os checks." : error.message };
  reval(); return { ok: true };
}

export async function removerItemEstudoLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Materia invalida." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

const STUDY_ITEM_KINDS = new Set(["core", "reinforcement", "challenge", "check", "criterion", "general", "reading", "video", "audiovisual", "practice", "quiz", "project", "checkpoint"]);

export async function importarRoadmapEstudosLifeOS(payload: string, filename = "roadmap.json"): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A importacao com IA ainda nao esta liberada para este usuario." };
  if (Buffer.byteLength(payload, "utf8") > ROADMAP_IMPORT_MAX_BYTES) return { ok: false, error: "O arquivo excede o limite de 5 MB." };

  const safeFilename = filename.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 180) || "roadmap.json";
  if (!/\.json$/i.test(safeFilename)) return { ok: false, error: "Importe um arquivo JSON exportado de um roadmap de idioma." };
  try {
    const imported = JSON.parse(payload) as unknown;
    if (!isLanguageRoadmapExport(imported)) {
      return { ok: false, error: "Somente roadmaps de idioma exportados pelo sistema podem ser importados. Carreiras de TI usam o catalogo predefinido." };
    }
  } catch {
    return { ok: false, error: "O arquivo JSON de idioma nao e valido." };
  }
  let source: string;
  try {
    source = prepareRoadmapImportSource(payload);
  } catch (error) {
    return { ok: false, error: roadmapAiError(error) };
  }

  const gateError = await roadmapGenerationGate(ctx);
  if (gateError) return { ok: false, error: gateError };
  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").insert({
    user_id: ctx.user.id,
    status: "generating",
    answers: { source: "import", roadmapType: "language", filename: safeFilename, characterCount: source.length },
    origin: "import",
    original_filename: safeFilename,
    source_sha256: sourceSha256,
    model,
    prompt_version: ROADMAP_IMPORT_PROMPT_VERSION,
  }).select("id").single();
  if (generationError || !generation) return { ok: false, error: generationError?.message ?? "Nao foi possivel iniciar a importacao." };

  try {
    const response = await getOpenAIClient().responses.parse({
      model,
      reasoning: { effort: openAIReasoningEffort(process.env.OPENAI_ROADMAP_REASONING_EFFORT) },
      instructions: roadmapImportSystemInstructions,
      input: roadmapImportPromptInput(source, safeFilename),
      text: { format: zodTextFormat(generatedRoadmapSchema, "imported_study_roadmap") },
      max_output_tokens: 30_000,
      safety_identifier: createHash("sha256").update(ctx.user.id).digest("hex"),
      store: false,
    });
    if (!response.output_parsed) throw new Error("EMPTY_STRUCTURED_OUTPUT");
    const preview = buildImportedRoadmapPlan(response.output_parsed, hojeISO("America/Bahia"), safeFilename);
    if (!preview.modules.length || !preview.modules.some((roadmapModule) => roadmapModule.steps.length)) throw new Error("EMPTY_ROADMAP");
    const readyError = await persistRoadmapDraft(ctx, generation.id, preview, response, 0);
    if (readyError) return { ok: false, error: readyError };
    reval();
    return { ok: true, generationId: generation.id, preview };
  } catch (error) {
    const message = roadmapAiError(error);
    await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", generation.id).eq("user_id", ctx.user.id);
    return { ok: false, error: message };
  }
}

type RoadmapAiContext = NonNullable<Awaited<ReturnType<typeof requireRoadmapAiUser>>>;

async function roadmapGenerationGate(ctx: RoadmapAiContext): Promise<string | null> {
  const today = hojeISO("America/Bahia");
  const tomorrow = addDays(today, 1);
  const [modulesCheck, draftsCheck, itemDetailsCheck, referenceStandardCheck, questionTypesCheck, countResult] = await Promise.all([
    ctx.supabase.from("perf_study_roadmap_module").select("id").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_generation").select("id, origin, preview_title").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, requirements, workspace").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, preparation_steps, practice_exercises, reflection_questions, completion_checklist, evidence_prompt").eq("user_id", ctx.user.id).limit(1),
    createAdminClient().from("perf_study_assessment_question").select("id, question_type, correct_order").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase
      .from("perf_study_roadmap_generation")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user.id)
      .in("status", ["generating", "ready", "accepted"])
      .gte("created_at", `${today}T00:00:00-03:00`)
      .lt("created_at", `${tomorrow}T00:00:00-03:00`),
  ]);
  if (modulesCheck.error) return "Execute a migration performance-study-modules.sql antes de gerar um novo roadmap.";
  if (draftsCheck.error) return "Execute a migration performance-roadmap-drafts.sql antes de gerar ou importar um roadmap.";
  if (itemDetailsCheck.error || questionTypesCheck.error) return "Execute a migration performance-study-question-types.sql antes de gerar ou importar um roadmap.";
  if (referenceStandardCheck.error) return "Execute a migration performance-study-reference-standard.sql antes de gerar ou importar um novo roadmap.";
  if (!ctx.isAdmin && countResult.error) return "Nao foi possivel verificar o limite diario de geracoes.";
  if (roadmapDailyLimitReached(countResult.count ?? 0, ctx.isAdmin)) return `Limite de seguranca de ${ROADMAP_AI_DAILY_LIMIT} geracoes por dia atingido.`;
  return null;
}

async function persistRoadmapDraft(
  ctx: RoadmapAiContext,
  generationId: string,
  preview: NonNullable<GenerateRoadmapResult["preview"]>,
  response: { id: string; usage?: { input_tokens?: number; output_tokens?: number } | null },
  webSearchCalls: number,
): Promise<string | null> {
  const stats = roadmapDraftStats(preview);
  const { error } = await ctx.supabase.from("perf_study_roadmap_generation").update({
    status: "ready",
    generated_plan: preview,
    preview_title: stats.title,
    preview_description: stats.description,
    module_count: stats.moduleCount,
    step_count: stats.stepCount,
    total_estimated_minutes: stats.totalEstimatedMinutes,
    provider_response_id: response.id,
    input_tokens: response.usage?.input_tokens ?? null,
    output_tokens: response.usage?.output_tokens ?? null,
    web_search_calls: webSearchCalls,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", generationId).eq("user_id", ctx.user.id);
  return error?.message ?? null;
}

function roadmapAiError(error: unknown): string {
  if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") return "A chave da OpenAI ainda nao foi configurada no servidor.";
  if (error instanceof Error && error.message === "EMPTY_IMPORT_FILE") return "O arquivo esta vazio.";
  if (error instanceof Error && error.message === "IMPORT_CONTEXT_TOO_LARGE") return `O texto util do arquivo ultrapassa ${Math.round(ROADMAP_IMPORT_AI_MAX_CHARS / 1_000_000)} milhoes de caracteres. Divida o roadmap em dois arquivos para a IA conseguir revisar tudo sem cortar conteudo.`;
  if (error instanceof Error && error.message === "EMPTY_ROADMAP") return "A IA nao encontrou conteudo suficiente para montar um roadmap.";
  if (error instanceof Error && error.message === "EMPTY_STRUCTURED_OUTPUT") return "A IA concluiu a solicitacao, mas nao devolveu um roadmap valido. Tente novamente.";
  if (error instanceof Error && error.message === "INVALID_STRUCTURED_OUTPUT") return "A IA devolveu um roadmap fora do formato esperado. Tente novamente; suas respostas continuam salvas.";
  if (error instanceof Error && error.message === "ROADMAP_OUTPUT_LIMIT") return "A IA atingiu o limite configurado mesmo com o orcamento ampliado. Tente reduzir a profundidade ou dividir o objetivo em duas trilhas.";
  if (error instanceof Error && error.message === "ROADMAP_CONTENT_FILTER") return "A resposta foi interrompida pelo filtro de seguranca da OpenAI. Revise o objetivo informado e tente novamente.";
  if (error instanceof Error && error.message === "PROVIDER_RESPONSE_CANCELLED") return "A geracao foi cancelada antes de terminar. Tente novamente.";
  if (error instanceof Error && error.message === "DRAFT_PERSIST_FAILED") return "A IA terminou o roadmap, mas o site nao conseguiu salvar o rascunho. Tente novamente.";
  if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || /timed out|timeout/i.test(error.message))) return "A geracao ultrapassou o tempo de conexao com a OpenAI. Tente novamente; suas respostas continuam salvas.";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (status === 401) return "A chave da OpenAI foi recusada. Verifique a configuracao do projeto.";
  if (status === 400 || code === "invalid_prompt") return "A OpenAI recusou o conteudo enviado. Revise o objetivo e tente novamente.";
  if (code === "insufficient_quota") return "O projeto da OpenAI esta sem saldo disponivel ou com a cobranca bloqueada.";
  if (status === 429 || code === "rate_limit_exceeded") return "A OpenAI recebeu muitas solicitacoes ao mesmo tempo. Aguarde um pouco e tente novamente.";
  if (status && status >= 500) return "A OpenAI esta temporariamente indisponivel. Tente novamente em alguns minutos.";
  if (error instanceof Error && error.message === "NO_AVAILABLE_DATES") return "Nenhum dia disponivel foi encontrado no periodo escolhido.";
  return "Nao foi possivel gerar o roadmap agora.";
}

function roadmapGenerationDiagnostic(error: unknown) {
  if (!(error instanceof Error)) return { value: String(error) };
  const details = error as Error & { status?: number; code?: string; type?: string };
  return {
    name: details.name,
    message: details.message,
    status: details.status ?? null,
    code: details.code ?? null,
    type: details.type ?? null,
  };
}

function roadmapGenerationTitle(answers: RoadmapAiAnswers): string {
  const subject = answers.roadmapType === "language" ? answers.targetLanguage : answers.subject;
  return `Roadmap de ${subject}`.trim().slice(0, 160);
}

function providerResponseError(response: OpenAIResponse): Error | null {
  if (response.status === "completed") return null;
  if (response.status === "queued" || response.status === "in_progress") return null;
  if (response.status === "incomplete") {
    return new Error(response.incomplete_details?.reason === "max_output_tokens" ? "ROADMAP_OUTPUT_LIMIT" : "ROADMAP_CONTENT_FILTER");
  }
  if (response.status === "cancelled") return new Error("PROVIDER_RESPONSE_CANCELLED");
  const error = new Error(response.error?.message || "PROVIDER_RESPONSE_FAILED") as Error & { code?: string };
  error.code = response.error?.code;
  return error;
}

function parseProviderRoadmap(response: OpenAIResponse) {
  const responseError = providerResponseError(response);
  if (responseError) throw responseError;
  if (response.status !== "completed" || !response.output_text) throw new Error("EMPTY_STRUCTURED_OUTPUT");
  let raw: unknown;
  try {
    raw = JSON.parse(response.output_text);
  } catch {
    throw new Error("INVALID_STRUCTURED_OUTPUT");
  }
  const parsed = generatedRoadmapSchema.safeParse(raw);
  if (!parsed.success) throw new Error("INVALID_STRUCTURED_OUTPUT");
  return parsed.data;
}

async function finalizeRoadmapProviderResponse(
  ctx: RoadmapAiContext,
  generationId: string,
  answers: RoadmapAiAnswers,
  response: OpenAIResponse,
): Promise<boolean> {
  if (response.status === "queued" || response.status === "in_progress") return false;
  const generated = parseProviderRoadmap(response);
  const preview = buildRoadmapPlan(generated, answers);
  if (!preview.modules.length || !preview.modules.some((roadmapModule) => roadmapModule.steps.length)) throw new Error("EMPTY_ROADMAP");
  const webSearchCalls = response.output.filter((item) => item.type === "web_search_call").length;
  const readyError = await persistRoadmapDraft(ctx, generationId, preview, response, webSearchCalls);
  if (readyError) throw new Error("DRAFT_PERSIST_FAILED");
  return true;
}

async function failRoadmapGeneration(ctx: RoadmapAiContext, generationId: string, error: unknown): Promise<void> {
  console.error("[roadmap-ai] generation failed", generationId, roadmapGenerationDiagnostic(error));
  const message = roadmapAiError(error);
  await ctx.supabase.from("perf_study_roadmap_generation").update({
    status: "failed",
    error_message: message,
    updated_at: new Date().toISOString(),
  }).eq("id", generationId).eq("user_id", ctx.user.id);
}

async function processRoadmapGeneration(
  ctx: RoadmapAiContext,
  generationId: string,
  answers: RoadmapAiAnswers,
  model: string,
  attemptId: string,
): Promise<void> {
  try {
    if (answers.roadmapType !== "language") throw new Error("IT_ROADMAPS_USE_PREDEFINED_CATALOG");
    const shouldSearchVideos = answers.learningFormats.includes("video");
    const shouldSearchExternalMaterials = answers.requiredMaterials.some((material) => ["course", "book"].includes(material));
    const shouldSearchResources = shouldSearchVideos || shouldSearchExternalMaterials;
    const response = await getOpenAIClient().responses.create({
      model,
      reasoning: { effort: openAIReasoningEffort(process.env.OPENAI_ROADMAP_REASONING_EFFORT) },
      instructions: answers.roadmapType === "language" ? languageRoadmapSystemInstructions : roadmapSystemInstructions,
      input: roadmapPromptInput(answers),
      text: { format: zodTextFormat(generatedRoadmapSchema, "study_roadmap") },
      ...(shouldSearchResources ? {
        tools: [{
          type: "web_search" as const,
          ...(!shouldSearchExternalMaterials ? { filters: { allowed_domains: ["youtube.com", "youtu.be"] } } : {}),
          search_context_size: "medium" as const,
          user_location: { type: "approximate" as const, country: "BR", timezone: "America/Bahia" },
        }],
        tool_choice: "auto" as const,
        max_tool_calls: 8,
      } : {}),
      max_output_tokens: openAIRoadmapMaxOutputTokens(process.env.OPENAI_ROADMAP_MAX_OUTPUT_TOKENS),
      safety_identifier: createHash("sha256").update(ctx.user.id).digest("hex"),
      background: true,
      store: true,
      metadata: { generation_id: generationId },
    }, {
      timeout: 60_000,
      maxRetries: 1,
      idempotencyKey: `roadmap-${generationId}-${attemptId}`,
    });
    const { error: providerIdError } = await ctx.supabase.from("perf_study_roadmap_generation").update({
      provider_response_id: response.id,
      updated_at: new Date().toISOString(),
    }).eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "generating");
    if (providerIdError) throw new Error("DRAFT_PERSIST_FAILED");
    await finalizeRoadmapProviderResponse(ctx, generationId, answers, response);
  } catch (error) {
    await failRoadmapGeneration(ctx, generationId, error);
  } finally {
    reval();
  }
}

export async function gerarRoadmapComIALifeOS(formData: FormData): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A geracao com IA ainda nao esta liberada para este usuario." };

  const roadmapType = text(formData, "roadmap_type", 20) ?? "skill";
  if (roadmapType !== "language") return { ok: false, error: "Roadmaps de TI agora usam carreiras e conteudos predefinidos. Abra Carreira em TI para criar a trilha." };
  const targetLanguage = text(formData, "target_language", 100) ?? "";
  const languageActivities = formValues(formData, "language_activities", 20);
  const availableDevices = formValues(formData, "available_devices", 5);
  const useContext = roadmapType === "language" ? "personal_learning" : text(formData, "use_context", 30) ?? "new_career";
  const parsedAnswers = roadmapAiAnswersSchema.safeParse({
    roadmapType,
    subject: roadmapType === "language" ? `Idioma ${targetLanguage}` : text(formData, "subject", 300) ?? "",
    goal: roadmapGoalFromContext(useContext),
    goalDetail: text(formData, "goal_detail", 1500) ?? "",
    currentLevel: text(formData, "current_level", 30) ?? "",
    digitalLiteracy: text(formData, "digital_literacy", 30) ?? "needs_guidance",
    availableDevices,
    mainDevice: availableDevices[0] ?? "windows",
    organizationProfileCollected: true,
    useContext,
    targetLevel: roadmapType === "language" ? "autonomous" : text(formData, "target_level", 30) ?? "autonomous",
    applicationIntent: roadmapType === "language" ? "none" : text(formData, "application_intent", 30) ?? "none",
    targetRole: roadmapType === "language" ? "" : text(formData, "target_role", 200) ?? "",
    jobDescription: roadmapType === "language" ? "" : text(formData, "job_description", 8000) ?? "",
    mainObstacle: text(formData, "main_obstacle", 30) ?? "",
    startDate: text(formData, "start_date", 10) ?? "",
    timelineMode: text(formData, "timeline_mode", 20) ?? "",
    deadline: text(formData, "deadline", 10) ?? "",
    durationWeeks: formData.get("duration_weeks"),
    durationMonths: formData.get("duration_months"),
    availableDays: formData.getAll("available_days").map(String),
    minutesPerDay: formData.get("minutes_per_day"),
    learningFormats: roadmapType === "language" ? roadmapLanguageFormats(languageActivities) : formValues(formData, "learning_formats", 10),
    contentDepth: text(formData, "content_depth", 30) ?? "",
    pace: text(formData, "pace", 30) ?? "",
    requiredMaterials: formData.getAll("required_materials").map(String),
    materialBudget: text(formData, "material_budget", 30) ?? "free_only",
    ownedMaterials: text(formData, "owned_materials", 3000) ?? "",
    finalOutcomes: [],
    assessmentPreference: text(formData, "assessment_preference", 30) ?? "",
    projectMode: text(formData, "project_mode", 30) ?? "",
    knownTopics: text(formData, "known_topics", 2000) ?? "",
    contextNotes: text(formData, "context_notes", 2000) ?? "",
    nativeLanguage: text(formData, "native_language", 100) ?? "Portugues (Brasil)",
    targetLanguage,
    languageVariant: text(formData, "language_variant", 100) ?? "",
    languageCurrentLevel: text(formData, "language_current_level", 20) ?? "unknown",
    languageTargetLevel: text(formData, "language_target_level", 20) ?? "b1",
    languagePurpose: text(formData, "language_purpose", 30) ?? "conversation",
    languageSkills: formValues(formData, "language_skills", 20),
    languageActivities,
    languageExposure: text(formData, "language_exposure", 30) ?? "none",
    languageObstacle: text(formData, "language_obstacle", 30) ?? "consistency",
    languagePracticeAccess: formValues(formData, "language_practice_access", 20),
    languageContexts: formValues(formData, "language_contexts", 20),
    languageSituations: text(formData, "language_situations", 2000) ?? "",
    languageInterests: text(formData, "language_interests", 2000) ?? "",
  });
  if (!parsedAnswers.success) return { ok: false, error: parsedAnswers.error.issues[0]?.message ?? "Revise as respostas do questionario." };
  if (!roadmapHorizon(parsedAnswers.data).availableDates.length) return { ok: false, error: "Escolha ao menos um dia disponivel dentro do periodo." };

  const gateError = await roadmapGenerationGate(ctx);
  if (gateError) return { ok: false, error: gateError };

  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  const generationTitle = roadmapGenerationTitle(parsedAnswers.data);
  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").insert({
    user_id: ctx.user.id,
    status: "generating",
    answers: parsedAnswers.data,
    origin: "ai",
    model,
    prompt_version: ROADMAP_AI_PROMPT_VERSION,
    preview_title: generationTitle,
  }).select("id").single();
  if (generationError || !generation) return { ok: false, error: generationError?.message ?? "Nao foi possivel iniciar a geracao." };

  after(() => processRoadmapGeneration(ctx, generation.id, parsedAnswers.data, model, randomUUID()));
  reval();
  return { ok: true, generationId: generation.id, queued: true, title: generationTitle };
}

export async function sincronizarGeracoesRoadmapLifeOS(): Promise<Res & { updated?: number }> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A geracao com IA ainda nao esta liberada para este usuario." };

  const { data: generations, error } = await ctx.supabase
    .from("perf_study_roadmap_generation")
    .select("id, answers, provider_response_id")
    .eq("user_id", ctx.user.id)
    .eq("origin", "ai")
    .eq("status", "generating")
    .not("provider_response_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return { ok: false, error: "Nao foi possivel consultar as geracoes em andamento." };

  let updated = 0;
  for (const generation of generations ?? []) {
    const parsedAnswers = roadmapAiAnswersSchema.safeParse(generation.answers);
    if (!parsedAnswers.success) {
      await failRoadmapGeneration(ctx, generation.id, new Error("INVALID_SAVED_ANSWERS"));
      updated += 1;
      continue;
    }
    if (parsedAnswers.data.roadmapType !== "language") {
      await failRoadmapGeneration(ctx, generation.id, new Error("IT_ROADMAPS_USE_PREDEFINED_CATALOG"));
      updated += 1;
      continue;
    }

    let response: OpenAIResponse;
    try {
      response = await getOpenAIClient().responses.retrieve(generation.provider_response_id, {}, {
        timeout: 30_000,
        maxRetries: 1,
      });
    } catch (retrieveError) {
      const status = typeof retrieveError === "object" && retrieveError && "status" in retrieveError ? Number(retrieveError.status) : null;
      if (status === 401 || status === 403 || status === 404) {
        await failRoadmapGeneration(ctx, generation.id, retrieveError);
        updated += 1;
      } else {
        console.warn("[roadmap-ai] provider status unavailable", generation.id, roadmapGenerationDiagnostic(retrieveError));
      }
      continue;
    }

    if (response.status === "queued" || response.status === "in_progress") continue;
    try {
      await finalizeRoadmapProviderResponse(ctx, generation.id, parsedAnswers.data, response);
    } catch (finalizeError) {
      await failRoadmapGeneration(ctx, generation.id, finalizeError);
    }
    updated += 1;
  }

  if (updated) reval();
  return { ok: true, updated };
}

export async function tentarNovamenteGeracaoRoadmapLifeOS(generationId: string): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Geracao invalida." };

  const { data: generation, error } = await ctx.supabase
    .from("perf_study_roadmap_generation")
    .select("id, status, origin, answers, model, preview_title")
    .eq("id", generationId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (error || !generation || generation.status !== "failed" || generation.origin !== "ai") {
    return { ok: false, error: "Esta geracao nao esta disponivel para uma nova tentativa." };
  }

  const parsedAnswers = roadmapAiAnswersSchema.safeParse(generation.answers);
  if (!parsedAnswers.success) return { ok: false, error: "As respostas salvas desta geracao nao sao mais validas." };
  if (parsedAnswers.data.roadmapType !== "language") return { ok: false, error: "Esta geracao antiga de TI foi substituida pelo catalogo de carreiras predefinidas." };
  const gateError = await roadmapGenerationGate(ctx);
  if (gateError) return { ok: false, error: gateError };

  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || generation.model || "gpt-5.6-sol";
  const { error: updateError } = await ctx.supabase.from("perf_study_roadmap_generation").update({
    status: "generating",
    model,
    prompt_version: ROADMAP_AI_PROMPT_VERSION,
    provider_response_id: null,
    input_tokens: null,
    output_tokens: null,
    web_search_calls: 0,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "failed");
  if (updateError) return { ok: false, error: "Nao foi possivel reiniciar esta geracao." };

  after(() => processRoadmapGeneration(ctx, generationId, parsedAnswers.data, model, randomUUID()));
  reval();
  return {
    ok: true,
    generationId,
    queued: true,
    title: generation.preview_title ?? roadmapGenerationTitle(parsedAnswers.data),
  };
}

export async function confirmarRoadmapGeradoLifeOS(generationId: string): Promise<Res & { id?: string }> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Geracao invalida." };

  const { data: existing } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("user_id", ctx.user.id).eq("generation_id", generationId).maybeSingle();
  if (existing?.id) {
    await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", generationId).eq("user_id", ctx.user.id);
    const activation = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, existing.id);
    if (!activation.ok) return activation;
    reval(); return { ok: true, id: existing.id };
  }

  const [itemDetailsCheck, referenceStandardCheck, questionTypesCheck] = await Promise.all([
    ctx.supabase.from("perf_study_roadmap_item").select("id, requirements, workspace").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, preparation_steps, practice_exercises, reflection_questions, completion_checklist, evidence_prompt").eq("user_id", ctx.user.id).limit(1),
    createAdminClient().from("perf_study_assessment_question").select("id, question_type, correct_order").eq("user_id", ctx.user.id).limit(1),
  ]);
  if (itemDetailsCheck.error || questionTypesCheck.error) return { ok: false, error: "Execute a migration performance-study-question-types.sql antes de salvar este roadmap." };
  if (referenceStandardCheck.error) return { ok: false, error: "Execute a migration performance-study-reference-standard.sql antes de salvar este roadmap." };

  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").select("id, status, generated_plan, origin, answers").eq("id", generationId).eq("user_id", ctx.user.id).maybeSingle();
  if (generationError || !generation || generation.status !== "ready") return { ok: false, error: "A previa nao esta disponivel para confirmacao." };
  if (!isLanguageRoadmapGeneration(generation.origin, generation.answers)) return { ok: false, error: "Somente roadmaps de idioma podem ser confirmados por este fluxo. Para TI, crie uma trilha pela opcao Carreira em TI." };
  const parsedPlan = roadmapGenerationPlanSchema.safeParse(generation.generated_plan);
  if (!parsedPlan.success) return { ok: false, error: "O roadmap gerado nao passou na validacao." };
  const plan = parsedPlan.data;
  const missingVideo = plan.modules.flatMap((module) => module.steps).find((step) => step.type === "video" && !step.resourceUrl);
  if (missingVideo) return { ok: false, error: `A etapa “${missingVideo.title}” está rotulada como Videoaula, mas não possui link direto. Reclassifique-a como atividade audiovisual ou gere um recurso válido.` };

  const roadmapPayload = {
    user_id: ctx.user.id,
    title: plan.title,
    description: plan.description,
    status: "archived",
    source: generation.origin === "import" ? "import" : "ai",
    generation_id: generationId,
    start_date: plan.startDate,
    target_date: plan.targetDate,
    difficulty_level: plan.difficultyLevel,
    quality_score: plan.qualityScore,
    workload_score: plan.workloadScore,
    total_estimated_minutes: plan.totalEstimatedMinutes,
  };
  let { data: created, error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({
    ...roadmapPayload,
    roadmap_kind: "language",
  }).select("id").single();
  if (roadmapError && /roadmap_kind/i.test(roadmapError.message ?? "")) {
    ({ data: created, error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert(roadmapPayload).select("id").single());
  }
  if (roadmapError || !created) return { ok: false, error: roadmapError?.message ?? "Nao foi possivel criar o roadmap." };

  let orderIndex = 0;
  for (let moduleIndex = 0; moduleIndex < plan.modules.length; moduleIndex += 1) {
    const roadmapModule = plan.modules[moduleIndex];
    const { data: createdModule, error: moduleError } = await ctx.supabase.from("perf_study_roadmap_module").insert({
      user_id: ctx.user.id,
      roadmap_id: created.id,
      title: roadmapModule.title,
      objective: roadmapModule.objective,
      success_criteria: roadmapModule.successCriteria,
      topics: roadmapModule.topics,
      order_index: moduleIndex,
      estimated_minutes: roadmapModule.estimatedMinutes,
    }).select("id").single();
    if (moduleError || !createdModule) {
      await ctx.supabase.from("perf_study_roadmap").delete().eq("id", created.id).eq("user_id", ctx.user.id);
      return { ok: false, error: moduleError?.message ?? "Nao foi possivel salvar os modulos." };
    }

    const stepsWithOrder = roadmapModule.steps.map((step) => ({ step, order: orderIndex++ }));
    const { data: createdItems, error: itemError } = await ctx.supabase.from("perf_study_roadmap_item").insert(stepsWithOrder.map(({ step, order }) => ({
      user_id: ctx.user.id,
      roadmap_id: created.id,
      module_id: createdModule.id,
      section: roadmapModule.title,
      title: step.title,
      description: step.description,
      requirements: step.requirements || null,
      workspace: step.workspace || null,
      preparation_steps: step.preparationSteps,
      instructions: step.instructions,
      practice_exercises: step.practiceExercises,
      reflection_questions: [],
      completion_checklist: step.completionChecklist,
      evidence_prompt: step.evidence || null,
      completion_criteria: step.completionCriteria,
      order_index: order,
      estimated_minutes: step.estimatedMinutes,
      scheduled_date: null,
      item_kind: step.type,
      resource_title: step.resourceTitle,
      resource_url: step.resourceUrl,
      resource_channel: step.resourceChannel,
    }))).select("id, order_index");
    if (itemError || !createdItems) {
      await ctx.supabase.from("perf_study_roadmap").delete().eq("id", created.id).eq("user_id", ctx.user.id);
      return { ok: false, error: itemError?.message ?? "Nao foi possivel salvar as etapas." };
    }

    const itemIdByOrder = new Map(createdItems.map((item) => [Number(item.order_index), item.id]));
    const questionRows = stepsWithOrder.flatMap(({ step, order }) => {
      const itemId = itemIdByOrder.get(order);
      if (!itemId) return [];
      return step.questions.map((question, questionIndex) => ({
        user_id: ctx.user.id,
        item_id: itemId,
        question_type: question.questionType,
        prompt: question.prompt,
        options: question.options,
        correct_option: question.correctOptionIndex,
        correct_order: question.correctOrder,
        explanation: question.explanation,
        order_index: questionIndex,
      }));
    });
    if (questionRows.length) {
      const { error: questionError } = await createAdminClient().from("perf_study_assessment_question").insert(questionRows);
      if (questionError) {
        await ctx.supabase.from("perf_study_roadmap").delete().eq("id", created.id).eq("user_id", ctx.user.id);
        return { ok: false, error: questionError.message };
      }
    }
  }

  const activation = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, created.id);
  if (!activation.ok) {
    await ctx.supabase.from("perf_study_roadmap").delete().eq("id", created.id).eq("user_id", ctx.user.id);
    return activation;
  }
  await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", generationId).eq("user_id", ctx.user.id);
  reval(); return { ok: true, id: created.id };
}

export async function obterRascunhoRoadmapLifeOS(generationId: string): Promise<{ ok: boolean; error?: string; draft?: RoadmapDraftDetail }> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Rascunho invalido." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap_generation").select(
    "id, status, origin, original_filename, answers, generated_plan, preview_title, preview_description, module_count, step_count, total_estimated_minutes, created_at",
  ).eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "ready").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Rascunho nao encontrado." };
  const parsedPlan = roadmapGenerationPlanSchema.safeParse(data.generated_plan);
  if (!parsedPlan.success) return { ok: false, error: "O arquivo salvo deste rascunho esta invalido." };
  const stats = roadmapDraftStats(parsedPlan.data);
  const parsedAnswers = data.origin === "ai" ? roadmapAiAnswersSchema.safeParse(data.answers) : null;
  return {
    ok: true,
    draft: {
      generationId: data.id,
      origin: data.origin === "import" ? "import" : "ai",
      originalFilename: data.original_filename ?? null,
      title: data.preview_title ?? stats.title,
      description: data.preview_description ?? stats.description,
      moduleCount: Number(data.module_count ?? stats.moduleCount),
      stepCount: Number(data.step_count ?? stats.stepCount),
      totalEstimatedMinutes: Number(data.total_estimated_minutes ?? stats.totalEstimatedMinutes),
      createdAt: data.created_at,
      plan: parsedPlan.data,
      answers: parsedAnswers?.success ? parsedAnswers.data : null,
    },
  };
}

export async function renomearRascunhoRoadmapLifeOS(generationId: string, value: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  const title = normalizedRoadmapTitle(value);
  if (!ctx || !generationId) return { ok: false, error: "Rascunho invalido." };
  if (!title) return { ok: false, error: "Informe um nome com pelo menos 3 caracteres." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap_generation").select("id, generated_plan").eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "ready").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Rascunho nao encontrado." };
  const parsedPlan = roadmapGenerationPlanSchema.safeParse(data.generated_plan);
  if (!parsedPlan.success) return { ok: false, error: "O arquivo salvo deste rascunho esta invalido." };
  const generatedPlan = roadmapGenerationPlanSchema.parse({ ...parsedPlan.data, title });
  const { data: updated, error: updateError } = await ctx.supabase.from("perf_study_roadmap_generation").update({ preview_title: title, generated_plan: generatedPlan, updated_at: new Date().toISOString() }).eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "ready").select("id").maybeSingle();
  if (updateError || !updated) return { ok: false, error: updateError?.message ?? "Rascunho nao encontrado." };
  reval();
  return { ok: true };
}

export async function removerRascunhoRoadmapLifeOS(generationId: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Rascunho invalido." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_generation").delete().eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "ready");
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function dispensarFalhaGeracaoRoadmapLifeOS(generationId: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Geracao invalida." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_generation").delete().eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "failed");
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function enviarAvaliacaoEstudoLifeOS(itemId: string, submittedAnswers: Record<string, SubmittedStudyAnswer>): Promise<{
  ok: boolean;
  error?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  masteryReached?: boolean;
  feedback?: Array<{ questionId: string; questionType: "multiple_choice" | "ordering"; correct: boolean }>;
}> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  const privileged = createAdminClient();
  if (!submittedAnswers || typeof submittedAnswers !== "object" || Object.keys(submittedAnswers).length > 20) return { ok: false, error: "Respostas invalidas." };

  type AssessmentItemLookup = { id: string; roadmap_id: string | null; module_id: string | null; scheduled_date: string | null; order_index: number; content_role: string | null };
  const itemLookup = await ctx.supabase.from("perf_study_roadmap_item")
    .select("id, roadmap_id, module_id, scheduled_date, order_index, content_role")
    .eq("id", itemId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  let item = itemLookup.data as AssessmentItemLookup | null;
  if (itemLookup.error) {
    const legacyLookup = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
    if (legacyLookup.error) return { ok: false, error: legacyLookup.error.message };
    item = legacyLookup.data ? { id: legacyLookup.data.id, roadmap_id: null, module_id: null, scheduled_date: null, order_index: 0, content_role: null } : null;
  }
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  if (item.content_role === "assessment") {
    const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
    if (moduleGateError) return { ok: false, error: moduleGateError };
  }
  if (item.content_role === "assessment" && typeof item.scheduled_date === "string") {
    const scheduledDate = item.scheduled_date;
    const today = hojeISO("America/Bahia");
    if (scheduledDate > today) return { ok: false, error: `Este bloco de perguntas fica disponivel em ${scheduledDate}.` };
    const { data: earlierPendingProject, error: projectSequenceError } = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("roadmap_id", item.roadmap_id)
      .in("content_role", ["module_project", "capstone"])
      .lt("order_index", item.order_index)
      .neq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (projectSequenceError) return { ok: false, error: projectSequenceError.message };
    if (earlierPendingProject) return { ok: false, error: "Conclua primeiro o desafio anterior deste roadmap." };
    const { data: earlierPendingQuiz, error: sequenceError } = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("roadmap_id", item.roadmap_id)
      .eq("content_role", "assessment")
      .not("scheduled_date", "is", null)
      .lt("order_index", item.order_index)
      .neq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (sequenceError) return { ok: false, error: sequenceError.message };
    if (earlierPendingQuiz) return { ok: false, error: "Conclua primeiro o bloco de perguntas anterior deste roadmap." };
  }
  let questionsResult = await privileged.from("perf_study_assessment_question").select("id, question_type, options, correct_option, correct_order").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
  if (questionsResult.error) {
    const legacyResult = await privileged.from("perf_study_assessment_question").select("id, options, correct_option").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
    if (legacyResult.error) return { ok: false, error: legacyResult.error.message };
    questionsResult = {
      ...legacyResult,
      data: (legacyResult.data ?? []).map((question) => ({ ...question, question_type: "multiple_choice", correct_order: [] })),
    };
  }
  const questions = questionsResult.data ?? [];
  if (!questions?.length) return { ok: false, error: "Esta etapa nao possui perguntas." };

  for (const question of questions) {
    const answer = submittedAnswers[question.id];
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    const questionType: "multiple_choice" | "ordering" = question.question_type === "ordering" ? "ordering" : "multiple_choice";
    if (!validStudyAnswer(answer, { questionType, optionCount })) return { ok: false, error: questionType === "ordering" ? "Ordene todas as opcoes antes de enviar." : "Responda todas as perguntas antes de enviar." };
  }

  const feedback = questions.map((question) => {
    const questionType: "multiple_choice" | "ordering" = question.question_type === "ordering" ? "ordering" : "multiple_choice";
    const correctOrder = Array.isArray(question.correct_order)
      ? question.correct_order.map(Number).filter(Number.isInteger)
      : [];
    const answer = submittedAnswers[question.id];
    const gradableQuestion = {
      questionType,
      optionCount: Array.isArray(question.options) ? question.options.length : 0,
      correctOptionIndex: questionType === "multiple_choice" ? Number(question.correct_option) : null,
      correctOrder: questionType === "ordering" ? correctOrder : [],
    };
    return {
      questionId: question.id,
      questionType,
      correct: isStudyAnswerCorrect(answer, gradableQuestion),
    };
  });
  const correctCount = feedback.filter((entry) => entry.correct).length;
  const totalCount = questions.length;
  const score = Math.round((correctCount / totalCount) * 10_000) / 100;
  const masteryReached = score >= 70;
  const { error: attemptError } = await ctx.supabase.rpc("perf_submit_study_attempt", { p_item_id: itemId, p_answers: submittedAnswers });
  if (attemptError) return { ok: false, error: attemptError.message.includes("Could not find") ? "Aplique a migration performance-scheduling-study-progress.sql antes de enviar a avaliação." : attemptError.message };

  reval();
  return { ok: true, score, correctCount, totalCount, masteryReached, feedback };
}

export async function reiniciarAvaliacaoEstudoLifeOS(itemId: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  // Uma nova tentativa nao apaga o historico nem revoga uma conclusao valida.
  return { ok: true };
}

export async function criarAporteLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const amount = number(formData, "amount"); const date = text(formData, "date", 10);
  if (amount == null || amount <= 0 || !date) return { ok: false, error: "Informe valor e data validos." };
  const { error } = await ctx.supabase.from("perf_investment_contribution").insert({ user_id: ctx.user.id, amount, date, institution: text(formData, "institution"), notes: text(formData, "notes", 1000), source: "manual" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarAporteLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Aporte invalido." };
  const amount = number(formData, "amount"); const date = text(formData, "date", 10);
  if (amount == null || amount <= 0 || !date) return { ok: false, error: "Informe valor e data validos." };
  const { error } = await ctx.supabase.from("perf_investment_contribution").update({ amount, date, institution: text(formData, "institution"), notes: text(formData, "notes", 1000), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerAporteLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Aporte invalido." };
  const { error } = await ctx.supabase.from("perf_investment_contribution").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function criarMetaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const name = text(formData, "name"); const target = number(formData, "target_value");
  if (!name || target == null) return { ok: false, error: "Nome e valor-alvo são obrigatórios." };
  const initial = number(formData, "initial_value") ?? 0;
  const { error } = await ctx.supabase.from("perf_goal").insert({ user_id: ctx.user.id, name, description: text(formData, "description", 1000), area: text(formData, "area", 30) ?? "pessoal", goal_type: text(formData, "goal_type", 30) ?? "quantity", initial_value: initial, current_value: initial, target_value: target, unit: text(formData, "unit", 30) ?? "unidade", start_date: text(formData, "start_date", 10) ?? hojeISO(), deadline: text(formData, "deadline", 10), priority: number(formData, "priority") ?? 2 });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function atualizarValorMetaLifeOS(id: string, currentValue: number): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id || !Number.isFinite(currentValue)) return { ok: false, error: "Dados inválidos." };
  const { error } = await ctx.supabase.from("perf_goal").update({ current_value: currentValue, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerMetaLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Meta inválida." };
  const { error } = await ctx.supabase.from("perf_goal").update({ active: false, status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function salvarCarteiraLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const date = text(formData, "date", 10) ?? hojeISO(); const total = number(formData, "total_value");
  if (total == null || total < 0) return { ok: false, error: "Informe um valor válido para a carteira." };
  const { data: previous } = await ctx.supabase.from("perf_portfolio_snapshot").select("total_value").eq("user_id", ctx.user.id).lt("date", date).order("date", { ascending: false }).limit(1).maybeSingle();
  const variation = portfolioVariation(total, previous ? Number(previous.total_value) : null);
  const { error } = await ctx.supabase.from("perf_portfolio_snapshot").upsert({ user_id: ctx.user.id, date, total_value: total, previous_value: previous ? Number(previous.total_value) : null, variation_amount: variation.amount, variation_percentage: variation.percent, movement: variation.movement, notes: text(formData, "notes", 1000), updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function salvarRetiradaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const amount = number(formData, "amount"); if (amount == null || amount <= 0) return { ok: false, error: "Informe um valor positivo." };
  const { error } = await ctx.supabase.from("perf_investment_withdrawal").insert({ user_id: ctx.user.id, date: text(formData, "date", 10) ?? hojeISO(), amount, institution: text(formData, "institution"), notes: text(formData, "notes", 1000) });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function salvarRevisaoLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const type = text(formData, "type", 20) ?? "weekly"; const start = text(formData, "period_start", 10); const end = text(formData, "period_end", 10);
  if (!start || !end || end < start) return { ok: false, error: "Período de revisão inválido." };
  const rating = number(formData, "rating");
  if (rating != null && (!Number.isInteger(rating) || rating < 0 || rating > 10)) return { ok: false, error: "A nota deve ficar entre 0 e 10." };
  const { error } = await ctx.supabase.from("perf_review").upsert({ user_id: ctx.user.id, type, period_start: start, period_end: end, rating, progress: text(formData, "progress", 2000), failures: text(formData, "failures", 2000), main_error: text(formData, "main_error", 1000), risk: text(formData, "risk", 1000), neglected_area: text(formData, "neglected_area"), adjustment: text(formData, "adjustment", 2000), priority: text(formData, "priority", 1000), status: "complete", updated_at: new Date().toISOString() }, { onConflict: "user_id,type,period_start" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function salvarFeedbackInsightLifeOS(id: string, feedback: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id || !["useful", "not_useful", "incorrect", "applied", "ignored"].includes(feedback)) return { ok: false, error: "Feedback inválido." };
  const { error } = await ctx.supabase.from("perf_ai_insight").update({ feedback, status: feedback === "applied" ? "applied" : "reviewed" }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function gerarInsightLifeOS(): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  try {
    const { data: performanceProfile, error: profileError } = await ctx.supabase
      .from("perf_profile")
      .select("timezone")
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    if (profileError) return { ok: false, error: profileError.message };
    await generateDailyLifeAnalysis({ supabase: ctx.supabase, userId: ctx.user.id, timezone: performanceProfile?.timezone ?? "America/Bahia", force: true });
    reval();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel gerar a analise diaria." };
  }
}
