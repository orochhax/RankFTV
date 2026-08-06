import { z } from "zod";
import { addDays, parseISO } from "@/lib/performance";

export const ROADMAP_AI_PROMPT_VERSION = "roadmap-v2";
export const ROADMAP_AI_DAILY_LIMIT = 3;

export const roadmapGoalValues = ["career", "exam", "project", "academic", "personal"] as const;
export const roadmapLevelValues = ["unknown", "beginner", "basic", "intermediate", "advanced"] as const;
export const roadmapTimelineValues = ["duration", "deadline"] as const;
export const roadmapWeekdayValues = ["0", "1", "2", "3", "4", "5", "6"] as const;
export const roadmapLearningFormatValues = ["reading", "video", "practice", "quiz", "challenge", "project"] as const;
export const roadmapDepthValues = ["essential", "balanced", "deep"] as const;
export const roadmapPaceValues = ["light", "steady", "intensive"] as const;
export const roadmapContextValues = ["current_job", "new_career", "freelance", "exam", "academic", "personal_project"] as const;
export const roadmapTargetLevelValues = ["foundation", "functional", "autonomous", "professional"] as const;
export const roadmapObstacleValues = ["direction", "time", "consistency", "theory", "practice", "none"] as const;
export const roadmapMaterialValues = ["free", "official", "documentation", "course", "book", "own_material"] as const;
export const roadmapOutcomeValues = ["knowledge", "portfolio", "real_project", "exam_ready", "job_ready", "teach"] as const;
export const roadmapAssessmentValues = ["none", "quick_quizzes", "module_exams", "practical", "mixed"] as const;
export const roadmapProjectModeValues = ["none", "guided", "per_module", "capstone"] as const;
export const roadmapItemKindValues = ["reading", "video", "practice", "quiz", "challenge", "project", "checkpoint"] as const;
export const roadmapDifficultyValues = ["introductory", "intermediate", "advanced", "mixed"] as const;

export const roadmapAiAnswersSchema = z.object({
  subject: z.string().trim().min(3, "Explique o que voce quer aprender.").max(300),
  goal: z.enum(roadmapGoalValues),
  goalDetail: z.string().trim().min(10, "Descreva o resultado pratico que voce espera.").max(1500),
  currentLevel: z.enum(roadmapLevelValues),
  useContext: z.enum(roadmapContextValues),
  targetLevel: z.enum(roadmapTargetLevelValues),
  mainObstacle: z.enum(roadmapObstacleValues),
  startDate: z.iso.date(),
  timelineMode: z.enum(roadmapTimelineValues),
  deadline: z.union([z.iso.date(), z.literal("")]),
  durationWeeks: z.coerce.number().int().min(1).max(52),
  availableDays: z.array(z.enum(roadmapWeekdayValues)).min(1, "Escolha ao menos um dia disponivel."),
  minutesPerDay: z.coerce.number().int().min(15).max(480),
  learningFormats: z.array(z.enum(roadmapLearningFormatValues)).min(1, "Escolha ao menos um formato de estudo."),
  contentDepth: z.enum(roadmapDepthValues),
  pace: z.enum(roadmapPaceValues),
  requiredMaterials: z.array(z.enum(roadmapMaterialValues)).min(1, "Escolha ao menos uma fonte de material."),
  finalOutcomes: z.array(z.enum(roadmapOutcomeValues)).min(1, "Escolha ao menos um resultado final."),
  assessmentPreference: z.enum(roadmapAssessmentValues),
  projectMode: z.enum(roadmapProjectModeValues),
  knownTopics: z.string().trim().max(2000),
  contextNotes: z.string().trim().max(2000),
}).superRefine((value, context) => {
  if (value.timelineMode === "deadline" && !value.deadline) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "Informe a data final do roadmap." });
  }
  if (value.timelineMode === "deadline" && value.deadline && value.deadline < value.startDate) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "A data final deve ser igual ou posterior ao inicio." });
  }
  if (value.timelineMode === "deadline" && value.deadline && inclusiveDays(value.startDate, value.deadline) > 52 * 7) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "O roadmap pode ter no maximo 52 semanas." });
  }
});

