import {
  itCareerCatalogs,
  itCareerLevelIds,
  itCareerLevelLabels,
  type ItCareerCatalog,
  type ItCareerId,
  type ItCareerLevelId,
} from "@/lib/it-career-roadmaps";

export type OfficialItCareerTopic = {
  id: string;
  title: string;
  subtopics: string[];
  objective: string;
  guidedStudy: string[];
  activities: string[];
  evidence: string;
  estimatedMinutes: number;
};

export type OfficialItCareerModule = {
  id: string;
  title: string;
  objective: string;
  successCriteria: string;
  level: ItCareerLevelId;
  runtime: "python" | "node" | "mobile" | "data" | "infra" | "security";
  topics: OfficialItCareerTopic[];
  project: {
    id: string;
    title: string;
    deliverables: string[];
    rubric: Array<{ id: string; label: string; weightPercent: number }>;
  };
};

export type OfficialItCareerTemplate = {
  schemaVersion: 1;
  templateKey: ItCareerId;
  templateVersion: number;
  careerKey: ItCareerId;
  targetLevel: ItCareerLevelId;
  title: string;
  summary: string;
  prerequisites: string[];
  competencies: string[];
  phases: Array<{ id: string; title: string; level: ItCareerLevelId; modules: OfficialItCareerModule[] }>;
  coreOrExtended: { core: string[]; extended: string[] };
};

function runtimeForCareer(career: ItCareerId): OfficialItCareerModule["runtime"] {
  if (["data_analytics_bi", "data_science_ai", "data_engineering"].includes(career)) return "data";
  if (career === "mobile") return "mobile";
  if (["devops_cloud", "support_infra_networks"].includes(career)) return "infra";
  if (career === "cybersecurity") return "security";
  if (["frontend", "backend", "fullstack", "qa_automation"].includes(career)) return "node";
  return "python";
}

function guidedStudy(topic: { title: string; subtopics: string[] }): string[] {
  return [
    `Explique o objetivo de ${topic.title} antes de abrir o exercício.`,
    `Estude: ${topic.subtopics.join(", ")}.`,
    "Execute um exemplo mínimo e anote a previsão e o resultado.",
    "Refaça a atividade sem consultar o exemplo e registre uma evidência reproduzível.",
  ];
}

function fromCatalog(catalog: ItCareerCatalog, targetLevel: ItCareerLevelId): OfficialItCareerTemplate {
  const levelIndex = itCareerLevelIds.indexOf(targetLevel);
  const phases = itCareerLevelIds.slice(0, levelIndex + 1).map((level) => {
    const phase = catalog.levels[level];
    return {
      id: `${catalog.id}:${level}`,
      title: `${itCareerLevelLabels[level]} — ${phase.title}`,
      level,
      modules: phase.modules.map((module) => ({
        id: module.id,
        title: module.title,
        objective: module.objective,
        successCriteria: module.successCriteria,
        level,
        runtime: runtimeForCareer(catalog.id),
        topics: module.topics.map((topic) => ({
          id: topic.id,
          title: topic.title,
          subtopics: [...topic.subtopics],
          objective: topic.competence,
          guidedStudy: guidedStudy(topic),
          activities: [
            `Prática guiada de ${topic.title}.`,
            `Tarefa sem consulta usando ${topic.subtopics.slice(0, 2).join(" e ")}.`,
            "Validar caso normal, borda e inválido quando aplicável.",
          ],
          evidence: `Código, comando ou documento que demonstre ${topic.title} de forma reproduzível.`,
          estimatedMinutes: topic.estimatedMinutes,
        })),
        project: {
          id: module.project.id,
          title: module.project.title,
          deliverables: [...module.project.deliverables],
          rubric: module.project.projectSpec.evaluationCriteria.map((criterion) => ({ id: criterion.id, label: criterion.label, weightPercent: criterion.weightPercent })),
        },
      })),
    };
  });
  const modules = phases.flatMap((phase) => phase.modules);
  return {
    schemaVersion: 1,
    templateKey: catalog.id,
    templateVersion: catalog.version,
    careerKey: catalog.id,
    targetLevel,
    title: `${catalog.title} — ${itCareerLevelLabels[targetLevel]}`,
    summary: catalog.description,
    prerequisites: levelIndex === 0 ? ["Nenhum conhecimento profissional prévio é exigido."] : [`Fundamentos das fases anteriores até ${itCareerLevelLabels[itCareerLevelIds[levelIndex - 1]]}.`],
    competencies: modules.map((module) => module.successCriteria),
    phases,
    coreOrExtended: {
      core: modules.flatMap((module) => module.topics.map((topic) => topic.title)),
      extended: ["Revisões adicionais", "Extensões opcionais do desafio", "Documentação de decisões e trade-offs"],
    },
  };
}

/** Matriz oficial: 11 carreiras x 5 profundidades, sempre derivada do catálogo versionado. */
export const officialItCareerTemplates: OfficialItCareerTemplate[] = itCareerCatalogs.flatMap((catalog) =>
  itCareerLevelIds.map((level) => fromCatalog(catalog, level)),
);

export function officialItCareerTemplate(careerId: ItCareerId, targetLevel: ItCareerLevelId): OfficialItCareerTemplate | null {
  return officialItCareerTemplates.find((template) => template.careerKey === careerId && template.targetLevel === targetLevel) ?? null;
}

export function validateOfficialItCareerTemplates(): void {
  const expected = itCareerCatalogs.length * itCareerLevelIds.length;
  if (officialItCareerTemplates.length !== expected) throw new Error("A matriz oficial de carreiras está incompleta.");
  const keys = new Set<string>();
  for (const template of officialItCareerTemplates) {
    const key = `${template.careerKey}:${template.targetLevel}`;
    if (keys.has(key)) throw new Error(`Template oficial duplicado: ${key}`);
    keys.add(key);
    if (!template.phases.length || template.phases.some((phase) => !phase.modules.length)) throw new Error(`Template oficial sem módulos: ${key}`);
    for (const moduleTemplate of template.phases.flatMap((phase) => phase.modules)) {
      if (!moduleTemplate.topics.length || !moduleTemplate.project.deliverables.length || moduleTemplate.project.rubric.reduce((total, criterion) => total + criterion.weightPercent, 0) !== 100) {
        throw new Error(`Módulo oficial incompleto: ${moduleTemplate.id}`);
      }
    }
  }
}
