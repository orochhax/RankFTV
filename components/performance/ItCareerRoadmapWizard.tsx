"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  Languages,
  Layers3,
  Loader2,
  Search,
  ShieldAlert,
  Target,
} from "lucide-react";
import {
  criarRoadmapTiPredefinidoLifeOS,
  obterConfiguracaoRoadmapTiLifeOS,
  previsualizarRoadmapTiLifeOS,
} from "@/app/admin/performance/life-os-actions";

type UnknownRecord = Record<string, unknown>;
type TimelineMode = "duration" | "deadline";
type MasteredTopicPolicy = "skip" | "validate";
type ApplicationIntent = "none" | "after_roadmap" | "applying_now";
type Objective = "learning" | "first_job" | "career_change" | "current_job" | "freelance";
type ItCareerInterestId = string;

type InterestOption = {
  id: ItCareerInterestId;
  label: string;
  description: string;
};

type CareerCard = {
  id: string;
  label: string;
  description: string;
};

type CareerTopic = {
  id: string;
  label: string;
  moduleLabel: string | null;
  levelLabel: string | null;
};

type PreviewNode = {
  id: string;
  title: string;
  children: PreviewNode[];
};

type PreviewModule = {
  id: string;
  title: string;
  levelId: string | null;
  levelLabel: string | null;
  estimatedMinutes: number;
  nodes: PreviewNode[];
};

type PreviewMilestone = {
  id: string;
  levelId: string | null;
  label: string;
  description: string | null;
  estimatedMinutes: number;
  targetDate: string | null;
};

type PreviewDailyQuestionPolicy = {
  questionsPerStudyDay: number;
  minutesPerQuestion: number;
  minutesReservedPerStudyDay: number;
  rationale: string | null;
};

type PreviewPlan = {
  title: string;
  description: string;
  modules: PreviewModule[];
  totalEstimatedMinutes: number;
  bufferMinutes: number;
  recommendedEstimatedMinutes: number;
  recommendedTargetDate: string | null;
  deadlineWarning: string | null;
  milestones: PreviewMilestone[];
  dailyQuestionPolicy: PreviewDailyQuestionPolicy | null;
};

type PlanBuilderSetup = {
  careerId: string;
  currentLevel: string;
  targetLevel: string;
  interestIds: ItCareerInterestId[];
  knownTopicIds: string[];
  knownTopicPolicy: MasteredTopicPolicy;
  includeDailyQuestions: true;
  includeModuleProjects: true;
  includeCapstone: boolean;
  jobPreparation: boolean;
  objective: Objective;
  applicationIntent: ApplicationIntent;
  targetRole: string;
  startDate: string;
  timelineMode: TimelineMode;
  durationMonths: number;
  deadline: string;
  availableDays: string[];
  minutesPerDay: number;
};

type WizardConfiguration = {
  careers: CareerCard[];
  currentLevelIds: string[];
  currentLevelLabels: Record<string, string>;
  targetLevelIds: string[];
  targetLevelLabels: Record<string, string>;
  interestOptions: InterestOption[];
  topicsByCareerAndLevel: Record<string, Record<string, CareerTopic[]>>;
};

const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500";
const fieldsetClass = "space-y-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:p-5";
const weekdays = [["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"], ["0", "Dom"]] as const;

const objectiveOptions: Array<{ value: Objective; label: string; detail: string }> = [
  { value: "learning", label: "Aprendizado pessoal", detail: "Aprender com profundidade, sem foco imediato em contratação." },
  { value: "first_job", label: "Primeiro emprego em TI", detail: "Construir base técnica e projetos para se preparar para entrar na área." },
  { value: "career_change", label: "Mudar de carreira", detail: "Fazer uma transição estruturada para esta especialidade." },
  { value: "current_job", label: "Melhorar no trabalho atual", detail: "Aplicar as competências na função que já exerce." },
  { value: "freelance", label: "Trabalhar como freelancer", detail: "Preparar-se para realizar e entregar projetos a clientes." },
];

const discoveryOptions = [
  { value: "interfaces", label: "Interfaces e experiência do usuário", terms: ["front", "full stack", "mobile"] },
  { value: "logic", label: "Lógica, sistemas e APIs", terms: ["back", "full stack"] },
  { value: "data", label: "Dados, indicadores e inteligência artificial", terms: ["dados", "data", "inteligência", "ia", "bi"] },
  { value: "infrastructure", label: "Infraestrutura, nuvem e automação", terms: ["devops", "cloud", "infra", "redes", "suporte"] },
  { value: "security", label: "Segurança e investigação de riscos", terms: ["segurança", "security"] },
  { value: "quality", label: "Qualidade, testes e prevenção de erros", terms: ["qa", "teste"] },
] as const;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function collection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const object = record(value);
  return Object.entries(object).map(([key, item]) => {
    const itemRecord = record(item);
    return Object.keys(itemRecord).length ? { id: key, ...itemRecord } : { id: key, label: String(item ?? key) };
  });
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function firstText(source: UnknownRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = textValue(source[key]);
    if (value) return value;
  }
  return fallback;
}

function labelsRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(collection(value).flatMap((item) => {
    const source = record(item);
    const id = firstText(source, ["id", "key", "value"]);
    const label = firstText(source, ["label", "title", "name"], id);
    return id ? [[id, label]] : [];
  }).concat(Object.entries(record(value)).flatMap(([id, label]) => typeof label === "string" ? [[id, label]] : [])));
}

const experienceLevelCopy: Record<string, { title: string; detail: string }> = {
  zero: { title: "Estou começando do zero", detail: "Ainda não pratiquei os fundamentos desta carreira." },
  foundation: { title: "Já tive contato com a base", detail: "Reconheço conceitos e ferramentas, mas ainda preciso consolidar a prática." },
  junior: { title: "Já realizo tarefas delimitadas", detail: "Consigo produzir entregas menores, normalmente com revisão ou orientação." },
  mid: { title: "Já trabalho com autonomia", detail: "Consigo integrar assuntos, diagnosticar problemas e justificar escolhas." },
  senior: { title: "Já decido arquitetura e escala", detail: "Tenho experiência prática com riscos, confiabilidade e decisões complexas." },
  specialist: { title: "Já atuo em problemas sistêmicos", detail: "Trabalho com plataformas, governança ou profundidade técnica avançada." },
};

const curriculumDepthCopy: Record<string, { title: string; reference: string; detail: string }> = {
  foundation: { title: "Base essencial", reference: "Conteúdo de Fundamentos", detail: "Conceitos, vocabulário e ferramentas indispensáveis para avançar." },
  junior: { title: "Prática para entregas iniciais", reference: "Competências associadas a Júnior", detail: "Fundamentos, tarefas delimitadas e qualidade básica em entregas iniciais." },
  mid: { title: "Autonomia e integração", reference: "Competências associadas a Pleno", detail: "Integração entre módulos, diagnóstico e decisões técnicas com autonomia." },
  senior: { title: "Arquitetura, escala e confiabilidade", reference: "Competências associadas a Sênior", detail: "Trade-offs, segurança, operação e problemas complexos em produção." },
  specialist: { title: "Especialização sistêmica", reference: "Competências de Especialista/Arquitetura", detail: "Plataformas, governança e profundidade técnica em sistemas de grande porte." },
};

