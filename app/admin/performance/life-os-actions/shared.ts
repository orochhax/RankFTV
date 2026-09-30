import "server-only";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { roadmapAiAnswersSchema } from "@/lib/study-roadmap-ai";

export type Res = { ok: boolean; error?: string };

export { createAdminClient };

export async function requireCeo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) return null;
  return { supabase, user, isAdmin: true as const };
}

export async function requireRoadmapAiUser() {
  return requireCeo();
}

export function reval() {
  revalidatePath("/admin/performance");
  revalidatePath("/admin/performance/calendario");
}
export function text(formData: FormData, key: string, max = 200): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}
export function number(formData: FormData, key: string): number | null {
  const value = Number(String(formData.get(key) ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function integer(formData: FormData, key: string, minimum = 0): number | null {
  const value = number(formData, key);
  return value != null && Number.isInteger(value) && value >= minimum ? value : null;
}

export function formValues(formData: FormData, key: string, max = 100): string[] {
  return [...new Set(formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean))].slice(0, max);
}

export function insertBatches<T>(values: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) batches.push(values.slice(index, index + size));
  return batches;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

/**
 * A importacao e limitada aos exports de idioma. Um JSON de carreira de TI
 * inclui metadados deterministas e jamais deve voltar ao normalizador com IA.
 */
export function isLanguageRoadmapExport(payload: unknown): boolean {
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

export function isLanguageRoadmapGeneration(origin: unknown, answers: unknown): boolean {
  if (!isPlainRecord(answers) || answers.roadmapType !== "language") return false;
  if (origin === "ai") return roadmapAiAnswersSchema.safeParse(answers).success;
  return origin === "import" && answers.source === "import";
}

export function normalizedRoadmapTitle(value: string): string | null {
  const title = value.trim().replace(/\s+/g, " ").slice(0, 160);
  return title.length >= 3 ? title : null;
}

export async function setActiveStudyRoadmap(
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