export type RoadmapAiAnswers = z.infer<typeof roadmapAiAnswersSchema>;

export type RoadmapSetupDraft = {
  subject?: string;
  goal?: string;
  goalDetail?: string;
  currentLevel?: string;
  useContext?: string;
  targetLevel?: string;
  mainObstacle?: string;
  startDate?: string;
  timelineMode?: string;
  deadline?: string;
  durationWeeks?: number;
  availableDays?: string[];
  minutesPerDay?: number;
  learningFormats?: string[];
  contentDepth?: string;
  pace?: string;
  requiredMaterials?: string[];
  finalOutcomes?: string[];
  assessmentPreference?: string;
  projectMode?: string;
  knownTopics?: string;
  contextNotes?: string;
};

export type RoadmapSetupStatus = {
  completeness: number;
  workload: number;
  qualityLabel: "Rascunho" | "Base definida" | "Bem detalhado" | "Sob medida";
  workloadLabel: "Leve" | "Moderado" | "Exigente" | "Intenso";
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function roadmapSetupStatus(draft: RoadmapSetupDraft): RoadmapSetupStatus {
  let completeness = 0;
  if ((draft.subject?.trim().length ?? 0) >= 3) completeness += 8;
  if (draft.goal) completeness += 5;
  if ((draft.goalDetail?.trim().length ?? 0) >= 10) completeness += 12;
  if (draft.currentLevel) completeness += 5;
  if (draft.useContext) completeness += 5;
  if (draft.targetLevel) completeness += 5;
  if (draft.mainObstacle) completeness += 4;
  const validTimeline = draft.timelineMode === "duration"
    ? Boolean(draft.durationWeeks && draft.durationWeeks > 0)
    : Boolean(draft.deadline && draft.startDate && draft.deadline >= draft.startDate);
  if (validTimeline) completeness += 10;
  if (draft.availableDays?.length) completeness += 6;
  if (draft.minutesPerDay && draft.minutesPerDay >= 15) completeness += 5;
  const formatCount = draft.learningFormats?.length ?? 0;
  completeness += formatCount >= 3 ? 15 : formatCount === 2 ? 10 : formatCount === 1 ? 5 : 0;
  if (draft.requiredMaterials?.length) completeness += 5;
  if (draft.finalOutcomes?.length) completeness += 5;
  if (draft.contentDepth) completeness += 3;
  if (draft.pace) completeness += 3;
  if (draft.assessmentPreference) completeness += 2;
  if (draft.projectMode) completeness += 2;

  const weeklyMinutes = (draft.minutesPerDay ?? 0) * (draft.availableDays?.length ?? 0);
  const timeLoad = Math.min(40, weeklyMinutes / 20);
  const depthLoad = draft.contentDepth === "deep" ? 20 : draft.contentDepth === "balanced" ? 12 : draft.contentDepth ? 5 : 0;
  const paceLoad = draft.pace === "intensive" ? 20 : draft.pace === "steady" ? 12 : draft.pace ? 5 : 0;
  const formatLoad = Math.min(18, formatCount * 3);
  const projectLoad = draft.projectMode === "capstone" ? 15 : draft.projectMode === "per_module" ? 10 : draft.projectMode === "guided" ? 6 : 0;
  const assessmentLoad = draft.assessmentPreference === "mixed" ? 10 : draft.assessmentPreference === "practical" ? 8 : draft.assessmentPreference === "module_exams" ? 6 : draft.assessmentPreference === "quick_quizzes" ? 4 : 0;
  const workload = clampScore(timeLoad + depthLoad + paceLoad + formatLoad + projectLoad + assessmentLoad);
  const completeScore = clampScore(completeness);

  return {
    completeness: completeScore,
    workload,
    qualityLabel: completeScore >= 85 ? "Sob medida" : completeScore >= 65 ? "Bem detalhado" : completeScore >= 40 ? "Base definida" : "Rascunho",
    workloadLabel: workload >= 75 ? "Intenso" : workload >= 55 ? "Exigente" : workload >= 30 ? "Moderado" : "Leve",
  };
}

const generatedQuestionSchema = z.object({
  prompt: z.string(),
  options: z.array(z.string()),
  correctOptionIndex: z.number(),
  explanation: z.string(),
});

const generatedResourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  channel: z.string(),
});

