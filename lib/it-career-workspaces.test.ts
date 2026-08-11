import assert from "node:assert/strict";
import test from "node:test";

import {
  assertStudentWorkspaceSafe,
  buildItCareerWorkspaceBundle,
  collectWorkspaceRowsByIds,
  createDeterministicZip,
  type ItCareerWorkspaceModule,
  type ItCareerWorkspaceRoadmap,
} from "./it-career-workspaces";

test("coletor preserva mais de mil questões usando lotes e páginas", async () => {
  const assessmentIds = Array.from({ length: 85 }, (_, index) => `assessment-${index}`);
  const source = assessmentIds.flatMap((itemId) => Array.from({ length: 25 }, (_, orderIndex) => ({ itemId, orderIndex })));
  const requests: Array<{ ids: number; start: number; end: number }> = [];
  const rows = await collectWorkspaceRowsByIds(assessmentIds, async (batchIds, start, end) => {
    requests.push({ ids: batchIds.length, start, end });
    return source.filter((row) => batchIds.includes(row.itemId)).slice(start, end + 1);
  }, { itemBatchSize: 40, pageSize: 500 });

  assert.equal(rows.length, 2_125);
  assert.ok(requests.every((request) => request.ids <= 40));
  assert.ok(requests.some((request) => request.start === 500));
});

const roadmap: ItCareerWorkspaceRoadmap = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Ciência de Dados — investimentos",
  templateKey: "data_science_ai",
  templateVersion: 4,
  targetLevel: "junior",
};

const workspaceModule: ItCareerWorkspaceModule = {
  id: "00000000-0000-4000-8000-000000000002",
  code: "M01",
  title: "Python científico e dados",
  objective: "Manipular dados de forma reproduzível.",
  successCriteria: "Explicar e testar a transformação criada.",
  level: "foundation",
  orderIndex: 0,
  topics: [{
    id: "t01",
    title: "NumPy",
    description: "Criar arrays e operações vetorizadas.",
    subtopics: ["arrays", "broadcasting", "máscaras"],
    guidedStudy: ["Leia a documentação curta e preveja a saída."],
    activities: ["Crie um array, transforme os valores e valide o resultado."],
    evidence: "Código executável e saída registrada.",
    estimatedMinutes: 180,
    questions: [{ type: "multiple_choice", prompt: "Qual operação evita um laço explícito?", options: ["Vetorização", "Concatenação", "Serialização"], sessionTitle: "Sessão 1" }],
  }],
  project: null,
};

test("workspace de módulo é determinístico e traz assunto antes da prática", () => {
  const first = buildItCareerWorkspaceBundle(roadmap, [workspaceModule], "module");
  const second = buildItCareerWorkspaceBundle(roadmap, [workspaceModule], "module");
  assert.equal(Buffer.compare(Buffer.from(first.bytes), Buffer.from(second.bytes)), 0);
  assert.equal(first.manifest.artifactSha256, second.manifest.artifactSha256);
  assert.ok(first.files.some((file) => file.path.endsWith("assuntos/numpy/README.md")));
  const exercise = first.files.find((file) => file.path.endsWith("assuntos/numpy/dados.py"));
  assert.ok(exercise);
  assert.match(exercise.content, /def exercicio_1_arrays/);
  assert.match(exercise.content, /ATIVIDADES DEFINIDAS PELO TEMPLATE/);
  assert.match(exercise.content, /Crie um array, transforme os valores/);
  assert.match(exercise.content, /ESCREVA SUA RESPOSTA ABAIXO DESTA LINHA/);
  assert.match(exercise.content, /Qual operação evita um laço explícito/);
  assert.match(exercise.content, /resposta_1 = ""/);
  assert.ok(first.files.some((file) => file.path === "roadmap.json"));
});

test("projeto completo inclui ambiente e todos os módulos em uma única pasta", () => {
  const secondModule = { ...workspaceModule, id: "00000000-0000-4000-8000-000000000003", code: "M02", title: "Estatística", orderIndex: 1 };
  const bundle = buildItCareerWorkspaceBundle(roadmap, [workspaceModule, secondModule], "full");
  assert.match(bundle.filename, /projeto-completo\.zip$/);
  assert.equal(bundle.manifest.generatedFor, "full");
  assert.equal(bundle.manifest.generatorVersion, 2);
  assert.ok(bundle.files.some((file) => file.path.startsWith("M01-")));
  assert.ok(bundle.files.some((file) => file.path.startsWith("M02-")));
  assert.ok(bundle.files.some((file) => file.path === "pyproject.toml"));
});

test("questão de ordenação vira uma resposta de sequência sem revelar correção", () => {
  const orderingModule: ItCareerWorkspaceModule = {
    ...workspaceModule,
    topics: [{
      ...workspaceModule.topics[0],
      questions: [{ type: "ordering", prompt: "Ordene o fluxo", options: ["Preparar", "Executar", "Validar"], sessionTitle: "Sessão 2" }],
    }],
  };
  const bundle = buildItCareerWorkspaceBundle(roadmap, [orderingModule], "module");
  const exercise = bundle.files.find((file) => file.path.endsWith("/dados.py"));
  assert.ok(exercise);
  assert.match(exercise.content, /ordem_1: list\[int\] = \[\]/);
  assert.match(exercise.content, /0: Preparar/);
  assert.doesNotMatch(exercise.content, /correct|correta|explica[cç][aã]o oficial/i);
});

test("manifesto não inclui arquivos privados nem gabaritos", () => {
  const bundle = buildItCareerWorkspaceBundle(roadmap, [workspaceModule], "module");
  assert.equal(bundle.manifest.files.some((file) => /solution|gabarito|resposta|correct_/i.test(file.path)), false);
  assert.doesNotThrow(() => assertStudentWorkspaceSafe(bundle.files));
  assert.throws(() => assertStudentWorkspaceSafe([{ path: "solucao.py", role: "starter", mimeType: "text/plain", content: "print('x')" }]), /privado/i);
  assert.throws(() => assertStudentWorkspaceSafe([{ path: "README.md", role: "documentation", mimeType: "text/plain", content: "correct_option = 2" }]), /privado/i);
});

test("ZIP rejeita path traversal e mantém artefatos ordenados", () => {
  assert.throws(() => createDeterministicZip([{ path: "../fora.txt", role: "starter", mimeType: "text/plain", content: "x" }]), /inválido/i);
  const zip = createDeterministicZip([
    { path: "b.txt", role: "starter", mimeType: "text/plain", content: "b" },
    { path: "a.txt", role: "starter", mimeType: "text/plain", content: "a" },
  ]);
  assert.ok(zip.byteLength > 30);
});
