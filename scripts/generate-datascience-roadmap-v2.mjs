import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const root = process.env.DATASCIENCE_PROJECT_ROOT ?? path.resolve(scriptDir, "..");
const curriculumPath = process.env.DATASCIENCE_CURRICULUM_SOURCE
  ?? path.resolve(root, "data/evolution/udemy-curricula.json");
const startDate = new Date(2026, 10, 23, 12);
const minimumDailyMinutes = 240;

if (!fs.existsSync(curriculumPath)) {
  throw new Error(`Grade dos cursos não encontrada em: ${curriculumPath}`);
}

const holidays = [
  ["2026-12-24", "Véspera de Natal (Recesso)", "nacional"],
  ["2026-12-25", "Natal", "nacional"],
  ["2026-12-31", "Véspera de Ano Novo (Recesso)", "nacional"],
  ["2027-01-01", "Confraternização Universal (Escala: Gilvan — Folga)", "nacional"],
  ["2027-03-26", "Sexta-feira Santa / Viagem (Escala: Naldo — Folga)", "nacional"],
  ["2027-04-21", "Tiradentes (Escala: Carlos — Dia Ativo de Estudo no Plantão)", "nacional"],
  ["2027-05-01", "Dia do Trabalho (Escala: Vitor — Folga)", "nacional"],
  ["2027-07-02", "Independência da Bahia (Escala: Pedro — Folga)", "estadual"],
  ["2027-09-07", "Independência do Brasil (Escala: Gilvan — Folga)", "nacional"],
  ["2027-10-12", "Nossa Senhora Aparecida (Escala: Naldo — Folga)", "nacional"],
  ["2027-11-02", "Finados (Escala: Carlos — Dia Ativo de Estudo no Plantão)", "nacional"],
  ["2027-11-15", "Proclamação da República (Escala: Vitor — Folga)", "nacional"],
  ["2027-11-20", "Dia da Consciência Negra (Escala: Pedro — Folga)", "nacional"],
  ["2027-12-25", "Natal 2027 (Escala: Gilvan — Folga)", "nacional"],
].map(([date, name, scope]) => ({ date, name, scope }));

