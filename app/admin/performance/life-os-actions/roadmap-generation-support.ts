import "server-only";

import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { addDays, hojeISO } from "@/lib/performance";
import { getOpenAIClient } from "@/lib/openai";
import { openAIReasoningEffort, openAIRoadmapMaxOutputTokens } from "@/lib/openai-config";
import { buildRoadmapPlan, generatedRoadmapSchema, languageRoadmapSystemInstructions, ROADMAP_AI_DAILY_LIMIT, ROADMAP_IMPORT_AI_MAX_CHARS, roadmapDailyLimitReached, roadmapDraftStats, roadmapPromptInput, roadmapSystemInstructions, type GenerateRoadmapResult, type RoadmapAiAnswers } from "@/lib/study-roadmap-ai";
import { createAdminClient, requireRoadmapAiUser, reval } from "./shared";

export type RoadmapAiContext = NonNullable<Awaited<ReturnType<typeof requireRoadmapAiUser>>>;

export async function roadmapGenerationGate(ctx: RoadmapAiContext): Promise<string | null> {
  const today = hojeISO("America/Bahia");
  const tomorrow = addDays(today, 1);
  const [modulesCheck, draftsCheck, itemDetailsCheck, referenceStandardCheck, questionTypesCheck, countResult] = await Promise.all([
    ctx.supabase.from("perf_study_roadmap_module").select("id").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_generation").select("id, origin, preview_title").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, requirements, workspace").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase.from("perf_study_roadmap_item").select("id, preparation_steps, practice_exercises, reflection_questions, completion_checklist, evidence_prompt").eq("user_id", ctx.user.id).limit(1),
    createAdminClient().from("perf_study_assessment_question").select("id, question_type, correct_order").eq("user_id", ctx.user.id).limit(1),
    ctx.supabase
      .from("perf_study_roadmap_generation")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user.id)
      .in("status", ["generating", "ready", "accepted"])
      .gte("created_at", `${today}T00:00:00-03:00`)
      .lt("created_at", `${tomorrow}T00:00:00-03:00`),
  ]);
  if (modulesCheck.error) return "Execute a migration performance-study-modules.sql antes de gerar um novo roadmap.";
  if (draftsCheck.error) return "Execute a migration performance-roadmap-drafts.sql antes de gerar ou importar um roadmap.";
  if (itemDetailsCheck.error || questionTypesCheck.error) return "Execute a migration performance-study-question-types.sql antes de gerar ou importar um roadmap.";
  if (referenceStandardCheck.error) return "Execute a migration performance-study-reference-standard.sql antes de gerar ou importar um novo roadmap.";
  if (!ctx.isAdmin && countResult.error) return "Nao foi possivel verificar o limite diario de geracoes.";
  if (roadmapDailyLimitReached(countResult.count ?? 0, ctx.isAdmin)) return `Limite de seguranca de ${ROADMAP_AI_DAILY_LIMIT} geracoes por dia atingido.`;
  return null;
}

