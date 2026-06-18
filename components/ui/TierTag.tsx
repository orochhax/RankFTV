import {
  calcularTierDoQuiz,
  calcularTierEfetivo,
  TIER_LABEL,
  TIER_STYLES,
  type QuizAnswers,
} from "@/lib/tier";

type Props = {
  quiz: Partial<QuizAnswers> | null;
  duplasPagas?: number;
};

export function TierTag({ quiz, duplasPagas = 0 }: Props) {
  const tier = calcularTierEfetivo(quiz, duplasPagas);
  const tierSemInscricoes = calcularTierDoQuiz(quiz);
  const bumped = tier !== tierSemInscricoes;

  return (
    <span
      title={
        bumped
          ? `Nível promovido pelas inscrições — ${duplasPagas} duplas pagas`
          : "Calculado com base nas respostas do questionário"
      }
      className={`inline-flex cursor-default items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${TIER_STYLES[tier]}`}
    >
      {TIER_LABEL[tier]}
      {bumped && <span className="opacity-60">↑</span>}
    </span>
  );
}