// Somente entram em blockedDates as viagens pessoais, recessos e feriados em que Carlos NÃO está escalado no plantão.
// 2027-04-21 (Tiradentes) e 2027-11-02 (Finados) possuem Responsável = Carlos, logo SÃO dias normais de estudo.
const blockedDates = new Set([
  "2026-11-23", // Viagem pessoal
  "2026-11-24", // Viagem pessoal
  "2026-11-25", // Viagem pessoal
  "2026-11-26", // Viagem pessoal
  "2026-11-27", // Viagem pessoal
  "2026-12-24", // Véspera de Natal
  "2026-12-25", // Natal
  "2026-12-31", // Véspera de Ano Novo
  "2027-01-01", // Confraternização Universal (Gilvan)
  "2027-03-08", // Viagem pessoal
  "2027-03-09", // Viagem pessoal
  "2027-03-10", // Viagem pessoal
  "2027-03-26", // Sexta-feira Santa + Viagem (Naldo)
  "2027-05-01", // Dia do Trabalho (Vitor)
  "2027-07-02", // Independência da Bahia (Pedro)
  "2027-09-07", // Independência do Brasil (Gilvan)
  "2027-10-12", // Nossa Senhora Aparecida (Naldo)
  "2027-11-15", // Proclamação da República (Vitor)
  "2027-11-20", // Dia da Consciência Negra (Pedro)
  "2027-12-25", // Natal (Gilvan)
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
    courses.set(course.slug, {
      slug: course.slug,
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
    title: "Engenharia de Software, Backend, Filas & Dados Corporativos",
    description: "Python avançado, POO, Pytest, Git, FastAPI assíncrono, Django REST Framework, filas com RabbitMQ/Redis, TypeScript/React/Next.js, PostgreSQL, SQL avançado e Lakehouse com Databricks.",
  },
  p2: {
    priority: "Prioridade 2",
    title: "Discovery FDE, Automação Omnichannel, LLMs & RAG Híbrido (RBAC)",
    description: "Engenharia de requisitos e Discovery FDE, orquestração no n8n com WhatsApp e Redis, arquitetura Transformer, Prompt Engineering, LlamaIndex, LangChain, IDP e RAG Híbrido Multi-Tenant com RBAC.",
  },
  p3: {
    priority: "Prioridade 3",
    title: "Harness Engineering, Sistemas Agênticos (MCP), LLMOps & Cloud AWS",
    description: "Agent Harness com LangGraph, enxames multiagentes, servidores MCP, NL2SQL, agentes multimodais, Guardrails OWASP/LGPD, Evals no GitHub Actions (CI/CD), Docker, Kubernetes e deploy AWS ECS/Fargate.",
  },
};

// Filtro cirúrgico AULA POR AULA (seções ativas + exclusão de aulas específicas já dominadas em Dias do Roadmap ou redundantes)
const courseRules = {
  "python-3-do-zero-ao-avancado": {
    sections: [4, 5, 6, 8, 9, 10, 11, 15, 16],
    skipItems: new Set([
      // Aulas básicas de def, dict, lambda e list comprehension já concluídas em Dias do Roadmap (Dia 01 a Dia 09):
      105, 106, 107, 108, 109, 110, 111, 121, 122, 123, 125, 126, 127, 135, 138,
      // Aulas da Seção 6 já dominadas (csv no Dia 08) ou fora do foco FDE (calendar, random, smtp, zip, bs4, selenium, jupyter, openpyxl, pillow):
      281, 282, 283, 295, 296, 297, 298, 299, 305, 306, 307, 308, 315, 316, 317, 318, 319, 320, 321, 322, 325, 326, 336, 337, 338, 339, 340,
    ]),
  },
  "git-e-github": {
    sections: [1, 2, 3, 4, 5, 6],
    skipItems: new Set([]),
  },
  "domine-pytest": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    skipItems: new Set([]),
  },
  "fastapi-apis-modernas-e-assincronas-com-python": {
    sections: [2, 3, 4, 5, 6, 7],
    skipItems: new Set([]),
  },
  "criando-apis-rest-com-django-rest-framework-essencial": {
    sections: [2, 3, 4, 5, 6],
    skipItems: new Set([]),
  },
  "rabbitmq-na-pratica": {
    sections: [1, 2],
    skipItems: new Set([]),
  },
  "curso-de-javascript-moderno-do-basico-ao-avancado": {
    sections: [4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30],
    skipItems: new Set([]),
  },
  "banco-de-dados-sql-postgresql": {
    sections: [2, 3, 4, 5],
    skipItems: new Set([]),
  },
  "curso-completo-sql-para-analise-de-dados": {
    sections: [4, 5, 6, 7, 8, 9],
    skipItems: new Set([]),
  },
  "databricks-developer-sql-python-para-analise-de-dados": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23],
    skipItems: new Set([]),
  },
  "analise-de-requisitos-de-software": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 21, 22, 24, 25],
    skipItems: new Set([]),
  },
  "n8n-do-zero-ao-profissional": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    skipItems: new Set([]),
  },
  "formacao-processamento-de-linguagem-natural-nlp": {
    sections: [2, 3, 5, 6, 7, 8, 9],
    skipItems: new Set([]),
  },
  "lanchain": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    skipItems: new Set([]),
  },
  "langchain-desenvolva-agentes-e-aplicacoes-ia-com-llms": {
    sections: [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    skipItems: new Set([16, 47, 136, 139, 140, 141]),
  },
  "agentic-ai-formacao-completa": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9],
    skipItems: new Set([]),
  },
  "llms-e-agentes-de-ia-para-empresas-e-negocios": {
    sections: [3, 4, 5, 6, 7, 8, 9],
    skipItems: new Set([]),
  },
  "mlops-da-ciencia-de-dados-a-operacao": {
    sections: [2, 3, 5],
    skipItems: new Set([]),
  },
  "docker-para-desenvolvedores-com-docker-swarm-e-kubernetes": {
    sections: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    skipItems: new Set([]),
  },
  "github-actions-guia-completo-do-zero-ao-deploy": {
    sections: [2, 3, 4, 5, 6, 8],
    skipItems: new Set([]),
  },
  "aws-na-pratica": {
    sections: [2, 3, 4, 6, 7, 8, 10, 11],
    skipItems: new Set([
      22, 23, 24, 25, 26, 27, 28, 36, 37, 38, 39, 40, 41, 53, 60, 61,
      85, 86, 87, 89, 90, 91,
      116, 117, 123, 124,
      148, 149, 150, 197, 199, 200, 204, 211,
      221, 222, 223, 230, 231, 232, 233,
    ]),
  },
};