export async function persistRoadmapDraft(
  ctx: RoadmapAiContext,
  generationId: string,
  preview: NonNullable<GenerateRoadmapResult["preview"]>,
  response: { id: string; usage?: { input_tokens?: number; output_tokens?: number } | null },
  webSearchCalls: number,
): Promise<string | null> {
  const stats = roadmapDraftStats(preview);
  const { error } = await ctx.supabase.from("perf_study_roadmap_generation").update({
    status: "ready",
    generated_plan: preview,
    preview_title: stats.title,
    preview_description: stats.description,
    module_count: stats.moduleCount,
    step_count: stats.stepCount,
    total_estimated_minutes: stats.totalEstimatedMinutes,
    provider_response_id: response.id,
    input_tokens: response.usage?.input_tokens ?? null,
    output_tokens: response.usage?.output_tokens ?? null,
    web_search_calls: webSearchCalls,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", generationId).eq("user_id", ctx.user.id);
  return error?.message ?? null;
}

export function roadmapAiError(error: unknown): string {
  if (error instanceof Error && error.message === "OPENAI_API_KEY_NOT_CONFIGURED") return "A chave da OpenAI ainda nao foi configurada no servidor.";
  if (error instanceof Error && error.message === "EMPTY_IMPORT_FILE") return "O arquivo esta vazio.";
  if (error instanceof Error && error.message === "IMPORT_CONTEXT_TOO_LARGE") return `O texto util do arquivo ultrapassa ${Math.round(ROADMAP_IMPORT_AI_MAX_CHARS / 1_000_000)} milhoes de caracteres. Divida o roadmap em dois arquivos para a IA conseguir revisar tudo sem cortar conteudo.`;
  if (error instanceof Error && error.message === "EMPTY_ROADMAP") return "A IA nao encontrou conteudo suficiente para montar um roadmap.";
  if (error instanceof Error && error.message === "EMPTY_STRUCTURED_OUTPUT") return "A IA concluiu a solicitacao, mas nao devolveu um roadmap valido. Tente novamente.";
  if (error instanceof Error && error.message === "INVALID_STRUCTURED_OUTPUT") return "A IA devolveu um roadmap fora do formato esperado. Tente novamente; suas respostas continuam salvas.";
  if (error instanceof Error && error.message === "ROADMAP_OUTPUT_LIMIT") return "A IA atingiu o limite configurado mesmo com o orcamento ampliado. Tente reduzir a profundidade ou dividir o objetivo em duas trilhas.";
  if (error instanceof Error && error.message === "ROADMAP_CONTENT_FILTER") return "A resposta foi interrompida pelo filtro de seguranca da OpenAI. Revise o objetivo informado e tente novamente.";
  if (error instanceof Error && error.message === "PROVIDER_RESPONSE_CANCELLED") return "A geracao foi cancelada antes de terminar. Tente novamente.";
  if (error instanceof Error && error.message === "DRAFT_PERSIST_FAILED") return "A IA terminou o roadmap, mas o site nao conseguiu salvar o rascunho. Tente novamente.";
  if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || /timed out|timeout/i.test(error.message))) return "A geracao ultrapassou o tempo de conexao com a OpenAI. Tente novamente; suas respostas continuam salvas.";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : null;
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (status === 401) return "A chave da OpenAI foi recusada. Verifique a configuracao do projeto.";
  if (status === 400 || code === "invalid_prompt") return "A OpenAI recusou o conteudo enviado. Revise o objetivo e tente novamente.";
  if (code === "insufficient_quota") return "O projeto da OpenAI esta sem saldo disponivel ou com a cobranca bloqueada.";
  if (status === 429 || code === "rate_limit_exceeded") return "A OpenAI recebeu muitas solicitacoes ao mesmo tempo. Aguarde um pouco e tente novamente.";
  if (status && status >= 500) return "A OpenAI esta temporariamente indisponivel. Tente novamente em alguns minutos.";
  if (error instanceof Error && error.message === "NO_AVAILABLE_DATES") return "Nenhum dia disponivel foi encontrado no periodo escolhido.";
  return "Nao foi possivel gerar o roadmap agora.";
}

export function roadmapGenerationDiagnostic(error: unknown) {
  if (!(error instanceof Error)) return { value: String(error) };
  const details = error as Error & { status?: number; code?: string; type?: string };
  return {
    name: details.name,
    message: details.message,
    status: details.status ?? null,
    code: details.code ?? null,
    type: details.type ?? null,
  };
}

export function roadmapGenerationTitle(answers: RoadmapAiAnswers): string {
  const subject = answers.roadmapType === "language" ? answers.targetLanguage : answers.subject;
  return `Roadmap de ${subject}`.trim().slice(0, 160);
}

export function providerResponseError(response: OpenAIResponse): Error | null {
  if (response.status === "completed") return null;
  if (response.status === "queued" || response.status === "in_progress") return null;
  if (response.status === "incomplete") {
    return new Error(response.incomplete_details?.reason === "max_output_tokens" ? "ROADMAP_OUTPUT_LIMIT" : "ROADMAP_CONTENT_FILTER");
  }
  if (response.status === "cancelled") return new Error("PROVIDER_RESPONSE_CANCELLED");
  const error = new Error(response.error?.message || "PROVIDER_RESPONSE_FAILED") as Error & { code?: string };
  error.code = response.error?.code;
  return error;
}