function curriculumDepth(id: string, fallback?: string | null): { title: string; reference: string; detail: string } {
  return curriculumDepthCopy[id] ?? { title: fallback || id, reference: "Profundidade curricular", detail: "Conteúdo técnico predefinido para esta etapa." };
}

function normalizeCareers(value: unknown): CareerCard[] {
  return collection(value).flatMap((item, index) => {
    const source = record(item);
    const id = firstText(source, ["id", "careerId", "key", "slug"], `career-${index + 1}`);
    const label = firstText(source, ["label", "title", "name"], id);
    if (!id || !label) return [];
    return [{
      id,
      label,
      description: firstText(source, ["description", "summary", "detail"], "Trilha técnica predefinida e organizada por níveis."),
    }];
  });
}

function normalizeTopics(value: unknown): CareerTopic[] {
  return collection(value).flatMap((item, index) => {
    const source = record(item);
    const id = firstText(source, ["id", "topicId", "key", "templateKey", "code"], `topic-${index + 1}`);
    const label = firstText(source, ["label", "title", "name"], id);
    if (!id || !label) return [];
    const moduleSource = record(source.module);
    const levelSource = record(source.level);
    return [{
      id,
      label,
      moduleLabel: firstText(source, ["moduleLabel", "moduleTitle", "moduleName"], firstText(moduleSource, ["label", "title", "name"])) || null,
      levelLabel: firstText(source, ["levelLabel", "levelName"], firstText(levelSource, ["label", "title", "name"])) || null,
    }];
  });
}

function normalizeNodes(value: unknown, prefix: string): PreviewNode[] {
  return collection(value).flatMap((item, index) => {
    const source = record(item);
    const title = firstText(source, ["title", "label", "name"], typeof item === "string" ? item : "");
    if (!title) return [];
    const id = firstText(source, ["id", "key", "templateKey", "code"], `${prefix}-${index}`);
    const childSource = source.subtopics ?? source.children ?? source.items;
    const children = normalizeNodes(childSource, id);
    const dailyQuizzes = collection(source.dailyQuizzes);
    const dailyQuestionCount = dailyQuizzes.reduce((sum: number, quiz) => sum + collection(record(quiz).questions).length, 0);
    const dailyQuestionSummary = dailyQuizzes.length
      ? [{
          id: `${id}-daily-questions`,
          title: `Questões diárias: ${dailyQuestionCount} perguntas em ${dailyQuizzes.length} dias de estudo`,
          children: [],
        }]
      : [];
    return [{ id, title, children: [...children, ...dailyQuestionSummary] }];
  });
}

function normalizeArtifact(value: unknown, prefix: string): PreviewNode[] {
  const source = record(value);
  if (!Object.keys(source).length) return [];
  const title = firstText(source, ["title", "label", "name"]);
  if (!title) return [];
  const id = firstText(source, ["id", "key", "templateKey", "code"], prefix);
  const projectSpec = record(source.projectSpec);
  const dataSpec = record(projectSpec.data);
  const functionalities = collection(projectSpec.functionalities);
  const deliverables = collection(projectSpec.deliverables);
  const criteria = collection(projectSpec.evaluationCriteria);
  const productDefinition = firstText(projectSpec, ["productDefinition"]);
  const dataLabel = firstText(dataSpec, ["sourceLabel"]);
  const children = productDefinition
    ? [
        { id: `${id}-product`, title: productDefinition, children: [] },
        ...(dataLabel ? [{ id: `${id}-data`, title: `Dados definidos: ${dataLabel}`, children: [] }] : []),
        { id: `${id}-scope`, title: `${functionalities.length} funcionalidades · ${deliverables.length} entregas · ${criteria.length} critérios de avaliação`, children: [] },
      ]
    : [
        ...normalizeNodes(source.requirements ?? source.constraints, `${id}-requirements`),
        ...normalizeNodes(source.deliverables, `${id}-deliverables`),
        ...normalizeNodes(source.acceptanceCriteria, `${id}-criteria`),
        ...normalizeSubmissionInstructions(source.submissionInstructions, `${id}-submission`),
      ];
  return [{ id, title, children }];
}

function normalizeSubmissionInstructions(value: unknown, prefix: string): PreviewNode[] {
  const instruction = textValue(value);
  if (instruction) return [{ id: prefix, title: `Como entregar: ${instruction}`, children: [] }];
  return normalizeNodes(value, prefix);
}

function normalizeDailyQuestionPolicy(value: unknown): PreviewDailyQuestionPolicy | null {
  const source = record(value);
  const questionsPerStudyDay = numberValue(source.questionsPerStudyDay);
  if (!questionsPerStudyDay) return null;
  return {
    questionsPerStudyDay,
    minutesPerQuestion: numberValue(source.minutesPerQuestion),
    minutesReservedPerStudyDay: numberValue(source.minutesReservedPerStudyDay),
    rationale: firstText(source, ["rationale", "description", "detail"]) || null,
  };
}

function normalizeMilestones(value: unknown): PreviewMilestone[] {
  return collection(value).flatMap((item, index) => {
    const source = record(item);
    const levelSource = record(source.level);
    const levelId = firstText(
      source,
      ["levelId", "targetLevel", "levelKey"],
      typeof source.level === "string" ? source.level : firstText(levelSource, ["id", "key", "value"]),
    ) || null;
    const fallbackLabel = levelId ? curriculumDepth(levelId).title : `Marco ${index + 1}`;
    const label = firstText(source, ["label", "title", "name"], fallbackLabel);
    if (!label) return [];
    return [{
      id: firstText(source, ["id", "key", "templateKey", "code"], levelId ? `milestone-${levelId}` : `milestone-${index + 1}`),
      levelId,
      label,
      description: firstText(source, ["description", "summary", "detail"]) || null,
      estimatedMinutes: numberValue(source.cumulativeRecommendedEstimatedMinutes ?? source.cumulativeEstimatedMinutes ?? source.recommendedEstimatedMinutes ?? source.estimatedMinutes ?? source.totalEstimatedMinutes),
      targetDate: firstText(source, ["recommendedTargetDate", "targetDate", "estimatedCompletionDate", "date"]) || null,
    }];
  });
}

function normalizeDeadlineWarning(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return value === true ? "A capacidade do prazo desejado é menor que a carga recomendada do roadmap." : null;
}

