import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImportedRoadmapPlan,
  buildRoadmapPlan,
  prepareRoadmapImportSource,
  roadmapAiAnswersSchema,
  roadmapDraftStats,
  roadmapGenerationPlanSchema,
  roadmapHorizon,
  roadmapPromptInput,
  roadmapSetupStatus,
  type GeneratedRoadmap,
} from "./study-roadmap-ai";

const answers = roadmapAiAnswersSchema.parse({
  subject: "Ciencia de dados",
  goal: "career",
  goalDetail: "Analisar dados reais e apresentar conclusoes para uma equipe comercial.",
  currentLevel: "beginner",
  useContext: "new_career",
  targetLevel: "autonomous",
  mainObstacle: "direction",
  startDate: "2026-08-03",
  timelineMode: "duration",
  deadline: "",
  durationWeeks: 2,
  availableDays: ["1", "3", "5"],
  minutesPerDay: 60,
  learningFormats: ["reading", "video", "practice", "quiz", "challenge", "project"],
  contentDepth: "balanced",
  pace: "steady",
  requiredMaterials: ["free", "official"],
  finalOutcomes: ["real_project"],
  assessmentPreference: "mixed",
  projectMode: "guided",
  knownTopics: "Planilhas",
  contextNotes: "Usar dados de vendas",
});

function generatedStep(overrides: Partial<GeneratedRoadmap["modules"][number]["steps"][number]> = {}): GeneratedRoadmap["modules"][number]["steps"][number] {
  return {
    title: "Analisar um CSV",
    type: "practice",
    whyItMatters: "Transforma conceitos em uma analise observavel.",
    requirements: "Um arquivo CSV e um editor de planilhas.",
    workspace: "Google Sheets no navegador.",
    instructions: "1. Abra o arquivo.\n2. Limpe os dados.\n3. Registre tres conclusoes.",
    expectedOutcome: "Entregar uma tabela limpa e tres conclusoes justificadas.",
    estimatedMinutes: 45,
    resource: null,
    questions: [],
    ...overrides,
  };
}

function generatedRoadmap(modules: GeneratedRoadmap["modules"]): GeneratedRoadmap {
  return {
    title: "Dados na pratica",
    description: "Curriculo para aprender por meio de analises reais.",
    diagnosis: "Iniciante com experiencia em planilhas.",
    recommendedCadence: "Conclua um modulo antes de iniciar o seguinte.",
    difficultyLevel: "introductory",
    modules,
  };
}

