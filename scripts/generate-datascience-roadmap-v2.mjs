import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const root = process.env.DATASCIENCE_PROJECT_ROOT ?? path.resolve(scriptDir, "..");
const curriculumPath = process.env.DATASCIENCE_CURRICULUM_SOURCE
  ?? path.resolve(root, "data/evolution/udemy-curricula.json");
const startDate = new Date(2026, 10, 16, 12);
const minimumDailyMinutes = 240;

if (!fs.existsSync(curriculumPath)) {
  throw new Error(`Grade dos cursos não encontrada em: ${curriculumPath}`);
}

const holidays = [
  ["2026-11-02", "Finados", "nacional"],
  ["2026-11-15", "Proclamação da República", "nacional"],
  ["2026-11-20", "Dia Nacional de Zumbi e da Consciência Negra", "nacional"],
  ["2026-12-25", "Natal", "nacional"],
  ["2027-01-01", "Confraternização Universal", "nacional"],
  ["2027-04-21", "Tiradentes", "nacional"],
  ["2027-05-01", "Dia do Trabalho", "nacional"],
  ["2027-05-12", "Emancipação de Eunápolis", "municipal"],
  ["2027-06-24", "São João", "municipal"],
  ["2027-07-02", "Independência da Bahia", "estadual"],
].map(([date, name, scope]) => ({ date, name, scope }));

const blockedDates = new Set([
  ...holidays.map((holiday) => holiday.date),
  "2026-11-23", // Viagem pessoal
  "2026-11-24", // Viagem pessoal
  "2026-11-25", // Viagem pessoal
  "2026-11-26", // Viagem pessoal
  "2026-11-27", // Viagem pessoal
  "2026-12-31", // Recesso / Véspera de Ano Novo
]);

