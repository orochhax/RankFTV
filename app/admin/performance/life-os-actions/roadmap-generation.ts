"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { getOpenAIClient } from "@/lib/openai";
import { reportOperationalEvent } from "@/lib/observability";
import { ROADMAP_AI_PROMPT_VERSION, roadmapAiAnswersSchema, roadmapGoalFromContext, roadmapHorizon, roadmapLanguageFormats, type GenerateRoadmapResult } from "@/lib/study-roadmap-ai";
import { Res, requireRoadmapAiUser, reval, text, formValues } from "./shared";
import { roadmapGenerationGate, roadmapGenerationDiagnostic, roadmapGenerationTitle, finalizeRoadmapProviderResponse, failRoadmapGeneration, processRoadmapGeneration } from "./roadmap-generation-support";

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
        await reportOperationalEvent({
          level: "warn",
          event: "roadmap_ai.provider_status_unavailable",
          context: { generationId: generation.id },
          error: roadmapGenerationDiagnostic(retrieveError),
        });
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
