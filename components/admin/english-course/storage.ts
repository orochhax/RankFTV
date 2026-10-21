import { EMPTY_ASSESSMENT_ANSWERS, type AssessmentAnswer, type AssessmentAnswers } from "./assessment";
import { PRACTICE_SETS } from "./practice";
import type { LearnerId } from "./roadmap";

export type ProgressMap = Record<LearnerId, Record<string, boolean>>;
export type PracticeResponseMap = Record<LearnerId, Record<string, string>>;
export type PracticeSubmissionMap = Record<LearnerId, Record<string, boolean>>;

export type PersistedData = {
  version: 4;
  progress: ProgressMap;
  answers: AssessmentAnswers;
  practiceResponses: PracticeResponseMap;
  practiceSubmissions: PracticeSubmissionMap;
};

const STORAGE_KEY = "rankftv:personal-english-roadmap:v1";
export const JULIA_CALIBRATED_PROGRESS: Record<string, boolean> = {
  "day-2-lesson": true,
  "day-4-lesson": true,
  "day-5-lesson": true,
};
const EMPTY_PROGRESS: ProgressMap = { carlos: {}, julia: JULIA_CALIBRATED_PROGRESS };
const EMPTY_PRACTICE_RESPONSES: PracticeResponseMap = { carlos: {}, julia: {} };
const EMPTY_PRACTICE_SUBMISSIONS: PracticeSubmissionMap = { carlos: {}, julia: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultAnswers(): AssessmentAnswers {
  return {
    carlos: { ...EMPTY_ASSESSMENT_ANSWERS.carlos },
    julia: { ...EMPTY_ASSESSMENT_ANSWERS.julia },
  };
}

function normalizeProgress(value: unknown): ProgressMap {
  if (!isRecord(value)) return EMPTY_PROGRESS;
  return {
    carlos: isRecord(value.carlos) ? value.carlos as Record<string, boolean> : {},
    julia: {
      ...JULIA_CALIBRATED_PROGRESS,
      ...(isRecord(value.julia) ? value.julia as Record<string, boolean> : {}),
    },
  };
}

function normalizeAnswers(value: unknown): AssessmentAnswers | null {
  if (!isRecord(value)) return null;
  const initial = defaultAnswers();
  return {
    carlos: isRecord(value.carlos) ? { ...initial.carlos, ...value.carlos as Record<string, AssessmentAnswer> } : initial.carlos,
    julia: isRecord(value.julia) ? { ...initial.julia, ...value.julia as Record<string, AssessmentAnswer> } : initial.julia,
  };
}

function normalizeLearnerStringRecords(value: unknown): PracticeResponseMap {
  if (!isRecord(value)) return EMPTY_PRACTICE_RESPONSES;
  return {
    carlos: isRecord(value.carlos) ? value.carlos as Record<string, string> : {},
    julia: isRecord(value.julia) ? value.julia as Record<string, string> : {},
  };
}

function normalizeLearnerBooleanRecords(value: unknown): PracticeSubmissionMap {
  if (!isRecord(value)) return EMPTY_PRACTICE_SUBMISSIONS;
  return {
    carlos: isRecord(value.carlos) ? value.carlos as Record<string, boolean> : {},
    julia: isRecord(value.julia) ? value.julia as Record<string, boolean> : {},
  };
}

function removeLegacyPracticeCompletions(progress: ProgressMap): ProgressMap {
  const practiceIds = new Set(Object.keys(PRACTICE_SETS));
  return {
    carlos: Object.fromEntries(Object.entries(progress.carlos).filter(([id]) => !practiceIds.has(id))),
    julia: Object.fromEntries(Object.entries(progress.julia).filter(([id]) => !practiceIds.has(id))),
  };
}

function fallbackData(): PersistedData {
  return {
    version: 4,
    progress: EMPTY_PROGRESS,
    answers: defaultAnswers(),
    practiceResponses: EMPTY_PRACTICE_RESPONSES,
    practiceSubmissions: EMPTY_PRACTICE_SUBMISSIONS,
  };
}

export function readEnglishCourseData(): PersistedData {
  const fallback = fallbackData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return fallback;
    const progress = normalizeProgress(value.progress);
    const answers = normalizeAnswers(value.answers);
    if (!answers) return { ...fallback, progress };
    const legacyProgress = value.version === 3 ? progress : removeLegacyPracticeCompletions(progress);
    return {
      version: 4,
      progress: legacyProgress,
      answers,
      practiceResponses: normalizeLearnerStringRecords(value.practiceResponses),
      practiceSubmissions: normalizeLearnerBooleanRecords(value.practiceSubmissions),
    };
  } catch {
    return fallback;
  }
}

export function writeEnglishCourseData(data: PersistedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A tela continua funcionando na sessão se o navegador bloquear o armazenamento.
  }
}