export const generatedRoadmapSchema = z.object({
  title: z.string(),
  description: z.string(),
  diagnosis: z.string(),
  recommendedCadence: z.string(),
  difficultyLevel: z.enum(roadmapDifficultyValues),
  modules: z.array(z.object({
    title: z.string(),
    objective: z.string(),
    successCriteria: z.string(),
    topics: z.array(z.string()),
    steps: z.array(z.object({
      title: z.string(),
      type: z.enum(roadmapItemKindValues),
      whyItMatters: z.string(),
      instructions: z.string(),
      expectedOutcome: z.string(),
      estimatedMinutes: z.number(),
      resource: generatedResourceSchema.nullable(),
      questions: z.array(generatedQuestionSchema),
    })),
  })),
});

export type GeneratedRoadmap = z.infer<typeof generatedRoadmapSchema>;

const roadmapQuestionPlanSchema = z.object({
  prompt: z.string().min(3).max(1500),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correctOptionIndex: z.number().int().min(0).max(5),
  explanation: z.string().min(3).max(1500),
});

export const roadmapGenerationPlanSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000),
  diagnosis: z.string().max(2000),
  recommendedCadence: z.string().max(1000),
  difficultyLevel: z.enum(roadmapDifficultyValues),
  qualityScore: z.number().int().min(0).max(100),
  workloadScore: z.number().int().min(0).max(100),
  startDate: z.iso.date(),
  targetDate: z.iso.date(),
  totalWeeks: z.number().int().min(1).max(52),
  totalEstimatedMinutes: z.number().int().min(0),
  selectedFormats: z.array(z.enum(roadmapLearningFormatValues)),
  modules: z.array(z.object({
    title: z.string().min(1).max(160),
    objective: z.string().max(1500),
    successCriteria: z.string().max(1500),
    topics: z.array(z.string().min(1).max(300)).max(30),
    estimatedMinutes: z.number().int().min(1),
    steps: z.array(z.object({
      title: z.string().min(1).max(500),
      type: z.enum(roadmapItemKindValues),
      description: z.string().max(2000),
      instructions: z.string().max(5000),
      completionCriteria: z.string().max(1500),
      estimatedMinutes: z.number().int().min(1),
      resourceTitle: z.string().max(500).nullable(),
      resourceUrl: z.string().max(1000).nullable(),
      resourceChannel: z.string().max(300).nullable(),
      questions: z.array(roadmapQuestionPlanSchema).max(10),
    })),
  })),
});

export type RoadmapGenerationPlan = z.infer<typeof roadmapGenerationPlanSchema>;

export type GenerateRoadmapResult = {
  ok: boolean;
  error?: string;
  generationId?: string;
  preview?: RoadmapGenerationPlan;
};

