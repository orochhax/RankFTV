import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImportedRoadmapPlan,
  buildRoadmapPlan,
  languageRoadmapSystemInstructions,
  prepareRoadmapImportSource,
  roadmapDailyLimitReached,
  roadmapAiAnswersSchema,
  roadmapDraftStats,
  roadmapGenerationPlanSchema,
  roadmapHorizon,
  roadmapLanguageFormats,
  roadmapPromptInput,
  roadmapSetupStatus,
  roadmapSystemInstructions,
  studyClockToMinutes,
  studyMinutesToClock,
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
  learningFormats: ["reading", "video", "practice", "challenge"],
  contentDepth: "balanced",
  pace: "steady",
  requiredMaterials: ["official"],
  materialBudget: "free_only",
  ownedMaterials: "",
  finalOutcomes: [],
  assessmentPreference: "mixed",
  projectMode: "guided",
  knownTopics: "Planilhas",
  contextNotes: "Usar dados de vendas",
});

const languageAnswers = roadmapAiAnswersSchema.parse({
  ...answers,
  roadmapType: "language",
  subject: "Idioma Ingles",
  goal: "personal",
  goalDetail: "Participar de reunioes e conversar sobre tecnologia sem traduzir cada frase.",
  currentLevel: "unknown",
  useContext: "personal_project",
  targetLevel: "autonomous",
  mainObstacle: "practice",
  nativeLanguage: "Portugues (Brasil)",
  targetLanguage: "Ingles",
  languageVariant: "Ingles americano",
  languageCurrentLevel: "a1",
  languageTargetLevel: "b1",
  languagePurpose: "work",
  languageSkills: ["speaking", "listening", "writing"],
  languageActivities: ["guided_writing", "conversation", "video", "sentence_completion", "real_life_tasks"],
  languageExposure: "occasional",
  languageObstacle: "speaking_anxiety",
  languagePracticeAccess: ["solo", "ai"],
  languageContexts: ["meetings", "presentations", "travel_services"],
  languageSituations: "Reunioes por video, apresentacoes curtas e conversas durante viagens.",
  languageInterests: "Tecnologia, futevolei, negocios e viagens.",
  learningFormats: ["video", "practice", "challenge"],
});

function generatedStep(overrides: Partial<GeneratedRoadmap["modules"][number]["steps"][number]> = {}): GeneratedRoadmap["modules"][number]["steps"][number] {
  return {
    title: "Analisar um CSV",
    type: "practice",
    whyItMatters: "Transforma conceitos em uma analise observavel.",
    requirements: "Um arquivo CSV e um editor de planilhas.",
    workspace: "Google Sheets no navegador.",
    preparationSteps: ["Baixe o CSV", "Crie uma copia de trabalho"],
    instructions: "1. Abra o arquivo.\n2. Limpe os dados.\n3. Registre tres conclusoes.",
    practiceExercises: ["Refaca a limpeza sem consultar as notas", "Teste uma linha vazia e um valor invalido"],
    reflectionQuestions: ["Qual decisao de limpeza mais altera a conclusao?"],
    completionChecklist: ["A tabela nao possui duplicatas", "As tres conclusoes citam evidencias"],
    evidence: "Planilha limpa e resumo com tres conclusoes.",
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
  assert.equal(input.capacity.availableStudyDays, 6);
  assert.equal(input.capacity.maximumSteps, 6);
  assert.equal(input.capacity.targetPlannedMinutes, 270);
  assert.equal(input.capacity.capacityUsagePercent, 75);
  assert.match(input.learner.digitalLiteracy, /instrucoes literais/);
  assert.equal(input.learner.mainDevice, "Windows");
  assert.equal("primaryGoal" in input.learner, false);
  assert.equal("targetLevel" in input.learner, false);
  assert.equal("finalOutcomes" in input.preferences, false);
  assert.match(input.preferences.materialBudget, /gratuitos/);
});

