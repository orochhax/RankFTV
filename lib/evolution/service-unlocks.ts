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
    title: "M1 · Diagnóstico entregue",
    service: "Diagnóstico e organização dos dados",
    unlockDay: 10,
    dayRanges: [[1, 10]],
    prerequisites: [],
    description: "Organizar uma base, definir indicadores e explicar um diagnóstico com limites claros.",
    deliverables: ["Base tratada e original preservada", "Dicionário de dados e indicadores", "Diagnóstico executivo reproduzível"],
    confirmations: [
      "Base original preservada, regras de qualidade e métricas documentadas.",
      "Indicadores conferidos em Excel e SQL e diagnóstico explicado com limites.",
      "Diagnóstico reproduzido, limites explicados e amostra com mini-proposta preparada.",
    ],
  },
  {
    id: "m2",
    title: "M2 · Painel entregue",
    service: "Painéis de gestão",
    unlockDay: 22,
    dayRanges: [[11, 22]],
    prerequisites: ["m1"],
    description: "Construir um painel conferido, atualizável e entregue no formato realmente testado.",
    deliverables: ["Modelo e medidas conferidos", "Painel com filtros úteis", "Manual de acesso e atualização"],
    confirmations: [
      "Medidas e relações conferidas com as fontes e consultas.",
      "Segundo arquivo processado e manual de acesso e atualização pronto.",
      "Oferta limitada ao formato de distribuição que foi testado.",
    ],
  },
  {
    id: "m3",
    title: "M3 · Automação entregue",
    service: "Relatórios automatizados",
    unlockDay: 55,
    dayRanges: [[23, 55]],
    prerequisites: ["m1"],
    description: "Executar uma rotina verificável, tratar falhas e permitir que outra pessoa reproduza a entrega.",
    deliverables: ["Rotina reexecutável", "Entradas fictícias e testes", "Manual e registro de falhas"],
    confirmations: [
      "Reexecução sem duplicidade e falha tratada com registro.",
      "Manual, entradas fictícias e conferências reproduzíveis.",
      "Código e resultados explicados e recuperação de uma falha demonstrada.",
    ],
  },
  {
    id: "m4",
    title: "M4 · Atendimento demonstrado",
    service: "Pacote integrado de dados",
    unlockDay: 60,
    dayRanges: [[56, 60]],
    prerequisites: ["m1", "m2", "m3"],
    description: "Transformar as entregas técnicas em uma oferta delimitada, demonstrável e comercialmente honesta.",
    deliverables: ["Proposta e escopo", "Caso ou piloto demonstrável", "Próxima decisão comercial"],
    confirmations: [
      "Proposta, escopo, custos e aceite preparados.",
      "Caso ou piloto demonstrado, identificando claramente o que é simulação.",
      "Próximo passo escolhido conforme as evidências: repetir, prospectar ou aprofundar.",
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
    .filter((section) => section.title.toLowerCase().includes("prática e entrega"))
    .flatMap((section) => section.tasks)
    .filter((task) => task.durationMinutes === 120 || task.durationMinutes === 45);
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
