import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";

import type { ItCareerId, ItCareerLevelId, ItCareerProjectSpec } from "@/lib/it-career-roadmaps";

export type ItCareerWorkspaceRuntime = "python" | "node" | "mobile" | "data" | "infra" | "security";
export type ItCareerWorkspaceFileRole = "documentation" | "starter" | "dataset" | "public_test" | "manifest";
export type ItCareerWorkspaceBundleKind = "base" | "module" | "through_module" | "full";

export type ItCareerWorkspaceTopic = {
  id: string;
  title: string;
  description: string | null;
  subtopics: string[];
  guidedStudy?: string[];
  activities?: string[];
  evidence?: string | null;
  estimatedMinutes: number | null;
  questions?: Array<{
    type: "multiple_choice" | "ordering";
    prompt: string;
    options: string[];
    sessionTitle: string;
  }>;
};

export type ItCareerWorkspaceModule = {
  id: string;
  code: string | null;
  title: string;
  objective: string | null;
  successCriteria: string | null;
  level: ItCareerLevelId | null;
  orderIndex: number;
  topics: ItCareerWorkspaceTopic[];
  project: {
    title: string;
    description: string | null;
    spec: ItCareerProjectSpec | null;
  } | null;
};

export type ItCareerWorkspaceRoadmap = {
  id: string;
  title: string;
  templateKey: ItCareerId;
  templateVersion: number;
  targetLevel: ItCareerLevelId;
};

export type ItCareerWorkspaceFile = {
  path: string;
  role: ItCareerWorkspaceFileRole;
  mimeType: string;
  content: string;
};

export type ItCareerWorkspaceManifestFile = Omit<ItCareerWorkspaceFile, "content"> & {
  size: number;
  sha256: string;
};

export type ItCareerWorkspaceManifest = {
  schemaVersion: 2;
  generatorVersion: 2;
  templateKey: ItCareerId;
  templateVersion: number;
  roadmapId: string;
  moduleId: string | null;
  moduleCode: string | null;
  generatedFor: ItCareerWorkspaceBundleKind;
  runtime: ItCareerWorkspaceRuntime;
  generatedAt: "deterministic";
  files: ItCareerWorkspaceManifestFile[];
  artifactSha256: string;
};

export type ItCareerWorkspaceBundle = {
  filename: string;
  manifest: ItCareerWorkspaceManifest;
  files: ItCareerWorkspaceFile[];
  bytes: Uint8Array;
};

export async function collectWorkspaceRowsByIds<T>(
  ids: string[],
  fetchPage: (batchIds: string[], rangeStart: number, rangeEnd: number) => Promise<T[]>,
  options: { itemBatchSize?: number; pageSize?: number } = {},
): Promise<T[]> {
  const itemBatchSize = options.itemBatchSize ?? 40;
  const pageSize = options.pageSize ?? 500;
  if (!Number.isInteger(itemBatchSize) || itemBatchSize < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Configuração de paginação inválida.");
  }

  const rows: T[] = [];
  for (let batchStart = 0; batchStart < ids.length; batchStart += itemBatchSize) {
    const batchIds = ids.slice(batchStart, batchStart + itemBatchSize);
    for (let page = 0; ; page += 1) {
      const rangeStart = page * pageSize;
      const pageRows = await fetchPage(batchIds, rangeStart, rangeStart + pageSize - 1);
      rows.push(...pageRows);
      if (pageRows.length < pageSize) break;
    }
  }
  return rows;
}

const forbiddenPath = /(^|\/)(?:solution|solutions|solucao|solucoes|answer|answers|resposta|respostas|gabarito|hidden|private)(?:[._-]|$)/i;
const forbiddenContent = /\b(?:correct_option|correct_order|gabarito|resposta\s+correta|solu[cç][aã]o\s+completa)\b/i;

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function identifier(value: string, fallback: string): string {
  const normalized = slug(value).replaceAll("-", "_").replace(/^\d+/, "");
  return normalized || fallback;
}