test("roadmapHorizon usa meses reais sem alterar roadmaps antigos em semanas", () => {
  const monthlyAnswers = roadmapAiAnswersSchema.parse({ ...answers, durationMonths: 6 });
  assert.equal(roadmapHorizon(monthlyAnswers).targetDate, "2027-02-02");
  assert.equal(roadmapHorizon(answers).targetDate, "2026-08-16");
});

test("questionario exige ao menos 30 minutos e identifica material proprio", () => {
  assert.throws(() => roadmapAiAnswersSchema.parse({ ...answers, minutesPerDay: 25 }));
  assert.throws(() => roadmapAiAnswersSchema.parse({ ...answers, requiredMaterials: ["own_material"], ownedMaterials: "" }));
  assert.doesNotThrow(() => roadmapAiAnswersSchema.parse({ ...answers, requiredMaterials: ["own_material"], ownedMaterials: "Curso de Python que ja comprei" }));
});

test("tempo de estudo converte HH:MM sem perder minutos", () => {
  assert.equal(studyMinutesToClock(30), "00:30");
  assert.equal(studyMinutesToClock(90), "01:30");
  assert.equal(studyMinutesToClock(480), "08:00");
  assert.equal(studyClockToMinutes("00:30"), 30);
  assert.equal(studyClockToMinutes("01:30"), 90);
  assert.equal(studyClockToMinutes("08:00"), 480);
  assert.equal(studyClockToMinutes("8:00"), null);
});

test("a IA nunca recebe permissao para criar respostas abertas", () => {
  assert.match(roadmapSystemInstructions, /reflectionQuestions deve ser sempre um array vazio/);
  assert.match(languageRoadmapSystemInstructions, /reflectionQuestions deve ser sempre um array vazio/);
});

test("roadmaps antigos continuam sendo interpretados como trilha de habilidade", () => {
  assert.equal(answers.roadmapType, "skill");
  assert.equal(answers.targetLanguage, "");
  assert.deepEqual(answers.languageActivities, []);
});

test("roadmap de idioma exige perfil linguistico util", () => {
  assert.equal(languageAnswers.roadmapType, "language");
  assert.throws(() => roadmapAiAnswersSchema.parse({
    ...languageAnswers,
    languageContexts: [],
    languageSituations: "",
  }));
  assert.doesNotThrow(() => roadmapAiAnswersSchema.parse({ ...languageAnswers, languageContexts: [], languageSituations: "Entrevista para uma vaga internacional" }));
});

test("metodos de idioma sao convertidos para formatos suportados pelo site", () => {
  assert.deepEqual(
    roadmapLanguageFormats(["guided_writing", "video", "sentence_completion", "conversation", "real_life_tasks"]),
    ["video", "practice", "challenge"],
  );
});

test("roadmapPromptInput envia contexto linguistico personalizado", () => {
  const input = JSON.parse(roadmapPromptInput(languageAnswers));
  assert.equal(input.learningTrack, "language");
  assert.equal(input.learner.targetLanguage, "Ingles");
  assert.equal(input.learner.currentLevel, "A1 - iniciante");
  assert.ok(input.learner.usageContexts.includes("reunioes e videochamadas"));
  assert.match(input.learner.specificSituation, /Reunioes/);
  assert.ok(input.preferences.learningMethods.includes("escrita guiada e reescrita"));
  assert.ok(input.preferences.prioritySkills.includes("fala"));
  assert.equal("digitalLiteracy" in input.learner, false);
  assert.match(languageRoadmapSystemInstructions, /Escrita guiada/);
  assert.match(languageRoadmapSystemInstructions, /completar frases/i);
  assert.match(languageRoadmapSystemInstructions, /filme ou serie/i);
});

test("roadmapSetupStatus aumenta definicao e carga conforme as escolhas", () => {
  const sparse = roadmapSetupStatus({ subject: "Power BI", learningFormats: ["video"] });
  const detailed = roadmapSetupStatus(answers);
  assert.ok(detailed.completeness > sparse.completeness);
  assert.ok(detailed.workload > sparse.workload);
  assert.equal(detailed.qualityLabel, "Sob medida");
});

