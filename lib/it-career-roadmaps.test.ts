import assert from "node:assert/strict";
import test from "node:test";
import {
  buildItCareerPlan,
  buildItCareerPreview,
  getItCareerCatalog,
  itCareerCatalogs,
  itCareerIds,
  itCareerInterestIds,
  itCareerInterestOptions,
  itCareerLevelIds,
  itCareerLevelLabels,
  type ItCareerArtifact,
  type ItCareerCatalog,
  type ItCareerInterestId,
  type ItCareerLevelId,
  type ItCareerModuleTemplate,
  type ItCareerPlanSetup,
  type ItCareerProjectSpec,
  type ItCareerQuestion,
} from "./it-career-roadmaps";

function setup(overrides: Partial<ItCareerPlanSetup> = {}): ItCareerPlanSetup {
  return {
    careerId: "frontend",
    currentLevel: "zero",
    targetLevel: "foundation",
    knownTopicIds: [],
    knownTopicPolicy: "validate",
    interestIds: ["technology"],
    includeDailyQuestions: true,
    includeModuleProjects: true,
    includeCapstone: true,
    jobPreparation: false,
    objective: "learning",
    applicationIntent: "none",
    targetRole: "",
    startDate: "2026-08-10",
    timelineMode: "duration",
    durationMonths: 12,
    deadline: "",
    availableDays: ["1", "2", "3", "4", "5"],
    minutesPerDay: 90,
    ...overrides,
  };
}

const forbiddenGenericProjectCopy = /defin(?:a|ir) (?:um|o) problema|escolha (?:um|o) problema|problema escolhido|assuntos definidos|demais t[oó]picos|resolver um problema pr[aá]tico usando|cumprir a miss[aã]o t[eé]cnica|miss[aã]o predefinida/i;
const forbiddenGenericQuestionCopy = /qual conceito pertence|qual a[cç][aã]o conecta corretamente|qual resposta demonstra entendimento aplic[aá]vel|qual conjunto corresponde ao conte[uú]do t[eé]cnico|memorizar termos sem aplic[aá]-los|escolher uma ferramenta somente pela popularidade/i;

function assertTextList(values: string[], minimum: number, maximum: number, label: string): void {
  assert.ok(values.length >= minimum, `${label} precisa de pelo menos ${minimum} itens`);
  assert.ok(values.length <= maximum, `${label} excede ${maximum} itens`);
  assert.equal(new Set(values).size, values.length, `${label} contém itens repetidos`);
  for (const value of values) {
    assert.ok(value.trim(), `${label} contém texto vazio`);
    assert.doesNotMatch(value, forbiddenGenericProjectCopy, `${label} voltou a delegar a definição do projeto ao aluno`);
  }
}

function assertProjectSpecValid(spec: ItCareerProjectSpec): void {
  assert.equal(spec.schemaVersion, 1);
  assert.ok(spec.blueprintId.trim());
  assert.ok(["module_challenge", "capstone"].includes(spec.projectKind));
  assert.ok(itCareerInterestIds.includes(spec.interest.id));
  assert.ok(spec.interest.label.trim());
  assert.ok(spec.projectTitle.trim());
  assert.ok(spec.productDefinition.trim());
  assert.ok(spec.problemStatement.trim());
  assert.ok(spec.targetAudience.trim());
  assert.doesNotMatch(JSON.stringify(spec), forbiddenGenericProjectCopy);

  assertTextList(spec.functionalities, 3, 8, "funcionalidades");
  assert.ok(spec.data.sourceLabel.trim());
  assert.ok(spec.data.acquisitionInstructions.trim());
  assert.ok(["synthetic_generator", "provided_fixture", "public_dataset"].includes(spec.data.sourceType));
  assert.ok(spec.data.entities.length >= 1);
  for (const entity of spec.data.entities) {
    assert.ok(entity.name.trim());
    assert.ok(entity.requiredFields.length >= 3);
    assert.equal(new Set(entity.requiredFields.map((field) => field.name)).size, entity.requiredFields.length);
    for (const field of entity.requiredFields) {
      assert.ok(field.name.trim());
      assert.ok(field.type.trim());
      assert.ok(field.description.trim());
    }
  }
  assertTextList(spec.data.preparationRules, 2, 8, "regras de preparação dos dados");
  assertTextList(spec.technicalConcepts, 1, 20, "conceitos técnicos");
  assertTextList(spec.mandatoryRequirements, 3, 8, "requisitos obrigatórios");
  assertTextList(spec.deliverables, 3, 8, "entregas");
  assertTextList(spec.submissionInstructions, 2, 8, "instruções de entrega");
  assertTextList(spec.outOfScope, 2, 8, "itens fora do escopo");
  assert.ok(spec.implementationFreedom.trim());

  assert.ok(spec.evaluationCriteria.length >= 3);
  assert.ok(spec.evaluationCriteria.length <= 8);
  assert.equal(new Set(spec.evaluationCriteria.map((criterion) => criterion.id)).size, spec.evaluationCriteria.length);
  assert.equal(spec.evaluationCriteria.reduce((sum, criterion) => sum + criterion.weightPercent, 0), 100);
  for (const criterion of spec.evaluationCriteria) {
    assert.ok(criterion.id.trim());
    assert.ok(criterion.label.trim());
    assert.ok(criterion.description.trim());
    assert.ok(criterion.weightPercent > 0);
  }
}

