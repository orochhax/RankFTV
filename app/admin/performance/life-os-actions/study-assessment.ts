"use server";

import { hojeISO } from "@/lib/performance";
import { isStudyAnswerCorrect, validStudyAnswer, type SubmittedStudyAnswer } from "@/lib/study-assessment";
import { Res, createAdminClient, requireCeo, reval } from "./shared";
import { previousItCareerModuleCompletionError } from "./it-career-support";

export async function enviarAvaliacaoEstudoLifeOS(itemId: string, submittedAnswers: Record<string, SubmittedStudyAnswer>): Promise<{
  ok: boolean;
  error?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  masteryReached?: boolean;
  feedback?: Array<{ questionId: string; questionType: "multiple_choice" | "ordering"; correct: boolean }>;
}> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  const privileged = createAdminClient();
  if (!submittedAnswers || typeof submittedAnswers !== "object" || Object.keys(submittedAnswers).length > 20) return { ok: false, error: "Respostas invalidas." };

  type AssessmentItemLookup = { id: string; roadmap_id: string | null; module_id: string | null; scheduled_date: string | null; order_index: number; content_role: string | null };
  const itemLookup = await ctx.supabase.from("perf_study_roadmap_item")
    .select("id, roadmap_id, module_id, scheduled_date, order_index, content_role")
    .eq("id", itemId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  let item = itemLookup.data as AssessmentItemLookup | null;
  if (itemLookup.error) {
    const legacyLookup = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
    if (legacyLookup.error) return { ok: false, error: legacyLookup.error.message };
    item = legacyLookup.data ? { id: legacyLookup.data.id, roadmap_id: null, module_id: null, scheduled_date: null, order_index: 0, content_role: null } : null;
  }
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  if (item.content_role === "assessment") {
    const moduleGateError = await previousItCareerModuleCompletionError(ctx, item);
    if (moduleGateError) return { ok: false, error: moduleGateError };
  }
  if (item.content_role === "assessment" && typeof item.scheduled_date === "string") {
    const scheduledDate = item.scheduled_date;
    const today = hojeISO("America/Bahia");
    if (scheduledDate > today) return { ok: false, error: `Este bloco de perguntas fica disponivel em ${scheduledDate}.` };
    const { data: earlierPendingProject, error: projectSequenceError } = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("roadmap_id", item.roadmap_id)
      .in("content_role", ["module_project", "capstone"])
      .lt("order_index", item.order_index)
      .neq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (projectSequenceError) return { ok: false, error: projectSequenceError.message };
    if (earlierPendingProject) return { ok: false, error: "Conclua primeiro o desafio anterior deste roadmap." };
    const { data: earlierPendingQuiz, error: sequenceError } = await ctx.supabase.from("perf_study_roadmap_item")
      .select("id")
      .eq("user_id", ctx.user.id)
      .eq("roadmap_id", item.roadmap_id)
      .eq("content_role", "assessment")
      .not("scheduled_date", "is", null)
      .lt("order_index", item.order_index)
      .neq("status", "completed")
      .limit(1)
      .maybeSingle();
    if (sequenceError) return { ok: false, error: sequenceError.message };
    if (earlierPendingQuiz) return { ok: false, error: "Conclua primeiro o bloco de perguntas anterior deste roadmap." };
  }
  let questionsResult = await privileged.from("perf_study_assessment_question").select("id, question_type, options, correct_option, correct_order").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
  if (questionsResult.error) {
    const legacyResult = await privileged.from("perf_study_assessment_question").select("id, options, correct_option").eq("item_id", itemId).eq("user_id", ctx.user.id).order("order_index").limit(20);
    if (legacyResult.error) return { ok: false, error: legacyResult.error.message };
    questionsResult = {
      ...legacyResult,
      data: (legacyResult.data ?? []).map((question) => ({ ...question, question_type: "multiple_choice", correct_order: [] })),
    };
  }
  const questions = questionsResult.data ?? [];
  if (!questions?.length) return { ok: false, error: "Esta etapa nao possui perguntas." };

  for (const question of questions) {
    const answer = submittedAnswers[question.id];
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    const questionType: "multiple_choice" | "ordering" = question.question_type === "ordering" ? "ordering" : "multiple_choice";
    if (!validStudyAnswer(answer, { questionType, optionCount })) return { ok: false, error: questionType === "ordering" ? "Ordene todas as opcoes antes de enviar." : "Responda todas as perguntas antes de enviar." };
  }

  const feedback = questions.map((question) => {
    const questionType: "multiple_choice" | "ordering" = question.question_type === "ordering" ? "ordering" : "multiple_choice";
    const correctOrder = Array.isArray(question.correct_order)
      ? question.correct_order.map(Number).filter(Number.isInteger)
      : [];
    const answer = submittedAnswers[question.id];
    const gradableQuestion = {
      questionType,
      optionCount: Array.isArray(question.options) ? question.options.length : 0,
      correctOptionIndex: questionType === "multiple_choice" ? Number(question.correct_option) : null,
      correctOrder: questionType === "ordering" ? correctOrder : [],
    };
    return {
      questionId: question.id,
      questionType,
      correct: isStudyAnswerCorrect(answer, gradableQuestion),
    };
  });
  const correctCount = feedback.filter((entry) => entry.correct).length;
  const totalCount = questions.length;
  const score = Math.round((correctCount / totalCount) * 10_000) / 100;
  const masteryReached = score >= 70;
  const { error: attemptError } = await ctx.supabase.rpc("perf_submit_study_attempt", { p_item_id: itemId, p_answers: submittedAnswers });
  if (attemptError) return { ok: false, error: attemptError.message.includes("Could not find") ? "Aplique a migration performance-scheduling-study-progress.sql antes de enviar a avaliação." : attemptError.message };

  reval();
  return { ok: true, score, correctCount, totalCount, masteryReached, feedback };
}

export async function reiniciarAvaliacaoEstudoLifeOS(itemId: string): Promise<Res> {
  const ctx = await requireCeo();
  if (!ctx || !itemId) return { ok: false, error: "Avaliacao invalida." };
  const { data: item } = await ctx.supabase.from("perf_study_roadmap_item").select("id").eq("id", itemId).eq("user_id", ctx.user.id).maybeSingle();
  if (!item) return { ok: false, error: "Etapa nao encontrada." };
  // Uma nova tentativa nao apaga o historico nem revoga uma conclusao valida.
  return { ok: true };
}