test("ritmo controla a parcela da capacidade realmente planejada", () => {
  const modules = [{
    title: "Carga",
    objective: "Distribuir a carga.",
    successCriteria: "Concluir as etapas.",
    topics: ["Carga"],
    steps: Array.from({ length: 10 }, (_, index) => generatedStep({ title: `Etapa ${index + 1}`, estimatedMinutes: 60 })),
  }];
  const light = buildRoadmapPlan(generatedRoadmap(modules), roadmapAiAnswersSchema.parse({ ...answers, pace: "light" }));
  const intensive = buildRoadmapPlan(generatedRoadmap(modules), roadmapAiAnswersSchema.parse({ ...answers, pace: "intensive" }));

  assert.equal(light.totalEstimatedMinutes, 216);
  assert.equal(intensive.totalEstimatedMinutes, 324);
});

test("roadmapSetupStatus considera a personalizacao do idioma", () => {
  const sparse = roadmapSetupStatus({ roadmapType: "language", targetLanguage: "Ingles", languageActivities: ["video"] });
  const detailed = roadmapSetupStatus(languageAnswers);
  assert.ok(detailed.completeness > sparse.completeness);
  assert.ok(detailed.workload > sparse.workload);
  assert.equal(detailed.qualityLabel, "Sob medida");
});

test("limite diario nao se aplica ao administrador", () => {
  assert.equal(roadmapDailyLimitReached(2, false), false);
  assert.equal(roadmapDailyLimitReached(3, false), true);
  assert.equal(roadmapDailyLimitReached(1000, true), false);
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
  assert.deepEqual(result.modules[0].steps[0].preparationSteps, ["Baixe o CSV", "Crie uma copia de trabalho"]);
  assert.equal(result.modules[0].steps[0].practiceExercises.length, 2);
  assert.deepEqual(result.modules[0].steps[0].reflectionQuestions, []);
  assert.equal(result.modules[0].steps[0].completionChecklist.length, 2);
  assert.equal(result.modules[0].steps[0].evidence, "Planilha limpa e resumo com tres conclusoes.");
  assert.equal("scheduledDate" in result.modules[0].steps[0], false);
});

test("provas e projetos sao controlados apenas pelas configuracoes proprias", () => {
  const withoutAssessments = roadmapAiAnswersSchema.parse({
    ...answers,
    learningFormats: ["practice", "quiz", "project"],
    assessmentPreference: "none",
    projectMode: "none",
  });
  const result = buildRoadmapPlan(generatedRoadmap([{
    title: "Modulo",
    objective: "Praticar e avaliar.",
    successCriteria: "Concluir o exercicio.",
    topics: ["Pratica"],
    steps: [
      generatedStep({ title: "Exercicio", type: "practice" }),
      generatedStep({ title: "Prova", type: "quiz" }),
      generatedStep({ title: "Projeto", type: "project" }),
    ],
  }]), withoutAssessments);

  assert.deepEqual(result.modules[0].steps.map((step) => step.type), ["practice"]);
  assert.deepEqual(result.selectedFormats, ["practice"]);
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
  delete legacyStep.preparationSteps;
  delete legacyStep.practiceExercises;
  delete legacyStep.reflectionQuestions;
  delete legacyStep.completionChecklist;
  delete legacyStep.evidence;
  const legacyQuestion = (legacyStep.questions as Array<Record<string, unknown>>)[0];
  delete legacyQuestion.questionType;
  delete legacyQuestion.correctOrder;

  const parsed = roadmapGenerationPlanSchema.parse(legacy);
  assert.equal(parsed.modules[0].steps[0].requirements, "");
  assert.equal(parsed.modules[0].steps[0].workspace, "");
  assert.deepEqual(parsed.modules[0].steps[0].preparationSteps, []);
  assert.deepEqual(parsed.modules[0].steps[0].practiceExercises, []);
  assert.deepEqual(parsed.modules[0].steps[0].reflectionQuestions, []);
  assert.deepEqual(parsed.modules[0].steps[0].completionChecklist, []);
  assert.equal(parsed.modules[0].steps[0].evidence, "");
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
