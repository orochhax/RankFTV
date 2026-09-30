"use server";

import { hojeISO } from "@/lib/performance";
import { buildItCareerPreview, itCareerCatalogs, itCareerCurrentLevelIds, itCareerCurrentLevelLabels, itCareerInterestOptions, itCareerLevelIds, itCareerLevelLabels, topicsForItCareer } from "@/lib/it-career-roadmaps";
import { Res, requireCeo, reval, text, setActiveStudyRoadmap } from "./shared";
import { parseItCareerPreviewInput } from "./it-career-support";

export async function criarRoadmapEstudosLifeOS(formData: FormData): Promise<Res & { id?: string }> {
  const ctx = await requireCeo();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const title = text(formData, "title", 160);
  if (!title) return { ok: false, error: "Informe o nome do roadmap." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap").insert({ user_id: ctx.user.id, title, description: text(formData, "description", 2000), status: "archived", source: "manual", start_date: text(formData, "start_date", 10) ?? hojeISO(), target_date: text(formData, "target_date", 10) }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const activation = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, data.id);
  if (!activation.ok) {
    await ctx.supabase.from("perf_study_roadmap").delete().eq("id", data.id).eq("user_id", ctx.user.id);
    return activation;
  }
  reval(); return { ok: true, id: data.id };
}


export async function obterConfiguracaoRoadmapTiLifeOS() {
  try {
    const ctx = await requireCeo();
    if (!ctx) return { ok: false as const, error: "Acesso negado." };

    const topicsByCareerAndLevel = Object.fromEntries(itCareerCatalogs.map((career) => [
      career.id,
      Object.fromEntries(itCareerCurrentLevelIds.map((level) => [
        level,
        topicsForItCareer(career.id, level).map((topic) => ({
          id: topic.id,
          label: topic.title,
          moduleLabel: topic.moduleLabel,
          levelLabel: topic.levelLabel,
        })),
      ])),
    ]));

    return {
      ok: true as const,
      configuration: {
        careers: itCareerCatalogs.map((career) => ({ id: career.id, label: career.title, description: career.description })),
        currentLevelIds: [...itCareerCurrentLevelIds],
        currentLevelLabels: { ...itCareerCurrentLevelLabels },
        targetLevelIds: [...itCareerLevelIds],
        targetLevelLabels: { ...itCareerLevelLabels },
        interestOptions: itCareerInterestOptions.map((interest) => ({ ...interest })),
        topicsByCareerAndLevel,
      },
    };
  } catch {
    return { ok: false as const, error: "Nao foi possivel carregar a configuracao do roadmap." };
  }
}

/** Calcula a previa no servidor e projeta apenas os campos exibidos pelo wizard. */
export async function previsualizarRoadmapTiLifeOS(value: unknown) {
  try {
    const ctx = await requireCeo();
    if (!ctx) return { ok: false as const, error: "Acesso negado." };
    const plan = buildItCareerPreview(parseItCareerPreviewInput(value));
    return {
      ok: true as const,
      preview: {
        title: plan.title,
        description: plan.description,
        totalEstimatedMinutes: plan.totalEstimatedMinutes,
        bufferMinutes: plan.bufferMinutes,
        recommendedEstimatedMinutes: plan.recommendedEstimatedMinutes,
        recommendedTargetDate: plan.recommendedTargetDate,
        deadlineWarning: plan.deadlineWarning,
        milestones: plan.milestones.map((milestone) => ({
          levelId: milestone.level,
          label: milestone.levelLabel,
          estimatedMinutes: milestone.cumulativeRecommendedEstimatedMinutes,
          targetDate: milestone.recommendedTargetDate,
        })),
        dailyQuestionPolicy: { ...plan.dailyQuestionPolicy },
        modules: plan.modules.map((module) => ({
          id: module.id,
          title: module.title,
          levelId: module.level,
          levelLabel: module.levelLabel,
          estimatedMinutes: module.estimatedMinutes,
          topics: module.topics.map((topic) => ({ id: topic.id, title: topic.title, subtopics: [...topic.subtopics] })),
          project: module.project ? {
            id: module.project.id,
            title: module.project.title,
            estimatedMinutes: module.project.estimatedMinutes,
            projectSpec: {
              productDefinition: module.project.projectSpec.productDefinition,
              data: { sourceLabel: module.project.projectSpec.data.sourceLabel },
              functionalities: [...module.project.projectSpec.functionalities],
              deliverables: [...module.project.projectSpec.deliverables],
              evaluationCriteria: module.project.projectSpec.evaluationCriteria.map((criterion) => ({ id: criterion.id })),
            },
          } : null,
        })),
      },
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Nao foi possivel montar a previa deste roadmap." };
  }
}
