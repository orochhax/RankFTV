"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { zodTextFormat } from "openai/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { addDays, hojeISO } from "@/lib/performance";
import { buildDeterministicInsights, portfolioVariation, type LifeEvent, type LifeGoal } from "@/lib/performance-life-os";
import type { Habit, HabitLog } from "@/lib/performance";
import { getOpenAIClient } from "@/lib/openai";
import {
  parseStudyRoadmapMarkdown,
  ROADMAP_IMPORT_MAX_BYTES,
  ROADMAP_IMPORT_MAX_ITEMS,
  type ParsedRoadmap,
} from "@/lib/performance-analytics";
import {
  buildRoadmapPlan,
  generatedRoadmapSchema,
  ROADMAP_AI_DAILY_LIMIT,
  ROADMAP_AI_PROMPT_VERSION,
  roadmapAiAnswersSchema,
  roadmapGenerationPlanSchema,
  roadmapHorizon,
  roadmapPromptInput,
  roadmapSystemInstructions,
  type GenerateRoadmapResult,
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
  const { data, error } = await ctx.supabase.from("perf_study_roadmap").insert({ user_id: ctx.user.id, title, description: text(formData, "description", 2000), status: "active", source: "manual", start_date: text(formData, "start_date", 10) ?? hojeISO(), target_date: text(formData, "target_date", 10) }).select("id").single();
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true, id: data.id };
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

export async function importarRoadmapEstudosLifeOS(payload: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  if (Buffer.byteLength(payload, "utf8") > ROADMAP_IMPORT_MAX_BYTES) {
    return { ok: false, error: "O arquivo excede o limite de 5 MB." };
  }
  let parsed: ParsedRoadmap;
  if (payload.trimStart().startsWith("{")) {
    let json: { title?: unknown; description?: unknown; sections?: unknown };
    try { json = JSON.parse(payload) as typeof json; } catch { return { ok: false, error: "JSON invalido." }; }
    if (typeof json.title !== "string" || !json.title.trim() || !Array.isArray(json.sections)) return { ok: false, error: "Formato de roadmap invalido." };
    const items: ParsedRoadmap["items"] = [];
    json.sections.forEach((section) => {
      if (!section || typeof section !== "object") return;
      const value = section as { title?: unknown; items?: unknown };
      if (!Array.isArray(value.items)) return;
      value.items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const entry = item as { title?: unknown; description?: unknown; instructions?: unknown; completionCriteria?: unknown; resourceTitle?: unknown; resourceUrl?: unknown; resourceChannel?: unknown; scheduledDate?: unknown; estimatedMinutes?: unknown; itemKind?: unknown };
        if (typeof entry.title === "string" && entry.title.trim()) {
          const estimatedMinutes = typeof entry.estimatedMinutes === "number" && Number.isFinite(entry.estimatedMinutes) && entry.estimatedMinutes > 0
            ? Math.min(1440, Math.round(entry.estimatedMinutes))
            : null;
          items.push({
            section: typeof value.title === "string" ? value.title : "Geral",
            title: entry.title.trim(),
            description: typeof entry.description === "string" ? entry.description : null,
            instructions: typeof entry.instructions === "string" ? entry.instructions : null,
            completionCriteria: typeof entry.completionCriteria === "string" ? entry.completionCriteria : null,
            resourceTitle: typeof entry.resourceTitle === "string" ? entry.resourceTitle : null,
            resourceUrl: typeof entry.resourceUrl === "string" ? entry.resourceUrl : null,
            resourceChannel: typeof entry.resourceChannel === "string" ? entry.resourceChannel : null,
            scheduledDate: typeof entry.scheduledDate === "string" ? entry.scheduledDate : null,
            estimatedMinutes,
            itemKind: typeof entry.itemKind === "string" && STUDY_ITEM_KINDS.has(entry.itemKind) ? entry.itemKind as ParsedRoadmap["items"][number]["itemKind"] : "general",
            orderIndex: items.length,
          });
        }
      });
    });
    parsed = { title: json.title.trim(), description: typeof json.description === "string" ? json.description : null, items };
  } else parsed = parseStudyRoadmapMarkdown(payload);
  if (!parsed.items.length) return { ok: false, error: "Nenhuma atividade com checkbox foi encontrada no arquivo." };
  if (parsed.items.length > ROADMAP_IMPORT_MAX_ITEMS) {
    return { ok: false, error: `O roadmap tem ${parsed.items.length} atividades. O limite por importacao e ${ROADMAP_IMPORT_MAX_ITEMS}.` };
  }

  const firstDate = parsed.items.map((item) => item.scheduledDate).filter((value): value is string => Boolean(value)).sort()[0] ?? hojeISO();
  const { data: created, error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({ user_id: ctx.user.id, title: parsed.title.slice(0, 160), description: parsed.description?.slice(0, 2000) ?? null, status: "active", source: "import", start_date: firstDate }).select("id").single();
  if (roadmapError || !created) return { ok: false, error: roadmapError?.message ?? "Nao foi possivel criar o roadmap." };
  const rows = parsed.items.map((item) => ({ user_id: ctx.user.id, roadmap_id: created.id, section: item.section.slice(0, 160), title: item.title.slice(0, 500), description: item.description?.slice(0, 2000) ?? null, instructions: item.instructions?.slice(0, 5000) ?? null, completion_criteria: item.completionCriteria?.slice(0, 1500) ?? null, resource_title: item.resourceTitle?.slice(0, 500) ?? null, resource_url: item.resourceUrl?.slice(0, 1000) ?? null, resource_channel: item.resourceChannel?.slice(0, 300) ?? null, order_index: item.orderIndex, estimated_minutes: item.estimatedMinutes ?? null, scheduled_date: item.scheduledDate, item_kind: item.itemKind }));
  for (let start = 0; start < rows.length; start += 500) {
    const { error: itemError } = await ctx.supabase.from("perf_study_roadmap_item").insert(rows.slice(start, start + 500));
    if (itemError) {
      await ctx.supabase.from("perf_study_roadmap").delete().eq("id", created.id).eq("user_id", ctx.user.id);
      return { ok: false, error: itemError.message };
    }
  }
  reval(); return { ok: true };
}

