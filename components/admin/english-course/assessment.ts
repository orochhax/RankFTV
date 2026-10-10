import type { LearnerId } from "./roadmap";

export type AssessmentAnswer = "A" | "B" | "C" | "D" | "NS";

export type AssessmentQuestion = {
  id: string;
  section: string;
  prompt: string;
  options: Array<{ id: Exclude<AssessmentAnswer, "NS">; label: string }>;
  correct: Exclude<AssessmentAnswer, "NS">;
};

const optionIds = ["A", "B", "C", "D"] as const;
const questionForSection = (section: string) => (
  id: string,
  prompt: string,
  labels: string[],
  correct: "A" | "B" | "C" | "D",
): AssessmentQuestion => ({ id, section, prompt, options: optionIds.map((optionId, index) => ({ id: optionId, label: labels[index] })), correct });

const baseQuestion = questionForSection("Base e vocabulário");
const dailyQuestion = questionForSection("Situações do dia a dia");
const advancedQuestion = questionForSection("Intermediário e avançado");

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  baseQuestion("q1", "‘Good morning’ é usado principalmente:", ["À noite", "Pela manhã", "Para se despedir", "Para pedir desculpas"], "B"),
  baseQuestion("q2", "Complete: My name ___ Carlos.", ["am", "are", "is", "be"], "C"),
  baseQuestion("q3", "Complete: Julia and I ___ from Brazil.", ["am", "are", "is", "has"], "B"),
  baseQuestion("q4", "Qual alternativa significa ‘Eu tenho vinte anos’ ?", ["I am twenty years old.", "I have twenty years.", "I is twenty.", "I has twenty years old."], "A"),
  baseQuestion("q5", "O plural correto de child é:", ["childs", "children", "childes", "childrens"], "B"),
  baseQuestion("q6", "Complete: She ___ coffee every morning.", ["drink", "drinks", "drinking", "drank"], "B"),
  baseQuestion("q7", "Transforme em pergunta: You live in Salvador.", ["Live you in Salvador?", "Are you live in Salvador?", "Do you live in Salvador?", "Does you live in Salvador?"], "C"),
  baseQuestion("q8", "Complete: There ___ two books on the table.", ["is", "are", "am", "be"], "B"),
  dailyQuestion("q9", "No restaurante, a maneira mais natural de pedir água é:", ["Give water.", "I water.", "Could I have some water, please?", "Water is mine."], "C"),
  dailyQuestion("q10", "Complete: I can’t talk now. I ___ dinner.", ["cook", "cooked", "am cooking", "have cook"], "C"),
  dailyQuestion("q11", "Complete: We ___ to Madrid last year.", ["go", "went", "gone", "going"], "B"),
  dailyQuestion("q12", "Complete: I have lived here ___ 2024.", ["for", "since", "during", "from"], "B"),
  dailyQuestion("q13", "Complete: If it rains tomorrow, we ___ at home.", ["stayed", "stay", "will stay", "would stayed"], "C"),
  dailyQuestion("q14", "I used to work at night indica que a pessoa:", ["Ainda trabalha à noite todos os dias.", "Trabalhava à noite no passado, mas isso mudou.", "Vai começar a trabalhar à noite.", "Nunca trabalhou à noite."], "B"),
  dailyQuestion("q15", "Escolha a frase correta:", ["She has never been to Portugal.", "She never has be to Portugal.", "She has never went to Portugal.", "She never been in Portugal."], "A"),
  dailyQuestion("q16", "Complete: This course is ___ than the previous one.", ["more useful", "usefuller", "most useful", "more use"], "A"),
  advancedQuestion("q17", "Complete: By the time we arrived, the class ___ .", ["started", "has started", "had started", "was start"], "C"),
  advancedQuestion("q18", "Qual frase é mais adequada em um e-mail profissional?", ["Send me the file now.", "I want that file.", "Could you please send me the updated file?", "You forgot my file."], "C"),
  advancedQuestion("q19", "Complete: If I ___ more time, I would study another language.", ["have", "had", "will have", "would have"], "B"),
  advancedQuestion("q20", "Complete: The report ___ by Friday.", ["must finish", "must be finished", "must finished", "must be finish"], "B"),
  advancedQuestion("q21", "Although the job was demanding, she enjoyed it significa:", ["Ela gostou porque era fácil.", "Ela não aceitou o trabalho.", "Apesar de exigente, ela gostou do trabalho.", "O trabalho deixou de ser exigente."], "C"),
  advancedQuestion("q22", "Complete: I wish I ___ more confident when speaking English.", ["am", "were", "will be", "have been"], "B"),
  advancedQuestion("q23", "The meeting was called off significa:", ["A reunião foi adiantada.", "A reunião foi cancelada.", "A reunião foi gravada.", "A reunião foi longa."], "B"),
  advancedQuestion("q24", "Complete: Not only ___ the project on time, but she also improved its quality.", ["she completed", "did she complete", "she did complete", "completed she"], "B"),
];

export type AssessmentAnswers = Record<LearnerId, Record<string, AssessmentAnswer>>;

export const CARLOS_INITIAL_ANSWERS: Record<string, AssessmentAnswer> = {
  q1: "B", q2: "A", q3: "B", q4: "C", q5: "A", q6: "B", q7: "A", q8: "C",
  q9: "NS", q10: "A", q11: "A", q12: "NS", q13: "C", q14: "NS", q15: "NS",
  q16: "NS", q17: "NS", q18: "NS", q19: "NS", q20: "NS", q21: "NS", q22: "NS", q23: "NS", q24: "NS",
};

export const JULIA_INITIAL_ANSWERS: Record<string, AssessmentAnswer> = {
  q1: "B", q2: "C", q3: "A", q4: "A", q5: "B", q6: "B", q7: "C", q8: "B",
  q9: "C", q10: "C", q11: "NS", q12: "B", q13: "C", q14: "C", q15: "NS",
  q16: "NS", q17: "NS", q18: "NS", q19: "NS", q20: "NS", q21: "NS", q22: "NS", q23: "NS", q24: "NS",
};

export const EMPTY_ASSESSMENT_ANSWERS: AssessmentAnswers = {
  carlos: CARLOS_INITIAL_ANSWERS,
  julia: JULIA_INITIAL_ANSWERS,
};