function assertArtifactValid(artifact: ItCareerArtifact): void {
  assert.ok(artifact.id.trim());
  assert.ok(artifact.estimatedMinutes > 0);
  assertProjectSpecValid(artifact.projectSpec);
  assert.ok(artifact.projectSpec.blueprintId.startsWith(`${artifact.id}.`), "blueprintId precisa carregar o id estável do template");
  assert.equal(artifact.title, artifact.projectSpec.projectTitle);
  assert.equal(artifact.objective, artifact.projectSpec.productDefinition);
  assert.equal(artifact.scenario, artifact.projectSpec.problemStatement);
  assert.deepEqual(artifact.requirements, artifact.projectSpec.mandatoryRequirements);
  assert.deepEqual(artifact.constraints, artifact.requirements, "o alias legado precisa refletir os requisitos");
  assert.deepEqual(artifact.deliverables, artifact.projectSpec.deliverables);
  assert.equal(artifact.acceptanceCriteria.length, artifact.projectSpec.evaluationCriteria.length);
  assert.equal(artifact.submissionInstructions, artifact.projectSpec.submissionInstructions.join(" "));
  assert.equal(artifact.evidence, "");
}

function assertQuestionValid(question: ItCareerQuestion): void {
  assert.ok(question.id.trim());
  assert.ok(question.prompt.trim());
  assert.ok(question.explanation.trim());
  assert.equal(question.type, "multiple_choice");
  assert.ok(question.options.length >= 2);
  assert.equal(new Set(question.options).size, question.options.length);
  assert.ok(Number.isInteger(question.correctOptionIndex));
  assert.ok((question.correctOptionIndex ?? -1) >= 0);
  assert.ok((question.correctOptionIndex ?? question.options.length) < question.options.length);
  assert.deepEqual(question.correctOrder, []);
  assert.doesNotMatch(question.prompt, forbiddenGenericQuestionCopy);
  assert.doesNotMatch(question.options.join(" "), forbiddenGenericQuestionCopy);
}

function dailySessions(plan: ReturnType<typeof buildItCareerPlan>) {
  return plan.modules.flatMap((module) => module.topics.flatMap((topic) => topic.dailyQuizzes));
}

function technicalProjects(plan: ReturnType<typeof buildItCareerPlan>) {
  return plan.modules.filter((module) => module.moduleKind !== "capstone").map((module) => module.project);
}

