import "server-only";

import { itCareerCurrentLevelIds, itCareerIds, itCareerInterestIds, itCareerLevelIds, type ItCareerCurrentLevelId, type ItCareerId, type ItCareerInterestId, type ItCareerLevelId, type ItCareerPlanSetup, type ItKnownTopicPolicy } from "@/lib/it-career-roadmaps";
import { requireCeo, isPlainRecord } from "./shared";

export const IT_ROADMAP_OBJECTIVES = new Set(["learning", "first_job", "career_change", "current_job", "freelance"]);
export const IT_APPLICATION_INTENTS = new Set(["none", "after_roadmap", "applying_now"]);

export function booleanField(formData: FormData, key: string): boolean {
  return formData.get(key) === "true";
}

export function itRoadmapPersistenceError(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? "";
  if (error?.code === "PGRST202" || error?.code === "PGRST204" || /roadmap_kind|template_key|content_role|module_kind|parent_item_id|project_spec|perf_activate_study_roadmap/i.test(message)) {
    return "Execute a migration performance-it-career-roadmaps.sql antes de criar uma carreira de TI.";
  }
  return message || "Nao foi possivel salvar o roadmap predefinido.";
}

export function isMissingStudyContentRole(error: { message?: string; code?: string } | null): boolean {
  const message = error?.message ?? "";
  return /content_role/i.test(message) && ["42703", "PGRST204"].includes(error?.code ?? "");
}

export type StudyModuleGateContext = NonNullable<Awaited<ReturnType<typeof requireCeo>>>;

export async function previousItCareerModuleCompletionError(
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

export type ItCareerWizardPreviewInput = {
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

export function previewStringArray(value: unknown, maximum: number): string[] {
  if (!Array.isArray(value) || value.length > maximum) return [];
  return value.flatMap((entry) => typeof entry === "string" && entry.trim() ? [entry.trim()] : []);
}

export function parseItCareerPreviewInput(value: unknown): ItCareerPlanSetup {
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