function roadmapAiError(error: unknown): string {
  if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") return "A chave da OpenAI ainda nao foi configurada no servidor.";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  if (status === 401) return "A chave da OpenAI foi recusada. Verifique a configuracao do projeto.";
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

  const { error: modulesSchemaError } = await ctx.supabase.from("perf_study_roadmap_module").select("id").eq("user_id", ctx.user.id).limit(1);
  if (modulesSchemaError) return { ok: false, error: "Execute a migration performance-study-modules.sql antes de gerar um novo roadmap." };

  const today = hojeISO("America/Bahia");
  const tomorrow = addDays(today, 1);
  const { count, error: countError } = await ctx.supabase
    .from("perf_study_roadmap_generation")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .in("status", ["generating", "ready", "accepted"])
    .gte("created_at", `${today}T00:00:00-03:00`)
    .lt("created_at", `${tomorrow}T00:00:00-03:00`);
  if (countError) return { ok: false, error: "Execute a migration performance-roadmap-ai.sql no Supabase." };
  if ((count ?? 0) >= ROADMAP_AI_DAILY_LIMIT) return { ok: false, error: `Limite de ${ROADMAP_AI_DAILY_LIMIT} geracoes por dia atingido.` };

  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").insert({
    user_id: ctx.user.id,
    status: "generating",
    answers: parsedAnswers.data,
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
    if (!preview.modules.length || !preview.modules.some((module) => module.steps.length)) throw new Error("EMPTY_ROADMAP");
    const webSearchCalls = response.output.filter((item) => item.type === "web_search_call").length;

    const { error: readyError } = await ctx.supabase.from("perf_study_roadmap_generation").update({
      status: "ready",
      generated_plan: preview,
      provider_response_id: response.id,
      input_tokens: response.usage?.input_tokens ?? null,
      output_tokens: response.usage?.output_tokens ?? null,
      web_search_calls: webSearchCalls,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", generation.id).eq("user_id", ctx.user.id);
    if (readyError) return { ok: false, error: readyError.message };
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
    reval(); return { ok: true, id: existing.id };
  }

  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").select("id, status, generated_plan").eq("id", generationId).eq("user_id", ctx.user.id).maybeSingle();
  if (generationError || !generation || generation.status !== "ready") return { ok: false, error: "A previa nao esta disponivel para confirmacao." };
  const parsedPlan = roadmapGenerationPlanSchema.safeParse(generation.generated_plan);
  if (!parsedPlan.success) return { ok: false, error: "O roadmap gerado nao passou na validacao." };
  const plan = parsedPlan.data;

  const { data: created, error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({
    user_id: ctx.user.id,
    title: plan.title,
    description: plan.description,
    status: "active",
    source: "ai",
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
        prompt: question.prompt,
        options: question.options,
        correct_option: question.correctOptionIndex,
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

  await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "accepted", accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", generationId).eq("user_id", ctx.user.id);
  reval(); return { ok: true, id: created.id };
}

export async function enviarAvaliacaoEstudoLifeOS(itemId: string, submittedAnswers: Record<string, number>): Promise<{
  ok: boolean;
  error?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  passed?: boolean;
  feedback?: Array<{ questionId: string; correct: boolean; correctOptionIndex: number; explanation: string }>;
}> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  if (!submittedAnswers || typeof submittedAnswers !== "object" || Object.keys(submittedAnswers).length > 20) return { ok: false, error: "Respostas invalidas." };

  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  const { data: questions, error: questionsError } = await ctx.supabase.from("perf_study_assessment_question").select("id, options, correct_option, explanation").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
  if (questionsError) return { ok: false, error: questionsError.message };
  if (!questions?.length) return { ok: false, error: "Esta etapa nao possui perguntas." };

  for (const question of questions) {
    const answer = submittedAnswers[question.id];
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    if (!Number.isInteger(answer) || answer < 0 || answer >= optionCount) return { ok: false, error: "Responda todas as perguntas antes de enviar." };
  }

  const feedback = questions.map((question) => ({
    questionId: question.id,
    correct: submittedAnswers[question.id] === Number(question.correct_option),
    correctOptionIndex: Number(question.correct_option),
    explanation: String(question.explanation),
  }));
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
  const today = hojeISO();
  const [habitsRes, logsRes, goalsRes, eventsRes] = await Promise.all([
    ctx.supabase.from("perf_habit").select("*").eq("user_id", ctx.user.id).eq("ativo", true).order("ordem"),
    ctx.supabase.from("perf_habit_log").select("habit_id, data, valor").eq("user_id", ctx.user.id).gte("data", addDays(today, -6)),
    ctx.supabase.from("perf_goal").select("*").eq("user_id", ctx.user.id).eq("active", true),
    ctx.supabase.from("perf_event").select("*").eq("user_id", ctx.user.id).eq("active", true).gte("start_at", `${today}T00:00:00.000Z`).lt("start_at", `${addDays(today, 1)}T00:00:00.000Z`),
  ]);
  const errors = [habitsRes.error, logsRes.error, goalsRes.error, eventsRes.error].filter(Boolean);
  if (errors.length) return { ok: false, error: errors[0]?.message ?? "Não foi possível ler os dados." };
  const habits = (habitsRes.data ?? []) as Habit[];
  const logs = (logsRes.data ?? []).map((row) => ({ habit_id: row.habit_id, data: row.data, valor: Number(row.valor) })) as HabitLog[];
  const goals = (goalsRes.data ?? []).map((row) => ({ id: row.id, name: row.name, description: row.description, area: row.area, goalType: row.goal_type, initialValue: Number(row.initial_value), currentValue: Number(row.current_value), targetValue: Number(row.target_value), unit: row.unit, startDate: row.start_date, deadline: row.deadline, priority: Number(row.priority), status: row.status, allowOverTarget: Boolean(row.allow_over_target) })) as LifeGoal[];
  const events = (eventsRes.data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, startAt: row.start_at, endAt: row.end_at, allDay: Boolean(row.all_day), status: row.status, source: row.source, categoryId: row.category_id, location: row.location, link: row.link, active: row.active })) as LifeEvent[];
  const insights = buildDeterministicInsights({ todayISO: today, habits, logs, goals, events });
  if (!insights.length) return { ok: false, error: "Ainda não há dados suficientes para gerar um insight." };
  const { error } = await ctx.supabase.from("perf_ai_insight").insert(insights.map((insight) => ({ user_id: ctx.user.id, type: insight.type, analysis_start: insight.analysisStart, analysis_end: insight.analysisEnd, main_area: insight.mainArea, diagnosis: insight.diagnosis, main_error: insight.mainError, risk: insight.risk, recommended_action: insight.recommendedAction, projection: insight.projection, priority: insight.priority, status: insight.status })));
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}
