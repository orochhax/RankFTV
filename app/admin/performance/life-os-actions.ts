"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { zodTextFormat } from "openai/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { addDays, hojeISO } from "@/lib/performance";
import { portfolioVariation } from "@/lib/performance-life-os";
import { getOpenAIClient } from "@/lib/openai";
import { generateDailyLifeAnalysis } from "@/lib/daily-life-analysis-service";
import { isStudyAnswerCorrect, validStudyAnswer, type SubmittedStudyAnswer } from "@/lib/study-assessment";
import {
  ROADMAP_IMPORT_MAX_BYTES,
} from "@/lib/performance-analytics";
import {
  buildImportedRoadmapPlan,
  buildRoadmapPlan,
  generatedRoadmapSchema,
  ROADMAP_AI_DAILY_LIMIT,
  ROADMAP_AI_PROMPT_VERSION,
  ROADMAP_IMPORT_AI_MAX_CHARS,
  ROADMAP_IMPORT_PROMPT_VERSION,
  prepareRoadmapImportSource,
  roadmapAiAnswersSchema,
  roadmapDraftStats,
  roadmapGenerationPlanSchema,
  roadmapHorizon,
  roadmapImportPromptInput,
  roadmapImportSystemInstructions,
  roadmapPromptInput,
  roadmapSystemInstructions,
  type GenerateRoadmapResult,
  type RoadmapDraftDetail,
} from "@/lib/study-roadmap-ai";

type Res = { ok: boolean; error?: string };

async function requireCeo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return { supabase, user };
}

