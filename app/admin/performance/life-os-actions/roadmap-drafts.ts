"use server";

import { roadmapAiAnswersSchema, roadmapDraftStats, roadmapGenerationPlanSchema, type RoadmapDraftDetail } from "@/lib/study-roadmap-ai";
import { Res, createAdminClient, requireRoadmapAiUser, reval, isLanguageRoadmapGeneration, normalizedRoadmapTitle, setActiveStudyRoadmap } from "./shared";

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
