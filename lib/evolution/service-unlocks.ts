import type { RoadmapSnapshot, RoadmapTask } from "./types";

export type ServiceUnlockStage = {
  id: "m1" | "m2" | "m3" | "m4";
  title: string;
  service: string;
  unlockDay: number;
  dayRanges: Array<[number, number]>;
  prerequisites: Array<ServiceUnlockStage["id"]>;
  description: string;
  deliverables: string[];
  confirmations: string[];
};

export type ServiceUnlockAssessment = ServiceUnlockStage & {
  status: "preparando" | "revisao" | "bloqueado" | "desbloqueado";
  requiredTaskIds: string[];
  completedTasks: number;
  completedConfirmations: number;
  progress: number;
};

export const serviceUnlockStages: ServiceUnlockStage[] = [
  {
    id: "m1",
    title: "M1 · Backend & Filas entregues",
    service: "APIs de IA, Webhooks e Filas Assíncronas",
    unlockDay: 10,
    dayRanges: [[1, 10]],
    prerequisites: [],
    description: "Construir e documentar microsserviços assíncronos em Python/FastAPI com validação Pydantic, filas e testes automatizados.",
    deliverables: ["Gateway FastAPI + Pydantic v2", "Fila com Retries e Dead-Letter Queue", "Suíte de testes Pytest e documentação OpenAPI"],
    confirmations: [
      "Contratos JSON validados com Pydantic v2 e erros 422 padronizados.",
      "Processamento assíncrono com idempotência, retries e cobertura no Pytest.",
      "Demonstração funcional com streaming SSE e escopo técnico documentado.",
    ],
  },
  {
    id: "m2",
    title: "M2 · Full-Stack & Dados entregues",
    service: "Interfaces React/Next.js e Integração PostgreSQL/Databricks",
    unlockDay: 22,
    dayRanges: [[11, 22]],
    prerequisites: ["m1"],
    description: "Integrar backends Python/Node a bancos PostgreSQL, data lakehouses e painéis operacionais em React e TypeScript.",
    deliverables: ["Painel operacional React/Next.js + TS", "Modelagem PostgreSQL e queries analíticas", "Integração de APIs REST com autenticação JWT"],
    confirmations: [
      "Consultas SQL e modelos relacionais validados com migrações seguras.",
      "Frontend TypeScript consumindo streaming e rotas protegidas sem vazamento.",
      "Manual de operação e arquitetura entregue no padrão consultivo FDE.",
    ],
  },
  {
    id: "m3",
    title: "M3 · Automação B2B & RAG Híbrido entregues",
    service: "Orquestração Omnichannel, IDP e RAG Multi-Tenant com RBAC",
    unlockDay: 55,
    dayRanges: [[23, 55]],
    prerequisites: ["m1"],
    description: "Implantar fluxos corporativos com WhatsApp/n8n, extração inteligente de PDFs (IDP) e busca híbrida com controle de acesso por cargo.",
    deliverables: ["Workflow omnichannel com fallback humano", "Pipeline IDP + RAG Híbrido (BM25 + pgvector)", "Filtro RBAC multi-tenant e citações auditáveis"],
    confirmations: [
      "Reexecução idempotente, logs auditáveis e transbordo humano testado.",
      "Busca híbrida com reranking e isolamento estrito de permissões por cargo (RBAC).",
      "Cálculo de ROI (tempo economizado e custo por execução) demonstrado para negócio.",
    ],
  },
  {
    id: "m4",
    title: "M4 · Sistemas Agênticos, LLMOps & Cloud AWS",
    service: "Plataforma FDE Completa: LangGraph, MCP, Evals em CI/CD e Deploy AWS",
    unlockDay: 60,
    dayRanges: [[56, 60]],
    prerequisites: ["m1", "m2", "m3"],
    description: "Entregar enxames multiagentes com servidores MCP, aprovação Human-in-the-Loop, esteira de Evals/Guardrails e deploy conteinerizado na AWS.",
    deliverables: ["Agent Harness em LangGraph + Servidores MCP", "Suite de Evals (Golden Set + LLM-as-a-Judge) e Guardrails OWASP", "Deploy Docker/ECS na AWS com CI/CD no GitHub Actions"],
    confirmations: [
      "Ações críticas bloqueadas por checkpoint Human-in-the-Loop e trilha de auditoria.",
      "Pipeline GitHub Actions validando Pytest, Guardrails anti-injection e métricas de Evals.",
      "Arquitetura documentada com ADRs e pronta para operação contínua (Dia 2).",
    ],
  },
];

export function serviceConfirmationId(stageId: ServiceUnlockStage["id"], index: number) {
  return `servico-${stageId}-confirmacao-${index + 1}`;
}

function isInRanges(dayNumber: number, ranges: Array<[number, number]>) {
  return ranges.some(([start, end]) => dayNumber >= start && dayNumber <= end);
}

function qualifyingTasks(roadmap: RoadmapSnapshot, stage: ServiceUnlockStage): RoadmapTask[] {
  return roadmap.days
    .filter((day) => isInRanges(day.dayNumber, stage.dayRanges))
    .flatMap((day) => day.sections)
    .flatMap((section) => section.tasks)
    .filter((task) => task.kind === "aula");
}

export function assessServiceUnlocks(roadmap: RoadmapSnapshot, completed: ReadonlySet<string>): ServiceUnlockAssessment[] {
  const unlocked = new Set<ServiceUnlockStage["id"]>();
  return serviceUnlockStages.map((stage) => {
    const tasks = qualifyingTasks(roadmap, stage);
    const completedTasks = tasks.filter((task) => completed.has(task.id)).length;
    const confirmationIds = stage.confirmations.map((_, index) => serviceConfirmationId(stage.id, index));
    const completedConfirmations = confirmationIds.filter((id) => completed.has(id)).length;
    const prerequisitesMet = stage.prerequisites.every((id) => unlocked.has(id));
    const evidenceComplete = completedTasks === tasks.length && tasks.length > 0;
    const confirmationsComplete = completedConfirmations === confirmationIds.length;
    const status = evidenceComplete && confirmationsComplete && prerequisitesMet
      ? "desbloqueado"
      : evidenceComplete && confirmationsComplete
        ? "bloqueado"
        : evidenceComplete
          ? "revisao"
          : "preparando";
    if (status === "desbloqueado") unlocked.add(stage.id);
    const total = tasks.length + confirmationIds.length;
    return {
      ...stage,
      status,
      requiredTaskIds: tasks.map((task) => task.id),
      completedTasks,
      completedConfirmations,
      progress: total ? Math.round(((completedTasks + completedConfirmations) / total) * 100) : 0,
    };
  });
}
