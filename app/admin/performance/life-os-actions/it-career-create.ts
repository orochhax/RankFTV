"use server";

import { randomUUID } from "node:crypto";
import { buildItCareerPlan, itCareerCurrentLevelIds, itCareerIds, itCareerInterestIds, itCareerLevelIds, type ItCareerCurrentLevelId, type ItCareerDailyQuizSession, type ItCareerId, type ItCareerInterestId, type ItCareerLevelId, type ItCareerPlanSetup, type ItKnownTopicPolicy } from "@/lib/it-career-roadmaps";
import { officialItCareerTemplate } from "@/lib/it-career-official-templates";
import { Res, createAdminClient, requireCeo, reval, text, integer, formValues, insertBatches } from "./shared";
import { IT_ROADMAP_OBJECTIVES, IT_APPLICATION_INTENTS, booleanField, itRoadmapPersistenceError } from "./it-career-support";

export async function criarRoadmapTiPredefinidoLifeOS(formData: FormData): Promise<Res & { id?: string }> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };

  const careerId = text(formData, "career_id", 80) ?? "";
  const currentLevel = text(formData, "current_level", 30) ?? "";
  const targetLevel = text(formData, "target_level", 30) ?? "";
  const knownTopicPolicy = text(formData, "mastered_topic_policy", 20) ?? "validate";
  const objective = text(formData, "objective", 30) ?? "";
  const applicationIntent = text(formData, "application_intent", 30) ?? "none";
  const targetRole = applicationIntent === "none" ? "" : text(formData, "target_role", 200) ?? "";
  const jobPreparation = applicationIntent !== "none" && booleanField(formData, "job_preparation");
  const timelineMode = text(formData, "timeline_mode", 20) ?? "duration";
  const durationMonths = integer(formData, "duration_months", 1) ?? 0;
  const deadline = text(formData, "deadline", 10) ?? "";
  const startDate = text(formData, "start_date", 10) ?? "";
  const minutesPerDay = integer(formData, "minutes_per_day", 1) ?? 0;
  const availableDays = formValues(formData, "available_days", 7);
  const knownTopicIds = formValues(formData, "mastered_topic_ids", 500);
  const interestIds = formValues(formData, "interest_ids", 3);
  const tooManyInterestIds = formValues(formData, "interest_ids", 4).length > 3;

  if (!itCareerIds.includes(careerId as ItCareerId)) return { ok: false, error: "Escolha uma carreira de TI valida." };
  if (!itCareerCurrentLevelIds.includes(currentLevel as ItCareerCurrentLevelId)) return { ok: false, error: "Informe seu nivel atual." };
  if (!itCareerLevelIds.includes(targetLevel as ItCareerLevelId)) return { ok: false, error: "Escolha a profundidade de conteúdo que deseja estudar." };
  if (!["skip", "validate"].includes(knownTopicPolicy)) return { ok: false, error: "Escolha como tratar os assuntos que ja domina." };
  if (!IT_ROADMAP_OBJECTIVES.has(objective)) return { ok: false, error: "Escolha seu objetivo com esta carreira." };
  if (!IT_APPLICATION_INTENTS.has(applicationIntent)) return { ok: false, error: "Informe se pretende se candidatar a vagas." };
  if (applicationIntent !== "none" && targetRole.length < 2) return { ok: false, error: "Informe o cargo ou funcao desejada." };
  if (!['duration', 'deadline'].includes(timelineMode)) return { ok: false, error: "Escolha como deseja informar o prazo." };
  if (interestIds.length < 1 || tooManyInterestIds) return { ok: false, error: "Escolha de um a tres assuntos de interesse." };
  if (interestIds.some((id) => !itCareerInterestIds.includes(id as ItCareerInterestId))) return { ok: false, error: "Escolha apenas assuntos de interesse validos." };

  const setup: ItCareerPlanSetup = {
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
    includeCapstone: booleanField(formData, "include_capstone"),
    jobPreparation,
    objective: objective as NonNullable<ItCareerPlanSetup["objective"]>,
    applicationIntent: applicationIntent as NonNullable<ItCareerPlanSetup["applicationIntent"]>,
    targetRole,
    startDate,
    timelineMode: timelineMode as "duration" | "deadline",
    durationMonths,
    deadline,
    availableDays,
    minutesPerDay,
  };

  let plan;
  try {
    plan = buildItCareerPlan(setup);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nao foi possivel montar este roadmap." };
  }
  const officialTemplate = officialItCareerTemplate(careerId as ItCareerId, targetLevel as ItCareerLevelId);
  if (!officialTemplate) return { ok: false, error: "O template oficial desta carreira e nível não está disponível." };

  const roadmapId = randomUUID();
  const now = new Date().toISOString();
  const storedSetup = {
    ...setup,
    objective,
    applicationIntent,
    targetRole,
    jobPreparation,
    deadlineWarning: plan.deadlineWarning,
    plannedEstimatedMinutes: plan.totalEstimatedMinutes,
    bufferMinutes: plan.bufferMinutes,
    recommendedEstimatedMinutes: plan.recommendedEstimatedMinutes,
    recommendedTargetDate: plan.recommendedTargetDate,
    milestones: plan.milestones,
    firstProfessionalMilestoneLabel: plan.professionalMilestone.firstLabel,
    nextProfessionalMilestoneLabel: plan.professionalMilestone.nextLabel,
    dailyQuestionPolicy: plan.dailyQuestionPolicy,
    estimationScope: "curriculum_completion",
    officialTemplateSchemaVersion: officialTemplate.schemaVersion,
    officialTemplateTitle: officialTemplate.title,
    workspaceSchemaVersion: 2,
    workspaceDelivery: "authenticated_download",
  };
  const { error: roadmapError } = await ctx.supabase.from("perf_study_roadmap").insert({
    id: roadmapId,
    user_id: ctx.user.id,
    title: plan.title,
    description: plan.description,
    status: "archived",
    source: "template",
    roadmap_kind: "it_career",
    template_key: plan.templateKey,
    template_version: plan.templateVersion,
    target_level: plan.targetLevel,
    setup: storedSetup,
    start_date: plan.startDate,
    target_date: plan.targetDate,
    recommended_target_date: plan.recommendedTargetDate,
    difficulty_level: plan.targetLevel === "foundation" || plan.targetLevel === "junior" ? "introductory" : plan.targetLevel === "mid" ? "intermediate" : "advanced",
    total_estimated_minutes: plan.totalEstimatedMinutes,
    created_at: now,
    updated_at: now,
  });
  if (roadmapError) return { ok: false, error: itRoadmapPersistenceError(roadmapError) };

  const rollback = async (message: string): Promise<Res> => {
    const { error: cleanupError } = await ctx.supabase.from("perf_study_roadmap").delete().eq("id", roadmapId).eq("user_id", ctx.user.id);
    return { ok: false, error: cleanupError ? `${message} A limpeza automatica tambem falhou: ${cleanupError.message}` : message };
  };

  const officialTopicById = new Map(
    officialTemplate.phases.flatMap((phase) => phase.modules.flatMap((module) => module.topics))
      .map((topic) => [topic.id, topic] as const),
  );

  const moduleIds = new Map<string, string>();
  const moduleRows = plan.modules.map((roadmapModule, index) => {
    const id = randomUUID();
    moduleIds.set(roadmapModule.id, id);
    return {
      id,
      user_id: ctx.user.id,
      roadmap_id: roadmapId,
      title: roadmapModule.title,
      objective: roadmapModule.objective,
      success_criteria: roadmapModule.successCriteria,
      topics: roadmapModule.topics.map((topic) => topic.title),
      order_index: index,
      estimated_minutes: roadmapModule.estimatedMinutes,
      module_kind: roadmapModule.moduleKind,
      module_code: `M${index + 1}`,
      level_code: roadmapModule.level,
      template_node_id: roadmapModule.id,
    };
  });
  for (const moduleBatch of insertBatches(moduleRows, 100)) {
    const { error: moduleError } = await ctx.supabase.from("perf_study_roadmap_module").insert(moduleBatch);
    if (moduleError) return rollback(itRoadmapPersistenceError(moduleError));
  }

  let orderIndex = 0;
  const itemRows: Array<Record<string, unknown>> = [];
  const questionRows: Array<Record<string, unknown>> = [];
  const topicItemRows = new Map<string, Record<string, unknown>>();
  const topicItemOrder: Array<{ moduleOrder: number; topicOrder: number; topicId: string }> = [];
  const projectItemRows = new Map<string, Record<string, unknown>>();
  const dailyQuizMaterializations: Array<{
    dailyQuiz: ItCareerDailyQuizSession;
    dailyQuizIndex: number;
    moduleId: string;
    moduleOrder: number;
    moduleTitle: string;
    topicCode: string;
    topicId: string;
    topicOrder: number;
    topicTitle: string;
    level: ItCareerLevelId;
  }> = [];
  for (const [moduleOrder, roadmapModule] of plan.modules.entries()) {
    const moduleId = moduleIds.get(roadmapModule.id);
    if (!moduleId) return rollback("Nao foi possivel vincular um dos modulos predefinidos.");
    for (const [topicOrder, topic] of roadmapModule.topics.entries()) {
      const officialTopic = officialTopicById.get(topic.id);
      if (!officialTopic) return rollback(`O assunto oficial ${topic.title} não foi encontrado no template versionado.`);
      const topicId = randomUUID();
      topicItemRows.set(topicId, {
        id: topicId, user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: null,
        section: roadmapModule.title, title: topic.title, description: topic.competence, estimated_minutes: topic.estimatedMinutes,
        preparation_steps: officialTopic.guidedStudy.slice(0, 8), practice_exercises: officialTopic.activities.slice(0, 8),
        reflection_questions: [], completion_checklist: [], evidence_prompt: officialTopic.evidence,
        item_kind: topic.role === "review" ? "reinforcement" : "core", content_role: topic.role, item_code: topic.code, level_code: roadmapModule.level,
        counts_for_progress: true, template_node_id: topic.id, subtopics: topic.subtopics,
      });
      topicItemOrder.push({ moduleOrder, topicOrder, topicId });
      const requiresDailyQuizzes = roadmapModule.id !== "career-preparation";
      if (requiresDailyQuizzes && !topic.dailyQuizzes.length) return rollback(`O catalogo de ${topic.title} nao possui perguntas para as sessoes de estudo.`);
      for (const [dailyQuizIndex, dailyQuiz] of topic.dailyQuizzes.entries()) {
        dailyQuizMaterializations.push({ dailyQuiz, dailyQuizIndex, moduleId, moduleOrder, moduleTitle: roadmapModule.title, topicCode: topic.code, topicId, topicOrder, topicTitle: topic.title, level: roadmapModule.level });
      }
    }
    if (roadmapModule.project) {
      const project = roadmapModule.project;
      const projectSpec = project.projectSpec;
      projectItemRows.set(moduleId, {
        id: randomUUID(), user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: null,
        section: roadmapModule.title, title: projectSpec.projectTitle,
        description: `${projectSpec.productDefinition}\n\nProblema: ${projectSpec.problemStatement}\n\nPublico: ${projectSpec.targetAudience}`,
        requirements: projectSpec.mandatoryRequirements.join("\n"), workspace: null, preparation_steps: [], instructions: projectSpec.submissionInstructions.join("\n"),
        practice_exercises: projectSpec.deliverables, reflection_questions: [], completion_checklist: projectSpec.deliverables.slice(0, 8), evidence_prompt: null,
        completion_criteria: projectSpec.evaluationCriteria.map((criterion) => `${criterion.label} (${criterion.weightPercent}%): ${criterion.description}`).join("\n"),
        project_spec: projectSpec, estimated_minutes: project.estimatedMinutes,
        item_kind: "project", content_role: roadmapModule.moduleKind === "capstone" ? "capstone" : "module_project", item_code: roadmapModule.moduleKind === "capstone" ? "TCC" : `${moduleOrder + 1}.P`, level_code: roadmapModule.level,
        // Projetos e atividades vivem no workspace da IDE. No site, somente
        // assuntos/revisoes compoem o progresso e o desbloqueio de modulos.
        counts_for_progress: false, template_node_id: project.id, subtopics: [],
      });
    }
  }

  dailyQuizMaterializations.sort((left, right) => left.dailyQuiz.scheduledDate.localeCompare(right.dailyQuiz.scheduledDate)
    || left.moduleOrder - right.moduleOrder
    || left.topicOrder - right.topicOrder
    || left.dailyQuiz.sessionIndex - right.dailyQuiz.sessionIndex
    || left.dailyQuiz.id.localeCompare(right.dailyQuiz.id));
  const lastDailyQuizIndexByModule = new Map<string, number>();
  dailyQuizMaterializations.forEach((entry, index) => lastDailyQuizIndexByModule.set(entry.moduleId, index));
  const appendedTopicIds = new Set<string>();
  const appendedProjectModuleIds = new Set<string>();
  const appendedQuizlessModuleOrders = new Set<number>();
  const appendItemRow = (row: Record<string, unknown>) => itemRows.push({ ...row, status: "pending", order_index: orderIndex++ });
  const appendQuizlessModulesBefore = (exclusiveModuleOrder: number) => {
    for (const [moduleOrder, roadmapModule] of plan.modules.entries()) {
      if (moduleOrder >= exclusiveModuleOrder || appendedQuizlessModuleOrders.has(moduleOrder)) continue;
      const moduleId = moduleIds.get(roadmapModule.id);
      if (!moduleId || lastDailyQuizIndexByModule.has(moduleId)) continue;

      topicItemOrder
        .filter((entry) => entry.moduleOrder === moduleOrder)
        .sort((left, right) => left.topicOrder - right.topicOrder)
        .forEach(({ topicId }) => {
          if (appendedTopicIds.has(topicId)) return;
          const topicRow = topicItemRows.get(topicId);
          if (topicRow) appendItemRow(topicRow);
          appendedTopicIds.add(topicId);
        });
      const projectRow = projectItemRows.get(moduleId);
      if (projectRow) {
        appendItemRow(projectRow);
        appendedProjectModuleIds.add(moduleId);
      }
      appendedQuizlessModuleOrders.add(moduleOrder);
    }
  };
  for (const [dailyOrder, materialization] of dailyQuizMaterializations.entries()) {
      appendQuizlessModulesBefore(materialization.moduleOrder);
      const { dailyQuiz, dailyQuizIndex, moduleId, moduleTitle, topicCode, topicId, topicTitle, level } = materialization;
      const scheduledWeekday = /^\d{4}-\d{2}-\d{2}$/.test(dailyQuiz.scheduledDate)
        ? new Date(`${dailyQuiz.scheduledDate}T12:00:00Z`).getUTCDay()
        : -1;
      if (
        dailyQuiz.scheduledDate < plan.startDate
        || !availableDays.includes(String(scheduledWeekday))
        || dailyQuiz.questions.length !== plan.dailyQuestionPolicy.questionsPerStudyDay
        || dailyQuiz.questions.length > 20
      ) return rollback(`O catalogo de ${topicTitle} possui uma sessao de perguntas diarias invalida.`);
      if (!appendedTopicIds.has(topicId)) {
        const topicRow = topicItemRows.get(topicId);
        if (!topicRow) return rollback(`Nao foi possivel materializar o assunto ${topicTitle}.`);
        appendItemRow(topicRow);
        appendedTopicIds.add(topicId);
      }
      const assessmentId = randomUUID();
      appendItemRow({
        id: assessmentId, user_id: ctx.user.id, roadmap_id: roadmapId, module_id: moduleId, parent_item_id: topicId,
        section: moduleTitle, title: dailyQuiz.title,
        description: "Perguntas predefinidas para praticar nos arquivos do workspace da IDE.",
        estimated_minutes: dailyQuiz.estimatedMinutes, item_kind: "quiz", content_role: "assessment",
        item_code: `${topicCode}.Q${dailyQuizIndex + 1}`, level_code: level, scheduled_date: dailyQuiz.scheduledDate,
        counts_for_progress: false, template_node_id: dailyQuiz.id, subtopics: [],
      });
      dailyQuiz.questions.forEach((question, questionIndex) => questionRows.push({
        user_id: ctx.user.id,
        item_id: assessmentId,
        question_type: question.type,
        prompt: question.prompt,
        options: question.options,
        correct_option: question.type === "multiple_choice" ? question.correctOptionIndex : null,
        correct_order: question.type === "ordering" ? question.correctOrder : [],
        explanation: question.explanation,
        order_index: questionIndex,
      }));
      if (lastDailyQuizIndexByModule.get(moduleId) === dailyOrder) {
        const projectRow = projectItemRows.get(moduleId);
        if (projectRow) {
          appendItemRow(projectRow);
          appendedProjectModuleIds.add(moduleId);
        }
      }
  }
  appendQuizlessModulesBefore(plan.modules.length);
  topicItemOrder
    .sort((left, right) => left.moduleOrder - right.moduleOrder || left.topicOrder - right.topicOrder)
    .forEach(({ topicId }) => {
      if (appendedTopicIds.has(topicId)) return;
      const topicRow = topicItemRows.get(topicId);
      if (topicRow) appendItemRow(topicRow);
    });
  plan.modules.forEach((roadmapModule) => {
    const moduleId = moduleIds.get(roadmapModule.id);
    if (!moduleId || appendedProjectModuleIds.has(moduleId)) return;
    const projectRow = projectItemRows.get(moduleId);
    if (projectRow) appendItemRow(projectRow);
  });

  for (const itemBatch of insertBatches(itemRows, 200)) {
    const { error: itemError } = await ctx.supabase
      .from("perf_study_roadmap_item")
      .insert(itemBatch, { defaultToNull: false });
    if (itemError) return rollback(itRoadmapPersistenceError(itemError));
  }
  for (const questionBatch of insertBatches(questionRows, 250)) {
    const { error: questionError } = await createAdminClient().from("perf_study_assessment_question").insert(questionBatch);
    if (questionError) return rollback(questionError.message);
  }
  const { error: activationError } = await ctx.supabase.rpc("perf_activate_study_roadmap", { p_roadmap_id: roadmapId });
  if (activationError) return rollback(itRoadmapPersistenceError(activationError));
  reval();
  return { ok: true, id: roadmapId };
}