function inclusiveDays(from: string, to: string): number {
  return Math.floor((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1;
}

export function roadmapHorizon(answers: RoadmapAiAnswers): { targetDate: string; totalWeeks: number; availableDates: string[]; capacityMinutes: number } {
  const fallbackTarget = addDays(answers.startDate, answers.durationWeeks * 7 - 1);
  const targetDate = answers.timelineMode === "deadline" && answers.deadline ? answers.deadline : fallbackTarget;
  const totalWeeks = Math.max(1, Math.min(52, Math.ceil(inclusiveDays(answers.startDate, targetDate) / 7)));
  const allowed = new Set(answers.availableDays.map(Number));
  const availableDates: string[] = [];
  for (let date = answers.startDate; date <= targetDate; date = addDays(date, 1)) {
    if (allowed.has(parseISO(date).getDay())) availableDates.push(date);
  }
  return { targetDate, totalWeeks, availableDates, capacityMinutes: availableDates.length * answers.minutesPerDay };
}

function normalizeText(value: string, fallback: string, max: number): string {
  return value.trim().slice(0, max) || fallback;
}

function normalizeYoutubeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtu.be" && url.pathname.slice(1).length >= 6) return url.toString();
    if ((hostname === "youtube.com" || hostname === "m.youtube.com") && url.pathname === "/watch" && url.searchParams.get("v")) return url.toString();
  } catch {
    return null;
  }
  return null;
}

function normalizeQuestions(questions: GeneratedRoadmap["modules"][number]["steps"][number]["questions"]): RoadmapGenerationPlan["modules"][number]["steps"][number]["questions"] {
  const prompts = new Set<string>();
  const normalized: RoadmapGenerationPlan["modules"][number]["steps"][number]["questions"] = [];
  for (const question of questions.slice(0, 10)) {
    const prompt = normalizeText(question.prompt, "", 1500);
    const key = prompt.toLocaleLowerCase("pt-BR");
    if (!prompt || prompts.has(key)) continue;
    const options = question.options.map((option) => option.trim().slice(0, 500)).filter(Boolean).filter((option, index, all) => all.indexOf(option) === index).slice(0, 6);
    const correctOptionIndex = Math.round(question.correctOptionIndex);
    if (options.length < 2 || correctOptionIndex < 0 || correctOptionIndex >= options.length) continue;
    prompts.add(key);
    normalized.push({
      prompt,
      options,
      correctOptionIndex,
      explanation: normalizeText(question.explanation, "Revise o conteudo deste modulo.", 1500),
    });
  }
  return normalized;
}