test("o catálogo v4 possui 11 carreiras, interesses fixos e desafios guiados em todos os módulos", () => {
  assert.equal(itCareerIds.length, 11);
  assert.equal(new Set(itCareerIds).size, 11);
  assert.deepEqual(itCareerCatalogs.map((career) => career.id), [...itCareerIds]);
  assert.deepEqual(itCareerLevelIds, ["foundation", "junior", "mid", "senior", "specialist"]);
  assert.equal(itCareerInterestIds.length, 11);
  assert.deepEqual(itCareerInterestOptions.map((interest) => interest.id), [...itCareerInterestIds]);

  for (const career of itCareerCatalogs) {
    assert.equal(career.schemaVersion, 4);
    assert.equal(career.version, 4);
    assertArtifactValid(career.capstone);
    assert.equal(career.capstone.projectSpec.projectKind, "capstone");

    const moduleProducts = new Set<string>();
    const moduleBlueprintIds = new Set<string>();
    for (const level of itCareerLevelIds) {
      const definition: ItCareerCatalog["levels"][ItCareerLevelId] = career.levels[level];
      assert.ok(definition.modules.length > 0, `${career.id}/${level} precisa de módulos`);
      for (const roadmapModule of definition.modules as ItCareerModuleTemplate[]) {
        assert.equal(roadmapModule.level, level);
        assertArtifactValid(roadmapModule.project);
        assert.equal(roadmapModule.project.projectSpec.projectKind, "module_challenge");
        assert.match(roadmapModule.project.title, /^Desafio do módulo —/);
        assert.equal(moduleProducts.has(roadmapModule.project.projectSpec.projectTitle), false, `${career.id} repetiu o mesmo produto em dois módulos`);
        assert.equal(moduleBlueprintIds.has(roadmapModule.project.projectSpec.blueprintId), false, `${career.id} repetiu blueprintId`);
        moduleProducts.add(roadmapModule.project.projectSpec.projectTitle);
        moduleBlueprintIds.add(roadmapModule.project.projectSpec.blueprintId);
        assert.equal("assessment" in roadmapModule, false);
        for (const topic of roadmapModule.topics) {
          assert.ok(topic.title.trim());
          assert.ok(topic.competence.trim());
          assert.ok(topic.studyMinutes > 0);
          assert.ok(topic.reviewMinutes > 0);
          assert.ok(topic.reviewMinutes <= topic.estimatedMinutes);
          assert.equal(topic.estimatedMinutes, topic.studyMinutes);
          assert.ok(topic.subtopics.length >= 2);
          assert.equal("activity" in topic, false);
        }
      }
    }
  }
});

