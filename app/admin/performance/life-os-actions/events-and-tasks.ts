"use server";

import { randomUUID } from "node:crypto";
import { addDays } from "@/lib/performance";
import { parseEventRecurrenceRule } from "@/lib/event-recurrence";
import { Res, requireCeo, reval, text, number } from "./shared";

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