export function buildRoadmapPlan(generated: GeneratedRoadmap, answers: RoadmapAiAnswers): RoadmapGenerationPlan {
  const horizon = roadmapHorizon(answers);
  if (!horizon.availableDates.length) throw new Error("NO_AVAILABLE_DATES");
  const setup = roadmapSetupStatus(answers);
  const selectedTypes = new Set<string>([...answers.learningFormats, "checkpoint"]);
  const seenSteps = new Set<string>();
  let stepsRemaining = 240;
  let totalEstimatedMinutes = 0;
  const modules: RoadmapGenerationPlan["modules"] = [];

  for (const roadmapModule of generated.modules.slice(0, 16)) {
    if (stepsRemaining <= 0) break;
    const steps: RoadmapGenerationPlan["modules"][number]["steps"] = [];
    for (const step of roadmapModule.steps.slice(0, Math.min(40, stepsRemaining))) {
      if (!selectedTypes.has(step.type)) continue;
      const title = normalizeText(step.title, "Etapa de estudo", 500);
      const stepKey = `${step.type}:${title.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ")}`;
      if (seenSteps.has(stepKey)) continue;
      seenSteps.add(stepKey);
      const estimatedMinutes = Math.max(10, Math.min(answers.minutesPerDay, Math.round(step.estimatedMinutes || 30)));
      const youtubeUrl = step.type === "video" && step.resource ? normalizeYoutubeUrl(step.resource.url) : null;
      const questions = ["quiz", "checkpoint", "practice"].includes(step.type) ? normalizeQuestions(step.questions) : [];
      steps.push({
        title,
        type: step.type,
        description: normalizeText(step.whyItMatters, "Parte necessaria para avancar no modulo.", 2000),
        instructions: normalizeText(step.instructions, "Siga as orientacoes e produza o resultado solicitado.", 5000),
        completionCriteria: normalizeText(step.expectedOutcome, "Concluir o resultado pratico descrito.", 1500),
        estimatedMinutes,
        resourceTitle: youtubeUrl ? normalizeText(step.resource?.title ?? "", "Video recomendado", 500) : null,
        resourceUrl: youtubeUrl,
        resourceChannel: youtubeUrl ? normalizeText(step.resource?.channel ?? "", "YouTube", 300) : null,
        questions,
      });
      totalEstimatedMinutes += estimatedMinutes;
      stepsRemaining -= 1;
      if (stepsRemaining <= 0) break;
    }
    if (!steps.length) continue;
    modules.push({
      title: normalizeText(roadmapModule.title, `Modulo ${modules.length + 1}`, 160),
      objective: normalizeText(roadmapModule.objective, "Desenvolver dominio pratico sobre os topicos do modulo.", 1500),
      successCriteria: normalizeText(roadmapModule.successCriteria, "Aplicar os conhecimentos sem depender de um tutorial passo a passo.", 1500),
      topics: roadmapModule.topics.map((topic) => topic.trim().slice(0, 300)).filter(Boolean).filter((topic, index, all) => all.indexOf(topic) === index).slice(0, 30),
      estimatedMinutes: steps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
      steps,
    });
  }

  return roadmapGenerationPlanSchema.parse({
    title: normalizeText(generated.title, `Roadmap de ${answers.subject}`, 160),
    description: normalizeText(generated.description, `Plano pratico para aprender ${answers.subject}.`, 2000),
    diagnosis: normalizeText(generated.diagnosis, "Plano criado com base nas respostas informadas.", 2000),
    recommendedCadence: normalizeText(generated.recommendedCadence, "Avance no seu ritmo e conclua um modulo antes de iniciar o seguinte.", 1000),
    difficultyLevel: generated.difficultyLevel,
    qualityScore: setup.completeness,
    workloadScore: setup.workload,
    startDate: answers.startDate,
    targetDate: horizon.targetDate,
    totalWeeks: horizon.totalWeeks,
    totalEstimatedMinutes,
    selectedFormats: answers.learningFormats,
    modules,
  });
}

const labels = {
  goals: { career: "carreira ou emprego", exam: "prova ou certificacao", project: "construir um projeto", academic: "formacao academica", personal: "conhecimento pessoal" },
  levels: { unknown: "nao sabe o nivel", beginner: "iniciante", basic: "basico", intermediate: "intermediario", advanced: "avancado" },
  contexts: { current_job: "trabalho atual", new_career: "transicao de carreira", freelance: "servicos freelance", exam: "prova ou certificacao", academic: "faculdade ou escola", personal_project: "projeto pessoal" },
  targets: { foundation: "compreender fundamentos", functional: "usar com orientacao", autonomous: "trabalhar com autonomia", professional: "nivel profissional" },
  obstacles: { direction: "falta de direcao", time: "pouco tempo", consistency: "dificuldade de manter constancia", theory: "excesso de teoria", practice: "falta de pratica", none: "nenhum obstaculo principal" },
  formats: { reading: "leituras orientadas", video: "videoaulas gratuitas", practice: "atividades praticas", quiz: "quizzes e provas", challenge: "desafios", project: "projetos completos" },
  materials: { free: "recursos gratuitos", official: "fontes oficiais", documentation: "documentacao", course: "curso estruturado", book: "livro ou apostila", own_material: "material proprio" },
  outcomes: { knowledge: "dominio conceitual", portfolio: "item de portfolio", real_project: "projeto real concluido", exam_ready: "pronto para prova", job_ready: "pronto para atuar", teach: "capaz de explicar para outra pessoa" },
} as const;

function mapLabels<T extends readonly string[]>(values: T, dictionary: Record<string, string>): string[] {
  return values.map((value) => dictionary[value] ?? value);
}

