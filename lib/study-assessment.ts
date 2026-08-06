import type { StudyQuestionType } from "@/lib/performance-widgets";

export type SubmittedStudyAnswer = number | number[];

export type GradableStudyQuestion = {
  questionType: StudyQuestionType;
  optionCount: number;
  correctOptionIndex: number | null;
  correctOrder: number[];
};

export function validOrderingAnswer(value: SubmittedStudyAnswer | undefined, optionCount: number): value is number[] {
  return Array.isArray(value)
    && value.length === optionCount
    && new Set(value).size === optionCount
    && value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < optionCount);
}

export function validStudyAnswer(value: SubmittedStudyAnswer | undefined, question: Pick<GradableStudyQuestion, "questionType" | "optionCount">): boolean {
  if (question.questionType === "ordering") return validOrderingAnswer(value, question.optionCount);
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < question.optionCount;
}

export function isStudyAnswerCorrect(value: SubmittedStudyAnswer | undefined, question: GradableStudyQuestion): boolean {
  if (question.questionType === "multiple_choice") return validStudyAnswer(value, question) && value === question.correctOptionIndex;
  if (!validOrderingAnswer(value, question.optionCount)) return false;
  return question.correctOrder.length === value.length && value.every((entry, index) => entry === question.correctOrder[index]);
}