function safeInlineText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function textHash(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function runtimeForCareer(career: ItCareerId): ItCareerWorkspaceRuntime {
  if (["data_analytics_bi", "data_science_ai", "data_engineering"].includes(career)) return "data";
  if (career === "mobile") return "mobile";
  if (["devops_cloud", "support_infra_networks"].includes(career)) return "infra";
  if (career === "cybersecurity") return "security";
  if (["frontend", "backend", "fullstack", "qa_automation"].includes(career)) return "node";
  return "python";
}

function runtimeFiles(runtime: ItCareerWorkspaceRuntime): ItCareerWorkspaceFile[] {
  if (runtime === "data") return [
    { path: "pyproject.toml", role: "starter", mimeType: "text/plain", content: `[project]\nname = "rankftv-study-workspace"\nversion = "0.1.0"\nrequires-python = ">=3.11"\ndependencies = ["duckdb>=1.1,<2", "pandas>=2.2,<3", "pytest>=8,<9"]\n` },
    { path: "requirements-colab.txt", role: "starter", mimeType: "text/plain", content: "duckdb>=1.1,<2\npandas>=2.2,<3\npytest>=8,<9\n" },
    { path: "bootstrap_colab.ipynb", role: "starter", mimeType: "application/x-ipynb+json", content: notebook("# Ambiente RankFTV\n# No Colab, execute esta célula antes dos exercícios.\n!pip install -q -r requirements-colab.txt") },
    { path: "dados/README.md", role: "documentation", mimeType: "text/markdown", content: "# Dados de estudo\n\nOs exercícios usam fixtures sintéticas e determinísticas. Execute `python gerar_dados.py` para recriar os arquivos com a mesma seed. Não inclua dados pessoais, credenciais ou dados de produção.\n" },
    { path: "dados/gerar_dados.py", role: "dataset", mimeType: "text/x-python", content: "\"\"\"Gera uma fixture local, sintética e reproduzível para exercícios.\"\"\"\nfrom csv import DictWriter\nfrom pathlib import Path\nfrom random import Random\n\nrandom = Random(42)\noutput = Path(__file__).with_name('eventos.csv')\nrows = [\n    {'event_id': f'evt-{index:04d}', 'occurred_at': f'2026-01-{(index % 28) + 1:02d}', 'category': ['alpha', 'beta', 'gamma'][index % 3], 'value': random.randint(10, 990)}\n    for index in range(1, 201)\n]\nwith output.open('w', newline='', encoding='utf-8') as file:\n    writer = DictWriter(file, fieldnames=rows[0].keys())\n    writer.writeheader()\n    writer.writerows(rows)\nprint(output)\n" },
  ];
  if (runtime === "node") return [
    { path: "package.json", role: "starter", mimeType: "application/json", content: JSON.stringify({ name: "rankftv-study-workspace", private: true, scripts: { test: "node --test" }, engines: { node: ">=22" } }, null, 2) + "\n" },
    { path: "README.runtime.md", role: "documentation", mimeType: "text/markdown", content: "# Ambiente Node.js\n\nUse Node.js 22 ou superior. Instale dependências apenas quando o README do módulo solicitar.\n" },
  ];
  if (runtime === "mobile") return [
    { path: "README.runtime.md", role: "documentation", mimeType: "text/markdown", content: "# Ambiente mobile\n\nUse Node.js 22+, Expo e um emulador ou dispositivo físico. O módulo informa a menor configuração necessária.\n" },
    { path: "package.json", role: "starter", mimeType: "application/json", content: JSON.stringify({ name: "rankftv-mobile-workspace", private: true, engines: { node: ">=22" } }, null, 2) + "\n" },
  ];
  if (runtime === "infra") return [
    { path: "README.runtime.md", role: "documentation", mimeType: "text/markdown", content: "# Ambiente de infraestrutura\n\nExecute laboratórios somente em ambiente local ou conta de teste. Nunca use segredos reais neste workspace.\n" },
    { path: ".env.example", role: "starter", mimeType: "text/plain", content: "# Preencha somente valores de ambiente de teste.\n" },
  ];
  if (runtime === "security") return [
    { path: "README.runtime.md", role: "documentation", mimeType: "text/markdown", content: "# Laboratório seguro\n\nExecute somente os cenários locais fornecidos. Não aponte ferramentas para sistemas, domínios ou contas de terceiros.\n" },
    { path: ".env.example", role: "starter", mimeType: "text/plain", content: "# Ambiente local de laboratório. Não use credenciais reais.\n" },
  ];
  return [{ path: "README.runtime.md", role: "documentation", mimeType: "text/markdown", content: "# Ambiente\n\nSiga as instruções do módulo para preparar o ambiente local.\n" }];
}

function notebook(source: string): string {
  return JSON.stringify({ cells: [{ cell_type: "markdown", metadata: {}, source: source.split("\n").map((line) => `${line}\n`) }], metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python", version: "3.11" } }, nbformat: 4, nbformat_minor: 5 }, null, 2) + "\n";
}

function topicReadme(topic: ItCareerWorkspaceTopic, module: ItCareerWorkspaceModule): string {
  const subtopics = topic.subtopics.length ? topic.subtopics.map((item) => `- ${item}`).join("\n") : "- Revise o objetivo do assunto antes de iniciar a prática.";
  const guidedStudy = topic.guidedStudy?.length
    ? topic.guidedStudy.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "1. Leia os subassuntos e registre uma previsão do resultado.\n2. Execute o exemplo inicial do arquivo de exercício.\n3. Altere uma entrada e explique o efeito observado.\n4. Implemente a tarefa sem consultar o exemplo.\n5. Teste um caso normal, um de borda e um inválido quando aplicável.";
  const activities = topic.activities?.length
    ? topic.activities.map((item) => `- ${item}`).join("\n")
    : "- Resolva as atividades comentadas no arquivo de exercício deste assunto.";
  return `# ${topic.title}\n\n## Resultado esperado\n\n${topic.description ?? module.objective ?? "Produzir um artefato reproduzível que demonstre o assunto."}\n\n## O que estudar\n\n${subtopics}\n\n## Estudo guiado\n\n${guidedStudy}\n\n## Atividades\n\n${activities}\n\n## Evidência esperada\n\n${topic.evidence ?? "Código, comando e resultado suficientes para outra pessoa reproduzir a entrega."}\n\n## Perguntas de prática\n\n- Qual conceito deste assunto decide o resultado principal?\n- Qual condição pode fazer sua solução falhar?\n- Como outra pessoa executaria e verificaria seu artefato?\n`;
}

function topicStarter(runtime: ItCareerWorkspaceRuntime, topic: ItCareerWorkspaceTopic): ItCareerWorkspaceFile[] {
  const folder = `assuntos/${slug(topic.title)}`;
  const common = [{ path: `${folder}/README.md`, role: "documentation" as const, mimeType: "text/markdown", content: topicReadme(topic, { id: "", code: null, title: "", objective: null, successCriteria: null, level: null, orderIndex: 0, topics: [], project: null }) }];
  if (runtime === "data") return [...common,
    { path: `${folder}/estudo.ipynb`, role: "starter" as const, mimeType: "application/x-ipynb+json", content: notebook(`# ${topic.title}\n\nExplique, com suas palavras, os subassuntos antes de executar o exercício.`) },
    { path: `${folder}/dados.py`, role: "starter" as const, mimeType: "text/x-python", content: pythonTopicExercises(topic) },
    { path: `${folder}/tests/test_publico.py`, role: "public_test" as const, mimeType: "text/x-python", content: "# Adicione casos de teste públicos para a sua implementação.\n" },
  ];
  if (runtime === "node" || runtime === "mobile") return [...common,
    { path: `${folder}/src/exercicios.ts`, role: "starter" as const, mimeType: "text/plain", content: typescriptTopicExercises(topic) },
    { path: `${folder}/tests/exercicio.test.ts`, role: "public_test" as const, mimeType: "text/plain", content: "// Escreva casos públicos para sua implementação.\n" },
  ];
  return [...common,
    { path: `${folder}/starter.md`, role: "starter" as const, mimeType: "text/markdown", content: `# Prática — ${topic.title}\n\nCrie o artefato descrito no README, valide os casos e registre a evidência.\n` },
  ];
}

function pythonTopicExercises(topic: ItCareerWorkspaceTopic): string {
  const subjects = topic.subtopics.length ? topic.subtopics : [topic.title];
  const templateActivities = topic.activities?.length
    ? `# ATIVIDADES DEFINIDAS PELO TEMPLATE\n${topic.activities.map((activity, index) => `# ${index + 1}. ${safeInlineText(activity)}`).join("\n")}\n\n`
    : "";
  const exercises = subjects.map((rawSubject, index) => {
    const subject = safeInlineText(rawSubject);
    return `def exercicio_${index + 1}_${identifier(subject, "assunto")}():\n    # ASSUNTO: ${subject}\n    # ATIVIDADE:\n    # 1. Crie um exemplo mínimo que demonstre ${subject}.\n    # 2. Execute um caso normal, um caso de borda e um caso inválido.\n    # 3. Compare o resultado esperado com o resultado observado.\n    #\n    # ESCREVA SUA RESPOSTA ABAIXO DESTA LINHA:\n    pass\n`;
  }).join("\n\n");
  const questions = topic.questions?.length
    ? topic.questions.map((question, index) => question.type === "ordering"
      ? `# ${index + 1}. [${safeInlineText(question.sessionTitle)}] ${safeInlineText(question.prompt)}\n# Organize os índices destas opções na sequência escolhida:\n${question.options.map((option, optionIndex) => `# ${optionIndex}: ${safeInlineText(option)}`).join("\n")}\nordem_${index + 1}: list[int] = []\njustificativa_${index + 1} = \"\"\"\nExplique aqui a ordem escolhida.\n\"\"\"`
      : `# ${index + 1}. [${safeInlineText(question.sessionTitle)}] ${safeInlineText(question.prompt)}\n# Opções:\n${question.options.map((option) => `# - [ ] ${safeInlineText(option)}`).join("\n")}\nresposta_${index + 1} = \"\"\njustificativa_${index + 1} = \"\"\"\nEscreva aqui por que escolheu essa resposta.\n\"\"\"`).join("\n\n")
    : `# 1. Explique o conceito principal de ${safeInlineText(topic.title)}.\nresposta_1 = \"\"\n\n# 2. Qual caso de borda merece um teste?\nresposta_2 = \"\"`;
  return `\"\"\"${safeInlineText(topic.title)}\n\nEste arquivo já contém as atividades e perguntas do assunto.\nImplemente cada resposta logo abaixo do comentário indicado.\n\"\"\"\n\n${templateActivities}${exercises}\n\n\n# PERGUNTAS DE REVISÃO\n# Preencha as variáveis e justifique suas escolhas.\n\n${questions}\n`;
}

function typescriptTopicExercises(topic: ItCareerWorkspaceTopic): string {
  const subjects = topic.subtopics.length ? topic.subtopics : [topic.title];
  const templateActivities = topic.activities?.length
    ? `// ATIVIDADES DEFINIDAS PELO TEMPLATE\n${topic.activities.map((activity, index) => `// ${index + 1}. ${safeInlineText(activity)}`).join("\n")}\n\n`
    : "";
  const exercises = subjects.map((rawSubject, index) => {
    const subject = safeInlineText(rawSubject);
    return `/**\n * EXERCÍCIO ${index + 1}: ${subject}\n * 1. Crie um exemplo mínimo que demonstre o assunto.\n * 2. Cubra um caso normal, um de borda e um inválido.\n * 3. Escreva sua implementação abaixo deste comentário.\n */\nexport function exercicio${index + 1}${identifier(subject, "Assunto")}(): unknown {\n  throw new Error("TODO: implemente este exercício");\n}`;
  }).join("\n\n");
  const questions = topic.questions?.length
    ? topic.questions.map((question, index) => question.type === "ordering"
      ? `// ${index + 1}. [${safeInlineText(question.sessionTitle)}] ${safeInlineText(question.prompt)}\n${question.options.map((option, optionIndex) => `// ${optionIndex}: ${safeInlineText(option)}`).join("\n")}\nexport const ordem${index + 1}: number[] = [];\nexport const justificativa${index + 1} = \"\";`
      : `// ${index + 1}. [${safeInlineText(question.sessionTitle)}] ${safeInlineText(question.prompt)}\n${question.options.map((option) => `// - [ ] ${safeInlineText(option)}`).join("\n")}\nexport const resposta${index + 1} = \"\";\nexport const justificativa${index + 1} = \"\";`).join("\n\n")
    : `// Explique o conceito principal e registre um caso de borda.\nexport const resposta1 = \"\";`;
  return `/** Atividades: ${safeInlineText(topic.title)}. Responda diretamente neste arquivo. */\n\n${templateActivities}${exercises}\n\n// PERGUNTAS DE REVISÃO\n${questions}\n`;
}

function moduleReadme(roadmap: ItCareerWorkspaceRoadmap, module: ItCareerWorkspaceModule): string {
  const topics = module.topics.map((topic, index) => `${index + 1}. [${topic.title}](assuntos/${slug(topic.title)}/README.md)`).join("\n");
  const project = module.project
    ? `\n## Desafio do módulo\n\n${module.project.title}\n\n${module.project.description ?? module.project.spec?.productDefinition ?? "Consulte a especificação no site e produza os entregáveis definidos."}\n`
    : "";
  return `# ${module.code ?? `M${module.orderIndex + 1}`} — ${module.title}\n\n## Objetivo\n\n${module.objective ?? "Construir competências técnicas verificáveis neste módulo."}\n\n## Critério de sucesso\n\n${module.successCriteria ?? "Concluir os assuntos, atividades e evidências obrigatórias."}\n\n## Assuntos\n\n${topics || "Nenhum assunto foi materializado."}${project}\n## Evidência\n\n- Responda às perguntas e faça as atividades dentro da pasta de cada assunto.\n- Registre o comando executado, resultado e decisão técnica.\n- Mantenha os arquivos necessários para outra pessoa reproduzir a entrega.\n- No site, marque o assunto como concluído depois de finalizar seus arquivos.\n\nTemplate: ${roadmap.templateKey}@${roadmap.templateVersion}\n`;
}

function projectFiles(module: ItCareerWorkspaceModule): ItCareerWorkspaceFile[] {
  if (!module.project) return [];
  const spec = module.project.spec;
  const content = spec
    ? `# ${spec.projectTitle}\n\n## Produto\n\n${spec.productDefinition}\n\n## Problema\n\n${spec.problemStatement}\n\n## Público\n\n${spec.targetAudience}\n\n## Dados\n\n${spec.data.sourceLabel}\n\n${spec.data.acquisitionInstructions}\n\n## Requisitos\n\n${spec.mandatoryRequirements.map((item) => `- ${item}`).join("\n")}\n\n## Entregáveis\n\n${spec.deliverables.map((item) => `- ${item}`).join("\n")}\n\n## Critérios\n\n${spec.evaluationCriteria.map((item) => `- ${item.label} (${item.weightPercent}%): ${item.description}`).join("\n")}\n`
    : `# ${module.project.title}\n\n${module.project.description ?? "Consulte o site para os critérios deste desafio."}\n`;
  return [
    { path: "desafio/README.md", role: "documentation", mimeType: "text/markdown", content },
    { path: "desafio/ENTREGA.md", role: "starter", mimeType: "text/markdown", content: "# Evidência da entrega\n\n- Como executar:\n- Resultado observado:\n- Limitações:\n- Próximo passo:\n" },
  ];
}

function baseFiles(roadmap: ItCareerWorkspaceRoadmap, runtime: ItCareerWorkspaceRuntime): ItCareerWorkspaceFile[] {
  return [
    { path: "README.md", role: "documentation", mimeType: "text/markdown", content: `# ${roadmap.title}\n\nEste workspace acompanha o mapa visual do RankFTV. O site exibe assuntos, progresso e desbloqueios; o trabalho prático acontece nestas pastas.\n\n## Estrutura\n\n- Cada módulo contém assuntos, perguntas, atividades e desafio.\n- Os arquivos não incluem gabaritos nem soluções prontas.\n- Depois de concluir os arquivos de um assunto, registre sua conclusão no site.\n- Use dados de exemplo apenas para aprendizado.\n` },
    ...runtimeFiles(runtime),
  ];
}

function normalizedFiles(files: ItCareerWorkspaceFile[]): ItCareerWorkspaceFile[] {
  const paths = new Set<string>();
  return [...files].map((file) => ({ ...file, path: file.path.replaceAll("\\", "/").replace(/^\/+/, "") }))
    .sort((left, right) => left.path.localeCompare(right.path))
    .filter((file) => {
      if (!file.path || file.path.includes("..") || paths.has(file.path)) throw new Error("Arquivo de workspace inválido.");
      if (forbiddenPath.test(file.path) || forbiddenContent.test(file.content)) throw new Error(`Conteúdo privado não pode entrar no pacote: ${file.path}`);
      paths.add(file.path);
      return true;
    });
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function u32(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function joinBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

/** ZIP mínimo, com ordem e timestamp fixos para manter o artefato reproduzível. */
export function createDeterministicZip(files: ItCareerWorkspaceFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const entries = normalizedFiles(files).map((file) => {
    const name = encoder.encode(file.path);
    const source = encoder.encode(file.content);
    const compressed = new Uint8Array(deflateRawSync(source, { level: 9 }));
    return { name, source, compressed, crc: crc32(source) };
  });
  let offset = 0;
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  for (const entry of entries) {
    const local = joinBytes([u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0), u32(entry.crc), u32(entry.compressed.length), u32(entry.source.length), u16(entry.name.length), u16(0), entry.name, entry.compressed]);
    locals.push(local);
    central.push(joinBytes([u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(entry.crc), u32(entry.compressed.length), u32(entry.source.length), u16(entry.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), entry.name]));
    offset += local.length;
  }
  const centralBytes = joinBytes(central);
  return joinBytes([...locals, centralBytes, u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(offset), u16(0)]);
}

export function buildItCareerWorkspaceBundle(
  roadmap: ItCareerWorkspaceRoadmap,
  modules: ItCareerWorkspaceModule[],
  kind: ItCareerWorkspaceBundleKind,
): ItCareerWorkspaceBundle {
  if (!modules.length && kind !== "base") throw new Error("O módulo não possui conteúdo para download.");
  const runtime = runtimeForCareer(roadmap.templateKey);
  const selected = kind === "base" ? [] : modules;
  const files = normalizedFiles([
    ...baseFiles(roadmap, runtime),
    ...selected.flatMap((module) => {
      const prefix = `${module.code ?? `M${module.orderIndex + 1}`}-${slug(module.title)}`;
      return [
        { path: `${prefix}/README.md`, role: "documentation" as const, mimeType: "text/markdown", content: moduleReadme(roadmap, module) },
        ...module.topics.flatMap((topic) => topicStarter(runtime, topic).map((file) => ({ ...file, path: `${prefix}/${file.path}` }))),
        ...projectFiles(module).map((file) => ({ ...file, path: `${prefix}/${file.path}` })),
      ];
    }),
  ]);
  const manifestFiles = files.map((file) => ({ path: file.path, role: file.role, mimeType: file.mimeType, size: Buffer.byteLength(file.content), sha256: textHash(file.content) }));
  const manifestWithoutHash = {
    schemaVersion: 2 as const,
    generatorVersion: 2 as const,
    templateKey: roadmap.templateKey,
    templateVersion: roadmap.templateVersion,
    roadmapId: roadmap.id,
    moduleId: kind === "module" ? modules[0]?.id ?? null : null,
    moduleCode: kind === "module" ? modules[0]?.code ?? null : null,
    generatedFor: kind,
    runtime,
    generatedAt: "deterministic" as const,
    files: manifestFiles,
  };
  const artifactSha256 = textHash(JSON.stringify(manifestWithoutHash));
  const manifest: ItCareerWorkspaceManifest = { ...manifestWithoutHash, artifactSha256 };
  const filesWithManifest = [...files, { path: "roadmap.json", role: "manifest" as const, mimeType: "application/json", content: JSON.stringify(manifest, null, 2) + "\n" }];
  const bytes = createDeterministicZip(filesWithManifest);
  const suffix = kind === "base" ? "ambiente-base" : kind === "full" ? "projeto-completo" : kind === "module" ? slug(modules[0]?.title ?? "modulo") : `ate-${modules.at(-1)?.code ?? "modulo"}`;
  return { filename: `${slug(roadmap.title)}-${suffix}.zip`, manifest, files: filesWithManifest, bytes };
}

export function assertStudentWorkspaceSafe(files: ItCareerWorkspaceFile[]): void {
  normalizedFiles(files);
}