function normalizePlan(value: unknown, fallbackTitle: string): PreviewPlan {
  const source = record(value);
  const modules = collection(source.modules).map((item, index) => {
    const moduleSource = record(item);
    const id = firstText(moduleSource, ["id", "key", "templateKey", "code"], `module-${index}`);
    const nodes = [
      ...normalizeNodes(moduleSource.topics ?? moduleSource.items ?? moduleSource.children, id),
      ...normalizeArtifact(moduleSource.project, `${id}-project`),
    ];
    const level = record(moduleSource.level);
    const levelId = firstText(
      moduleSource,
      ["levelId", "levelKey"],
      typeof moduleSource.level === "string" ? moduleSource.level : firstText(level, ["id", "key", "value"]),
    ) || null;
    return {
      id,
      title: firstText(moduleSource, ["title", "label", "name"], `Módulo ${index + 1}`),
      levelId,
      levelLabel: firstText(moduleSource, ["levelLabel", "levelName"], firstText(level, ["label", "title", "name"])) || null,
      estimatedMinutes: numberValue(moduleSource.estimatedMinutes ?? moduleSource.totalEstimatedMinutes ?? moduleSource.durationMinutes),
      nodes,
    };
  });
  const capstoneSource = record(source.capstone);
  if (Object.keys(capstoneSource).length) {
    const capstoneId = firstText(capstoneSource, ["id", "key", "templateKey"], "capstone");
    modules.push({
      id: capstoneId,
      title: firstText(capstoneSource, ["title", "label", "name"], "Projeto final completo (TCC)"),
      levelId: null,
      levelLabel: "Projeto final",
      estimatedMinutes: numberValue(capstoneSource.estimatedMinutes ?? capstoneSource.totalEstimatedMinutes),
      nodes: normalizeArtifact(capstoneSource, capstoneId).flatMap((node) => node.children.length ? node.children : [node]),
    });
  }
  const preparationSource = record(source.jobPreparation);
  if (Object.keys(preparationSource).length) {
    const preparationId = firstText(preparationSource, ["id", "key", "templateKey"], "job-preparation");
    modules.push({
      id: preparationId,
      title: firstText(preparationSource, ["title", "label", "name"], "Preparação profissional"),
      levelId: null,
      levelLabel: "Carreira",
      estimatedMinutes: numberValue(preparationSource.estimatedMinutes ?? preparationSource.totalEstimatedMinutes),
      nodes: normalizeArtifact(preparationSource, preparationId).flatMap((node) => node.children.length ? node.children : [node]),
    });
  }
  const moduleMinutes = modules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  const totalEstimatedMinutes = numberValue(source.totalEstimatedMinutes ?? source.estimatedMinutes) || moduleMinutes;
  const explicitBufferMinutes = numberValue(source.bufferMinutes ?? source.reviewBufferMinutes ?? source.contingencyMinutes);
  const explicitRecommendedMinutes = numberValue(source.recommendedEstimatedMinutes ?? source.recommendedTotalMinutes ?? source.totalRecommendedMinutes);
  const recommendedEstimatedMinutes = Math.max(totalEstimatedMinutes + explicitBufferMinutes, explicitRecommendedMinutes, totalEstimatedMinutes);
  const bufferMinutes = explicitBufferMinutes || Math.max(0, recommendedEstimatedMinutes - totalEstimatedMinutes);
  return {
    title: firstText(source, ["title", "name"], fallbackTitle),
    description: firstText(source, ["description", "summary"], "Roadmap predefinido ajustado ao seu nível, objetivo e tempo disponível."),
    modules,
    totalEstimatedMinutes,
    bufferMinutes,
    recommendedEstimatedMinutes,
    recommendedTargetDate: firstText(source, ["recommendedTargetDate", "recommendedDeadline", "recommendedDate"]) || null,
    deadlineWarning: normalizeDeadlineWarning(source.deadlineWarning),
    milestones: normalizeMilestones(source.milestones),
    dailyQuestionPolicy: normalizeDailyQuestionPolicy(source.dailyQuestionPolicy),
  };
}

function formatDuration(minutes: number): string {
  if (!minutes) return "Carga calculada ao salvar";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}min` : ""}` : `${minutes}min`;
}

function formatDurationAsDays(minutes: number): string {
  if (!minutes) return "";
  const totalHours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const remainingTime = [
    hours ? `${hours}h` : null,
    remainderMinutes ? `${remainderMinutes}min` : null,
  ].filter(Boolean).join(" ");
  const equivalent = [
    days ? `${days} ${days === 1 ? "dia" : "dias"}` : null,
    remainingTime || null,
  ].filter(Boolean).join(" + ");
  return equivalent;
}

function formatDurationAsStudyDays(minutes: number, minutesPerDay: number): string {
  if (!minutes || !minutesPerDay) return "";
  const studyDays = Math.ceil(minutes / minutesPerDay);
  return `≈ ${studyDays} ${studyDays === 1 ? "dia" : "dias"} de estudo de ${formatDuration(minutesPerDay)}`;
}

