export type StudyDevice = "windows" | "mac" | "linux" | "chromebook" | "mobile";

export type StudyOrganizationProfile = {
  availableDevices: StudyDevice[];
  /** Compatibility only for profiles assembled from answers saved before v13. */
  mainDevice?: StudyDevice;
  digitalLiteracy: "needs_guidance" | "basic" | "comfortable" | "advanced";
  roadmapType: "skill" | "language";
  subject: string;
  targetLanguage?: string;
};

export type StudyOrganizationCommandKind = "cmd" | "terminal" | "folder_list";

export type StudyOrganizationPlan = {
  rootFolder: string;
  folders: string[];
  deviceLabel: string;
  destinationLabel: string;
  intro: string;
  steps: string[];
  copyContent: string;
  copyLabel: string;
  contentLabel: string;
  commandKind: StudyOrganizationCommandKind;
};

export type StudyOrganizationInput = {
  roadmapId: string;
  roadmapTitle: string;
  moduleTitles: string[];
  profile: StudyOrganizationProfile | null;
  selectedDevice?: StudyDevice;
};

const STUDY_DEVICES: readonly StudyDevice[] = ["windows", "mac", "linux", "chromebook", "mobile"];

export function studyDeviceLabel(device: StudyDevice): string {
  return {
    windows: "PC Windows",
    mac: "Mac",
    linux: "computador Linux",
    chromebook: "Chromebook",
    mobile: "celular ou tablet",
  }[device];
}

export function studyAvailableDevices(profile: StudyOrganizationProfile | null): StudyDevice[] {
  if (!profile) return [];
  const source = profile.availableDevices?.length
    ? profile.availableDevices
    : profile.mainDevice
      ? [profile.mainDevice]
      : [];
  return [...new Set(source)].filter((device): device is StudyDevice => STUDY_DEVICES.includes(device));
}

export function recommendedStudyOrganizationDevice(profile: StudyOrganizationProfile | null): StudyDevice | undefined {
  const available = studyAvailableDevices(profile);
  return available.find((device) => device === "windows" || device === "mac" || device === "linux") ?? available[0];
}

const MAX_FOLDER_LENGTH = 64;
const HASH_LENGTH = 8;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * Produces a portable path segment. Keeping a deliberately small character set
 * makes the same names safe to interpolate into both CMD and POSIX commands.
 */
export function sanitizeStudyFolderName(value: string, fallback = "Pasta", maxLength = MAX_FOLDER_LENGTH): string {
  const safeLimit = Math.max(8, Math.min(MAX_FOLDER_LENGTH, Math.floor(maxLength)));
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^[\s_-]+|[\s_-]+$/g, "")
    .slice(0, safeLimit)
    .replace(/[\s_-]+$/g, "");

  const safeFallback = String(fallback ?? "Pasta")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, "-")
    .replace(/^[\s_-]+|[\s_-]+$/g, "")
    .slice(0, safeLimit) || "Pasta";
  const candidate = normalized || safeFallback;

  if (WINDOWS_RESERVED_NAME.test(candidate)) {
    return `Pasta-${candidate}`.slice(0, safeLimit);
  }

  return candidate;
}

function stableSuffix(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(HASH_LENGTH, "0");
}

function cleanDisplayText(value: string, fallback: string): string {
  const cleaned = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 120);
}

function numberedFolders(moduleTitles: string[]): string[] {
  return moduleTitles.map((title, index) => {
    const prefix = `${String(index + 1).padStart(2, "0")} - `;
    const titleLimit = MAX_FOLDER_LENGTH - prefix.length;
    return `${prefix}${sanitizeStudyFolderName(title, "Modulo", titleLimit)}`;
  });
}

function folderTree(rootFolder: string, folders: string[]): string {
  const children = folders.length > 0 ? folders.map((folder) => `    - ${folder}`).join("\n") : "    - (adicione os arquivos do seu estudo aqui)";
  return `Estudos/\n  ${rootFolder}/\n${children}`;
}

function windowsCommand(rootFolder: string, folders: string[]): string {
  return [
    "@echo off",
    "setlocal DisableDelayedExpansion",
    `set "STUDY_ROOT=%USERPROFILE%\\Estudos\\${rootFolder}"`,
    "if not exist \"%STUDY_ROOT%\" mkdir \"%STUDY_ROOT%\"",
    ...folders.map((folder) => `if not exist \"%STUDY_ROOT%\\${folder}\" mkdir \"%STUDY_ROOT%\\${folder}\"`),
    "endlocal",
  ].join("\n");
}

function posixCommand(rootFolder: string, folders: string[]): string {
  const root = `$HOME/Estudos/${rootFolder}`;
  return [
    `mkdir -p \"${root}\"`,
    ...folders.map((folder) => `mkdir -p \"${root}/${folder}\"`),
  ].join("\n");
}

function topicFor(profile: StudyOrganizationProfile | null, roadmapTitle: string): string {
  if (!profile) return cleanDisplayText(roadmapTitle, "este roadmap");
  if (profile.roadmapType === "language") {
    return cleanDisplayText(profile.targetLanguage || profile.subject, "o novo idioma");
  }
  return cleanDisplayText(profile.subject, roadmapTitle || "este assunto");
}

