import test from "node:test";
import assert from "node:assert/strict";
import {
  createStudyOrganizationPlan,
  sanitizeStudyFolderName,
  type StudyOrganizationProfile,
} from "./study-organization";

const windowsProfile: StudyOrganizationProfile = {
  availableDevices: ["windows"],
  digitalLiteracy: "needs_guidance",
  roadmapType: "skill",
  subject: "Ciência de dados",
};

test("personaliza o guia para Windows e mantém a ordem dos módulos", () => {
  const plan = createStudyOrganizationPlan({
    roadmapId: "roadmap-123",
    roadmapTitle: "Dados na prática",
    moduleTitles: ["Fundamentos", "Primeiro projeto", "Apresentação"],
    profile: windowsProfile,
  });

  assert.equal(plan.commandKind, "cmd");
  assert.equal(plan.deviceLabel, "PC Windows");
  assert.match(plan.intro, /Ciência de dados/);
  assert.deepEqual(plan.folders, ["01 - Fundamentos", "02 - Primeiro projeto", "03 - Apresentacao"]);
  assert.match(plan.destinationLabel, /^%USERPROFILE%\\Estudos\\Dados na pratica - [a-f0-9]{8}$/);
  assert.match(plan.steps.join(" "), /Windows \+ R/);
});

test("oferece o comando do aparelho escolhido entre todos os disponiveis", () => {
  const input = {
    roadmapId: "multi-device",
    roadmapTitle: "Plano pratico",
    moduleTitles: ["Base", "Projeto"],
    profile: { ...windowsProfile, availableDevices: ["windows", "mobile"] },
  } satisfies Parameters<typeof createStudyOrganizationPlan>[0];
  const recommended = createStudyOrganizationPlan(input);
  const onMobile = createStudyOrganizationPlan({ ...input, selectedDevice: "mobile" });
  const unavailable = createStudyOrganizationPlan({ ...input, selectedDevice: "linux" });

  assert.equal(recommended.commandKind, "cmd");
  assert.equal(onMobile.commandKind, "folder_list");
  assert.equal(onMobile.deviceLabel, "celular ou tablet");
  assert.deepEqual(onMobile.folders, recommended.folders);
  assert.equal(unavailable.commandKind, "cmd");
});

test("gera CMD idempotente somente com comandos permitidos", () => {
  const plan = createStudyOrganizationPlan({
    roadmapId: "safe-id",
    roadmapTitle: "Curso & del C:\\ %PATH% ! ^ | > < \" $(calc); `calc`",
    moduleTitles: ["../../fora & whoami", "%TEMP%\\arquivo", "\" && calc"],
    profile: windowsProfile,
  });

  for (const line of plan.copyContent.split("\n")) {
    assert.match(line, /^(?:@echo off$|setlocal DisableDelayedExpansion$|set "STUDY_ROOT=|if not exist ".*" mkdir "|endlocal$)/);
  }
  assert.doesNotMatch(plan.copyContent, /(?:%PATH%|%TEMP%|\$\(|`|&&|[|<>^!;])/i);
  assert.ok(plan.copyContent.split("\n").every((line) => !/^\s*whoami\b/i.test(line)));
  assert.equal(plan.copyContent.split("mkdir ").length - 1, 4);
});

test("neutraliza nomes reservados do Windows e limita os segmentos", () => {
  const plan = createStudyOrganizationPlan({
    roadmapId: "reserved",
    roadmapTitle: "CON",
    moduleTitles: ["AUX", "NUL", "COM1", "x".repeat(500)],
    profile: windowsProfile,
  });

  assert.match(plan.rootFolder, /^Pasta-CON - [a-f0-9]{8}$/);
  assert.deepEqual(plan.folders.slice(0, 3), ["01 - Pasta-AUX", "02 - Pasta-NUL", "03 - Pasta-COM1"]);
  assert.ok(plan.rootFolder.length <= 64);
  assert.ok(plan.folders.every((folder) => folder.length <= 64));
  assert.equal(sanitizeStudyFolderName("..\\CON/"), "Pasta-CON");
});

test("usa um sufixo estável do id para separar roadmaps com o mesmo título", () => {
  const base = { roadmapTitle: "Inglês", moduleTitles: ["Começo"], profile: windowsProfile };
  const first = createStudyOrganizationPlan({ ...base, roadmapId: "id-a" });
  const repeated = createStudyOrganizationPlan({ ...base, roadmapId: "id-a" });
  const other = createStudyOrganizationPlan({ ...base, roadmapId: "id-b" });

  assert.equal(first.rootFolder, repeated.rootFolder);
  assert.notEqual(first.rootFolder, other.rootFolder);
});

test("gera mkdir -p seguro no Mac e personaliza roadmaps de idioma", () => {
  const plan = createStudyOrganizationPlan({
    roadmapId: "language-roadmap",
    roadmapTitle: "Conversação",
    moduleTitles: ["Apresentações", "Reuniões"],
    profile: {
      availableDevices: ["mac"],
      digitalLiteracy: "comfortable",
      roadmapType: "language",
      subject: "Idiomas",
      targetLanguage: "Inglês",
    },
  });

  assert.equal(plan.commandKind, "terminal");
  assert.match(plan.intro, /Inglês/);
  assert.ok(plan.copyContent.split("\n").every((line) => line.startsWith("mkdir -p \"$HOME/Estudos/")));
  assert.match(plan.copyContent, /01 - Apresentacoes/);
});

test("Chromebook, celular e perfil ausente recebem lista manual, não comando", () => {
  for (const mainDevice of ["chromebook", "mobile"] as const) {
    const plan = createStudyOrganizationPlan({
      roadmapId: mainDevice,
      roadmapTitle: "Plano",
      moduleTitles: ["Módulo único"],
      profile: { ...windowsProfile, availableDevices: [mainDevice] },
    });
    assert.equal(plan.commandKind, "folder_list");
    assert.doesNotMatch(plan.copyContent, /\b(?:mkdir|setlocal|endlocal)\b/);
    assert.match(plan.copyContent, /01 - Modulo unico/);
  }

  const unknown = createStudyOrganizationPlan({
    roadmapId: "unknown",
    roadmapTitle: "Plano",
    moduleTitles: [],
    profile: null,
  });
  assert.equal(unknown.commandKind, "folder_list");
  assert.equal(unknown.deviceLabel, "seu dispositivo");
});
