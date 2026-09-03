"use server";

import { hojeISO } from "@/lib/performance";
import { Res, requireCeo, reval, text, number, integer, formValues } from "./shared";

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
