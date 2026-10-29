import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const curriculumPath = process.env.DATASCIENCE_CURRICULUM_SOURCE
  ?? path.resolve(root, "../../DataScience/01 - Roadmap/roadmapudemy_diario.md");
const startDate = new Date(2026, 10, 3, 12);
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
const holidayMap = new Map(holidays.map((holiday) => [holiday.date, holiday]));
const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const slug = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const nextStudyDate = (date) => {
  const next = new Date(date);
  while (next.getDay() === 0 || next.getDay() === 6 || holidayMap.has(dateKey(next))) next.setDate(next.getDate() + 1);
  return next;
};
const parseDuration = (text = "") => {
  const hours = Number(text.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(text.match(/(\d+)min/)?.[1] ?? 0);
  const seconds = Number(text.match(/(\d+)s/)?.[1] ?? 0);
  return hours * 60 + minutes + Math.ceil(seconds / 60);
};

function parseCatalog(markdown) {
  const courses = new Map();
  let inDataScience = false;
  let currentCourse = null;
  let currentSection = null;

  for (const line of markdown.split(/\r?\n/)) {
    if (line === "### Data Science") { inDataScience = true; currentCourse = null; currentSection = null; continue; }
    if (line.startsWith("### ") && line !== "### Data Science") { inDataScience = false; continue; }
    if (!inDataScience) continue;

    const courseMatch = line.match(/^\*\*Curso:\*\* \[([^\]]+)\]\(([^)]+)\)/);
    if (courseMatch) {
      const [, title, url] = courseMatch;
      if (!courses.has(title)) courses.set(title, { title, url, units: [], seen: new Set() });
      currentCourse = courses.get(title);
      currentSection = null;
      continue;
    }
    const sectionMatch = line.match(/^\*\*Seção:\*\* `(.+)`/);
    if (sectionMatch) { currentSection = sectionMatch[1]; continue; }
    const itemMatch = line.match(/^- \[ \] (Aula|Quiz|Simulação): `([^`]+)`(?: — (.+))?$/);
    if (!itemMatch || !currentCourse || !currentSection) continue;

    const [, type, title, durationText = ""] = itemMatch;
    const key = `${currentSection}|${type}|${title}`;
    if (currentCourse.seen.has(key)) continue;
    currentCourse.seen.add(key);
    const exactMinutes = parseDuration(durationText);
    currentCourse.units.push({
      courseTitle: currentCourse.title,
      courseUrl: currentCourse.url,
      section: currentSection,
      type,
      title,
      durationText: durationText || "duração não informada",
      durationMinutes: exactMinutes || 10,
      estimated: exactMinutes === 0,
      wholeModule: false,
    });
  }

  for (const course of courses.values()) {
    course.units.forEach((unit, index) => { unit.sequence = index + 1; });
    delete course.seen;
  }
  return courses;
}

const catalog = parseCatalog(fs.readFileSync(curriculumPath, "utf8"));
const wholeModuleCourse = (title, url, modules) => ({
  title,
  url,
  units: modules.map(([moduleTitle, minutes, estimated = false], index) => ({
    courseTitle: title,
    courseUrl: url,
    section: moduleTitle,
    type: "Módulo",
    title: moduleTitle,
    durationText: `${minutes}min`,
    durationMinutes: minutes,
    estimated,
    wholeModule: true,
    sequence: index + 1,
  })),
});

const exactLectureCourse = (title, url, sections) => {
  let sequence = 0;
  return {
    title,
    url,
    units: sections.flatMap(([section, lessons]) => lessons.map(([lessonTitle, durationText]) => ({
      courseTitle: title,
      courseUrl: url,
      section,
      type: "Aula",
      title: lessonTitle,
      durationText,
      durationMinutes: parseDuration(durationText),
      estimated: false,
      wholeModule: false,
      sequence: ++sequence,
    }))),
  };
};

catalog.set("Análise e Levantamento de Requisitos de Software — Wesley Ávila", exactLectureCourse(
  "Análise e Levantamento de Requisitos de Software — Wesley Ávila",
  "https://www.udemy.com/course/analise-de-requisitos-de-software/",
  [
    ["Introdução Geral ao Curso de Requisitos de Software", [
      ["Introdução Geral ao Curso de Requisitos de Software", "13min22s"],
    ]],
    ["Introdução à Análise de Requisitos de Software", [
      ["O que são Requisitos de Software?", "7min38s"],
      ["O que é Análise de Requisitos de Software?", "5min31s"],
      ["Porque Análise de Requisitos é Importante?", "4min41s"],
      ["Processos de Análise de Requisitos", "5min19s"],
      ["Desafios na Área de Análise de Requisitos de Software", "4min45s"],
      ["Tipos de Requisitos de Software", "17min35s"],
    ]],
    ["Elicitação de Requisitos", [
      ["Técnicas de Elicitação de Requisitos: Entrevistas, Workshops, Brainstorming, etc", "18min00s"],
      ["Compreendendo as Necessidades dos Stakeholders e Capturando Requisitos", "16min10s"],
      ["Requisitos Funcionais, de Domínio, Interface, Usabilidade, Desempenho e ETC", "17min08s"],
    ]],
    ["Análise e Documentação de Requisitos", [
      ["Identificação de Requisitos Essenciais (Funcionais) e Opcionais (Não Funcionais)", "13min14s"],
      ["Documentação de Requisitos utilizando Linguagem Natural, Diagramas UML e Outras", "16min31s"],
      ["Especificação de Requisitos de Forma Clara, Consistente e Sem Ambiguidades", "10min54s"],
    ]],
    ["Comunicação e Colaboração", [
      ["Técnicas de Comunicação Eficaz com os Stakeholders", "19min52s"],
      ["Trabalho em Equipe e Colaboração Durante o Processo de Análise de Requisitos", "14min42s"],
      ["Desafios Comuns e Melhores Práticas para Lidar com Requisitos de Software", "14min01s"],
    ]],
    ["Estudos de Caso e Exemplos Práticos", [
      ["Exemplo de Análise de Requisitos de Sistema de Gerenciamento de Bibliotecas", "10min59s"],
      ["Exemplo de Análise de Requisitos de Aplicativo de Entrega de Alimentos", "15min21s"],
      ["Exemplo de Análise de Requisitos de Sistema de Gestão Empresarial", "16min33s"],
      ["Documento de Requisitos Sistema de Gerenciamento de Bibliotecas", "13min29s"],
      ["Documento de Requisitos Aplicativo de Entrega de Alimentos", "10min05s"],
      ["Documento de Requisitos Sistema de Gestão Empresarial", "12min33s"],
      ["Dificuldades, Desafios e Soluções no Levantamento de Requisitos", "12min49s"],
    ]],
  ],
));

catalog.set("Formação Microsoft Power BI Profissional — André Rosa", wholeModuleCourse(
  "Formação Microsoft Power BI Profissional — André Rosa",
  "https://www.udemy.com/course/formacao-power-bi-pro/",
  [
    ["Introdução", 48],
    ["Introdução a BI (Bussiness Intelligence)", 47],
    ["Modelagem - Power Query - Ingestão e transformação de dados", 107],
    ["Trabalhando com Modelo Fato e Dimensão (Star Schema/Snow Flake)", 39],
    ["Ingestão de Dados da WEB", 41],
    ["Modelagem Desnormalizando seus dados (Modelo de Dados)", 57],
    ["INTRODUÇÃO DAX", 64],
    ["Funções DAX Agregações e Iterativas", 61],
    ["Funções DAX Agregações Datas", 34],
    ["Funções DAX Lógicas", 36],
    ["Funções DAX Filters/Filtros/Calculate", 71, true],
    ["Funções DAX Inteligência de Tempo", 71, true],
    ["Filtros Power BI", 71, true],
    ["Data Viz Visualização de dados", 71, true],
    ["P&R Perguntas e Resposta / Q&A Questions and Answers", 71, true],
    ["Finalizando e Publicando 1º Projeto Completo", 71, true],
    ["2º Projeto Gestão de Orçamentos", 71, true],
    ["Bookmarks - Criando o Storytelling", 71, true],
    ["Power BI Service - Recursos e Gestão", 67, true],
  ],
));

catalog.set("Álgebra Linear para Data Science e Machine Learning — Jones Granatyr", wholeModuleCourse(
  "Álgebra Linear para Data Science e Machine Learning — Jones Granatyr",
  "https://www.udemy.com/course/algebra-linear-para-data-science-e-machine-learning/",
  [["Introdução", 8], ["Conceitos iniciais", 110], ["Vetores", 60], ["Matrizes", 52], ["Operações", 43], ["Transformações", 106], ["Aplicações", 115], ["Considerações finais", 3]],
));

catalog.set("FastAPI - APIs Modernas e Assíncronas com Python — Geek University", wholeModuleCourse(
  "FastAPI - APIs Modernas e Assíncronas com Python — Geek University",
  "https://www.udemy.com/course/fastapi-apis-modernas-e-assincronas-com-python/",
  [["Apresentação", 6], ["Introdução ao FastAPI", 98], ["Entendendo os conceitos do FastAPI", 174], ["CRUD FastAPI e SQL Alchemy", 90], ["CRUD FastAPI e SQL Model", 62], ["Segurança: Autenticação e Autorização com FastAPI", 224], ["Deploy: FastAPI em Cloud Linux com NGINX e PostgreSQL", 91], ["Encerramento", 2]],
));

const phaseInfo = {
  p1: { priority: "Prioridade 1", title: "Fundamentos indispensáveis", description: "Python para dados, SQL, estatística, BI, qualidade e comunicação." },
  p2: { priority: "Prioridade 2", title: "Competências próximas do nível pleno", description: "Machine Learning, experimentação, séries temporais, APIs, engenharia e produção." },
  p3: { priority: "Prioridade 3", title: "Especialização em Inteligência Artificial", description: "Deep Learning, NLP, LLMs, RAG, agentes, MLOps e cloud." },
};

const plan = [
  ["p1", "course", "Análise de Dados com Python e Pandas"],
  ["p1", "course", "Git e contribuições para projetos Open Source"],
  ["p1", "course", "SQL para Análise de Dados: do Básico ao Avançado!"],
  ["p1", "course", "Análise e Levantamento de Requisitos de Software — Wesley Ávila"],
  ["p1", "project", "diagnostico-atendimento", 2, "Projeto 1C · Diagnóstico de atendimento ao cliente"],
  ["p1", "course", "Formação Microsoft Power BI Profissional — André Rosa"],
  ["p1", "project", "painel-estoque", 3, "Projeto 2B · Painel de estoque e risco de ruptura"],
  ["p1", "course", "Estatística para Ciência de Dados e Machine Learning"],
  ["p1", "course", "Álgebra Linear para Data Science e Machine Learning — Jones Granatyr"],
  ["p1", "course", "Data Storytelling e Visualização de Dados"],
  ["p1", "course", "Machine Learning e Data Science com Python de A a Z"],
  ["p2", "course", "Feature Engineering for Machine Learning"],
  ["p2", "project", "risco-credito", 4, "Projeto 3B · Previsão de inadimplência e risco de crédito"],
  ["p2", "course", "Domine Pytest: Testes de Software com Python"],
  ["p2", "course", "Bayesian Machine Learning in Python: A/B Testing"],
  ["p2", "course", "Econometrics and Statistics for Business in R & Python"],
  ["p2", "course", "Séries Temporais e Analises Preditivas com Python"],
  ["p2", "project", "previsao-atendimento", 4, "Projeto 4C · Previsão de volume e dimensionamento de atendimento"],
  ["p2", "course", "FastAPI - APIs Modernas e Assíncronas com Python — Geek University"],
  ["p2", "project", "api-churn", 4, "Projeto 5A · API de decisão para risco de churn"],
  ["p2", "course", "Databricks Developer Spark,SQL,Python Para Análise de Dados"],
  ["p2", "course", "MLOps: Da Ciência de Dados à Operação"],
  ["p2", "course", "Machine Learning com Amazon AWS e SageMaker"],
  ["p3", "course", "Deep Learning com Python de A a Z - O Curso Completo"],
  ["p3", "course", "Formação Processamento de Linguagem Natural, LLMs e GenAI"],
  ["p3", "course", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs"],
  ["p3", "project", "inteligencia-avaliacoes", 5, "Projeto 6B · Inteligência de avaliações de clientes"],
];

const projectSteps = ["Diagnóstico e escopo", "Construção", "Validação", "Documentação e entrega", "Publicação no LinkedIn"];
let cursor = nextStudyDate(startDate);
let dayNumber = 1;
let taskCounter = 1;
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
  const prefix = unit.wholeModule ? "Módulo inteiro" : `${unit.type} ${String(unit.sequence).padStart(2, "0")}`;
  const estimate = unit.estimated ? " (duração estimada)" : "";
  return {
    id: `tarefa-${String(taskCounter++).padStart(5, "0")}`,
    label: `${prefix}: ${unit.title} — ${unit.durationText}${estimate}`,
    kind: unit.type === "Quiz" ? "quiz" : unit.type === "Simulação" ? "simulacao" : "aula",
    durationMinutes: unit.durationMinutes,
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
    const sectionKey = `${row.unit.courseTitle} · ${row.unit.section}`;
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
    note: "Os títulos abaixo reproduzem literalmente a grade cadastrada. Use o nome para localizar a aula ou o módulo na Udemy.",
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
    const step = projectSteps[index] ?? `Execução ${index + 1}`;
    const task = { id: `tarefa-${String(taskCounter++).padStart(5, "0")}`, label: `${step} — 4h`, kind: "entrega", durationMinutes: 240 };
    days.push({ id: `dia-${String(dayNumber).padStart(3, "0")}`, dayNumber, date: dateKey(date), weekday: weekdays[date.getDay()], plannedMinutes: 240, phaseId, phaseTitle: phaseInfo[phaseId].title, kind: "project", projectSlug, note: title, sections: [{ title: "Projeto de portfólio", tasks: [task] }], courses: [] });
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
  if (!course) throw new Error(`Curso sem grade exata cadastrada: ${key}`);
  for (const unit of course.units) {
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
  if (remainingMinutes < minimumDailyMinutes && previousDay?.kind === "study" && previousDay.phaseId === studyBuffer[0].phaseId) {
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
  return { id, title: info.title, priority: info.priority, description: info.description, start: phaseDays[0].date, end: phaseDays.at(-1).date, days: phaseDays.length };
});
const projectEndDay = (projectSlug) => days.filter((day) => day.projectSlug === projectSlug).at(-1)?.dayNumber ?? days.length;
const lastDayForCourse = (courseTitle, sectionTitle) => days.filter((day) => {
  const hasCourse = day.courses.some((course) => course.title === courseTitle);
  if (!hasCourse || !sectionTitle) return hasCourse;
  return day.sections.some((section) => section.title === `${courseTitle} · ${sectionTitle}`);
}).at(-1)?.dayNumber;
const skillDefinitions = [
  ["NumPy", "Análise de Dados com Python e Pandas", "Numpy Hands On", "Arrays, indexação, reshape, join e operações com NumPy concluídos."],
  ["Pandas", "Análise de Dados com Python e Pandas", "Pandas - Transformação de Dados", "Manipulação e transformação de dados com Series e DataFrames concluídas."],
  ["Git", "Git e contribuições para projetos Open Source", null, "Controle de versão, branches, conflitos e colaboração estudados."],
  ["SQL", "SQL para Análise de Dados: do Básico ao Avançado!", null, "Consultas, subqueries e funções de janela concluídas."],
  ["Levantamento de requisitos", "Análise e Levantamento de Requisitos de Software — Wesley Ávila", "Elicitação de Requisitos", "Entrevistas, workshops, brainstorming e captura de necessidades estudados."],
  ["Comunicação com stakeholders", "Análise e Levantamento de Requisitos de Software — Wesley Ávila", "Comunicação e Colaboração", "Comunicação, colaboração e tratamento de requisitos com stakeholders concluídos."],
  ["Microsoft Power Query", "Formação Microsoft Power BI Profissional — André Rosa", "Modelagem - Power Query - Ingestão e transformação de dados", "Ingestão e transformação de dados no Power Query concluídas."],
  ["Modelagem de dados", "Formação Microsoft Power BI Profissional — André Rosa", "Modelagem Desnormalizando seus dados (Modelo de Dados)", "Modelagem dimensional, fato, dimensão e desnormalização estudadas."],
  ["DAX", "Formação Microsoft Power BI Profissional — André Rosa", "Funções DAX Inteligência de Tempo", "Agregações, filtros, lógica e inteligência de tempo em DAX concluídas."],
  ["Microsoft Power BI", "Formação Microsoft Power BI Profissional — André Rosa", null, "Modelagem, visualização, publicação e recursos do Power BI concluídos."],
  ["Estatística", "Estatística para Ciência de Dados e Machine Learning", null, "Probabilidade, inferência, testes, correlação e regressão concluídos."],
  ["Álgebra linear", "Álgebra Linear para Data Science e Machine Learning — Jones Granatyr", null, "Vetores, matrizes, operações e transformações lineares concluídos."],
  ["Storytelling com dados", "Data Storytelling e Visualização de Dados", null, "Narrativa, comunicação visual e escolha de gráficos concluídas."],
  ["Machine Learning", "Machine Learning e Data Science com Python de A a Z", null, "Modelos de classificação, regressão, agrupamento e avaliação concluídos."],
  ["Feature engineering", "Feature Engineering for Machine Learning", null, "Imputação, encoding, transformação, scaling e pipelines concluídos."],
  ["Pytest", "Domine Pytest: Testes de Software com Python", null, "Testes, fixtures, parametrização, integração e CI/CD com Pytest concluídos."],
  ["Teste A/B", "Bayesian Machine Learning in Python: A/B Testing", null, "Testes A/B tradicionais e bayesianos concluídos."],
  ["Econometria", "Econometrics and Statistics for Business in R & Python", null, "Métodos de inferência causal e econometria aplicada concluídos."],
  ["Séries temporais", "Séries Temporais e Analises Preditivas com Python", null, "Preprocessamento, previsão e detecção de anomalias em séries concluídos."],
  ["FastAPI", "FastAPI - APIs Modernas e Assíncronas com Python — Geek University", null, "Construção, segurança, persistência e deploy de APIs com FastAPI concluídos."],
  ["Apache Spark", "Databricks Developer Spark,SQL,Python Para Análise de Dados", "Funções de agregações", "Manipulação e agregação distribuída de dados com PySpark concluídas."],
  ["Databricks", "Databricks Developer Spark,SQL,Python Para Análise de Dados", null, "Processamento de dados, Delta Lake e recursos do Databricks concluídos."],
  ["MLOps", "MLOps: Da Ciência de Dados à Operação", null, "DVC, MLflow, Airflow e operação de modelos concluídos."],
  ["Amazon SageMaker", "Machine Learning com Amazon AWS e SageMaker", null, "Treinamento, endpoints e modelos gerenciados no SageMaker concluídos."],
  ["Deep Learning", "Deep Learning com Python de A a Z - O Curso Completo", null, "Redes densas, convolucionais, recorrentes e autoencoders concluídos."],
  ["Processamento de linguagem natural (PLN)", "Formação Processamento de Linguagem Natural, LLMs e GenAI", "Machine Learning e Deep Learning para NLP na Prática", "Fundamentos e modelos de NLP aplicados concluídos."],
  ["Large Language Models (LLM)", "Formação Processamento de Linguagem Natural, LLMs e GenAI", "Transformers, Bert, GPT e mais", "Transformers, BERT, GPT e LLMs estudados."],
  ["LangChain", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs", "RAG: Aplicação de Busca Semântica em Documentos Jurídicos", "Chains, embeddings, bancos vetoriais e RAG com LangChain concluídos."],
  ["LangGraph", "LangChain e LangGraph: Crie Agentes de IA com LLMs e RAGs", null, "Conceitos e aplicações práticas de fluxos com LangGraph concluídos."],
];
const linkedinSkillMilestones = skillDefinitions.map(([skill, course, section, evidence]) => ({
  id: `linkedin-skill-${slug(skill)}`,
  afterDay: lastDayForCourse(course, section),
  skill,
  evidence,
})).filter((milestone) => milestone.afterDay);
const roadmap = {
  generatedAt: new Date().toISOString(),
  sourcePath: "Grade literal dos cursos em DataScience/01 - Roadmap/roadmapudemy_diario.md e módulos oficiais confirmados",
  period: { start: days[0].date, end: days.at(-1).date },
  totalBusinessDays: days.length,
  totalPlannedMinutes: days.reduce((total, day) => total + day.plannedMinutes, 0),
  phases: phaseStats,
  holidays,
  careerMilestones: [
    { id: "m1", afterDay: projectEndDay("diagnostico-atendimento"), title: "Portfólio inicial de análise", rationale: "Primeiro diagnóstico reproduzível concluído.", linkedinTitle: "Estudante de Ciência de Dados | Python, Pandas e análise de dados" },
    { id: "m2", afterDay: projectEndDay("painel-estoque"), title: "Base de BI demonstrada", rationale: "SQL, Power BI e um painel auditável já foram entregues.", linkedinTitle: "Analista de Dados em formação | SQL, Power BI e Python" },
    { id: "m3", afterDay: projectEndDay("risco-credito"), title: "Machine Learning aplicado", rationale: "Modelo preditivo validado e comunicado com limites claros.", linkedinTitle: "Cientista de Dados em formação | Machine Learning, SQL e Python" },
    { id: "m4", afterDay: projectEndDay("api-churn"), title: "Entrega técnica em API", rationale: "Modelo transformado em serviço testável e documentado.", linkedinTitle: "Cientista de Dados em formação | ML, APIs e MLOps" },
    { id: "m5", afterDay: days.length, title: "Trilha completa concluída", rationale: "Projetos de dados, previsão e IA entregues com documentação.", linkedinTitle: "Cientista de Dados Júnior | Python, SQL, ML e IA aplicada" },
  ],
  linkedinSkillMilestones,
  days,
};

fs.writeFileSync(path.join(root, "data/evolution/roadmap.json"), `${JSON.stringify(roadmap, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ courses: catalog.size, days: roadmap.totalBusinessDays, hours: Math.round(roadmap.totalPlannedMinutes / 6) / 10, start: roadmap.period.start, end: roadmap.period.end, projects: days.filter((day) => day.kind === "project").length }, null, 2));
