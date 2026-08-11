import { NextRequest } from "next/server";

import { buildItCareerWorkspaceBundle, collectWorkspaceRowsByIds, type ItCareerWorkspaceModule, type ItCareerWorkspaceTopic } from "@/lib/it-career-workspaces";
import { itCareerIds, itCareerLevelIds, type ItCareerId, type ItCareerLevelId, type ItCareerProjectSpec } from "@/lib/it-career-roadmaps";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0) : [];
}

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9._-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "workspace.zip";
}

function lockedModuleMessage(title: string): string {
  return `Você precisa finalizar o módulo "${title}" primeiro.`;
}

type PublicQuestionRow = {
  item_id: string;
  question_type: string;
  prompt: string;
  options: unknown;
  order_index: number;
};

const QUESTION_ITEM_BATCH_SIZE = 40;
const QUESTION_PAGE_SIZE = 500;

async function loadPublicQuestions(userId: string, assessmentIds: string[]): Promise<{ data: PublicQuestionRow[]; error: string | null }> {
  if (!assessmentIds.length) return { data: [], error: null };
  const admin = createAdminClient();
  try {
    // Roadmaps longos passam de mil perguntas. Lotes pequenos evitam URLs
    // extensas no filtro `in`, e a paginação impede truncamento pelo max_rows.
    const questions = await collectWorkspaceRowsByIds<PublicQuestionRow>(assessmentIds, async (itemIds, rangeStart, rangeEnd) => {
      const result = await admin.from("perf_study_assessment_question")
        .select("item_id, question_type, prompt, options, order_index")
        .eq("user_id", userId)
        .in("item_id", itemIds)
        .order("item_id").order("order_index")
        .range(rangeStart, rangeEnd);
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []) as PublicQuestionRow[];
    }, { itemBatchSize: QUESTION_ITEM_BATCH_SIZE, pageSize: QUESTION_PAGE_SIZE });
    return { data: questions, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Não foi possível carregar as perguntas do workspace." };
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ roadmapId: string }> }) {
  const { roadmapId } = await params;
  const requestedKind = request.nextUrl.searchParams.get("kind");
  const requestedModuleId = request.nextUrl.searchParams.get("moduleId");
  const requestedFormat = request.nextUrl.searchParams.get("format");
  const kind = requestedKind === "base" || requestedKind === "module" || requestedKind === "through_module" || requestedKind === "full" ? requestedKind : null;
  if (!kind || !roadmapId) return Response.json({ error: "Download inválido." }, { status: 400 });
  if ((kind === "module" || kind === "through_module") && !requestedModuleId) return Response.json({ error: "Módulo inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Acesso negado." }, { status: 401 });

  const roadmapResult = await supabase.from("perf_study_roadmap")
    .select("id, title, roadmap_kind, template_key, template_version, target_level")
    .eq("id", roadmapId).eq("user_id", auth.user.id).maybeSingle();
  const roadmap = roadmapResult.data;
  if (roadmapResult.error || !roadmap || roadmap.roadmap_kind !== "it_career") {
    return Response.json({ error: "Roadmap de TI não encontrado." }, { status: 404 });
  }
  if (!itCareerIds.includes(roadmap.template_key as ItCareerId) || !itCareerLevelIds.includes(roadmap.target_level as ItCareerLevelId) || !Number.isInteger(roadmap.template_version) || Number(roadmap.template_version) < 1) {
    return Response.json({ error: "Snapshot do roadmap inválido." }, { status: 409 });
  }

  const modulesResult = await supabase.from("perf_study_roadmap_module")
    .select("id, title, objective, success_criteria, order_index, module_code, level_code")
    .eq("roadmap_id", roadmap.id).eq("user_id", auth.user.id).order("order_index", { ascending: true });
  if (modulesResult.error) return Response.json({ error: modulesResult.error.message }, { status: 500 });
  const modules = modulesResult.data ?? [];
  const targetIndex = requestedModuleId ? modules.findIndex((module) => module.id === requestedModuleId) : -1;
  if ((kind === "module" || kind === "through_module") && targetIndex < 0) return Response.json({ error: "Módulo não encontrado." }, { status: 404 });
  const includedRows = kind === "base" ? [] : kind === "full" ? modules : kind === "module" ? modules.slice(targetIndex, targetIndex + 1) : modules.slice(0, targetIndex + 1);

  const itemResult = await supabase.from("perf_study_roadmap_item")
    .select("id, module_id, parent_item_id, title, description, estimated_minutes, content_role, subtopics, preparation_steps, practice_exercises, evidence_prompt, project_spec, item_code, counts_for_progress, status")
    .eq("roadmap_id", roadmap.id).eq("user_id", auth.user.id).order("order_index", { ascending: true });
  if (itemResult.error) return Response.json({ error: itemResult.error.message }, { status: 500 });
  const items = itemResult.data ?? [];
  const includedModuleIds = new Set(includedRows.map((module) => module.id));
  const assessmentIds = items
    .filter((item) => item.content_role === "assessment" && includedModuleIds.has(item.module_id))
    .map((item) => item.id);
  const publicQuestionResult = await loadPublicQuestions(auth.user.id, assessmentIds);
  if (publicQuestionResult.error) return Response.json({ error: publicQuestionResult.error }, { status: 500 });
  const publicQuestions = publicQuestionResult.data;

  if ((kind === "module" || kind === "through_module") && targetIndex > 0) {
    const priorModules = modules.slice(0, targetIndex);
    const pendingByModule = new Set(items.filter((item) => item.counts_for_progress !== false && item.status !== "completed").map((item) => item.module_id));
    const blocker = priorModules.find((module) => pendingByModule.has(module.id));
    if (blocker) return Response.json({ error: lockedModuleMessage(blocker.title) }, { status: 423 });
  }

  const workspaceModules: ItCareerWorkspaceModule[] = includedRows.map((module) => {
    const moduleItems = items.filter((item) => item.module_id === module.id);
    const topics: ItCareerWorkspaceTopic[] = moduleItems
      .filter((item) => item.content_role === "topic" || item.content_role === "review")
      .map((item) => {
        const assessments = moduleItems.filter((candidate) => candidate.content_role === "assessment" && candidate.parent_item_id === item.id);
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          subtopics: textList(item.subtopics),
          guidedStudy: textList(item.preparation_steps),
          activities: textList(item.practice_exercises),
          evidence: item.evidence_prompt,
          estimatedMinutes: item.estimated_minutes,
          questions: assessments.flatMap((assessment) => publicQuestions
            .filter((question) => question.item_id === assessment.id)
            .map((question) => ({
              type: question.question_type === "ordering" ? "ordering" as const : "multiple_choice" as const,
              prompt: question.prompt,
              options: textList(question.options),
              sessionTitle: assessment.title,
            }))),
        };
      });
    const projectItem = moduleItems.find((item) => item.content_role === "module_project" || item.content_role === "capstone");
    return {
      id: module.id,
      code: module.module_code,
      title: module.title,
      objective: module.objective,
      successCriteria: module.success_criteria,
      level: itCareerLevelIds.includes(module.level_code as ItCareerLevelId) ? module.level_code as ItCareerLevelId : null,
      orderIndex: module.order_index,
      topics,
      project: projectItem ? { title: projectItem.title, description: projectItem.description, spec: projectItem.project_spec as ItCareerProjectSpec | null } : null,
    };
  });

  try {
    const bundle = buildItCareerWorkspaceBundle({
      id: roadmap.id,
      title: roadmap.title,
      templateKey: roadmap.template_key as ItCareerId,
      templateVersion: Number(roadmap.template_version),
      targetLevel: roadmap.target_level as ItCareerLevelId,
    }, workspaceModules, kind);

    // O log é auxiliar: a ausência da migration não pode impedir um download autorizado.
    await createAdminClient().from("perf_study_workspace_download").insert({
      user_id: auth.user.id,
      roadmap_id: roadmap.id,
      module_id: kind === "module" ? requestedModuleId : null,
      bundle_kind: kind,
      artifact_sha256: bundle.manifest.artifactSha256,
      template_version: Number(roadmap.template_version),
      workspace_generator_version: 2,
    });

    if (requestedFormat === "files") {
      return Response.json({
        rootFolder: safeFilename(bundle.filename).replace(/\.zip$/i, ""),
        manifest: bundle.manifest,
        files: bundle.files.map(({ path, mimeType, content }) => ({ path, mimeType, content })),
      }, { headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
    }

    const body = new ArrayBuffer(bundle.bytes.byteLength);
    new Uint8Array(body).set(bundle.bytes);
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename(bundle.filename)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-RankFTV-Artifact-Sha256": bundle.manifest.artifactSha256,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível preparar o workspace." }, { status: 500 });
  }
}
