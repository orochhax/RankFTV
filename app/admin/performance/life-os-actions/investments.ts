"use server";

import { hojeISO } from "@/lib/performance";
import { portfolioVariation } from "@/lib/performance-life-os";
import { generateDailyLifeAnalysis } from "@/lib/daily-life-analysis-service";
import { Res, requireCeo, reval, text, number } from "./shared";

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