async function requireRoadmapAiUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const enabledIds = new Set((process.env.ROADMAP_AI_ENABLED_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  if (!enabledIds.has("*") && !enabledIds.has(user.id)) return null;
  return { supabase, user };
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
  const start = new Date(startAt); const end = new Date(endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return { ok: false, error: "O fim precisa ser depois do início." };
  const status = text(formData, "status", 30) ?? "planned";
  if (!["planned", "in_progress", "completed", "cancelled"].includes(status)) return { ok: false, error: "Status inválido." };
  const { error } = await ctx.supabase.from("perf_event").insert({
    user_id: ctx.user.id, title, description: text(formData, "description", 2000), start_at: start.toISOString(), end_at: end.toISOString(),
    all_day: formData.get("all_day") === "on", status, source: "manual", location: text(formData, "location"), link: text(formData, "link", 500),
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
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return { ok: false, error: "O fim precisa ser depois do inicio." };
  }
  const { error } = await ctx.supabase.from("perf_event").update({
    title,
    description: text(formData, "description", 2000),
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    location: text(formData, "location"),
    link: text(formData, "link", 500),
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

export async function criarTreinoAcademiaLifeOS(formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title", 160); const date = text(formData, "date", 10); const duration = number(formData, "duration_minutes");
  if (!title || !date) return { ok: false, error: "Nome e data sao obrigatorios." };
  if (duration != null && (!Number.isInteger(duration) || duration <= 0)) return { ok: false, error: "Duracao invalida." };
  const muscleGroups = formData.getAll("muscle_groups").map(String).filter((value) => ACADEMY_MUSCLES.has(value));
  if (!muscleGroups.length) return { ok: false, error: "Selecione pelo menos um grupo muscular." };
  const { error } = await ctx.supabase.from("perf_activity").insert({ user_id: ctx.user.id, title, date, area: "academia", type: text(formData, "type", 50), duration_minutes: duration, status: "completed", notes: text(formData, "notes", 2000), metadata: { muscle_groups: muscleGroups } });
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

export async function ativarRoadmapEstudosLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  const result = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, id);
  if (result.ok) reval();
  return result;
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
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function removerItemEstudoLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Materia invalida." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

const STUDY_ITEM_KINDS = new Set(["core", "reinforcement", "challenge", "check", "criterion", "general", "reading", "video", "practice", "quiz", "project", "checkpoint"]);

export async function importarRoadmapEstudosLifeOS(payload: string, filename = "roadmap.md"): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A importacao com IA ainda nao esta liberada para este usuario." };
  if (Buffer.byteLength(payload, "utf8") > ROADMAP_IMPORT_MAX_BYTES) return { ok: false, error: "O arquivo excede o limite de 5 MB." };

  const safeFilename = filename.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 180) || "roadmap.md";
  if (!/\.(md|markdown|txt|json)$/i.test(safeFilename)) return { ok: false, error: "Use um arquivo Markdown, TXT ou JSON." };
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
    answers: { source: "import", filename: safeFilename, characterCount: source.length },
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
      reasoning: { effort: "medium" },
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
  const [modulesCheck, draftsCheck, itemDetailsCheck, questionTypesCheck, countResult] = await Promise.all([
    ctx.supabase.from("perf_study_roadmap_module").select("id").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_generation").select("id, origin, preview_title").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, requirements, workspace").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_assessment_question").select("id, question_type, correct_order").eq("user_id", ctx.user.id).limit(1),
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
  if (countResult.error) return "Nao foi possivel verificar o limite diario de geracoes.";
  if ((countResult.count ?? 0) >= ROADMAP_AI_DAILY_LIMIT) return `Limite de ${ROADMAP_AI_DAILY_LIMIT} geracoes por dia atingido.`;
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
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  if (status === 401) return "A chave da OpenAI foi recusada. Verifique a configuracao do projeto.";
  if (status === 400) return "A OpenAI recusou o conteudo. Verifique o formato ou reduza o tamanho do arquivo.";
  if (status === 429) return "A OpenAI atingiu o limite de uso. Aguarde um pouco ou verifique seus creditos.";
  if (status && status >= 500) return "A OpenAI esta temporariamente indisponivel. Tente novamente em alguns minutos.";
  if (error instanceof Error && error.message === "NO_AVAILABLE_DATES") return "Nenhum dia disponivel foi encontrado no periodo escolhido.";
  return "Nao foi possivel gerar o roadmap agora.";
}

export async function gerarRoadmapComIALifeOS(formData: FormData): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A geracao com IA ainda nao esta liberada para este usuario." };

  const parsedAnswers = roadmapAiAnswersSchema.safeParse({
    subject: text(formData, "subject", 300) ?? "",
    goal: text(formData, "goal", 30) ?? "",
    goalDetail: text(formData, "goal_detail", 1500) ?? "",
    currentLevel: text(formData, "current_level", 30) ?? "",
    useContext: text(formData, "use_context", 30) ?? "",
    targetLevel: text(formData, "target_level", 30) ?? "",
    mainObstacle: text(formData, "main_obstacle", 30) ?? "",
    startDate: text(formData, "start_date", 10) ?? "",
    timelineMode: text(formData, "timeline_mode", 20) ?? "",
    deadline: text(formData, "deadline", 10) ?? "",
    durationWeeks: formData.get("duration_weeks"),
    availableDays: formData.getAll("available_days").map(String),
    minutesPerDay: formData.get("minutes_per_day"),
    learningFormats: formData.getAll("learning_formats").map(String),
    contentDepth: text(formData, "content_depth", 30) ?? "",
    pace: text(formData, "pace", 30) ?? "",
    requiredMaterials: formData.getAll("required_materials").map(String),
    finalOutcomes: formData.getAll("final_outcomes").map(String),
    assessmentPreference: text(formData, "assessment_preference", 30) ?? "",
    projectMode: text(formData, "project_mode", 30) ?? "",
    knownTopics: text(formData, "known_topics", 2000) ?? "",
    contextNotes: text(formData, "context_notes", 2000) ?? "",
  });
  if (!parsedAnswers.success) return { ok: false, error: parsedAnswers.error.issues[0]?.message ?? "Revise as respostas do questionario." };
  if (!roadmapHorizon(parsedAnswers.data).availableDates.length) return { ok: false, error: "Escolha ao menos um dia disponivel dentro do periodo." };

  const gateError = await roadmapGenerationGate(ctx);
  if (gateError) return { ok: false, error: gateError };

  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").insert({
    user_id: ctx.user.id,
    status: "generating",
    answers: parsedAnswers.data,
    origin: "ai",
    model,
    prompt_version: ROADMAP_AI_PROMPT_VERSION,
  }).select("id").single();
  if (generationError || !generation) return { ok: false, error: generationError?.message ?? "Nao foi possivel iniciar a geracao." };

  try {
    const shouldSearchVideos = parsedAnswers.data.learningFormats.includes("video");
    const response = await getOpenAIClient().responses.parse({
      model,
      reasoning: { effort: "medium" },
      instructions: roadmapSystemInstructions,
      input: roadmapPromptInput(parsedAnswers.data),
      text: { format: zodTextFormat(generatedRoadmapSchema, "study_roadmap") },
      ...(shouldSearchVideos ? {
        tools: [{
          type: "web_search" as const,
          filters: { allowed_domains: ["youtube.com", "youtu.be"] },
          search_context_size: "medium" as const,
          user_location: { type: "approximate" as const, country: "BR", timezone: "America/Bahia" },
        }],
        tool_choice: "auto" as const,
        max_tool_calls: 8,
      } : {}),
      max_output_tokens: 30_000,
      safety_identifier: createHash("sha256").update(ctx.user.id).digest("hex"),
      store: false,
    });
    if (!response.output_parsed) throw new Error("EMPTY_STRUCTURED_OUTPUT");
    const preview = buildRoadmapPlan(response.output_parsed, parsedAnswers.data);
    if (!preview.modules.length || !preview.modules.some((roadmapModule) => roadmapModule.steps.length)) throw new Error("EMPTY_ROADMAP");
    const webSearchCalls = response.output.filter((item) => item.type === "web_search_call").length;
    const readyError = await persistRoadmapDraft(ctx, generation.id, preview, response, webSearchCalls);
    if (readyError) return { ok: false, error: readyError };
    reval();
    return { ok: true, generationId: generation.id, preview };
  } catch (error) {
    const message = roadmapAiError(error);
    await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", generation.id).eq("user_id", ctx.user.id);
    return { ok: false, error: message };
  }
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

  const [itemDetailsCheck, questionTypesCheck] = await Promise.all([
    ctx.supabase.from("perf_study_roadmap_item").select("id, requirements, workspace").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_assessment_question").select("id, question_type, correct_order").eq("user_id", ctx.user.id).limit(1),
  ]);
  if (itemDetailsCheck.error || questionTypesCheck.error) return { ok: false, error: "Execute a migration performance-study-question-types.sql antes de salvar este roadmap." };

  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").select("id, status, generated_plan, origin").eq("id", generationId).eq("user_id", ctx.user.id).maybeSingle();
  if (generationError || !generation || generation.status !== "ready") return { ok: false, error: "A previa nao esta disponivel para confirmacao." };
  const parsedPlan = roadmapGenerationPlanSchema.safeParse(generation.generated_plan);
  if (!parsedPlan.success) return { ok: false, error: "O roadmap gerado nao passou na validacao." };
  const plan = parsedPlan.data;

  const { data: created, error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({
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
  }).select("id").single();
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
      instructions: step.instructions,
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
      const { error: questionError } = await ctx.supabase.from("perf_study_assessment_question").insert(questionRows);
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

export async function removerRascunhoRoadmapLifeOS(generationId: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx || !generationId) return { ok: false, error: "Rascunho invalido." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_generation").delete().eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "ready");
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
  passed?: boolean;
  feedback?: Array<{ questionId: string; questionType: "multiple_choice" | "ordering"; correct: boolean; correctOptionIndex: number | null; correctOrder: number[]; explanation: string }>;
}> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  if (!submittedAnswers || typeof submittedAnswers !== "object" || Object.keys(submittedAnswers).length > 20) return { ok: false, error: "Respostas invalidas." };

  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  let questionsResult = await ctx.supabase.from("perf_study_assessment_question").select("id, question_type, options, correct_option, correct_order, explanation").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
  if (questionsResult.error) {
    const legacyResult = await ctx.supabase.from("perf_study_assessment_question").select("id, options, correct_option, explanation").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
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
      correctOptionIndex: gradableQuestion.correctOptionIndex,
      correctOrder: gradableQuestion.correctOrder,
      explanation: String(question.explanation),
    };
  });
  const correctCount = feedback.filter((entry) => entry.correct).length;
  const totalCount = questions.length;
  const score = Math.round((correctCount / totalCount) * 10_000) / 100;
  const passed = score >= 70;
  const { error: attemptError } = await ctx.supabase.from("perf_study_assessment_attempt").insert({
    user_id: ctx.user.id,
    item_id: itemId,
    answers: submittedAnswers,
    correct_count: correctCount,
    total_count: totalCount,
    score,
  });
  if (attemptError) return { ok: false, error: attemptError.message };

  const { error: itemError } = await ctx.supabase.from("perf_study_roadmap_item").update({
    status: passed ? "completed" : "in_progress",
    completed_at: passed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", itemId).eq("user_id", ctx.user.id);
  if (itemError) return { ok: false, error: itemError.message };
  reval();
  return { ok: true, score, correctCount, totalCount, passed, feedback };
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
    await generateDailyLifeAnalysis({ supabase: ctx.supabase, userId: ctx.user.id, timezone: "America/Bahia", force: true });
    reval();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel gerar a analise diaria." };
  }
}
