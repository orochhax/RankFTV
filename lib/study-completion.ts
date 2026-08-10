export type StudyCompletionInput = {
  requiredChecks: number;
  checkedChecks: number;
  questionIds: string[];
  attempts: Array<{ answers: Record<string, unknown> }>;
  legacyCompletionPreserved?: boolean;
};

export type StudyCompletionPolicy = {
  eligible: boolean;
  completed: boolean;
  manual: boolean;
};

/** Correção/nota não participa da conclusão; importa responder validamente todas as perguntas atuais. */
export function studyCompletionPolicy(input: StudyCompletionInput): StudyCompletionPolicy {
  const manual = input.requiredChecks === 0 && input.questionIds.length === 0;
  const allChecked = input.checkedChecks === input.requiredChecks;
  const allAnswered = input.questionIds.length === 0 || input.attempts.some((attempt) =>
    input.questionIds.every((questionId) => Object.prototype.hasOwnProperty.call(attempt.answers, questionId)),
  );
  const eligible = !manual && allChecked && allAnswered;
  return { eligible, completed: Boolean(input.legacyCompletionPreserved) || eligible, manual };
}
