"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEvolutionOwner } from "@/lib/evolution/access";
import { todayInSaoPaulo } from "@/lib/evolution/date";
import { weekRange } from "@/lib/evolution/metrics";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function refreshEvolution() {
  revalidatePath("/admin/evolucao", "layout");
}

async function assertSuccess(error: { message: string } | null) {
  if (error) throw new Error("Não foi possível salvar. Confirme se a migração da Central de Evolução foi aplicada.");
}

export async function addStudySession(formData: FormData) {
  const input = z.object({
    studyDate: isoDate,
    minutes: z.coerce.number().int().min(1).max(1440),
    source: z.enum(["manual", "timer"]).default("manual"),
  }).parse({
    studyDate: formData.get("studyDate"),
    minutes: formData.get("minutes"),
    source: formData.get("source") ?? "manual",
  });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_study_sessions").insert({ user_id: user.id, study_date: input.studyDate, minutes: input.minutes, source: input.source });
  await assertSuccess(error);
  refreshEvolution();
}

export async function setRoadmapTask(taskId: string, completed: boolean) {
  const cleanTaskId = z.string().min(1).max(160).parse(taskId);
  const { supabase, user } = await requireEvolutionOwner();
  const result = completed
    ? await supabase.from("evo_roadmap_progress").upsert({ user_id: user.id, task_id: cleanTaskId }, { onConflict: "user_id,task_id" })
    : await supabase.from("evo_roadmap_progress").delete().eq("user_id", user.id).eq("task_id", cleanTaskId);
  await assertSuccess(result.error);
  refreshEvolution();
}

export async function saveTraining(formData: FormData) {
  const input = z.object({ date: isoDate, bodyParts: z.array(z.string().min(1).max(40)).min(1).max(8) }).parse({
    date: formData.get("date"),
    bodyParts: formData.getAll("bodyParts"),
  });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_training_logs").upsert({ user_id: user.id, training_date: input.date, body_parts: input.bodyParts }, { onConflict: "user_id,training_date" });
  await assertSuccess(error);
  refreshEvolution();
}

export async function saveWeight(formData: FormData) {
  const input = z.object({ date: isoDate, weight: z.coerce.number().min(20).max(500) }).parse({ date: formData.get("date"), weight: formData.get("weight") });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_weight_logs").upsert({ user_id: user.id, measured_on: input.date, weight_kg: input.weight }, { onConflict: "user_id,measured_on" });
  await assertSuccess(error);
  refreshEvolution();
}

export async function saveFollowers(formData: FormData) {
  const input = z.object({ date: isoDate, followers: z.coerce.number().int().min(0).max(100_000_000) }).parse({ date: formData.get("date"), followers: formData.get("followers") });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_follower_snapshots").upsert({ user_id: user.id, measured_on: input.date, followers: input.followers, source: "manual" }, { onConflict: "user_id,measured_on" });
  await assertSuccess(error);
  refreshEvolution();
}

export async function saveShapeSettings(formData: FormData) {
  const input = z.object({
    followerTarget: z.coerce.number().int().min(0).max(100_000_000),
    currentWeight: z.preprocess((value) => value === "" ? null : value, z.coerce.number().min(20).max(500).nullable()),
    goalWeight: z.preprocess((value) => value === "" ? null : value, z.coerce.number().min(20).max(500).nullable()),
  }).parse({ followerTarget: formData.get("followerTarget"), currentWeight: formData.get("currentWeight"), goalWeight: formData.get("goalWeight") });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_settings").upsert({
    user_id: user.id,
    follower_target: input.followerTarget,
    current_weight_kg: input.currentWeight,
    goal_weight_kg: input.goalWeight,
  }, { onConflict: "user_id" });
  await assertSuccess(error);
  refreshEvolution();
}

export async function addEquipment(formData: FormData) {
  const input = z.object({ name: z.string().trim().min(1).max(120), priority: z.enum(["low", "medium", "high"]) }).parse({ name: formData.get("name"), priority: formData.get("priority") });
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_equipment").insert({ user_id: user.id, ...input });
  await assertSuccess(error);
  refreshEvolution();
}

export async function toggleEquipment(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const purchased = formData.get("purchased") === "true";
  const { supabase, user } = await requireEvolutionOwner();
  const { error } = await supabase.from("evo_equipment").update({ purchased_at: purchased ? new Date().toISOString() : null }).eq("id", id).eq("user_id", user.id);
  await assertSuccess(error);
  refreshEvolution();
}

export async function selectWeeklyVideo(formData: FormData) {
  const input = z.object({ ideaId: z.string().uuid(), title: z.string().min(1).max(240) }).parse({ ideaId: formData.get("ideaId"), title: formData.get("title") });
  const { supabase, user } = await requireEvolutionOwner();
  const weekStart = weekRange(todayInSaoPaulo()).start;
  const { error } = await supabase.from("evo_weekly_videos").upsert({ user_id: user.id, week_start: weekStart, idea_id: input.ideaId, title_snapshot: input.title }, { onConflict: "user_id,week_start" });
  await assertSuccess(error);
  refreshEvolution();
}

export async function markWeeklyVideoPublished() {
  const { supabase, user } = await requireEvolutionOwner();
  const weekStart = weekRange(todayInSaoPaulo()).start;
  const { error } = await supabase.from("evo_weekly_videos").update({ published_at: new Date().toISOString() }).eq("user_id", user.id).eq("week_start", weekStart);
  await assertSuccess(error);
  refreshEvolution();
}