export function parseProviderRoadmap(response: OpenAIResponse) {
  const responseError = providerResponseError(response);
  if (responseError) throw responseError;
  if (response.status !== "completed" || !response.output_text) throw new Error("EMPTY_STRUCTURED_OUTPUT");
  let raw: unknown;
  try {
    raw = JSON.parse(response.output_text);
  } catch {
    throw new Error("INVALID_STRUCTURED_OUTPUT");
  }
  const parsed = generatedRoadmapSchema.safeParse(raw);
  if (!parsed.success) throw new Error("INVALID_STRUCTURED_OUTPUT");
  return parsed.data;
}

export async function finalizeRoadmapProviderResponse(
  ctx: RoadmapAiContext,
  generationId: string,
  answers: RoadmapAiAnswers,
  response: OpenAIResponse,
): Promise<boolean> {
  if (response.status === "queued" || response.status === "in_progress") return false;
  const generated = parseProviderRoadmap(response);
  const preview = buildRoadmapPlan(generated, answers);
  if (!preview.modules.length || !preview.modules.some((roadmapModule) => roadmapModule.steps.length)) throw new Error("EMPTY_ROADMAP");
  const webSearchCalls = response.output.filter((item) => item.type === "web_search_call").length;
  const readyError = await persistRoadmapDraft(ctx, generationId, preview, response, webSearchCalls);
  if (readyError) throw new Error("DRAFT_PERSIST_FAILED");
  return true;
}

export async function failRoadmapGeneration(ctx: RoadmapAiContext, generationId: string, error: unknown): Promise<void> {
  console.error("[roadmap-ai] generation failed", generationId, roadmapGenerationDiagnostic(error));
  const message = roadmapAiError(error);
  await ctx.supabase.from("perf_study_roadmap_generation").update({
    status: "failed",
    error_message: message,
    updated_at: new Date().toISOString(),
  }).eq("id", generationId).eq("user_id", ctx.user.id);
}

export async function processRoadmapGeneration(
  ctx: RoadmapAiContext,
  generationId: string,
  answers: RoadmapAiAnswers,
  model: string,
  attemptId: string,
): Promise<void> {
  try {
    if (answers.roadmapType !== "language") throw new Error("IT_ROADMAPS_USE_PREDEFINED_CATALOG");
    const shouldSearchVideos = answers.learningFormats.includes("video");
    const shouldSearchExternalMaterials = answers.requiredMaterials.some((material) => ["course", "book"].includes(material));
    const shouldSearchResources = shouldSearchVideos || shouldSearchExternalMaterials;
    const response = await getOpenAIClient().responses.create({
      model,
      reasoning: { effort: openAIReasoningEffort(process.env.OPENAI_ROADMAP_REASONING_EFFORT) },
      instructions: answers.roadmapType === "language" ? languageRoadmapSystemInstructions : roadmapSystemInstructions,
      input: roadmapPromptInput(answers),
      text: { format: zodTextFormat(generatedRoadmapSchema, "study_roadmap") },
      ...(shouldSearchResources ? {
        tools: [{
          type: "web_search" as const,
          ...(!shouldSearchExternalMaterials ? { filters: { allowed_domains: ["youtube.com", "youtu.be"] } } : {}),
          search_context_size: "medium" as const,
          user_location: { type: "approximate" as const, country: "BR", timezone: "America/Bahia" },
        }],
        tool_choice: "auto" as const,
        max_tool_calls: 8,
      } : {}),
      max_output_tokens: openAIRoadmapMaxOutputTokens(process.env.OPENAI_ROADMAP_MAX_OUTPUT_TOKENS),
      safety_identifier: createHash("sha256").update(ctx.user.id).digest("hex"),
      background: true,
      store: true,
      metadata: { generation_id: generationId },
    }, {
      timeout: 60_000,
      maxRetries: 1,
      idempotencyKey: `roadmap-${generationId}-${attemptId}`,
    });
    const { error: providerIdError } = await ctx.supabase.from("perf_study_roadmap_generation").update({
      provider_response_id: response.id,
      updated_at: new Date().toISOString(),
    }).eq("id", generationId).eq("user_id", ctx.user.id).eq("status", "generating");
    if (providerIdError) throw new Error("DRAFT_PERSIST_FAILED");
    await finalizeRoadmapProviderResponse(ctx, generationId, answers, response);
  } catch (error) {
    await failRoadmapGeneration(ctx, generationId, error);
  } finally {
    reval();
  }
}