function introFor(profile: StudyOrganizationProfile | null, deviceLabel: string, topic: string): string {
  if (!profile) {
    return `Separe os materiais de ${topic} em uma pasta para cada módulo. Assim, exercícios, anotações e projetos ficam fáceis de encontrar.`;
  }

  if (profile.digitalLiteracy === "needs_guidance") {
    return `Vamos organizar seus estudos de ${topic} no ${deviceLabel}. Siga os passos com calma: cada módulo terá sua própria pasta para guardar anotações, exercícios e projetos.`;
  }
  if (profile.digitalLiteracy === "basic") {
    return `Organize seus estudos de ${topic} no ${deviceLabel} com uma pasta para cada módulo. Você poderá guardar cada arquivo no lugar certo desde a primeira etapa.`;
  }
  return `Crie no ${deviceLabel} uma estrutura de ${topic} separada por módulo para manter materiais, exercícios e entregas fáceis de localizar.`;
}

export function createStudyOrganizationPlan(input: StudyOrganizationInput): StudyOrganizationPlan {
  const suffixSource = String(input.roadmapId || `${input.roadmapTitle}|${input.moduleTitles.join("|")}`);
  const suffix = stableSuffix(suffixSource);
  const titleLimit = MAX_FOLDER_LENGTH - HASH_LENGTH - 3;
  const titleFolder = sanitizeStudyFolderName(input.roadmapTitle, "Roadmap", titleLimit);
  const rootFolder = `${titleFolder} - ${suffix}`;
  const folders = numberedFolders(input.moduleTitles);
  const topic = topicFor(input.profile, input.roadmapTitle);
  const availableDevices = studyAvailableDevices(input.profile);
  const device = input.selectedDevice && availableDevices.includes(input.selectedDevice)
    ? input.selectedDevice
    : recommendedStudyOrganizationDevice(input.profile);

  if (device === "windows") {
    const destinationLabel = `%USERPROFILE%\\Estudos\\${rootFolder}`;
    const detailed = input.profile?.digitalLiteracy === "needs_guidance" || input.profile?.digitalLiteracy === "basic";
    return {
      rootFolder,
      folders,
      deviceLabel: "PC Windows",
      destinationLabel,
      intro: introFor(input.profile, "PC Windows", topic),
      steps: detailed
        ? [
            "Copie o comando abaixo.",
            "Pressione Windows + R, digite cmd e pressione Enter para abrir o Prompt de Comando.",
            "Cole o comando, pressione Enter e aguarde a criação das pastas.",
            `Abra o Explorador de Arquivos e acesse ${destinationLabel}.`,
          ]
        : [
            "Copie o comando e execute-o no Prompt de Comando.",
            `Abra ${destinationLabel} e guarde cada material na pasta do módulo correspondente.`,
          ],
      copyContent: windowsCommand(rootFolder, folders),
      copyLabel: "Copiar comando CMD",
      contentLabel: "Comando para criar as pastas",
      commandKind: "cmd",
    };
  }

  if (device === "mac" || device === "linux") {
    const deviceLabel = studyDeviceLabel(device);
    const destinationLabel = `$HOME/Estudos/${rootFolder}`;
    const detailed = input.profile?.digitalLiteracy === "needs_guidance" || input.profile?.digitalLiteracy === "basic";
    return {
      rootFolder,
      folders,
      deviceLabel,
      destinationLabel,
      intro: introFor(input.profile, deviceLabel, topic),
      steps: detailed
        ? [
            "Copie o comando abaixo.",
            `Abra o Terminal no seu ${deviceLabel}.`,
            "Cole o comando e pressione Enter.",
            `Abra a pasta ${destinationLabel} no gerenciador de arquivos.`,
          ]
        : [
            "Copie e execute o comando no Terminal.",
            `Use ${destinationLabel} para guardar os materiais de cada módulo.`,
          ],
      copyContent: posixCommand(rootFolder, folders),
      copyLabel: "Copiar comando do Terminal",
      contentLabel: "Comando para criar as pastas",
      commandKind: "terminal",
    };
  }

  const isChromebook = device === "chromebook";
  const deviceLabel = device ? studyDeviceLabel(device) : "seu dispositivo";
  const destinationLabel = isChromebook
    ? `Meus arquivos/Estudos/${rootFolder}`
    : device === "mobile"
      ? `Arquivos/Estudos/${rootFolder}`
      : `Estudos/${rootFolder}`;
  const firstStep = isChromebook
    ? "Abra o app Arquivos e entre em Meus arquivos."
    : device === "mobile"
      ? "Abra o app Arquivos (ou o gerenciador de arquivos do aparelho)."
      : "Abra o gerenciador de arquivos do seu dispositivo.";

  return {
    rootFolder,
    folders,
    deviceLabel,
    destinationLabel,
    intro: introFor(input.profile, deviceLabel, topic),
    steps: [
      firstStep,
      "Crie uma pasta chamada Estudos e, dentro dela, crie a pasta principal indicada na lista.",
      "Dentro da pasta principal, crie uma subpasta para cada módulo, mantendo a numeração.",
      "Ao terminar uma atividade, salve o arquivo na pasta do módulo correspondente.",
    ],
    copyContent: folderTree(rootFolder, folders),
    copyLabel: "Copiar lista de pastas",
    contentLabel: "Estrutura de pastas",
    commandKind: "folder_list",
  };
}