function formatDurationDetails(minutes: number, minutesPerDay: number): string {
  return [
    `${formatDuration(minutes)} no total`,
    formatDurationAsStudyDays(minutes, minutesPerDay),
  ].filter(Boolean).join(" · ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function studyMinutesToClock(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function studyClockToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
}

function isoDate(date: Date): string {
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dateFromIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function addCalendarMonths(value: string, months: number): string | null {
  if (!dateFromIso(value) || !Number.isInteger(months)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const absoluteMonth = year * 12 + month - 1 + months;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = absoluteMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function previousCalendarDay(value: string): string | null {
  const date = dateFromIso(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date) || null;
}

function desiredTargetDate(startDate: string, mode: TimelineMode, durationMonths: number, deadline: string): string | null {
  if (mode === "deadline") return dateFromIso(deadline) ? deadline : null;
  if (!dateFromIso(startDate) || !Number.isFinite(durationMonths) || durationMonths < 1) return null;
  const nextMonthBoundary = addCalendarMonths(startDate, Math.floor(durationMonths));
  return nextMonthBoundary ? previousCalendarDay(nextMonthBoundary) : null;
}

function availableMinutesUntil(startDate: string, targetDate: string | null, availableDays: string[], minutesPerDay: number): number {
  const start = dateFromIso(startDate);
  const target = targetDate ? dateFromIso(targetDate) : null;
  if (!start || !target || target < start || !availableDays.length || minutesPerDay <= 0) return 0;
  const days = new Set(availableDays.map(Number));
  const totalDays = Math.floor((target.getTime() - start.getTime()) / 86_400_000) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  let studyDays = fullWeeks * days.size;
  const remainder = totalDays % 7;
  for (let index = 0; index < remainder; index += 1) {
    if (days.has((start.getUTCDay() + index) % 7)) studyDays += 1;
  }
  return studyDays * minutesPerDay;
}

function recommendedDateFromLoad(startDate: string, availableDays: string[], minutesPerDay: number, totalMinutes: number): string | null {
  const start = dateFromIso(startDate);
  if (!start || !availableDays.length || minutesPerDay <= 0 || totalMinutes <= 0) return null;
  const days = new Set(availableDays.map(Number));
  const cursor = new Date(start);
  let remaining = totalMinutes;
  // Twenty years is a safety guard against malformed inputs, not a product deadline.
  for (let index = 0; index < 7_305; index += 1) {
    if (days.has(cursor.getUTCDay())) remaining -= minutesPerDay;
    if (remaining <= 0) return isoDate(cursor) || null;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
}

function laterDate(first: string | null, second: string | null): string | null {
  if (!first) return second;
  if (!second) return first;
  return first >= second ? first : second;
}

function normalizedSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function PreviewTree({ nodes, depth = 0 }: { nodes: PreviewNode[]; depth?: number }) {
  if (!nodes.length) return null;
  return <ul className={depth ? "mt-1 space-y-1 border-l border-white/10 pl-3" : "space-y-1.5"}>{nodes.map((node) => <li key={node.id}>
    <div className="flex items-start gap-2 text-xs leading-5 text-white/60"><Check className="mt-1 size-3 shrink-0 text-emerald-300/70" /><span>{node.title}</span></div>
    <PreviewTree nodes={node.children} depth={depth + 1} />
  </li>)}</ul>;
}

export function ItCareerRoadmapWizard({ today, onClose, onDone, onChooseLanguage }: { today: string; onClose: () => void; onDone: () => void; onChooseLanguage: () => void }) {
  const [configuration, setConfiguration] = useState<WizardConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [careerId, setCareerId] = useState("");
  const [careerSearch, setCareerSearch] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryFocus, setDiscoveryFocus] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [masteredTopicIds, setMasteredTopicIds] = useState<string[]>([]);
  const [masteryConfirmed, setMasteryConfirmed] = useState(false);
  const [masteredTopicPolicy, setMasteredTopicPolicy] = useState<MasteredTopicPolicy | "">("");
  const [targetLevel, setTargetLevel] = useState("");
  const [objective, setObjective] = useState<Objective | "">("");
  const [applicationIntent, setApplicationIntent] = useState<ApplicationIntent>("none");
  const [targetRole, setTargetRole] = useState("");
  const [includeJobPreparation, setIncludeJobPreparation] = useState(true);
  const [selectedInterestIds, setSelectedInterestIds] = useState<ItCareerInterestId[]>([]);
  const [includeCapstone, setIncludeCapstone] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("duration");
  const [durationMonths, setDurationMonths] = useState(6);
  const [deadline, setDeadline] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [configurationPending, startConfigurationTransition] = useTransition();
  const [previewPending, startPreviewTransition] = useTransition();
  const [storedPreviewResult, setStoredPreviewResult] = useState<{ key: string; plan: PreviewPlan | null; error: string | null }>({ key: "", plan: null, error: null });
  const previewRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    startConfigurationTransition(async () => {
      try {
        const result = await obterConfiguracaoRoadmapTiLifeOS();
        if (!active) return;
        if (!result.ok) {
          setConfigurationError(result.error);
          return;
        }
        setConfiguration(result.configuration);
        setConfigurationError(null);
      } catch {
        if (active) setConfigurationError("Não foi possível carregar a configuração do roadmap.");
      }
    });
    return () => { active = false; };
  }, []);

  const careers = useMemo(() => normalizeCareers(configuration?.careers), [configuration]);
  const currentLevelLabels = useMemo(() => labelsRecord(configuration?.currentLevelLabels), [configuration]);
  const currentLevelIds = useMemo(() => collection(configuration?.currentLevelIds).map((item) => typeof item === "string" ? item : firstText(record(item), ["id", "value", "key"])).filter(Boolean), [configuration]);
  const targetLevelIds = useMemo(() => collection(configuration?.targetLevelIds).map((item) => typeof item === "string" ? item : firstText(record(item), ["id", "value", "key"])).filter(Boolean), [configuration]);
  const noExperienceLevel = currentLevelIds[0] ?? "zero";
  const interestOptions = useMemo<InterestOption[]>(() => collection(configuration?.interestOptions).flatMap((item) => {
    const source = record(item);
    const id = firstText(source, ["id"]);
    const label = firstText(source, ["label"]);
    return id && label ? [{ id, label, description: firstText(source, ["description"]) }] : [];
  }), [configuration]);

  const selectedCareer = careers.find((career) => career.id === careerId) ?? null;
  const visibleCareers = useMemo(() => {
    const query = normalizedSearch(careerSearch.trim());
    if (!query) return careers;
    return careers.filter((career) => normalizedSearch(`${career.label} ${career.description}`).includes(query));
  }, [careerSearch, careers]);
  const recommendedCareerIds = useMemo(() => {
    const option = discoveryOptions.find((entry) => entry.value === discoveryFocus);
    if (!option) return new Set<string>();
    return new Set(careers.filter((career) => option.terms.some((term) => normalizedSearch(career.label).includes(normalizedSearch(term)))).slice(0, 3).map((career) => career.id));
  }, [careers, discoveryFocus]);
  const careerTopics = useMemo(() => {
    if (!careerId || !currentLevel || currentLevel === noExperienceLevel) return [];
    return normalizeTopics(configuration?.topicsByCareerAndLevel?.[careerId]?.[currentLevel]);
  }, [careerId, configuration, currentLevel, noExperienceLevel]);
  const masteryReady = Boolean(currentLevel) && (currentLevel === noExperienceLevel || masteryConfirmed) && (!masteredTopicIds.length || Boolean(masteredTopicPolicy));
  const careerGoalReady = Boolean(targetLevel && objective) && (applicationIntent === "none" || targetRole.trim().length >= 2);
  const interestsReady = selectedInterestIds.length >= 1 && selectedInterestIds.length <= 3;
  const validTargetLevelIds = targetLevelIds.filter((id) => targetLevelIds.indexOf(id) >= targetLevelIds.indexOf(currentLevel));
  const effectiveIncludeCapstone = includeCapstone;
  const desiredDate = desiredTargetDate(startDate, timelineMode, durationMonths, deadline);

  const builderAnswers = useMemo<PlanBuilderSetup | null>(() => selectedCareer && masteryReady && careerGoalReady && interestsReady && desiredDate && availableDays.length && minutesPerDay >= 30
    ? {
        careerId,
        currentLevel,
        targetLevel,
        interestIds: selectedInterestIds,
        knownTopicIds: masteredTopicIds,
        knownTopicPolicy: masteredTopicIds.length ? masteredTopicPolicy as MasteredTopicPolicy : "validate",
        includeDailyQuestions: true,
        includeModuleProjects: true,
        includeCapstone: effectiveIncludeCapstone,
        jobPreparation: applicationIntent !== "none" && includeJobPreparation,
        objective: objective as Objective,
        applicationIntent,
        targetRole: applicationIntent === "none" ? "" : targetRole.trim(),
        startDate,
        timelineMode,
        durationMonths,
        deadline: timelineMode === "deadline" ? deadline : "",
        availableDays,
        minutesPerDay,
      }
    : null, [applicationIntent, availableDays, careerGoalReady, careerId, currentLevel, deadline, desiredDate, durationMonths, effectiveIncludeCapstone, includeJobPreparation, interestsReady, masteredTopicIds, masteredTopicPolicy, masteryReady, minutesPerDay, objective, selectedCareer, selectedInterestIds, startDate, targetLevel, targetRole, timelineMode]);

  const previewKey = useMemo(() => builderAnswers ? JSON.stringify(builderAnswers) : "", [builderAnswers]);

  useEffect(() => {
    const requestId = ++previewRequestId.current;
    if (!builderAnswers || !selectedCareer || !previewKey) return;
    const timer = window.setTimeout(() => {
      startPreviewTransition(async () => {
        try {
          const result = await previsualizarRoadmapTiLifeOS(builderAnswers);
          if (requestId !== previewRequestId.current) return;
          if (!result.ok) {
            setStoredPreviewResult({ key: previewKey, plan: null, error: result.error });
            return;
          }
          setStoredPreviewResult({
            key: previewKey,
            plan: normalizePlan(result.preview, `Roadmap de ${selectedCareer.label}`),
            error: null,
          });
        } catch {
          if (requestId === previewRequestId.current) {
            setStoredPreviewResult({ key: previewKey, plan: null, error: "Não foi possível montar a prévia deste roadmap." });
          }
        }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [builderAnswers, previewKey, selectedCareer]);

  const previewResult = storedPreviewResult.key === previewKey && previewKey
    ? storedPreviewResult
    : { key: previewKey, plan: null, error: null };

  const preview = previewResult.plan;
  const recommendedLoadMinutes = preview?.recommendedEstimatedMinutes ?? 0;
  const locallyRecommendedDate = preview ? recommendedDateFromLoad(startDate, availableDays, minutesPerDay, recommendedLoadMinutes) : null;
  const recommendedTargetDate = laterDate(preview?.recommendedTargetDate ?? null, locallyRecommendedDate);
  const availableMinutes = desiredDate ? availableMinutesUntil(startDate, desiredDate, availableDays, minutesPerDay) : 0;
  const deadlineIsShort = Boolean(preview && (preview.deadlineWarning || availableMinutes < recommendedLoadMinutes));
  const previewIsLoading = Boolean(builderAnswers && (!preview || previewPending));
  const canSubmit = Boolean(preview && builderAnswers && !previewResult.error && !previewPending);

  const chooseCareer = (nextCareerId: string) => {
    setCareerId(nextCareerId);
    setDiscovering(false);
    setCurrentLevel("");
    setMasteredTopicIds([]);
    setMasteryConfirmed(false);
    setMasteredTopicPolicy("");
    setTargetLevel("");
    setError(null);
  };

  const chooseCurrentLevel = (value: string) => {
    setCurrentLevel(value);
    setMasteredTopicIds([]);
    setMasteryConfirmed(value === noExperienceLevel);
    setMasteredTopicPolicy("");
    setTargetLevel("");
  };

  const toggleMasteredTopic = (topicId: string) => {
    setMasteredTopicIds((current) => current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId]);
    setMasteryConfirmed(false);
    setMasteredTopicPolicy("");
    setTargetLevel("");
  };

  const toggleAvailableDay = (value: string) => setAvailableDays((current) => current.includes(value) ? current.filter((day) => day !== value) : [...current, value]);
  const toggleInterest = (interestId: ItCareerInterestId) => setSelectedInterestIds((current) => {
    if (current.includes(interestId)) return current.filter((id) => id !== interestId);
    if (current.length >= 3) return current;
    return [...current, interestId];
  });

  return <form className="space-y-5 text-white" onSubmit={(event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError(previewResult.error ?? "Responda as perguntas obrigatórias antes de criar o roadmap.");
      return;
    }
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await criarRoadmapTiPredefinidoLifeOS(formData);
      if (!result.ok) setError(result.error ?? "Não foi possível criar o roadmap de TI.");
      else onDone();
    });
  }}>
    <input type="hidden" name="roadmap_type" value="it" />
    <input type="hidden" name="career_id" value={careerId} />
    <input type="hidden" name="current_level" value={currentLevel} />
    {masteredTopicIds.map((topicId) => <input key={topicId} type="hidden" name="mastered_topic_ids" value={topicId} />)}
    <input type="hidden" name="mastered_topic_policy" value={masteredTopicIds.length ? masteredTopicPolicy : "validate"} />
    <input type="hidden" name="target_level" value={targetLevel} />
    <input type="hidden" name="objective" value={objective} />
    <input type="hidden" name="application_intent" value={applicationIntent} />
    <input type="hidden" name="target_role" value={applicationIntent === "none" ? "" : targetRole.trim()} />
    <input type="hidden" name="job_preparation" value={applicationIntent !== "none" && includeJobPreparation ? "true" : "false"} />
    {selectedInterestIds.map((interestId) => <input key={interestId} type="hidden" name="interest_ids" value={interestId} />)}
    <input type="hidden" name="include_daily_questions" value="true" />
    <input type="hidden" name="include_module_projects" value="true" />
    <input type="hidden" name="include_capstone" value={effectiveIncludeCapstone ? "true" : "false"} />
    <input type="hidden" name="timeline_mode" value={timelineMode} />
    <input type="hidden" name="duration_months" value={durationMonths} />
    <input type="hidden" name="minutes_per_day" value={minutesPerDay} />

    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-white/40">Tipo de trilha</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" aria-pressed="true" className="flex items-center gap-3 rounded-xl border border-blue-400/50 bg-blue-400/10 p-3 text-left">
          <span className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white"><Code2 className="size-5" /></span>
          <span><b className="block text-sm text-white">Carreira em TI</b><span className="mt-0.5 block text-xs text-white/45">Conteúdo oficial, predefinido e organizado por nível</span></span>
        </button>
        <button type="button" onClick={onChooseLanguage} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.06]">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-white/45"><Languages className="size-5" /></span>
          <span><b className="block text-sm text-white/80">Novo idioma</b><span className="mt-0.5 block text-xs text-white/40">Continuar no gerador completo de idiomas</span></span>
        </button>
      </div>
    </fieldset>

    <aside className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-4 text-xs leading-5 text-amber-50/75">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
      <p><b className="font-semibold text-amber-100">Datas são previsões para concluir este roteiro de estudos.</b> Elas não indicam quando você se tornará Júnior, Pleno, Sênior ou Especialista. Senioridade profissional também depende de experiência real, responsabilidade, contexto e resultados no trabalho.</p>
    </aside>

    <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">1. Qual carreira de TI você quer seguir?</legend>
      {configurationPending && <p className="flex items-center gap-2 text-xs text-white/45"><Loader2 className="size-4 animate-spin" />Carregando catálogo público...</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Pesquisar carreira</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-white/30" /><input value={careerSearch} onChange={(event) => setCareerSearch(event.target.value)} placeholder="Pesquisar carreira" className={`${inputClass} mt-0 pl-9`} /></label>
        <button type="button" onClick={() => { setDiscovering(true); setCareerId(""); setDiscoveryFocus(""); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${discovering ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-white/10 text-white/55 hover:bg-white/[0.05]"}`}>Ainda não sei</button>
      </div>
      {discovering && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
        <p className="text-sm font-semibold text-amber-100">Que tipo de problema mais chama sua atenção?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{discoveryOptions.map((option) => <button key={option.value} type="button" onClick={() => setDiscoveryFocus(option.value)} className={`rounded-lg border p-3 text-left text-xs leading-5 ${discoveryFocus === option.value ? "border-amber-400/50 bg-amber-400/10 text-amber-100" : "border-white/10 text-white/55 hover:border-white/20"}`}>{option.label}</button>)}</div>
        {discoveryFocus && <p className="mt-3 text-xs leading-5 text-amber-100/65">As opções mais relacionadas aparecem primeiro e recebem a indicação “Recomendada”. Você continua livre para escolher qualquer carreira.</p>}
      </div>}
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{[...visibleCareers].sort((a, b) => Number(recommendedCareerIds.has(b.id)) - Number(recommendedCareerIds.has(a.id))).map((career) => {
        const selected = career.id === careerId;
        const recommended = recommendedCareerIds.has(career.id);
        return <button key={career.id} type="button" onClick={() => chooseCareer(career.id)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-blue-400/60 bg-blue-400/10" : recommended ? "border-amber-400/30 bg-amber-400/[0.04] hover:border-amber-300/50" : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"}`}>
          <span className="flex items-start gap-3"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-blue-600 text-white" : "bg-white/[0.06] text-white/40"}`}>{selected ? <Check className="size-4" /> : <BriefcaseBusiness className="size-4" />}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/85">{career.label}</b>{recommended && <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">Recomendada</span>}</span><span className="mt-1 block text-xs leading-5 text-white/40">{career.description}</span></span></span>
        </button>;
      })}</div>
      {!visibleCareers.length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-white/40">Nenhuma carreira corresponde à pesquisa.</p>}
    </fieldset>

    {selectedCareer && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">2. Quanto contato prático você já tem com {selectedCareer.label}?</legend>
      <p className="text-xs leading-5 text-white/45">Ela define quais assuntos você poderá declarar dominados. Nenhum conteúdo é removido automaticamente: você escolhe abaixo se quer revisar ou pular cada assunto.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{currentLevelIds.map((id) => {
        const copy = experienceLevelCopy[id] ?? { title: currentLevelLabels[id] ?? id, detail: "Experiência prática declarada pelo usuário." };
        return <button key={id} type="button" onClick={() => chooseCurrentLevel(id)} className={`rounded-lg border p-3 text-left ${currentLevel === id ? "border-blue-400/60 bg-blue-400/10" : "border-white/10 hover:border-white/20"}`}><b className={`block text-sm ${currentLevel === id ? "text-blue-100" : "text-white/75"}`}>{copy.title}</b><span className="mt-1 block text-xs leading-5 text-white/40">{copy.detail}</span></button>;
      })}</div>
    </fieldset>}

    {selectedCareer && currentLevel && currentLevel !== noExperienceLevel && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">3. Quais assuntos você já domina?</legend>
      <p className="text-xs leading-5 text-white/45">Marque apenas o que consegue usar sem depender de um tutorial. Você poderá escolher se quer remover ou validar esses tópicos.</p>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{careerTopics.map((topic) => {
        const selected = masteredTopicIds.includes(topic.id);
        return <label key={topic.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected ? "border-emerald-400/45 bg-emerald-400/[0.07]" : "border-white/10 hover:border-white/20"}`}>
          <input type="checkbox" checked={selected} onChange={() => toggleMasteredTopic(topic.id)} className="peer sr-only" />
          <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ${selected ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white/[0.04] text-transparent ring-white/15"}`}><Check className="size-3.5" /></span>
          <span className="min-w-0"><b className="block text-sm font-medium text-white/75">{topic.label}</b>{(topic.moduleLabel || topic.levelLabel) && <span className="mt-0.5 block text-[11px] text-white/35">{[topic.moduleLabel, topic.levelLabel].filter(Boolean).join(" · ")}</span>}</span>
        </label>;
      })}{!careerTopics.length && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-white/40">O catálogo não possui tópicos de diagnóstico para este nível. Você pode continuar sem marcar assuntos.</p>}</div>
      <div className="flex justify-end"><button type="button" onClick={() => { setMasteryConfirmed(true); if (!masteredTopicIds.length) setMasteredTopicPolicy(""); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Continuar com esta seleção</button></div>
      {masteryConfirmed && masteredTopicIds.length > 0 && <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
        <p className="text-sm font-semibold text-cyan-100">O que fazer com os {masteredTopicIds.length} assuntos marcados?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => { setMasteredTopicPolicy("skip"); setTargetLevel(""); }} className={`rounded-lg border p-3 text-left ${masteredTopicPolicy === "skip" ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10"}`}><b className="block text-sm text-white/80">Remover do meu roadmap</b><span className="mt-1 block text-xs leading-5 text-white/40">Não incluir os assuntos que você declarou dominar.</span></button>
          <button type="button" onClick={() => { setMasteredTopicPolicy("validate"); setTargetLevel(""); }} className={`rounded-lg border p-3 text-left ${masteredTopicPolicy === "validate" ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10"}`}><b className="block text-sm text-white/80">Revisão/validação curta</b><span className="mt-1 block text-xs leading-5 text-white/40">Manter uma checagem rápida para evitar lacunas.</span></button>
        </div>
      </div>}
    </fieldset>}

    {selectedCareer && masteryReady && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">{currentLevel === noExperienceLevel ? "3" : "4"}. Qual profundidade curricular você quer concluir?</legend>
      <p className="text-xs leading-5 text-white/45">A escolha controla quais módulos e assuntos entram no roadmap. Os nomes profissionais aparecem apenas como referência das competências abordadas.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{validTargetLevelIds.map((id) => {
        const copy = curriculumDepth(id);
        return <button key={id} type="button" onClick={() => setTargetLevel(id)} className={`rounded-lg border p-3 text-left ${targetLevel === id ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 hover:border-white/20"}`}><b className="block text-sm text-white/80">{copy.title}</b><span className="mt-1 block text-[11px] font-medium text-violet-200/70">{copy.reference}</span><span className="mt-1 block text-xs leading-5 text-white/40">{copy.detail}</span></button>;
      })}</div>
      {currentLevel === noExperienceLevel && <p className="flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2 text-xs text-blue-100/70"><Target className="size-4 shrink-0 text-blue-300" /><span><b className="font-semibold text-blue-100">Primeiro objetivo:</b> prática inicial associada a Júnior, sem promessa de contratação.</span></p>}
    </fieldset>}

    {targetLevel && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">Objetivo profissional</legend>
      <div className="grid gap-2 sm:grid-cols-2">{objectiveOptions.map((option) => <button key={option.value} type="button" onClick={() => setObjective(option.value)} className={`rounded-lg border p-3 text-left ${objective === option.value ? "border-blue-400/55 bg-blue-400/10" : "border-white/10 hover:border-white/20"}`}><b className="block text-sm text-white/80">{option.label}</b><span className="mt-1 block text-xs leading-5 text-white/40">{option.detail}</span></button>)}</div>
      {objective && <div className="grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-white/45 sm:col-span-2">Você pretende se candidatar a vagas nessa área?
          <select value={applicationIntent} onChange={(event) => { const value = event.target.value as ApplicationIntent; setApplicationIntent(value); if (value === "none") setTargetRole(""); }} className={inputClass}>
            <option value="none">Não durante este roadmap</option>
            <option value="after_roadmap">Sim, depois de concluir o roadmap</option>
            <option value="applying_now">Sim, já estou me candidatando</option>
          </select>
        </label>
        {applicationIntent !== "none" && <>
          <label className="text-xs font-medium text-white/45 sm:col-span-2">Cargo ou função desejada
            <input required minLength={2} maxLength={200} value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Ex.: Desenvolvedor Back-end Júnior" className={inputClass} />
          </label>
          <button type="button" aria-pressed={includeJobPreparation} onClick={() => setIncludeJobPreparation((value) => !value)} className={`sm:col-span-2 rounded-lg border p-3 text-left ${includeJobPreparation ? "border-emerald-400/40 bg-emerald-400/[0.07]" : "border-white/10"}`}><span className="flex items-start gap-3"><span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${includeJobPreparation ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/30"}`}><Check className="size-4" /></span><span><b className="block text-sm text-white/80">Incluir preparação profissional</b><span className="mt-1 block text-xs leading-5 text-white/40">Adicionar as entregas predefinidas de portfólio, posicionamento profissional e entrevistas relacionadas à carreira.</span></span></span></button>
        </>}
      </div>}
    </fieldset>}

    {careerGoalReady && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">Quais assuntos deixam o estudo mais interessante para você?</legend>
      <p className="text-xs leading-5 text-white/45">Escolha de 1 a 3 temas. O primeiro será o contexto principal; os demais serão alternados nos desafios e nas questões, sem mudar a competência ou a dificuldade.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{interestOptions.map((interest) => {
        const position = selectedInterestIds.indexOf(interest.id);
        const selected = position >= 0;
        const limitReached = !selected && selectedInterestIds.length >= 3;
        return <button key={interest.id} type="button" disabled={limitReached} aria-pressed={selected} onClick={() => toggleInterest(interest.id)} className={`rounded-lg border p-3 text-left transition ${selected ? "border-cyan-400/55 bg-cyan-400/[0.08]" : "border-white/10 hover:border-white/20"} ${limitReached ? "cursor-not-allowed opacity-40" : ""}`}>
          <span className="flex items-start gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${selected ? "bg-cyan-500 text-white" : "bg-white/[0.06] text-white/35"}`}>{selected ? position + 1 : <Target className="size-3.5" />}</span><span><span className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/80">{interest.label}</b>{position === 0 && <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-100">Tema principal</span>}</span>{interest.description && <span className="mt-1 block text-xs leading-5 text-white/40">{interest.description}</span>}</span></span>
        </button>;
      })}</div>
      <p className={`text-[11px] ${interestsReady ? "text-cyan-200/65" : "text-amber-200/65"}`}>{selectedInterestIds.length}/3 selecionados{selectedInterestIds.length === 0 ? " · escolha pelo menos um tema" : " · remova e selecione novamente para mudar a ordem"}</p>
    </fieldset>}

    {careerGoalReady && interestsReady && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">Entregas práticas do roadmap</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-400/45 bg-emerald-400/[0.07] p-4 text-left"><span className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white"><Check className="size-4" /></span><span><span className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/80">Questões diárias</b><span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-100">Incluídas</span></span><span className="mt-1 block text-xs leading-5 text-white/40">Perguntas predefinidas, com correção imediata e quantidade ajustada ao nível e ao tempo diário.</span></span></span></div>
        <div className="rounded-xl border border-emerald-400/45 bg-emerald-400/[0.07] p-4 text-left"><span className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white"><FolderKanban className="size-4" /></span><span><span className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/80">Desafio por módulo</b><span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-200">Obrigatório</span></span><span className="mt-1 block text-xs leading-5 text-white/40">Produto já definido, com funcionalidades, dados, requisitos, entregas e critérios de avaliação.</span></span></span></div>
        <button type="button" aria-pressed={effectiveIncludeCapstone} onClick={() => setIncludeCapstone((value) => !value)} className={`rounded-xl border p-4 text-left ${effectiveIncludeCapstone ? "border-emerald-400/45 bg-emerald-400/[0.07]" : "border-white/10 hover:border-white/20"}`}><span className="flex items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${effectiveIncludeCapstone ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/35"}`}>{effectiveIncludeCapstone ? <Check className="size-4" /> : <GraduationCap className="size-4" />}</span><span><span className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/80">Projeto final completo (TCC)</b><span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/50">Opcional</span></span><span className="mt-1 block text-xs leading-5 text-white/40">Produto final já definido e contextualizado pelo seu primeiro tema de interesse.</span></span></span></button>
      </div>
    </fieldset>}

    {careerGoalReady && interestsReady && <fieldset className={fieldsetClass}>
      <legend className="px-1 font-semibold text-white">Tempo disponível</legend>
      <p className="text-xs leading-5 text-white/45">O conteúdo não será cortado para caber no prazo. A previsão considera questões, desafios, TCC quando incluído e margem de revisão.</p>
      <div className="inline-flex rounded-lg bg-black/30 p-1">
        <button type="button" onClick={() => setTimelineMode("duration")} className={`rounded-md px-3 py-2 text-xs font-semibold ${timelineMode === "duration" ? "bg-blue-600 text-white" : "text-white/40"}`}>Por duração</button>
        <button type="button" onClick={() => setTimelineMode("deadline")} className={`rounded-md px-3 py-2 text-xs font-semibold ${timelineMode === "deadline" ? "bg-blue-600 text-white" : "text-white/40"}`}>Até uma data</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-white/45">Início<input name="start_date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} /></label>
        {timelineMode === "duration" ? <label className="text-xs font-medium text-white/45">Duração desejada do roteiro (meses)<input type="number" required min={1} step={1} value={durationMonths} onChange={(event) => setDurationMonths(Math.max(1, Math.floor(Number(event.target.value) || 1)))} className={inputClass} /></label> : <label className="text-xs font-medium text-white/45">Data desejada para concluir o roteiro<input name="deadline" type="date" required min={startDate || today} value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label>}
        <label className="text-xs font-medium text-white/45">Tempo por dia (HH:MM)<input type="time" required min="00:30" max="08:00" step={300} value={studyMinutesToClock(minutesPerDay)} onChange={(event) => setMinutesPerDay(studyClockToMinutes(event.target.value))} className={inputClass} /></label>
      </div>
      <div><p className="text-xs font-medium text-white/45">Dias em que normalmente consegue estudar</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${availableDays.includes(value) ? "border-blue-400/50 bg-blue-400/10 text-blue-200" : "border-white/10 text-white/35"}`}><input type="checkbox" name="available_days" value={value} checked={availableDays.includes(value)} onChange={() => toggleAvailableDay(value)} className="sr-only" />{label}</label>)}</div><p className="mt-2 text-[11px] leading-5 text-white/35">Feriados e pausas não são descontados automaticamente.</p></div>
    </fieldset>}

    {previewIsLoading && <p className="flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-400/[0.04] p-3 text-xs text-blue-100/65"><Loader2 className="size-4 animate-spin" />Atualizando prévia...</p>}
    {preview && <section className="space-y-4 rounded-xl border border-blue-400/25 bg-blue-400/[0.045] p-4 sm:p-5">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Prévia do seu roadmap</p><h3 className="mt-1 text-lg font-bold text-white">{preview.title}</h3></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <PreviewMetric icon={BookOpenCheck} label="Carga do roteiro" value={formatDurationAsDays(preview.totalEstimatedMinutes)} detail={formatDurationDetails(preview.totalEstimatedMinutes, minutesPerDay)} />
        <PreviewMetric icon={Layers3} label="Carga com margem" value={formatDurationAsDays(recommendedLoadMinutes)} detail={formatDurationDetails(recommendedLoadMinutes, minutesPerDay)} />
        <PreviewMetric icon={Target} label="Prazo escolhido" value={formatDate(desiredDate)} detail={deadlineIsShort ? "Abaixo do necessário" : undefined} tone={deadlineIsShort ? "danger" : "default"} />
        <PreviewMetric icon={Clock3} label="Prazo recomendado" value={formatDate(recommendedTargetDate)} />
      </div>
      {preview.dailyQuestionPolicy && <aside className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.05] px-3 py-2 text-xs text-emerald-50/70"><FileCheck2 className="size-4 shrink-0 text-emerald-300" /><p><b className="font-semibold text-emerald-100">Questões diárias:</b> {preview.dailyQuestionPolicy.questionsPerStudyDay} por dia · cerca de {formatDuration(preview.dailyQuestionPolicy.minutesReservedPerStudyDay || preview.dailyQuestionPolicy.questionsPerStudyDay * preview.dailyQuestionPolicy.minutesPerQuestion)} · correção imediata</p></aside>}
      {deadlineIsShort && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 p-4"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-300" /><div><p className="text-sm font-semibold text-red-100">Prazo insuficiente</p><p className="mt-1 text-xs leading-5 text-red-100/70">Disponível: {formatDuration(availableMinutes)} · Necessário: {formatDuration(recommendedLoadMinutes)} · Recomendado: {formatDate(recommendedTargetDate)}. Você pode continuar; nenhum conteúdo será removido.</p></div></div>}
      {preview.milestones.length > 0 && <details className="group overflow-hidden rounded-xl border border-white/10 bg-black/15">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Marcos de conclusão do conteúdo</p><p className="mt-0.5 text-[11px] text-white/35">{preview.milestones.length} previsões acumuladas por nível</p></div>
          <ChevronDown className="size-4 shrink-0 text-white/35 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-white/40">Referência de estudo; não representa senioridade profissional.</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">{preview.milestones.map((milestone, index) => {
            const depth = milestone.levelId ? curriculumDepth(milestone.levelId, milestone.label) : null;
            const milestoneDate = milestone.targetDate ?? (milestone.estimatedMinutes ? recommendedDateFromLoad(startDate, availableDays, minutesPerDay, milestone.estimatedMinutes) : null);
            const isFirstRecommended = currentLevel === noExperienceLevel && (milestone.levelId === "junior" || normalizedSearch(milestone.label).includes("junior"));
            return <li key={milestone.id} className={`rounded-lg border p-3 ${isFirstRecommended ? "border-blue-400/35 bg-blue-400/[0.06]" : "border-white/10 bg-white/[0.02]"}`}><div className="flex items-start gap-2"><span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${isFirstRecommended ? "bg-blue-500 text-white" : "bg-white/[0.06] text-white/45"}`}>{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-white/80">{depth?.title ?? milestone.label}</b>{isFirstRecommended && <span className="rounded bg-blue-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-200">Primeiro objetivo</span>}</div>{depth && <span className="mt-0.5 block text-[10px] text-white/35">{depth.reference}</span>}<p className="mt-2 text-[11px] font-medium text-cyan-200/70">Até {formatDate(milestoneDate)}{milestone.estimatedMinutes > 0 ? ` · ${formatDurationAsDays(milestone.estimatedMinutes)} acumulados` : ""}</p></div></div></li>;
          })}</ol>
        </div>
      </details>}
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">{preview.modules.map((module, index) => {
        const depth = module.levelId ? curriculumDepth(module.levelId, module.levelLabel) : null;
        return <details key={module.id} open={index === 0} className="overflow-hidden rounded-lg border border-white/10 bg-black/15"><summary className="flex cursor-pointer list-none items-center gap-3 p-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-xs font-bold text-white/55">{index + 1}</span><span className="min-w-0 flex-1"><b className="block text-sm text-white/80">{module.title}</b><span className="mt-0.5 block text-[11px] text-white/35">{[depth?.title ?? module.levelLabel, module.nodes.length ? `${module.nodes.length} itens` : null, module.estimatedMinutes ? formatDuration(module.estimatedMinutes) : null].filter(Boolean).join(" · ")}</span></span><ChevronDown className="size-4 text-white/35" /></summary>{module.nodes.length > 0 && <div className="border-t border-white/10 px-4 py-3"><PreviewTree nodes={module.nodes} /></div>}</details>;
      })}</div>
    </section>}

    {(error || configurationError || previewResult.error) && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error ?? configurationError ?? previewResult.error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
      <p className="flex items-center gap-2 text-[11px] text-white/35"><Code2 className="size-3.5" />A trilha de TI usa somente conteúdo predefinido. Nenhuma IA criará módulos ou assuntos.</p>
      <div className="flex gap-2"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white/60 hover:bg-white/15 disabled:opacity-50">Cancelar</button><button type="submit" disabled={pending || !canSubmit} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{pending ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}{pending ? "Criando roadmap..." : "Criar roadmap"}</button></div>
    </div>
  </form>;
}

function PreviewMetric({ icon: Icon, label, value, detail, tone = "default" }: { icon: typeof Clock3; label: string; value: string; detail?: string; tone?: "default" | "danger" }) {
  const danger = tone === "danger";
  return <div className={`rounded-lg border p-3 ${danger ? "border-red-400/45 bg-red-500/10" : "border-white/10 bg-black/15"}`}><p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${danger ? "text-red-200/75" : "text-white/35"}`}><Icon className="size-3.5" />{label}</p><p className={`mt-1.5 text-sm font-semibold ${danger ? "text-red-100" : "text-white/75"}`}>{value}</p>{detail && <p className={`mt-1 text-[10px] leading-4 ${danger ? "font-semibold text-red-200/75" : "text-white/40"}`}>{detail}</p>}</div>;
}