const selectedUnits = (course) => {
  const rule = courseRules[course.slug];
  if (!rule) throw new Error(`Curso sem regra de curadoria: ${course.slug}`);
  const allowedSections = new Set(rule.sections);
  return course.units.filter((unit) => (
    allowedSections.has(unit.sectionNumber)
    && !(unit.itemClass === "lecture" && rule.skipItems.has(unit.sequence))
    && unit.durationMinutes <= minimumDailyMinutes
  ));
};

// Plano de 150 dias úteis (600h): 93 dias de aulas cirúrgicas + 57 dias construindo os 6 Grandes Projetos FDE
const plan = [
  ["p1", "course", "python-3-do-zero-ao-avancado"],
  ["p1", "course", "git-e-github"],
  ["p1", "course", "domine-pytest"],
  ["p1", "course", "fastapi-apis-modernas-e-assincronas-com-python"],
  ["p1", "course", "criando-apis-rest-com-django-rest-framework-essencial"],
  ["p1", "course", "rabbitmq-na-pratica"],
  ["p1", "course", "curso-de-javascript-moderno-do-basico-ao-avancado"],
  ["p1", "project", "gateway-webhooks", 10, "Projeto 1A · Enterprise AI Gateway, Filas Assíncronas (RabbitMQ/Redis) & Multi-LLM Fallback Router"],
  ["p1", "course", "banco-de-dados-sql-postgresql"],
  ["p1", "course", "curso-completo-sql-para-analise-de-dados"],
  ["p1", "course", "databricks-developer-sql-python-para-analise-de-dados"],
  ["p2", "course", "analise-de-requisitos-de-software"],
  ["p2", "course", "n8n-do-zero-ao-profissional"],
  ["p2", "project", "orquestrador-n8n", 9, "Projeto 2A · Motor FDE de Automação B2B, Triagem WhatsApp, Databricks/SQL & Escalonamento Humano"],
  ["p2", "course", "formacao-processamento-de-linguagem-natural-nlp"],
  ["p2", "course", "lanchain"],
  ["p2", "course", "langchain-desenvolva-agentes-e-aplicacoes-ia-com-llms"],
  ["p2", "project", "rag-multitenant", 10, "Projeto 3A · Plataforma IDP (Intelligent Document Processing) & RAG Híbrido Multi-Tenant com RBAC"],
  ["p3", "course", "agentic-ai-formacao-completa"],
  ["p3", "course", "llms-e-agentes-de-ia-para-empresas-e-negocios"],
  ["p3", "project", "enxame-agentes", 10, "Projeto 4A · Agent Harness Corporativo: LangGraph, Servidores MCP, NL2SQL & Human-in-the-Loop"],
  ["p3", "course", "mlops-da-ciencia-de-dados-a-operacao"],
  ["p3", "project", "evals-guardrails", 9, "Projeto 5A · Suite LLMOps: Evals Automatizados, Guardrails OWASP/LGPD & Observabilidade (Langfuse)"],
  ["p3", "course", "docker-para-desenvolvedores-com-docker-swarm-e-kubernetes"],
  ["p3", "course", "github-actions-guia-completo-do-zero-ao-deploy"],
  ["p3", "course", "aws-na-pratica"],
  ["p3", "project", "enterprise-deploy-aws", 9, "Projeto 6A · Plataforma Cloud-Native FDE: CI/CD com Gate de Evals, Docker, K8s & Deploy AWS ECS"],
];