export function roadmapPromptInput(answers: RoadmapAiAnswers): string {
  const horizon = roadmapHorizon(answers);
  const maximumSteps = Math.min(96, Math.max(4, horizon.availableDates.length));
  return JSON.stringify({
    learner: {
      subject: answers.subject,
      primaryGoal: labels.goals[answers.goal],
      practicalGoal: answers.goalDetail,
      currentLevel: labels.levels[answers.currentLevel],
      useContext: labels.contexts[answers.useContext],
      targetLevel: labels.targets[answers.targetLevel],
      mainObstacle: labels.obstacles[answers.mainObstacle],
      knownTopics: answers.knownTopics || "nao informado",
      additionalContext: answers.contextNotes || "nao informado",
    },
    preferences: {
      formats: mapLabels(answers.learningFormats, labels.formats),
      contentDepth: answers.contentDepth,
      pace: answers.pace,
      materialSources: mapLabels(answers.requiredMaterials, labels.materials),
      finalOutcomes: mapLabels(answers.finalOutcomes, labels.outcomes),
      assessmentPreference: answers.assessmentPreference,
      projectMode: answers.projectMode,
    },
    capacity: {
      totalWeeks: horizon.totalWeeks,
      studyDaysPerWeek: answers.availableDays.length,
      availableSessions: horizon.availableDates.length,
      minutesPerSession: answers.minutesPerDay,
      totalCapacityMinutes: horizon.capacityMinutes,
      targetPlannedMinutes: Math.round(horizon.capacityMinutes * 0.8),
      maximumSteps,
      note: "Os dias servem apenas para dimensionar a carga. Nao atribua datas aos modulos ou passos.",
    },
  });
}

export const roadmapSystemInstructions = `Voce e um arquiteto de curriculos praticos. Crie um caminho de aprendizagem que produza dominio observavel, nao uma lista decorativa de tarefas.

REGRAS DE QUALIDADE
- Organize os modulos em ordem de pre-requisitos. Cada modulo deve preparar o seguinte.
- Evite topicos, titulos ou atividades repetitivas. Cada passo deve adicionar uma habilidade nova ou testar uma habilidade anterior.
- Nao use instrucoes vagas como "estude o assunto", "assista a uma aula" ou "pratique". Em instructions, escreva um passo a passo numerado dizendo exatamente o que fazer primeiro, depois e por ultimo.
- Toda leitura deve informar o que procurar e o que registrar. Toda pratica deve produzir um artefato concreto. Todo desafio deve ter restricoes claras. Todo projeto deve integrar conhecimentos anteriores.
- Cada modulo precisa de objetivo mensuravel e criterio de dominio. Planeje cerca de 80% da capacidade e preserve margem para revisao e imprevistos.
- Nao atribua datas. Os dias e minutos informados servem apenas para dimensionar quantidade, profundidade e duracao dos passos.
- Use somente os formatos pedidos pelo usuario. checkpoint pode ser usado ao final de um modulo quando houver avaliacao.

VIDEOS E FONTES
- Quando video estiver entre os formatos, use web search para encontrar videos gratuitos e publicos no YouTube, em canais confiaveis e diretamente relacionados ao passo.
- Use apenas URL direta no formato youtube.com/watch?v=... ou youtu.be/.... Nao use pagina de busca, playlist, Shorts, canal ou link inventado.
- Se nao encontrar um video confiavel, devolva resource como null. Nunca fabrique uma URL.
- Para passos que nao sejam video, devolva resource como null.

AVALIACOES
- Para quiz e checkpoint, crie de 3 a 6 perguntas de multipla escolha, com alternativas plausiveis, resposta correta e explicacao pedagogica.
- As perguntas devem medir aplicacao e compreensao, nao apenas memorizacao de definicoes.
- Para outros tipos, use questions vazio, exceto quando uma pratica realmente precisar de checagem objetiva.

Escreva todo o conteudo em portugues do Brasil e respeite estritamente o schema de saida.`;