const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const nextStudyDate = (date) => {
  const next = new Date(date);
  while (next.getDay() === 0 || next.getDay() === 6 || blockedDates.has(dateKey(next))) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "duração não informada";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours ? `${hours}h` : ""}${minutes}min${String(remainingSeconds).padStart(2, "0")}s`;
};

const itemType = (item) => item.type === "lecture" ? "Aula"
  : item.type === "quiz" ? "Quiz"
    : item.type === "role-play" ? "Simulação"
      : "Atividade";

function buildCatalog(snapshot) {
  const courses = new Map();
  for (const course of snapshot.courses) {
    courses.set(course.title, {
      title: course.title,
      url: course.url,
      units: course.sections.flatMap((section) => section.items.map((item) => ({
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        courseUrl: course.url,
        sectionId: section.id,
        sectionNumber: section.number,
        section: section.title,
        itemId: item.id,
        itemClass: item.type,
        itemSubtype: item.subtype,
        type: itemType(item),
        title: item.title,
        durationSeconds: item.durationSeconds,
        durationText: formatDuration(item.durationSeconds),
        durationMinutes: item.durationSeconds ? Math.ceil(item.durationSeconds / 60) : 10,
        estimated: !item.durationSeconds,
        wholeModule: false,
        sequence: item.number,
      }))),
    });
  }
  return courses;
}

const curriculumSnapshot = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
const catalog = buildCatalog(curriculumSnapshot);

const phaseInfo = {
  p1: {
    priority: "Prioridade 1",
    title: "Fundamentos de Engenharia, Dados e APIs",
    description: "Python intermediário e avançado, concorrência assíncrona, TypeScript, Node.js, React e APIs de alta performance com FastAPI.",
  },
  p2: {
    priority: "Prioridade 2",
    title: "Automação Low-Code e Engenharia de LLMs",
    description: "Workflows visuais no n8n, Webhooks, WhatsApp, Transformers, Prompt Engineering e Structured Outputs.",
  },
  p3: {
    priority: "Prioridade 3",
    title: "RAG, Sistemas Agênticos, LLMOps e Cloud",
    description: "Bancos vetoriais, RAG multi-tenant, orquestração com LangGraph, protocolo MCP, testes determinísticos com Pytest, Docker e deploy AWS.",
  },
};

const activeSections = new Map(Object.entries({
  "Curso de Python 3 do básico ao avançado - com projetos reais": [4, 5, 6, 14, 15, 17],
  "JavaScript e TypeScript do básico ao avançado - JS + TS": [8, 9, 10, 18, 19, 20, 21, 22, 27],
  "Git e contribuições para projetos Open Source": [1, 2, 3, 4, 5, 6],
  "FastAPI - APIs Modernas e Assíncronas com Python": [2, 3, 4, 5, 6, 7],
  "Análise e Levantamento de Requisitos de Software": [2, 3, 4, 5, 6],
  "n8n do Zero ao Profissional - Automações e Agentes de IA": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  "Formação Processamento de Linguagem Natural, LLMs e GenAI": [2, 5, 6, 8],
  "SQL para Análise de Dados: do Básico ao Avançado!": [4, 5, 6, 7, 8, 9],
  "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs": [2, 3, 4, 5, 6, 7, 8, 9, 10],
  "Domine Pytest: Testes de Software com Python": [2, 3, 4, 5, 6, 7, 9, 10, 11],
  "MLOps: Da Ciência de Dados à Operação": [2, 3, 4, 5, 6],
  "Docker para Desenvolvedores (com Docker Swarm e Kubernetes)": [2, 3, 4, 5, 6, 7],
  "Machine Learning com Amazon AWS e SageMaker": [2, 3, 10],
}));

const selectedUnits = (course) => {
  const sections = activeSections.get(course.title);
  if (!sections) throw new Error(`Curso sem regra de curadoria: ${course.title}`);
  const allowed = new Set(sections);
  return course.units.filter((unit) => allowed.has(unit.sectionNumber) && unit.durationMinutes <= minimumDailyMinutes);
};

const plan = [
  ["p1", "course", "Curso de Python 3 do básico ao avançado - com projetos reais"],
  ["p1", "course", "JavaScript e TypeScript do básico ao avançado - JS + TS"],
  ["p1", "course", "Git e contribuições para projetos Open Source"],
  ["p1", "course", "FastAPI - APIs Modernas e Assíncronas com Python"],
  ["p1", "project", "gateway-webhooks", 3, "Projeto 1A · AI-Ready Gateway & Webhook Router Assíncrono"],
  ["p2", "course", "Análise e Levantamento de Requisitos de Software"],
  ["p2", "course", "n8n do Zero ao Profissional - Automações e Agentes de IA"],
  ["p2", "project", "orquestrador-n8n", 4, "Projeto 2A · Orquestrador de Processos B2B com n8n & Fallback Humano"],
  ["p2", "course", "Formação Processamento de Linguagem Natural, LLMs e GenAI"],
  ["p2", "course", "SQL para Análise de Dados: do Básico ao Avançado!"],
  ["p2", "project", "rag-multitenant", 4, "Projeto 3A · Motor RAG Híbrido e Extração Estruturada Corporativa"],
  ["p3", "course", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs"],
  ["p3", "project", "enxame-agentes", 4, "Projeto 4A · Enxame Multiagente Autônomo com LangGraph & Protocolo MCP"],
  ["p3", "course", "Domine Pytest: Testes de Software com Python"],
  ["p3", "course", "MLOps: Da Ciência de Dados à Operação"],
  ["p3", "project", "evals-guardrails", 4, "Projeto 5A · Pipeline Automatizado de Evals, Testes e Guardrails"],
  ["p3", "course", "Docker para Desenvolvedores (com Docker Swarm e Kubernetes)"],
  ["p3", "course", "Machine Learning com Amazon AWS e SageMaker"],
  ["p3", "project", "enterprise-deploy-aws", 5, "Projeto 6A · Plataforma Enterprise de IA Conteinerizada & Deploy na AWS"],
];

const projectSteps = [
  "Diagnóstico e arquitetura",
  "Construção técnica",
  "Validação de bordas e testes",
  "Publicação no LinkedIn e GitHub",
  "Aprimoramento e estudo de caso",
];

let cursor = nextStudyDate(startDate);
let dayNumber = 1;
const days = [];
let studyBuffer = [];
const pendingProjects = [];

function consumeDate() {
  cursor = nextStudyDate(cursor);
  const current = new Date(cursor);
  cursor.setDate(cursor.getDate() + 1);
  return current;
}

function taskForUnit(unit) {
  const prefix = `${unit.type} ${unit.sequence ?? "sem número"}`;
  return {
    id: `udemy-${unit.courseId}-${unit.itemClass}-${unit.itemId}`,
    label: `${prefix}: ${unit.title} — ${unit.durationText}`,
    kind: unit.type === "Quiz" ? "quiz" : unit.type === "Simulação" ? "simulacao" : "aula",
    durationMinutes: unit.durationMinutes,
    durationSeconds: unit.durationSeconds,
    udemyCourseId: unit.courseId,
    udemyItemId: unit.itemId,
    sectionNumber: unit.sectionNumber,
    itemNumber: unit.sequence,
  };
}

function addStudyDay(units) {
  const date = consumeDate();
  const phaseId = units[0].phaseId;
  const info = phaseInfo[phaseId];
  const taskRows = units.map((unit) => ({ unit, task: taskForUnit(unit) }));
  const sectionMap = new Map();
  const courseMap = new Map();
  for (const row of taskRows) {
    const sectionKey = `${row.unit.courseTitle} · Seção ${row.unit.sectionNumber}: ${row.unit.section}`;
    if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, []);
    sectionMap.get(sectionKey).push(row.task);
    if (!courseMap.has(row.unit.courseTitle)) courseMap.set(row.unit.courseTitle, { unit: row.unit, tasks: [] });
    courseMap.get(row.unit.courseTitle).tasks.push(row.task);
  }
  days.push({
    id: `dia-${String(dayNumber).padStart(3, "0")}`,
    dayNumber,
    date: dateKey(date),
    weekday: weekdays[date.getDay()],
    plannedMinutes: units.reduce((sum, unit) => sum + unit.durationMinutes, 0),
    phaseId,
    phaseTitle: info.title,
    kind: "study",
    note: "Os títulos abaixo reproduzem literalmente a grade cadastrada na Udemy. Use o nome para localizar a aula ou o módulo.",
    sections: [...sectionMap].map(([title, tasks]) => ({ title, tasks })),
    courses: [...courseMap.values()].map(({ unit, tasks }) => ({
      id: slug(unit.courseTitle),
      title: unit.courseTitle,
      url: unit.courseUrl,
      lessons: tasks,
      durationSource: units.some((item) => item.courseTitle === unit.courseTitle && item.estimated) ? "estimativa" : "catalogo",
    })),
    _units: units,
  });
  dayNumber += 1;
}

function addProject(entry) {
  const [phaseId, , projectSlug, projectDays, title] = entry;
  for (let index = 0; index < projectDays; index += 1) {
    const date = consumeDate();
    const isLastDay = index === projectDays - 1;
    const step = isLastDay ? "Documentação final e publicação no LinkedIn" : projectSteps[index] ?? `Execução ${index + 1}`;
    const task = {
      id: `projeto-${projectSlug}-${String(index + 1).padStart(2, "0")}`,
      label: `${step} — 4h`,
      kind: "entrega",
      durationMinutes: 240,
    };
    days.push({
      id: `dia-${String(dayNumber).padStart(3, "0")}`,
      dayNumber,
      date: dateKey(date),
      weekday: weekdays[date.getDay()],
      plannedMinutes: 240,
      phaseId,
      phaseTitle: phaseInfo[phaseId].title,
      kind: "project",
      projectSlug,
      note: title,
      sections: [{ title: "Projeto de portfólio", tasks: [task] }],
      courses: [],
    });
    dayNumber += 1;
  }
}

function releasePendingProjects() {
  while (pendingProjects.length) addProject(pendingProjects.shift());
}

for (const entry of plan) {
  const [phaseId, kind, key] = entry;
  if (kind === "project") {
    if (studyBuffer.length) pendingProjects.push(entry); else addProject(entry);
    continue;
  }
  const course = catalog.get(key);
  if (!course) throw new Error(`Curso sem grade cadastrada: ${key}`);
  for (const unit of selectedUnits(course)) {
    studyBuffer.push({ ...unit, phaseId });
    const minutes = studyBuffer.reduce((sum, item) => sum + item.durationMinutes, 0);
    if (minutes >= minimumDailyMinutes) {
      addStudyDay(studyBuffer);
      studyBuffer = [];
      releasePendingProjects();
    }
  }
}

if (studyBuffer.length) {
  const remainingMinutes = studyBuffer.reduce((sum, unit) => sum + unit.durationMinutes, 0);
  const previousDay = days.at(-1);
  if (
    remainingMinutes < minimumDailyMinutes
    && previousDay?.kind === "study"
    && previousDay.phaseId === studyBuffer[0].phaseId
    && previousDay.plannedMinutes + remainingMinutes <= 300
  ) {
    days.pop();
    dayNumber -= 1;
    cursor = new Date(`${previousDay.date}T12:00:00`);
    addStudyDay([...previousDay._units, ...studyBuffer]);
  } else {
    addStudyDay(studyBuffer);
  }
}
releasePendingProjects();

for (const day of days) delete day._units;

const phaseStats = Object.entries(phaseInfo).map(([id, info]) => {
  const phaseDays = days.filter((day) => day.phaseId === id);
  return {
    id,
    title: info.title,
    priority: info.priority,
    description: info.description,
    start: phaseDays[0]?.date ?? "",
    end: phaseDays.at(-1)?.date ?? "",
    days: phaseDays.length,
  };
});

const projectEndDay = (projectSlug) => days.filter((day) => day.projectSlug === projectSlug).at(-1)?.dayNumber ?? days.length;
const lastDayForCourse = (courseTitle, sectionTitle) => days.filter((day) => {
  const hasCourse = day.courses.some((course) => course.title === courseTitle);
  if (!hasCourse || !sectionTitle) return hasCourse;
  return day.sections.some((section) => section.title.startsWith(`${courseTitle} · Seção `) && slug(section.title).endsWith(slug(sectionTitle)));
}).at(-1)?.dayNumber;

const skillDefinitions = [
  ["Python Intermediário e POO", "Curso de Python 3 do básico ao avançado - com projetos reais", "Introdução à Programação Orientada a Objetos em Python - POO (Classes)", "Dicionários, closures, decoradores e modelagem orientada a objetos concluídos."],
  ["Design Patterns em Python", "Curso de Python 3 do básico ao avançado - com projetos reais", "Design Patterns (Padrões de projeto - GOF) - POO Avançado - Mini Curso", "Padrões de projeto estruturais e comportamentais aplicados em Python concluídos."],
  ["TypeScript", "JavaScript e TypeScript do básico ao avançado - JS + TS", "TypeScript - Generics (Generic Type)", "Tipagem estática, interfaces, generics e classes em TypeScript dominados."],
  ["React para IA", "JavaScript e TypeScript do básico ao avançado - JS + TS", "Typescript e React (Pomodoro App)", "Criação de interfaces web e consumo de streams com React concluídos."],
  ["Git & GitHub", "Git e contribuições para projetos Open Source", null, "Controle de versão, branches, conflitos, code review e pull requests concluídos."],
  ["FastAPI & Async", "FastAPI - APIs Modernas e Assíncronas com Python", null, "Construção de APIs assíncronas de alta performance, Pydantic e segurança concluídos."],
  ["Levantamento de Requisitos", "Análise e Levantamento de Requisitos de Software", null, "Elicitação, entrevistas com stakeholders e mapeamento de processos corporativos estudados."],
  ["Orquestração n8n", "n8n do Zero ao Profissional - Automações e Agentes de IA", "Webhooks no n8n", "Construção de fluxos visuais, nós de código e webhooks no n8n dominados."],
  ["WhatsApp Automation", "n8n do Zero ao Profissional - Automações e Agentes de IA", "API de Whatsapp", "Integração do n8n com APIs de WhatsApp para comunicação transacional concluída."],
  ["Prompt Engineering", "n8n do Zero ao Profissional - Automações e Agentes de IA", "Engenharia de Prompt", "Estruturação de prompts de sistema, context windows e structured outputs concluídos."],
  ["Transformers & LLMs", "Formação Processamento de Linguagem Natural, LLMs e GenAI", "Transformers, Bert, GPT e mais", "Arquitetura Transformer, mecanismos de auto-atenção, BERT e GPT concluídos."],
  ["SQL Avançado", "SQL para Análise de Dados: do Básico ao Avançado!", null, "JOINs, subqueries, agregações e modelagem em PostgreSQL concluídos."],
  ["LangChain & RAG", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs", "RAG: Aplicação de Busca Semântica em Documentos Jurídicos", "Ingestão de dados, embeddings, busca vetorial no Pinecone e RAG concluídos."],
  ["LangGraph & Agentes", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs", "Aplicações Práticas de LangGraph", "Grafos de estado, nós condicionais e agentes inteligentes com LangGraph concluídos."],
  ["Model Context Protocol (MCP)", "n8n do Zero ao Profissional - Automações e Agentes de IA", "MCP no n8n", "Criação e consumo de servidores e ferramentas padronizadas via protocolo MCP concluídos."],
  ["Pytest & Mocking", "Domine Pytest: Testes de Software com Python", null, "Testes automatizados, fixtures e simulação de APIs com unittest.mock concluídos."],
  ["MLOps & Versionamento", "MLOps: Da Ciência de Dados à Operação", null, "Pipelines de dados, DVC, tracking com MLflow e automação concluídos."],
  ["Docker & Docker Compose", "Docker para Desenvolvedores (com Docker Swarm e Kubernetes)", "Gerenciando múltiplos containers com Docker Compose", "Criação de imagens multi-stage e orquestração com Docker Compose dominadas."],
  ["Deploy Cloud na AWS", "Machine Learning com Amazon AWS e SageMaker", "Endpoint externo", "Hospedagem, storage S3 e endpoints gerenciados em nuvem na AWS concluídos."],
];

const linkedinSkillMilestones = skillDefinitions.map(([skill, course, section, evidence]) => ({
  id: `linkedin-skill-${slug(skill)}`,
  afterDay: lastDayForCourse(course, section),
  skill,
  evidence,
})).filter((milestone) => milestone.afterDay);

const careerMilestones = [
  {
    id: "m1",
    afterDay: projectEndDay("gateway-webhooks"),
    title: "APIs e Backend para IA",
    rationale: "Gateway assíncrono com FastAPI, Pydantic e streaming SSE concluído.",
    linkedinTitle: "Engenheiro de Software em formação | Python, Asyncio, FastAPI e APIs de IA",
  },
  {
    id: "m2",
    afterDay: projectEndDay("orquestrador-n8n"),
    title: "Automação Low-Code e Processos B2B",
    rationale: "Workflow corporativo no n8n com WhatsApp e fallback humano entregue.",
    linkedinTitle: "Engenheiro de Automação & IA em formação | n8n, Webhooks, APIs e Integrações B2B",
  },
  {
    id: "m3",
    afterDay: projectEndDay("rag-multitenant"),
    title: "RAG Corporativo e LLMs",
    rationale: "Base de conhecimento multi-tenant com busca híbrida demonstrada.",
    linkedinTitle: "Engenheiro de IA Aplicada em formação | LLMs, RAG, Pinecone, SQL e Embeddings",
  },
  {
    id: "m4",
    afterDay: projectEndDay("enxame-agentes"),
    title: "Sistemas Agênticos e Protocolo MCP",
    rationale: "Enxame multiagente autônomo com LangGraph, MCP e Human-in-the-Loop concluído.",
    linkedinTitle: "Engenheiro de IA Aplicada em formação | LangGraph, Agentes Autônomos, MCP e Human-in-the-Loop",
  },
  {
    id: "m5",
    afterDay: projectEndDay("evals-guardrails"),
    title: "LLMOps, Qualidade e Segurança",
    rationale: "Pipeline de testes com Pytest, mocks e LLM-as-a-judge demonstrado.",
    linkedinTitle: "Engenheiro de IA Aplicada em formação | LLMOps, Evals, Pytest, Guardrails e Segurança",
  },
  {
    id: "m6",
    afterDay: projectEndDay("enterprise-deploy-aws"),
    title: "Deploy Enterprise na Nuvem",
    rationale: "Solução completa de IA conteinerizada em Docker e implantada na AWS entregue.",
    linkedinTitle: "Engenheiro de IA Aplicada | Python, FastAPI, LangGraph, Docker e AWS",
  },
];

const roadmap = {
  generatedAt: new Date().toISOString(),
  sourcePath: "Grades oficiais completas da Udemy registradas em data/evolution/udemy-curricula.json",
  period: { start: days[0]?.date ?? "", end: days.at(-1)?.date ?? "" },
  totalBusinessDays: days.length,
  totalPlannedMinutes: days.reduce((total, day) => total + day.plannedMinutes, 0),
  phases: phaseStats,
  holidays,
  careerMilestones,
  curation: {
    basis: "Vagas reais de Engenharia de IA Aplicada e plano de monetização triplo",
    level: "Engenheiro de IA Júnior / Pleno com base prática corporativa",
    canonicalItems: curriculumSnapshot.courses.reduce((sum, course) => sum + course.sections.reduce((sectionSum, section) => sectionSum + section.items.length, 0), 0),
    activeUdemyItems: days.flatMap((day) => day.sections.flatMap((section) => section.tasks)).filter((task) => task.id.startsWith("udemy-")).length,
    excludedItemsRemainInCanonicalSource: true,
  },
  linkedinSkillMilestones,
  days,
};

fs.writeFileSync(path.join(root, "data/evolution/roadmap.json"), `${JSON.stringify(roadmap, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  courses: catalog.size,
  days: roadmap.totalBusinessDays,
  hours: Math.round(roadmap.totalPlannedMinutes / 6) / 10,
  start: roadmap.period.start,
  end: roadmap.period.end,
  projects: days.filter((day) => day.kind === "project").length,
}, null, 2));