const projectSteps = [
  "Discovery FDE, especificação de contratos e ADR (Architecture Decision Record)",
  "Modelagem de banco de dados, schemas Pydantic/SQL e infraestrutura local",
  "Implementação do núcleo backend assíncrono e regras determinísticas",
  "Integração de LLMs, filas/mensageria, roteamento e ferramentas",
  "Construção da camada de segurança (RBAC / Guardrails / Idempotência)",
  "Desenvolvimento da interface operacional e streaming em tempo real",
  "Bateria de testes automatizados com Pytest, mocks e casos de borda",
  "Execução de benchmark quantitativo, métricas de qualidade e cálculo de ROI",
  "Refinamento de observabilidade, traces, logs e documentação de handoff",
  "Documentação final executiva (PT/EN) e publicação no GitHub e LinkedIn",
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
    note: "Aulas filtradas individualmente (aula por aula) da grade oficial da Udemy. Assista apenas às aulas listadas neste dia.",
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
    const step = isLastDay ? "Documentação final executiva (PT/EN) e publicação no GitHub e LinkedIn" : projectSteps[index] ?? `Execução prática — Etapa ${index + 1}`;
    const task = {
      id: `projeto-${projectSlug}-${String(index + 1).padStart(2, "0")}`,
      label: `Etapa ${index + 1}/${projectDays}: ${step} — 4h`,
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
    const currentMinutes = studyBuffer.reduce((sum, item) => sum + item.durationMinutes, 0);
    if (currentMinutes + unit.durationMinutes > 247 && currentMinutes >= 231) {
      addStudyDay(studyBuffer);
      studyBuffer = [{ ...unit, phaseId }];
      releasePendingProjects();
    } else {
      studyBuffer.push({ ...unit, phaseId });
      if (currentMinutes + unit.durationMinutes >= minimumDailyMinutes) {
        addStudyDay(studyBuffer);
        studyBuffer = [];
        releasePendingProjects();
      }
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
const lastDayForCourse = (courseSlug, sectionTitle) => {
  const course = catalog.get(courseSlug);
  if (!course) return undefined;
  return days.filter((day) => {
    const hasCourse = day.courses.some((c) => c.title === course.title);
    if (!hasCourse || !sectionTitle) return hasCourse;
    return day.sections.some((section) => section.title.startsWith(`${course.title} · Seção `) && slug(section.title).endsWith(slug(sectionTitle)));
  }).at(-1)?.dayNumber;
};

const skillDefinitions = [
  ["Python Avançado, Closures & Generators", "python-3-do-zero-ao-avancado", "Python Intermediário - Funções, Dicionários, Módulos, Programação Funcional e +", "Closures, decorators, generators, iterators e tratamento avançado de exceções dominados."],
  ["Programação Orientada a Objetos (POO)", "python-3-do-zero-ao-avancado", "Introdução à Programação Orientada a Objetos em Python - POO (Classes)", "Encapsulamento, herança, polimorfismo, composição e dunder methods em Python concluídos."],
  ["Concorrência, Threads & Manipulação de PDFs/JSON", "python-3-do-zero-ao-avancado", "Módulos Python - os, datetime, sys, json, csv, selenium, pillow e mais", "Automação de sistema, variáveis de ambiente (.env), requisições HTTP, Threads e PyPDF2 concluídos."],
  ["Django & Deploy Linux", "python-3-do-zero-ao-avancado", "Django com Python - Primeiro Deploy (Linux)", "Construção de aplicações web em Django e deploy em servidor Linux concluídos."],
  ["Git, GitHub & Code Review", "git-e-github", null, "Versionamento profissional, branching, resolução de conflitos, rebase e pull requests concluídos."],
  ["Pytest & Testes Automatizados", "domine-pytest", null, "Fixtures, testes parametrizados, markers, mocks e testes de integração em Python dominados."],
  ["FastAPI, Pydantic v2 & APIs Assíncronas", "fastapi-apis-modernas-e-assincronas-com-python", null, "Desenvolvimento de microsserviços REST assíncronos com FastAPI, SQLModel, JWT e NGINX concluído."],
  ["Django REST Framework (DRF)", "criando-apis-rest-com-django-rest-framework-essencial", null, "Construção de APIs corporativas com serialização, permissões e autenticação no Django REST Framework concluída."],
  ["RabbitMQ & Mensageria Assíncrona (AMQP)", "rabbitmq-na-pratica", null, "Arquitetura orientada a eventos com RabbitMQ, Exchanges, Producers/Consumers e Docker concluída."],
  ["Node.js, Express & APIs REST", "curso-de-javascript-moderno-do-basico-ao-avancado", "API REST - JavaScript, Node, Express e SQL (MySQL ou MariaDB)", "Desenvolvimento backend em JavaScript/Node.js com Express, JWT e banco relacional concluído."],
  ["React.js & Hooks", "curso-de-javascript-moderno-do-basico-ao-avancado", "React - Redux - Redux Saga - React Hooks e componentes funcionais - Avançado", "Construção de interfaces reativas com componentes funcionais e React Hooks concluída."],
  ["TypeScript, Generics & SOLID", "curso-de-javascript-moderno-do-basico-ao-avancado", "TypeScript - Princípios SOLID (S.O.L.I.D.)", "Tipagem estática avançada, interfaces, generics e arquitetura limpa SOLID em TypeScript concluídos."],
  ["Next.js & Full-Stack Web", "curso-de-javascript-moderno-do-basico-ao-avancado", "Deploy NextJS + Strapi no Ubuntu Server 20.04", "Desenvolvimento e deploy de frontends modernos com Next.js e TypeScript concluídos."],
  ["PostgreSQL & Modelagem Relacional", "banco-de-dados-sql-postgresql", null, "Modelagem relacional, consultas avançadas, índices e administração em PostgreSQL concluídos."],
  ["SQL Analítico, Window Functions & BigQuery", "curso-completo-sql-para-analise-de-dados", null, "Subqueries, CTEs, Window Functions e consultas em Data Warehouse (Google BigQuery) dominadas."],
  ["Databricks, PySpark, Delta Lake & Unity Catalog", "databricks-developer-sql-python-para-analise-de-dados", null, "Engenharia de dados Lakehouse com PySpark, transações Delta Lake, arquitetura Medallion e Unity Catalog concluída."],
  ["Engenharia de Requisitos & Discovery Técnico (FDE)", "analise-de-requisitos-de-software", null, "Condução de discovery com clientes, elicitação de requisitos, escopo, validação e diagramas de arquitetura concluídos."],
  ["Orquestração n8n, Webhooks & WhatsApp API", "n8n-do-zero-ao-profissional", "Banco de dados Redis", "Automação de processos B2B com n8n self-hosted, webhooks, WhatsApp API e cache Redis concluída."],
  ["Model Context Protocol (MCP) & Multiagentes Low-Code", "n8n-do-zero-ao-profissional", "MCP no n8n", "Orquestração de agentes com base vetorial, múltiplos agentes e protocolo MCP no n8n concluída."],
  ["Processamento de Linguagem Natural (NLP) & Transformers", "formacao-processamento-de-linguagem-natural-nlp", null, "Fundamentos de NLP, spaCy, Deep Learning para texto e arquitetura Transformer (BERT/GPT) concluídos."],
  ["LangChain, Embeddings & Vector Databases (Pinecone)", "lanchain", "RAG: Aplicação de Busca Semântica em Documentos Jurídicos", "Construção de pipelines RAG, embeddings e busca semântica em bancos vetoriais concluída."],
  ["LangGraph & Grafos de Estado para Agentes", "lanchain", "Aplicações Práticas de LangGraph", "Modelagem de agentes cíclicos com controle de estado em LangGraph concluída."],
  ["Prompt Engineering Avançado, Structured Outputs & Function Calling", "langchain-desenvolva-agentes-e-aplicacoes-ia-com-llms", "Aplicações IA com OpenAI", "Few-shot, Chain-of-Thought, saídas estruturadas JSON, Function Calling e assistentes de voz concluídos."],
  ["Roteamento Multi-LLM (OpenAI, Gemini, Mistral, Groq & Ollama)", "langchain-desenvolva-agentes-e-aplicacoes-ia-com-llms", "LLMs Overview - Explorando Algumas LLMs", "Integração e seleção entre modelos proprietários e modelos open-weight locais (DeepSeek/Llama via Ollama) concluídas."],
  ["LlamaIndex & Integração de LLMs com Bancos de Dados", "langchain-desenvolva-agentes-e-aplicacoes-ia-com-llms", "LlamaIndex - Integração de Banco de Dados", "Construção de Query Engines, agentes ReAct e RAG conectado a bancos de dados com LlamaIndex concluída."],
  ["Agent Harness, Guardrails, Observabilidade & Protocolo A2A", "agentic-ai-formacao-completa", null, "Context engineering, Agent Skills, Guardrails, supervisão humana (HITL), controle de custos, MCP e protocolo A2A concluídos."],
  ["IDP (Extração Documental), Qdrant, NL2SQL & Visão Multimodal", "llms-e-agentes-de-ia-para-empresas-e-negocios", null, "Parsing de documentos para JSON, busca vetorial no Qdrant, agentes Text-to-SQL (NL2SQL) em LangGraph e VLMs concluídos."],
  ["MLOps & Rastreamento com MLflow", "mlops-da-ciencia-de-dados-a-operacao", null, "Ciclo de vida de modelos, rastreamento de experimentos e registro com MLflow concluídos."],
  ["Docker, Docker Compose & Kubernetes", "docker-para-desenvolvedores-com-docker-swarm-e-kubernetes", null, "Containerização multi-stage, redes, volumes, Docker Compose e orquestração com Kubernetes concluídos."],
  ["CI/CD com GitHub Actions & DevSecOps para Python", "github-actions-guia-completo-do-zero-ao-deploy", null, "Pipelines automatizadas de CI/CD com GitHub Actions, Secrets, multi-ambiente, lint, Pytest e scan de segurança concluídas."],
  ["AWS Cloud Architecture, ECS Fargate, IAM, S3, WAF & CloudWatch", "aws-na-pratica", null, "Infraestrutura cloud-native na AWS: IAM, VPC, EC2, ALB, S3 Vectors, CloudWatch, WAF e deploy de containers no Amazon ECS Fargate concluídos."],
];

const linkedinSkillMilestones = skillDefinitions.map(([skill, courseSlug, section, evidence]) => ({
  id: `linkedin-skill-${slug(skill)}`,
  afterDay: lastDayForCourse(courseSlug, section),
  skill,
  evidence,
})).filter((milestone) => milestone.afterDay);

const careerMilestones = [
  {
    id: "m0",
    afterDay: 0,
    title: "Marco 0 · Reposicionamento Imediato (Aplicar Hoje)",
    rationale: "Conecta sua experiência real em operações críticas/NOC e Engenharia de Software ao foco em Engenharia de IA Aplicada, Automação e Sistemas em Produção, sem inventar senioridade.",
    linkedinTitle: "Analista de Redes & Operações Críticas (NOC) | Engenharia de Software | Python, SQL, Automação & IA Aplicada",
    linkedinAbout: "Atuo em operações de telecomunicações como Analista de Redes e Comunicação de Dados em ambiente NOC, monitorando infraestrutura crítica, indicadores de disponibilidade (SLAs), análise de causa raiz e resposta a incidentes em tempo real.\n\nCurso Engenharia de Software e direciono minha especialização prática para Engenharia de IA Aplicada e Forward Deployed Engineering (FDE) — unindo minha vivência real em operação de missão crítica com desenvolvimento de software (Python, SQL, APIs REST e automação de processos) para construir soluções que saem do protótipo e rodam com confiabilidade em produção.\n\nDesenvolvo sistemas integrando Python, FastAPI, bancos de dados relacionais (PostgreSQL/SQL), fluxos automatizados e modelos de linguagem (LLMs), sempre com foco em código testável, governança, observabilidade e impacto operacional mensurável.\n\nFoco de atuação: Engenharia de IA Aplicada (Applied AI), Forward Deployed Engineering (FDE), Automação de Processos B2B, Integração de Sistemas & APIs, Arquitetura RAG e Agentes Inteligentes.",
  },
  {
    id: "m1",
    afterDay: projectEndDay("gateway-webhooks"),
    title: "Marco 1 · Engenharia Backend, Filas Assíncronas & Multi-LLM Gateway",
    rationale: "Projeto 1A concluído: AI Gateway em FastAPI + Django DRF + RabbitMQ/Redis + React/Next.js + Pytest publicado no GitHub.",
    linkedinTitle: "Software & AI Integration Engineer em formação | Python, FastAPI, Django, TypeScript, RabbitMQ & Multi-LLM APIs",
    linkedinAbout: "Atuo em operações de infraestrutura crítica (NOC) e curso Engenharia de Software, com foco prático no desenvolvimento de backends resilientes, integrações corporativas e sistemas de Inteligência Artificial Aplicada em produção.\n\nExperiência prática na construção de microsserviços assíncronos e gateways de IA utilizando Python (FastAPI, Django REST Framework, Pydantic v2, Asyncio), filas de mensageria (RabbitMQ, Redis, Dead-Letter Queues), interfaces operacionais em TypeScript (React / Next.js) e testes automatizados com Pytest.\n\nProjetos recentes incluem roteamento multi-LLM com fallback automático entre provedores, controle de idempotência, streaming em tempo real via Server-Sent Events (SSE) e controle de custos por token.\n\nStack principal: Python, FastAPI, Django DRF, TypeScript, React/Next.js, RabbitMQ, Redis, Pytest, Git e Operações Críticas.",
  },
  {
    id: "m2",
    afterDay: projectEndDay("orquestrador-n8n"),
    title: "Marco 2 · Discovery FDE, Dados (PostgreSQL/Databricks) & Automação B2B",
    rationale: "Projeto 2A concluído: Pipeline Lakehouse (Databricks/PostgreSQL) + Orquestrador Omnichannel B2B (n8n + WhatsApp + DRF) com cálculo de ROI entregue.",
    linkedinTitle: "Forward Deployed & AI Automation Engineer em formação | Python, FastAPI, PostgreSQL, Databricks, n8n & Integrações B2B",
    linkedinAbout: "Engenheiro de Software em formação com experiência real em operações de missão crítica (NOC), focado em Forward Deployed Engineering (FDE), Engenharia de IA Aplicada e Automação de Processos Corporativos.\n\nAtuo na ponte entre operação de negócio e engenharia de produção: conduzo o mapeamento de processos (Discovery), modelo bancos de dados relacionais e analíticos (PostgreSQL, SQL avançado com Window Functions, Databricks / PySpark / Delta Lake) e implemento arquiteturas híbridas combinando código puro (Python, FastAPI, Django DRF) e orquestração low-code (n8n, Webhooks, Redis, WhatsApp API) com transbordo humano (Human-in-the-Loop) e medição de ROI.\n\nStack principal: Python, FastAPI, Django DRF, TypeScript/Next.js, PostgreSQL, Databricks (PySpark/Delta Lake), n8n, RabbitMQ, Redis e Pytest.",
  },
  {
    id: "m3",
    afterDay: projectEndDay("rag-multitenant"),
    title: "Marco 3 · IDP (Processamento Documental) & RAG Híbrido Multi-Tenant com RBAC",
    rationale: "Projeto 3A concluído: Motor IDP e RAG Híbrido (BM25 + pgvector/Qdrant + Reranking) com segurança RBAC e métricas Recall@k/MRR demonstradas.",
    linkedinTitle: "Applied AI & Forward Deployed Engineer (Jr) | Python, FastAPI, LLMs, RAG Híbrido, IDP, PostgreSQL (pgvector) & RBAC",
    linkedinAbout: "Atuo na interseção entre Engenharia de Software, Dados e Inteligência Artificial Aplicada (perfil Forward Deployed Engineer), apoiado por experiência sólida em operação de infraestrutura crítica e SLAs rigorosos.\n\nConstruo soluções de IA Generativa preparadas para produção corporativa, com domínio prático em Processamento Inteligente de Documentos (IDP), arquiteturas de Retrieval-Augmented Generation (RAG Híbrido combinando busca lexical BM25 + busca vetorial em PostgreSQL pgvector / Qdrant + Cross-Encoder Reranking), isolamento de dados Multi-Tenant com controle de acesso por cargo (RBAC) e avaliação quantitativa de recuperação (Recall@k, MRR, nDCG).\n\nStack principal: Python (FastAPI, Django DRF, Pydantic, Pytest), LangChain, LlamaIndex, PostgreSQL (pgvector), Databricks, TypeScript/Next.js, RabbitMQ, Redis e n8n.",
  },
  {
    id: "m4",
    afterDay: projectEndDay("enxame-agentes"),
    title: "Marco 4 · Harness Engineering, Sistemas Multiagentes (LangGraph) & Protocolo MCP",
    rationale: "Projeto 4A concluído: Agent Harness em LangGraph com servidores MCP próprios, NL2SQL seguro e checkpoint Human-in-the-Loop publicado.",
    linkedinTitle: "Applied AI & Forward Deployed Engineer | Python, FastAPI, LangGraph, MCP, Multi-Agent Systems, RAG Híbrido & NL2SQL",
    linkedinAbout: "Engenheiro de IA Aplicada e Forward Deployed Engineer com background em operações críticas de telecomunicações e Engenharia de Software. Especializado em tirar projetos de IA Generativa do estágio de protótipo e colocá-los para operar com segurança em fluxos reais de negócio.\n\nDesenvolvo arquiteturas de Agent Harness e sistemas multiagentes utilizando LangGraph, LangChain e LlamaIndex, integrando ferramentas corporativas e bancos de dados via Model Context Protocol (MCP) e Text-to-SQL (NL2SQL read-only). Implemento controles determinísticos de execução (limites de loop, orçamento de tokens, roteamento entre modelos proprietários e open-weight) e fluxos Human-in-the-Loop com trilha completa de auditoria.\n\nStack principal: Python, FastAPI, LangGraph, LangChain, LlamaIndex, MCP, PostgreSQL (pgvector), Qdrant, Databricks, TypeScript/React, RabbitMQ e Redis.",
  },
  {
    id: "m5",
    afterDay: projectEndDay("evals-guardrails"),
    title: "Marco 5 · LLMOps, Engenharia de Avaliação (Evals), Guardrails OWASP & Langfuse",
    rationale: "Projeto 5A concluído: Suite de Evals (Golden Datasets + LLM-as-a-Judge), Guardrails OWASP LLM / LGPD e observabilidade com Langfuse/OpenTelemetry.",
    linkedinTitle: "Applied AI & Forward Deployed Engineer | Python, FastAPI, LangGraph, MCP, RAG, LLMOps, Evals & AI Security (OWASP/LGPD)",
    linkedinAbout: "Applied AI & Forward Deployed Engineer focado em confiabilidade, segurança e operação contínua (Dia 2) de sistemas baseados em LLMs e Agentes Autônomos.\n\nCombino engenharia backend full-stack (Python, FastAPI, Django DRF, TypeScript/Next.js, PostgreSQL, RabbitMQ) com práticas avançadas de LLMOps: construção de Golden Datasets, pipelines de avaliação automatizada (LLM-as-a-Judge, Groundedness, Recall@k, MRR), instrumentação de observabilidade e tracing em produção (Langfuse / OpenTelemetry), otimização de latência/custo e implementação de Guardrails de segurança alinhados ao OWASP LLM Top 10 e à LGPD/GDPR (bloqueio de Prompt Injection e mascaramento automático de PII).\n\nStack principal: Python, FastAPI, LangGraph, LangChain, LlamaIndex, MCP, Langfuse, OpenTelemetry, Pytest, PostgreSQL (pgvector), Qdrant e Databricks.",
  },
  {
    id: "m6",
    afterDay: projectEndDay("enterprise-deploy-aws"),
    title: "Marco 6 · Formação Completa: FDE & Applied AI Engineer Cloud-Native (AWS & CI/CD)",
    rationale: "Projeto 6A (Capstone) e todos os 150 dias concluídos: Plataforma completa conteinerizada (Docker/K8s) com CI/CD e Eval Gate no GitHub Actions implantada na AWS (ECS Fargate).",
    linkedinTitle: "Forward Deployed AI Engineer (FDE) | Applied AI Engineer | Python, FastAPI, LangGraph, MCP, RAG, LLMOps, Docker & AWS",
    linkedinAbout: "Forward Deployed AI Engineer (FDE) e Engenheiro de IA Aplicada com vivência real em operações de missão crítica (NOC) e formação em Engenharia de Software. Especialista em traduzir processos de negócio complexos em sistemas agênticos, pipelines de dados e arquiteturas RAG que operam em produção com segurança, observabilidade e ROI comprovado.\n\nO que entrego de ponta a ponta:\n• Discovery Técnico & Arquitetura FDE: mapeamento de processos, decisão entre automação determinística vs. IA probabilística, especificações técnicas (ADRs) e mensuração de impacto financeiro (ROI).\n• Engenharia de IA, RAG & IDP: ingestão documental complexa, busca híbrida (BM25 + pgvector/Qdrant), Cross-Encoder Reranking, isolamento Multi-Tenant com RBAC e consultas Text-to-SQL (NL2SQL).\n• Harness Engineering & Sistemas Multiagentes: orquestração com LangGraph, desenvolvimento de servidores Model Context Protocol (MCP), roteamento multi-LLM (OpenAI, Anthropic, Gemini, Groq, Ollama) e fluxos Human-in-the-Loop.\n• LLMOps, Segurança & Cloud AWS: suítes de testes e avaliação contínua (Pytest, Golden Datasets, LLM-as-a-Judge) integradas ao CI/CD (GitHub Actions), Guardrails OWASP LLM / LGPD, tracing com Langfuse/OpenTelemetry e deploy conteinerizado (Docker, Kubernetes, AWS ECS Fargate, ECR, S3, IAM, WAF e CloudWatch).",
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
    basis: "32 vagas reais (Brasil & Europa) de Forward Deployed Engineer (FDE) e Applied AI Engineer + 6 Grandes Sistemas de Produção",
    level: "Júnior Avançado / Pleno-Ready em Engenharia de IA Aplicada & Forward Deployed Engineering",
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
  totalPlannedMinutes: roadmap.totalPlannedMinutes,
  roundedHours: Math.round(roadmap.totalPlannedMinutes / 60),
  exactHours: Math.round(roadmap.totalPlannedMinutes / 6) / 10,
  start: roadmap.period.start,
  end: roadmap.period.end,
  studyDays: days.filter((day) => day.kind === "study").length,
  projectDays: days.filter((day) => day.kind === "project").length,
  skillsCount: linkedinSkillMilestones.length,
  milestonesCount: careerMilestones.length,
}, null, 2));