test("identificadores persistíveis do catálogo continuam únicos", () => {
  const ids: string[] = [];
  for (const career of itCareerCatalogs) {
    ids.push(career.id, career.capstone.id);
    for (const level of itCareerLevelIds) {
      for (const roadmapModule of career.levels[level].modules) {
        ids.push(roadmapModule.id, roadmapModule.project.id);
        for (const topic of roadmapModule.topics) ids.push(topic.id);
      }
    }
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("os 110 módulos usam blueprints concretos, estrutura definida e esforço calibrado por nível", () => {
  let projectCount = 0;

  for (const career of itCareerCatalogs) {
    let priorLevelProjectMinutes = 0;
    for (const level of itCareerLevelIds) {
      const projects = career.levels[level].modules.map((roadmapModule) => roadmapModule.project);
      const levelProjectMinutes = projects.reduce((sum, project) => sum + project.estimatedMinutes, 0);
      assert.ok(levelProjectMinutes > priorLevelProjectMinutes, `${career.id}/${level} não aumentou a prática em relação ao nível anterior`);
      priorLevelProjectMinutes = levelProjectMinutes;

      for (const project of projects) {
        projectCount += 1;
        const spec = project.projectSpec;
        assert.match(spec.blueprintId, new RegExp(`^${project.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.module_challenge\\.${level}$`));
        assert.ok(spec.functionalities.some((item) => spec.problemStatement.includes(item.replace(/\.$/, "").toLocaleLowerCase("pt-BR")) || item.length > 45));
        assert.ok(spec.mandatoryRequirements.some((item) => /estruturar a solu[cç][aã]o/i.test(item)));
        assert.ok(spec.mandatoryRequirements.some((item) => /todos os assuntos listados em Conceitos técnicos/i.test(item)));
        assert.ok(spec.mandatoryRequirements.some((item) => /execu[cç][aã]o|entrega|SLO|plataforma|especialista|junior|mid|senior|fundamento/i.test(item)));
        assert.ok(spec.deliverables.some((item) => new RegExp(project.title.replace(/^Desafio do módulo — | sobre .+$/g, "").split(" ")[0], "i").test(item)));
        assert.equal(spec.data.sourceType, "synthetic_generator");
        assert.ok(spec.deliverables.some((item) => /gerador determinístico/i.test(item)));
        assert.equal(spec.deliverables.some((item) => /fornecid[ao]|diretório fixtures|mock server fornecido/i.test(item)), false);
      }
    }
  }
  assert.equal(projectCount, 110);

  const frontend = getItCareerCatalog("frontend");
  assert.ok(frontend);
  const webGit = frontend.levels.foundation.modules[0].project.projectSpec;
  assert.match(webGit.projectTitle, /inspetor web de requisições e versões/i);
  assert.match(webGit.productDefinition, /registrar uma alteração de interface/i);
  assert.ok(webGit.functionalities.some((item) => /status, headers e tempo de resposta/i.test(item)));
  assert.ok(webGit.deliverables.some((item) => /histórico Git/i.test(item)));
  assert.ok(webGit.evaluationCriteria.some((criterion) => /inspetor web/i.test(criterion.description)));
});

test("interesses exigem entre uma e três opções válidas, únicas e ordenadas", () => {
  assert.throws(() => buildItCareerPlan(setup({ interestIds: [] })), /um a três assuntos de interesse/i);
  assert.throws(() => buildItCareerPlan(setup({ interestIds: ["football", "cars", "news", "technology"] })), /um a três assuntos de interesse/i);
  assert.throws(() => buildItCareerPlan(setup({ interestIds: ["football", "football"] })), /sem repetir/i);
  assert.throws(() => buildItCareerPlan(setup({ interestIds: ["invalid" as ItCareerInterestId] })), /opção inválida/i);

  const plan = buildItCareerPlan(setup({ interestIds: ["football", "cars", "news"] }));
  assert.deepEqual(plan.interests.map((interest) => interest.id), ["football", "cars", "news"]);
});

test("desafios por módulo são obrigatórios e o TCC permanece opcional em todos os níveis", () => {
  for (const targetLevel of itCareerLevelIds) {
    assert.throws(
      () => buildItCareerPlan(setup({ targetLevel, includeModuleProjects: false, includeCapstone: true })),
      /desafios práticos.*obrigatórios/i,
    );
    const plan = buildItCareerPlan(setup({ targetLevel, includeModuleProjects: true, includeCapstone: true }));
    assert.ok(technicalProjects(plan).length > 0);
    assert.ok(technicalProjects(plan).every(Boolean));
    assert.ok(technicalProjects(plan).every((project) => project?.projectSpec.projectKind === "module_challenge"));
  }
  assert.doesNotThrow(() => buildItCareerPlan(setup({ targetLevel: "foundation", includeCapstone: false })));
  for (const targetLevel of itCareerLevelIds) {
    const withoutCapstone = buildItCareerPlan(setup({ targetLevel, includeCapstone: false }));
    assert.equal(withoutCapstone.modules.some((module) => module.moduleKind === "capstone"), false);
  }
});

test("rótulos, estimativas e projetos permanecem determinísticos", () => {
  assert.deepEqual(itCareerLevelLabels, {
    foundation: "Fundamentos",
    junior: "Conteúdo para atuação Júnior",
    mid: "Conteúdo intermediário",
    senior: "Conteúdo avançado",
    specialist: "Especialização técnica e arquitetura",
  });
  const first = buildItCareerPlan(setup({ targetLevel: "junior", interestIds: ["football", "cars"] }));
  const second = buildItCareerPlan(setup({ targetLevel: "junior", interestIds: ["football", "cars"] }));
  assert.deepEqual(first, second);
  assert.match(first.description, /não comprova senioridade profissional/i);
});

test("a prévia leve preserva carga, prazos e specs sem materializar sessões ou gabaritos", () => {
  const previewSetup = setup({
    careerId: "data_science_ai",
    targetLevel: "specialist",
    interestIds: ["football", "technology"],
    includeCapstone: true,
    minutesPerDay: 300,
  });
  const full = buildItCareerPlan(previewSetup);
  const preview = buildItCareerPreview(previewSetup);
  assert.ok(dailySessions(full).length > 100);
  assert.ok(dailySessions(full).reduce((sum, session) => sum + session.questions.length, 0) > 1_000);
  assert.equal(dailySessions(preview).length, 0);

  const normalizedFull = structuredClone(full);
  normalizedFull.modules.forEach((roadmapModule) => roadmapModule.topics.forEach((topic) => {
    topic.dailyQuizzes = [];
  }));
  assert.deepEqual(preview, normalizedFull);
});

test("trocar somente o interesse preserva carga, prazo e dificuldade técnica", () => {
  const football = buildItCareerPlan(setup({ targetLevel: "junior", interestIds: ["football"] }));
  const cars = buildItCareerPlan(setup({ targetLevel: "junior", interestIds: ["cars"] }));

  assert.equal(football.totalEstimatedMinutes, cars.totalEstimatedMinutes);
  assert.equal(football.bufferMinutes, cars.bufferMinutes);
  assert.equal(football.recommendedEstimatedMinutes, cars.recommendedEstimatedMinutes);
  assert.equal(football.recommendedTargetDate, cars.recommendedTargetDate);
  assert.deepEqual(football.milestones, cars.milestones);
  assert.deepEqual(football.modules.map((module) => module.estimatedMinutes), cars.modules.map((module) => module.estimatedMinutes));

  const footballProjects = football.modules.map((module) => module.project).filter(Boolean) as ItCareerArtifact[];
  const carProjects = cars.modules.map((module) => module.project).filter(Boolean) as ItCareerArtifact[];
  assert.equal(footballProjects.length, carProjects.length);
  for (const [index, footballProject] of footballProjects.entries()) {
    const carProject = carProjects[index];
    assert.equal(footballProject.projectSpec.blueprintId, carProject.projectSpec.blueprintId);
    assert.equal(footballProject.estimatedMinutes, carProject.estimatedMinutes);
    assert.deepEqual(footballProject.projectSpec.technicalConcepts, carProject.projectSpec.technicalConcepts);
    assert.deepEqual(footballProject.projectSpec.evaluationCriteria, carProject.projectSpec.evaluationCriteria);
    assert.notEqual(footballProject.projectSpec.interest.id, carProject.projectSpec.interest.id);
    assert.notEqual(footballProject.projectSpec.productDefinition, carProject.projectSpec.productDefinition);
  }

  const footballSessions = dailySessions(football);
  const carSessions = dailySessions(cars);
  assert.equal(footballSessions.length, carSessions.length);
  for (const [sessionIndex, footballSession] of footballSessions.entries()) {
    const carSession = carSessions[sessionIndex];
    assert.equal(footballSession.questions.length, carSession.questions.length);
    for (const [questionIndex, footballQuestion] of footballSession.questions.entries()) {
      const carQuestion = carSession.questions[questionIndex];
      assert.deepEqual(footballQuestion.options, carQuestion.options, "o interesse não pode mudar o gabarito nem a dificuldade");
      assert.equal(footballQuestion.correctOptionIndex, carQuestion.correctOptionIndex);
      assert.equal(footballQuestion.explanation, carQuestion.explanation);
      assert.notEqual(footballQuestion.prompt, carQuestion.prompt, "o interesse deve mudar somente o contexto do enunciado");
    }
  }
});

test("o TCC usa o primeiro interesse e desafios e questões podem alternar os demais", () => {
  const plan = buildItCareerPlan(setup({
    careerId: "data_science_ai",
    targetLevel: "specialist",
    interestIds: ["football", "cars", "news"],
    minutesPerDay: 300,
  }));
  const challengeInterests = plan.modules
    .filter((module) => module.moduleKind !== "capstone")
    .map((module) => module.project?.projectSpec.interest.id);
  assert.deepEqual(challengeInterests.slice(0, 6), ["football", "cars", "news", "football", "cars", "news"]);
  const capstone = plan.modules.find((module) => module.moduleKind === "capstone")?.project;
  assert.ok(capstone);
  assert.equal(capstone.projectSpec.interest.id, "football");

  const firstPrompts = dailySessions(plan)[0].questions.map((question) => question.prompt).join(" ");
  assert.match(firstPrompts, /futebol/i);
  assert.match(firstPrompts, /carros|veículos/i);
  assert.match(firstPrompts, /notícias|matérias/i);
});

test("o TCC de Ciência de Dados e IA com futebol é um produto probabilístico totalmente definido", () => {
  const plan = buildItCareerPlan(setup({
    careerId: "data_science_ai",
    targetLevel: "specialist",
    interestIds: ["football"],
    minutesPerDay: 300,
  }));
  const capstone = plan.modules.find((module) => module.moduleKind === "capstone")?.project;
  assert.ok(capstone);
  const spec = capstone.projectSpec;

  assert.equal(spec.projectKind, "capstone");
  assert.equal(spec.interest.id, "football");
  assert.equal(spec.projectTitle, "TCC — Previsor probabilístico reproduzível sobre Futebol");
  assert.match(spec.productDefinition, /sistema de IA capaz de analisar a fixture histórica de partidas de futebol/i);
  assert.match(spec.productDefinition, /probabilidades de vitória do mandante, empate e vitória do visitante/i);
  assert.match(spec.productDefinition, /somando 100%/i);
  assert.equal(spec.data.sourceType, "synthetic_generator");
  assert.equal(spec.data.sourceLabel, "fixture histórica de partidas de futebol");
  assert.match(spec.data.acquisitionInstructions, /seed 42/i);
  assert.match(spec.data.acquisitionInstructions, /1\.000 partidas fictícias/i);
  const match = spec.data.entities.find((entity) => entity.name === "match");
  assert.ok(match);
  const fieldNames = new Set(match.requiredFields.map((field) => field.name));
  for (const fieldName of ["match_id", "played_at", "home_team", "away_team", "home_goals", "away_goals", "home_recent_points", "away_recent_points"]) {
    assert.ok(fieldNames.has(fieldName), `campo obrigatório ausente na fixture: ${fieldName}`);
  }
  assert.ok(spec.functionalities.some((entry) => /baseline/i.test(entry)));
  assert.ok(spec.functionalities.some((entry) => /treinar e comparar pelo menos dois modelos/i.test(entry)));
  assert.ok(spec.functionalities.some((entry) => /API/i.test(entry)));
  assert.ok(spec.mandatoryRequirements.some((entry) => /sem vazamento/i.test(entry)));
  assert.ok(spec.mandatoryRequirements.some((entry) => /sementes e versões/i.test(entry)));
  assert.ok(spec.mandatoryRequirements.some((entry) => /todos os módulos listados em Conceitos técnicos/i.test(entry)));
  assert.equal(spec.technicalConcepts.length, 10);
  assert.ok(spec.deliverables.some((entry) => /repositório versionado/i.test(entry)));
  assert.equal(spec.evaluationCriteria.reduce((sum, criterion) => sum + criterion.weightPercent, 0), 100);
  assert.doesNotMatch(JSON.stringify(spec), forbiddenGenericProjectCopy);
});

test("o contexto de investimentos gera o Portfolio Intelligence Lab sem recomendação financeira", () => {
  const plan = buildItCareerPlan(setup({ careerId: "data_science_ai", targetLevel: "senior", interestIds: ["investments"] }));
  const capstone = plan.modules.find((module) => module.moduleKind === "capstone")?.project;
  assert.ok(capstone);
  assert.equal(capstone!.projectSpec.interest.id, "investments");
  assert.match(capstone!.projectSpec.projectTitle, /Portfolio Intelligence Lab/);
  assert.match(capstone!.projectSpec.productDefinition, /backtests walk-forward/i);
  assert.match(capstone!.projectSpec.data.preparationRules.join(" "), /nunca como recomendação de investimento/i);
});

test("perguntas diárias adaptam quantidade ao nível e ao tempo e mantêm gabarito válido", () => {
  const shortFoundation = buildItCareerPlan(setup({ targetLevel: "foundation", minutesPerDay: 30 }));
  const mediumFoundation = buildItCareerPlan(setup({ targetLevel: "foundation", minutesPerDay: 90 }));
  const longSpecialist = buildItCareerPlan(setup({ targetLevel: "specialist", minutesPerDay: 300 }));
  assert.equal(shortFoundation.dailyQuestionPolicy.questionsPerStudyDay, 2);
  assert.ok(mediumFoundation.dailyQuestionPolicy.questionsPerStudyDay > shortFoundation.dailyQuestionPolicy.questionsPerStudyDay);
  assert.ok(longSpecialist.dailyQuestionPolicy.questionsPerStudyDay > mediumFoundation.dailyQuestionPolicy.questionsPerStudyDay);
  assert.equal(longSpecialist.dailyQuestionPolicy.minutesReservedPerStudyDay, longSpecialist.dailyQuestionPolicy.questionsPerStudyDay * 4);
  assert.throws(() => buildItCareerPlan(setup({ includeDailyQuestions: false })), /perguntas diárias/i);

  const sessions = dailySessions(mediumFoundation);
  assert.ok(sessions.length > 0);
  assert.equal(new Set(sessions.map((session) => session.scheduledDate)).size, sessions.length);
  let priorDate = "";
  for (const session of sessions) {
    assert.equal(session.questions.length, mediumFoundation.dailyQuestionPolicy.questionsPerStudyDay);
    assert.ok([1, 2, 3, 4, 5].includes(new Date(`${session.scheduledDate}T12:00:00Z`).getUTCDay()));
    assert.ok(session.scheduledDate > priorDate);
    priorDate = session.scheduledDate;
    session.questions.forEach(assertQuestionValid);
    assert.equal(new Set(session.questions.map((question) => question.prompt)).size, session.questions.length, `a sessão ${session.id} repetiu enunciados`);
    for (const question of session.questions) {
      const correct = question.options[question.correctOptionIndex ?? -1] ?? "";
      assert.ok(session.topicId.includes("topic"));
      assert.ok(correct.length > 40, "a resposta correta precisa expressar uma decisão técnica, não apenas repetir um rótulo");
      assert.match(question.explanation, /objetivo técnico/i);
    }
  }
});

test("o calendário reserva dias de execução do desafio antes das questões do módulo seguinte", () => {
  const plan = buildItCareerPlan(setup({
    careerId: "frontend",
    targetLevel: "foundation",
    includeCapstone: false,
    minutesPerDay: 90,
    availableDays: ["1", "2", "3", "4", "5"],
  }));
  const technicalModules = plan.modules.filter((roadmapModule) => roadmapModule.moduleKind !== "capstone");
  assert.ok(technicalModules.length >= 2);
  const firstModule = technicalModules[0];
  const secondModule = technicalModules[1];
  const firstModuleSessions = firstModule.topics.flatMap((topic) => topic.dailyQuizzes);
  const secondModuleSessions = secondModule.topics.flatMap((topic) => topic.dailyQuizzes);
  const lastFirstDate = firstModuleSessions.at(-1)?.scheduledDate;
  const firstSecondDate = secondModuleSessions[0]?.scheduledDate;
  assert.ok(lastFirstDate && firstSecondDate);

  let availableStudyDatesBetween = 0;
  let cursor = new Date(`${lastFirstDate}T12:00:00Z`);
  const target = new Date(`${firstSecondDate}T12:00:00Z`);
  while (cursor < target) {
    cursor = new Date(cursor.getTime() + 86_400_000);
    if ([1, 2, 3, 4, 5].includes(cursor.getUTCDay())) availableStudyDatesBetween += 1;
  }
  const expectedProjectDays = Math.ceil((firstModule.project?.estimatedMinutes ?? 0) / 90);
  assert.equal(availableStudyDatesBetween, expectedProjectDays + 1, "o próximo quiz deve começar somente após todos os dias reservados ao desafio");
});

test("skip remove tópico e validate mantém revisão sem remover o desafio do módulo", () => {
  const catalog = getItCareerCatalog("frontend");
  assert.ok(catalog);
  const knownTopic = catalog.levels.foundation.modules[0].topics[0];
  const common = { currentLevel: "foundation" as const, targetLevel: "foundation" as const, knownTopicIds: [knownTopic.id] };
  const skipped = buildItCareerPlan(setup({ ...common, knownTopicPolicy: "skip" }));
  const validated = buildItCareerPlan(setup({ ...common, knownTopicPolicy: "validate" }));
  assert.equal(skipped.modules.flatMap((module) => module.topics).some((topic) => topic.id === knownTopic.id), false);
  assert.ok(skipped.modules.every((module) => module.project));
  const review = validated.modules.flatMap((module) => module.topics).find((topic) => topic.id === knownTopic.id);
  assert.ok(review);
  assert.equal(review.role, "review");
  assert.equal(review.estimatedMinutes, knownTopic.reviewMinutes);
  assert.ok(review.dailyQuizzes.length > 0);
});

test("skip integral mantém o projeto de consolidação no ponto curricular do módulo", () => {
  const catalog = getItCareerCatalog("frontend");
  assert.ok(catalog);
  const firstTemplateModule = catalog.levels.foundation.modules[0];
  const nextTemplateModule = catalog.levels.foundation.modules[1];
  const plan = buildItCareerPlan(setup({
    currentLevel: "foundation",
    targetLevel: "foundation",
    knownTopicIds: firstTemplateModule.topics.map((topic) => topic.id),
    knownTopicPolicy: "skip",
  }));

  const consolidationIndex = plan.modules.findIndex((roadmapModule) => roadmapModule.id === firstTemplateModule.id);
  const nextModuleIndex = plan.modules.findIndex((roadmapModule) => roadmapModule.id === nextTemplateModule.id);
  assert.ok(consolidationIndex >= 0 && consolidationIndex < nextModuleIndex);
  assert.equal(plan.modules[consolidationIndex].topics.length, 0);
  assert.ok(plan.modules[consolidationIndex].project);
  assert.ok(plan.modules[nextModuleIndex].topics.some((topic) => topic.dailyQuizzes.length > 0));
});

test("as 55 combinações de carreira e profundidade permanecem cumulativas e válidas", () => {
  for (const careerId of itCareerIds) {
    const catalog = getItCareerCatalog(careerId);
    if (!catalog) throw new Error(`Catálogo ausente: ${careerId}`);
    for (const [targetIndex, targetLevel] of itCareerLevelIds.entries()) {
      const plan = buildItCareerPlan(setup({ careerId, targetLevel, includeCapstone: true }));
      const expected: string[] = itCareerLevelIds
        .slice(0, targetIndex + 1)
        .flatMap((level: ItCareerLevelId) => catalog.levels[level].modules.map((roadmapModule: ItCareerModuleTemplate) => roadmapModule.id));
      assert.deepEqual(plan.modules.filter((module) => module.moduleKind !== "capstone").map((module) => module.id), expected);
      assert.ok(plan.modules.filter((module) => module.moduleKind !== "capstone").every((module) => module.project));
      assert.ok(plan.totalEstimatedMinutes > 0);
      const sessions = dailySessions(plan);
      assert.ok(sessions.length > 0);
      for (const session of sessions) {
        assert.equal(new Set(session.questions.map((question) => question.prompt)).size, session.questions.length, `${careerId}/${targetLevel}/${session.id} repetiu pergunta na mesma sessão`);
        assert.equal(session.questions.some((question) => forbiddenGenericQuestionCopy.test(question.prompt)), false);
      }
    }
  }
});

test("prazo e duração não cortam nem regeneram o conteúdo", () => {
  const common = { careerId: "data_engineering" as const, targetLevel: "specialist" as const, minutesPerDay: 90 };
  const generous = buildItCareerPlan(setup({ ...common, timelineMode: "duration", durationMonths: 120 }));
  const short = buildItCareerPlan(setup({ ...common, timelineMode: "deadline", deadline: "2026-08-10" }));
  assert.equal(short.deadlineWarning, true);
  assert.equal(short.targetDate, "2026-08-10");
  assert.deepEqual(short.modules, generous.modules);
  assert.equal(short.recommendedTargetDate, generous.recommendedTargetDate);

  const oneMonth = buildItCareerPlan(setup({ durationMonths: 1 }));
  const sevenMonths = buildItCareerPlan(setup({ durationMonths: 7 }));
  assert.equal(oneMonth.totalEstimatedMinutes, sevenMonths.totalEstimatedMinutes);
  assert.deepEqual(oneMonth.modules, sevenMonths.modules);
});

test("datas civis impossíveis são rejeitadas", () => {
  assert.throws(
    () => buildItCareerPlan(setup({ startDate: "2026-02-30" })),
    /data inicial válida/i,
  );
  assert.throws(
    () => buildItCareerPlan(setup({ timelineMode: "deadline", deadline: "2026-02-30" })),
    /prazo igual ou posterior/i,
  );
});

test("a carga inclui questões e desafios e o plano não contém aulas ou atividades legadas", () => {
  const plan = buildItCareerPlan(setup({ targetLevel: "junior" }));
  const quizMinutes = dailySessions(plan).reduce((sum, session) => sum + session.estimatedMinutes, 0);
  assert.equal(plan.totalEstimatedMinutes, plan.modules.reduce((sum, module) => sum + module.estimatedMinutes, 0));
  assert.ok(plan.totalEstimatedMinutes >= quizMinutes);
  assert.equal(plan.bufferMinutes, Math.ceil(plan.totalEstimatedMinutes * 0.25));

  const forbidden = new Set(["instructions", "preparationSteps", "practiceExercises", "reflectionQuestions", "completionChecklist", "whyItMatters", "workspace", "activity", "assessment"]);
  function inspect(value: unknown): void {
    if (Array.isArray(value)) return void value.forEach(inspect);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.has(key), false, `campo legado encontrado: ${key}`);
      inspect(child);
    }
  }
  inspect(plan);
});
