"use server";

import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { hojeISO } from "@/lib/performance";
import { getOpenAIClient } from "@/lib/openai";
import { openAIReasoningEffort } from "@/lib/openai-config";
import { ROADMAP_IMPORT_MAX_BYTES } from "@/lib/performance-analytics";
import { buildImportedRoadmapPlan, generatedRoadmapSchema, ROADMAP_IMPORT_PROMPT_VERSION, prepareRoadmapImportSource, roadmapImportPromptInput, roadmapImportSystemInstructions, type GenerateRoadmapResult } from "@/lib/study-roadmap-ai";
import { Res, createAdminClient, requireCeo, requireRoadmapAiUser, reval, text, number, isLanguageRoadmapExport, normalizedRoadmapTitle, setActiveStudyRoadmap } from "./shared";
import { isMissingStudyContentRole, previousItCareerModuleCompletionError } from "./it-career-support";
import { persistRoadmapDraft, roadmapAiError, roadmapGenerationGate } from "./roadmap-generation-support";

export async function ativarRoadmapEstudosLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  const result = await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, id);
  if (result.ok) reval();
  return result;
}

export async function renomearRoadmapEstudosLifeOS(id: string, value: string): Promise<Res> {
  const ctx = await requireRoadmapAiUser();
  const title = normalizedRoadmapTitle(value);
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  if (!title) return { ok: false, error: "Informe um nome com pelo menos 3 caracteres." };
  const { data, error } = await ctx.supabase.from("perf_study_roadmap").update({ title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id).select("id").maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Roadmap nao encontrado." };
  reval();
  return { ok: true };
}

export async function removerRoadmapEstudosLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Roadmap invalido." };
  const { data: roadmap, error: lookupError } = await ctx.supabase.from("perf_study_roadmap").select("id, status").eq("id", id).eq("user_id", ctx.user.id).maybeSingle();
  if (lookupError || !roadmap) return { ok: false, error: lookupError?.message ?? "Roadmap nao encontrado." };
  const { error } = await ctx.supabase.from("perf_study_roadmap").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  if (roadmap.status === "active") {
    const { data: replacement } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("user_id", ctx.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (replacement?.id) await setActiveStudyRoadmap(ctx.supabase, ctx.user.id, replacement.id);
  }
  reval();
  return { ok: true };
}

export async function criarItemEstudoLifeOS(roadmapId: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !roadmapId) return { ok: false, error: "Roadmap invalido." };
  const title = text(formData, "title", 160); const orderIndex = number(formData, "order_index") ?? 0; const estimated = number(formData, "estimated_minutes");
  if (!title) return { ok: false, error: "Informe o nome da materia." };
  const { data: roadmap } = await ctx.supabase.from("perf_study_roadmap").select("id").eq("id", roadmapId).eq("user_id", ctx.user.id).maybeSingle();
  if (!roadmap) return { ok: false, error: "Roadmap nao encontrado." };
  const kind = text(formData, "item_kind", 20) ?? "general";
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").insert({ user_id: ctx.user.id, roadmap_id: roadmapId, title, section: text(formData, "section", 120), description: text(formData, "description", 2000), order_index: Math.max(0, Math.round(orderIndex)), estimated_minutes: estimated, scheduled_date: text(formData, "scheduled_date", 10), item_kind: STUDY_ITEM_KINDS.has(kind) ? kind : "general" });
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function editarItemEstudoLifeOS(id: string, formData: FormData): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Materia invalida." };
  const title = text(formData, "title", 160); const estimated = number(formData, "estimated_minutes");
  if (!title) return { ok: false, error: "Informe o nome da materia." };
  const kind = text(formData, "item_kind", 20) ?? "general";
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").update({ title, section: text(formData, "section", 120), description: text(formData, "description", 2000), order_index: Math.max(0, Math.round(number(formData, "order_index") ?? 0)), estimated_minutes: estimated, scheduled_date: text(formData, "scheduled_date", 10), item_kind: STUDY_ITEM_KINDS.has(kind) ? kind : "general", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function atualizarStatusEstudoLifeOS(id: string, status: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id || !["pending", "in_progress", "completed"].includes(status)) return { ok: false, error: "Status invalido." };
  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item")
    .select("roadmap_id, module_id, preparation_steps, completion_checklist")
    .eq("id", id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Etapa não encontrada." };
  if (status !== "pending") {
    const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
    if (moduleGateError) return { ok: false, error: moduleGateError };
  }
  const { count } = await createAdminClient().from("perf_study_assessment_question").select("id", { count: "exact", head: true }).eq("item_id", id).eq("user_id", ctx.user.id);
  const hasChecks = (Array.isArray(item.preparation_steps) && item.preparation_steps.length > 0) || (Array.isArray(item.completion_checklist) && item.completion_checklist.length > 0);
  if (hasChecks || (count ?? 0) > 0) return { ok: false, error: "Esta aula é concluída automaticamente após todos os checks e respostas." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

export async function alternarCheckEstudoLifeOS(itemId: string, group: "preparation" | "completion", index: number, checked: boolean): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !itemId || !["preparation", "completion"].includes(group) || !Number.isInteger(index) || index < 0) return { ok: false, error: "Checklist inválido." };
  if (checked) {
    const itemLookup = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id, roadmap_id, module_id, order_index, content_role")
      .eq("id", itemId)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    const item = itemLookup.data;
    if (itemLookup.error) {
      if (!isMissingStudyContentRole(itemLookup.error)) return { ok: false, error: itemLookup.error.message };
      const legacyItemLookup = await ctx.supabase.from("perf_study_roadmap_item")
        .select("id, roadmap_id")
        .eq("id", itemId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (legacyItemLookup.error) return { ok: false, error: legacyItemLookup.error.message };
      if (!legacyItemLookup.data?.roadmap_id) return { ok: false, error: "Etapa nao encontrada." };
      const legacyRoadmapLookup = await ctx.supabase.from("perf_study_roadmap")
        .select("source")
        .eq("id", legacyItemLookup.data.roadmap_id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (legacyRoadmapLookup.error) return { ok: false, error: legacyRoadmapLookup.error.message };
      if (!legacyRoadmapLookup.data || legacyRoadmapLookup.data.source === "template") {
        return { ok: false, error: "Execute a migration performance-it-career-roadmaps.sql antes de marcar este desafio." };
      }
    } else if (!item) {
      return { ok: false, error: "Etapa nao encontrada." };
    } else {
      const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
      if (moduleGateError) return { ok: false, error: moduleGateError };
    }
    if (item && ["module_project", "capstone"].includes(item.content_role ?? "") && item.roadmap_id) {
      const { data: earlierPendingGate, error: gateError } = await ctx.supabase.from("perf_study_roadmap_item")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("roadmap_id", item.roadmap_id)
        .in("content_role", ["assessment", "module_project", "capstone"])
        .lt("order_index", item.order_index)
        .neq("status", "completed")
        .limit(1)
        .maybeSingle();
      if (gateError) return { ok: false, error: gateError.message };
      if (earlierPendingGate) return { ok: false, error: "Conclua primeiro as questões e o desafio anterior deste roadmap." };
    }
  }
  const { error } = await ctx.supabase.rpc("perf_toggle_study_check", { p_item_id: itemId, p_group: group, p_index: index, p_checked: checked });
  if (error) return { ok: false, error: error.message.includes("Could not find") ? "Aplique a migration de progresso dos estudos antes de marcar os checks." : error.message };
  reval(); return { ok: true };
}

export async function removerItemEstudoLifeOS(id: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !id) return { ok: false, error: "Materia invalida." };
  const { error } = await ctx.supabase.from("perf_study_roadmap_item").delete().eq("id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  reval(); return { ok: true };
}

const STUDY_ITEM_KINDS = new Set(["core", "reinforcement", "challenge", "check", "criterion", "general", "reading", "video", "audiovisual", "practice", "quiz", "project", "checkpoint"]);

export async function importarRoadmapEstudosLifeOS(payload: string, filename = "roadmap.json"): Promise<GenerateRoadmapResult> {
  const ctx = await requireRoadmapAiUser();
  if (!ctx) return { ok: false, error: "A importacao com IA ainda nao esta liberada para este usuario." };
  if (Buffer.byteLength(payload, "utf8") > ROADMAP_IMPORT_MAX_BYTES) return { ok: false, error: "O arquivo excede o limite de 5 MB." };

  const safeFilename = filename.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 180) || "roadmap.json";
  if (!/\.json$/i.test(safeFilename)) return { ok: false, error: "Importe um arquivo JSON exportado de um roadmap de idioma." };
  try {
    const imported = JSON.parse(payload) as unknown;
    if (!isLanguageRoadmapExport(imported)) {
      return { ok: false, error: "Somente roadmaps de idioma exportados pelo sistema podem ser importados. Carreiras de TI usam o catalogo predefinido." };
    }
  } catch {
    return { ok: false, error: "O arquivo JSON de idioma nao e valido." };
  }
  let source: string;
  try {
    source = prepareRoadmapImportSource(payload);
  } catch (error) {
    return { ok: false, error: roadmapAiError(error) };
  }

  const gateError = await roadmapGenerationGate(ctx);
  if (gateError) return { ok: false, error: gateError };
  const model = process.env.OPENAI_ROADMAP_MODEL?.trim() || "gpt-5.6-sol";
  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  const { data: generation, error: generationError } = await ctx.supabase.from("perf_study_roadmap_generation").insert({
    user_id: ctx.user.id,
    status: "generating",
    answers: { source: "import", roadmapType: "language", filename: safeFilename, characterCount: source.length },
    origin: "import",
    original_filename: safeFilename,
    source_sha256: sourceSha256,
    model,
    prompt_version: ROADMAP_IMPORT_PROMPT_VERSION,
  }).select("id").single();
  if (generationError || !generation) return { ok: false, error: generationError?.message ?? "Nao foi possivel iniciar a importacao." };

  try {
    const response = await getOpenAIClient().responses.parse({
      model,
      reasoning: { effort: openAIReasoningEffort(process.env.OPENAI_ROADMAP_REASONING_EFFORT) },
      instructions: roadmapImportSystemInstructions,
      input: roadmapImportPromptInput(source, safeFilename),
      text: { format: zodTextFormat(generatedRoadmapSchema, "imported_study_roadmap") },
      max_output_tokens: 30_000,
      safety_identifier: createHash("sha256").update(ctx.user.id).digest("hex"),
      store: false,
    });
    if (!response.output_parsed) throw new Error("EMPTY_STRUCTURED_OUTPUT");
    const preview = buildImportedRoadmapPlan(response.output_parsed, hojeISO("America/Bahia"), safeFilename);
    if (!preview.modules.length || !preview.modules.some((roadmapModule) => roadmapModule.steps.length)) throw new Error("EMPTY_ROADMAP");
    const readyError = await persistRoadmapDraft(ctx, generation.id, preview, response, 0);
    if (readyError) return { ok: false, error: readyError };
    reval();
    return { ok: true, generationId: generation.id, preview };
  } catch (error) {
    const message = roadmapAiError(error);
    await ctx.supabase.from("perf_study_roadmap_generation").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", generation.id).eq("user_id", ctx.user.id);
    return { ok: false, error: message };
  }
}