test("roadmapHorizon usa os dias apenas para calcular capacidade", () => {
  const result = roadmapHorizon(answers);
  assert.equal(result.targetDate, "2026-08-16");
  assert.deepEqual(result.availableDates, ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10", "2026-08-12", "2026-08-14"]);
  assert.equal(result.capacityMinutes, 360);
});

test("roadmapPromptInput limita o plano a uma etapa relevante por sessao", () => {
  const input = JSON.parse(roadmapPromptInput(answers));
  assert.equal(input.capacity.availableSessions, 6);
  assert.equal(input.capacity.maximumSteps, 6);
  assert.equal(input.capacity.targetPlannedMinutes, 288);
  assert.match(input.learner.digitalLiteracy, /instrucoes literais/);
  assert.equal(input.learner.mainDevice, "Windows");
});

test("roadmapSetupStatus aumenta definicao e carga conforme as escolhas", () => {
  const sparse = roadmapSetupStatus({ subject: "Power BI", learningFormats: ["video"] });
  const detailed = roadmapSetupStatus(answers);
  assert.ok(detailed.completeness > sparse.completeness);
  assert.ok(detailed.workload > sparse.workload);
  assert.equal(detailed.qualityLabel, "Sob medida");
});

test("prepareRoadmapImportSource limpa o arquivo sem interpretar seu conteudo", () => {
  assert.equal(
    prepareRoadmapImportSource('{\n  "title": "Plano",\n  "sections": []\n}\0'),
    '{"title":"Plano","sections":[]}',
  );
  assert.throws(() => prepareRoadmapImportSource("  \0  "), /EMPTY_IMPORT_FILE/);
});

test("buildRoadmapPlan cria modulos sem datas, remove repeticao e valida recursos", () => {
  const result = buildRoadmapPlan(generatedRoadmap([{
    title: "Fundamentos",
    objective: "Preparar e analisar um conjunto de dados.",
    successCriteria: "Explicar as decisoes de limpeza e sustentar as conclusoes.",
    topics: ["CSV", "limpeza", "analise"],
    steps: [
      generatedStep(),
      generatedStep(),
      generatedStep({
        title: "Video sobre limpeza",
        type: "video",
        resource: { title: "Limpeza de dados", url: "https://www.youtube.com/watch?v=abc12345678", channel: "Canal Dados" },
      }),
      generatedStep({
        title: "Video sem fonte valida",
        type: "video",
        resource: { title: "Busca", url: "https://www.youtube.com/results?search_query=dados", channel: "YouTube" },
      }),
      generatedStep({
        title: "Prova de fundamentos",
        type: "quiz",
        estimatedMinutes: 90,
        questions: [{ questionType: "multiple_choice", prompt: "Qual etapa vem antes da analise?", options: ["Limpeza", "Publicacao", "Design"], correctOptionIndex: 0, correctOrder: [], explanation: "Dados inconsistentes comprometem a analise." }],
      }),
    ],
  }]), answers);

  assert.equal(result.modules.length, 1);
  assert.equal(result.modules[0].steps.length, 4);
  assert.equal(result.modules[0].steps[1].resourceUrl, "https://www.youtube.com/watch?v=abc12345678");
  assert.equal(result.modules[0].steps[2].resourceUrl, null);
  assert.equal(result.modules[0].steps[3].estimatedMinutes, 60);
  assert.equal(result.modules[0].steps[3].questions.length, 1);
  assert.equal(result.modules[0].steps[0].requirements, "Um arquivo CSV e um editor de planilhas.");
  assert.equal(result.modules[0].steps[0].workspace, "Google Sheets no navegador.");
  assert.equal("scheduledDate" in result.modules[0].steps[0], false);
});

test("buildRoadmapPlan resume competencias e calcula o tempo do modulo pelas etapas", () => {
  const result = buildRoadmapPlan(generatedRoadmap([{
    title: "Modulo executavel",
    objective: "Entregar dois exercicios verificaveis.",
    successCriteria: "Executar e explicar os dois resultados.",
    topics: ["Python", "VS Code", "Git", "GitHub", "Tipos", "Condicionais", "Funcoes", "Testes", "README", "Terminal"],
    steps: [generatedStep({ title: "Etapa um", estimatedMinutes: 30 }), generatedStep({ title: "Etapa dois", estimatedMinutes: 45 })],
  }]), answers);

  assert.equal(result.modules[0].topics.length, 8);
  assert.equal(result.modules[0].estimatedMinutes, 75);
  assert.equal(result.totalEstimatedMinutes, 75);
});

test("buildRoadmapPlan preserva perguntas de ordenacao validas", () => {
  const result = buildRoadmapPlan(generatedRoadmap([{
    title: "Fluxo de analise",
    objective: "Executar uma analise na ordem correta.",
    successCriteria: "Justificar cada etapa do fluxo.",
    topics: ["Processo"],
    steps: [generatedStep({
      questions: [{
        questionType: "ordering",
        prompt: "Ordene o fluxo de tratamento dos dados.",
        options: ["Publicar", "Importar", "Validar", "Limpar"],
        correctOptionIndex: null,
        correctOrder: [1, 3, 2, 0],
        explanation: "Primeiro os dados entram, depois sao limpos e validados antes da publicacao.",
      }],
    })],
  }]), answers);

  assert.deepEqual(result.modules[0].steps[0].questions[0], {
    questionType: "ordering",
    prompt: "Ordene o fluxo de tratamento dos dados.",
    options: ["Publicar", "Importar", "Validar", "Limpar"],
    correctOptionIndex: null,
    correctOrder: [1, 3, 2, 0],
    explanation: "Primeiro os dados entram, depois sao limpos e validados antes da publicacao.",
  });
});

test("roadmapGenerationPlanSchema mantem rascunhos antigos compativeis", () => {
  const current = buildRoadmapPlan(generatedRoadmap([{
    title: "Fundamentos",
    objective: "Aprender o fluxo.",
    successCriteria: "Executar o fluxo.",
    topics: ["Fluxo"],
    steps: [generatedStep({
      questions: [{ questionType: "multiple_choice", prompt: "Qual vem primeiro?", options: ["Importar", "Publicar"], correctOptionIndex: 0, correctOrder: [], explanation: "Primeiro importe." }],
    })],
  }]), answers);
  const legacy = structuredClone(current) as unknown as Record<string, unknown>;
  const legacyStep = ((legacy.modules as Array<{ steps: Array<Record<string, unknown>> }>)[0].steps[0]);
  delete legacyStep.requirements;
  delete legacyStep.workspace;
  const legacyQuestion = (legacyStep.questions as Array<Record<string, unknown>>)[0];
  delete legacyQuestion.questionType;
  delete legacyQuestion.correctOrder;

  const parsed = roadmapGenerationPlanSchema.parse(legacy);
  assert.equal(parsed.modules[0].steps[0].requirements, "");
  assert.equal(parsed.modules[0].steps[0].workspace, "");
  assert.equal(parsed.modules[0].steps[0].questions[0].questionType, "multiple_choice");
  assert.deepEqual(parsed.modules[0].steps[0].questions[0].correctOrder, []);
});

test("buildRoadmapPlan limita as etapas a quantidade de sessoes informada", () => {
  const modules = Array.from({ length: 8 }, (_, moduleIndex) => ({
    title: `Modulo ${moduleIndex + 1}`,
    objective: "Objetivo",
    successCriteria: "Criterio",
    topics: ["Topico"],
    steps: Array.from({ length: 40 }, (_, stepIndex) => generatedStep({ title: `Atividade ${moduleIndex + 1}-${stepIndex + 1}` })),
  }));
  const result = buildRoadmapPlan(generatedRoadmap(modules), answers);
  assert.equal(result.modules.flatMap((module) => module.steps).length, 6);
  assert.equal(result.modules.length, 1);
  assert.ok(result.totalEstimatedMinutes <= roadmapHorizon(answers).capacityMinutes);
});

test("buildImportedRoadmapPlan preserva recurso seguro e cria uma janela sem datas por aula", () => {
  const imported = buildImportedRoadmapPlan(generatedRoadmap([{
    title: "Documentacao essencial",
    objective: "Compreender a fonte principal.",
    successCriteria: "Aplicar a documentacao em um exemplo.",
    topics: ["Documentacao"],
    steps: [generatedStep({
      title: "Ler o guia oficial",
      type: "reading",
      estimatedMinutes: 300,
      resource: { title: "Guia oficial", url: "https://example.com/guia", channel: "Documentacao" },
    })],
  }]), "2026-08-03", "a.md");

  assert.equal(imported.modules[0].steps[0].resourceUrl, "https://example.com/guia");
  assert.equal(imported.modules[0].steps[0].estimatedMinutes, 300);
  assert.deepEqual(imported.selectedFormats, ["reading"]);
  assert.equal(imported.totalWeeks, 2);
  assert.equal(imported.targetDate, "2026-08-16");
  assert.equal("scheduledDate" in imported.modules[0].steps[0], false);
  assert.deepEqual(roadmapDraftStats(imported), {
    title: "Dados na pratica",
    description: "Curriculo para aprender por meio de analises reais.",
    moduleCount: 1,
    stepCount: 1,
    totalEstimatedMinutes: 300,
  });
});
