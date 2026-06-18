export type QuizKey = "duplas" | "abrangencia" | "premiacao" | "nivel" | "circuito";
export type QuizAnswers = Record<QuizKey, 0 | 1 | 2 | 3>;
export type Tier = "local" | "open" | "elite";

export const QUIZ_QUESTIONS: {
  key: QuizKey;
  pergunta: string;
  opcoes: { valor: 0 | 1 | 2 | 3; label: string }[];
}[] = [
  {
    key: "duplas",
    pergunta: "Quantas duplas você espera inscrever?",
    opcoes: [
      { valor: 0, label: "Menos de 8 duplas" },
      { valor: 1, label: "De 8 a 16 duplas" },
      { valor: 2, label: "De 16 a 32 duplas" },
      { valor: 3, label: "Mais de 32 duplas" },
    ],
  },
  {
    key: "abrangencia",
    pergunta: "De onde você espera que venham os atletas?",
    opcoes: [
      { valor: 0, label: "Só da minha cidade" },
      { valor: 1, label: "De cidades próximas / região" },
      { valor: 2, label: "Do estado inteiro" },
      { valor: 3, label: "De outros estados também" },
    ],
  },
  {
    key: "premiacao",
    pergunta: "Qual a premiação para os vencedores?",
    opcoes: [
      { valor: 0, label: "Sem premiação" },
      { valor: 1, label: "Troféu ou medalha" },
      { valor: 2, label: "Dinheiro até R$ 1.000" },
      { valor: 3, label: "Dinheiro acima de R$ 1.000" },
    ],
  },
  {
    key: "nivel",
    pergunta: "Qual o nível médio dos atletas esperados?",
    opcoes: [
      { valor: 0, label: "Iniciantes / recreativos" },
      { valor: 1, label: "Intermediários" },
      { valor: 2, label: "Avançados — competem regularmente" },
      { valor: 3, label: "Alto nível — atletas de circuito" },
    ],
  },
  {
    key: "circuito",
    pergunta: "Esse campeonato faz parte de algum circuito ou liga?",
    opcoes: [
      { valor: 0, label: "Não, é um evento avulso" },
      { valor: 1, label: "Sim, circuito próprio" },
      { valor: 2, label: "Sim, circuito regional conhecido" },
      { valor: 3, label: "Sim, circuito estadual ou nacional" },
    ],
  },
];

const HIERARQUIA: Record<Tier, number> = { local: 0, open: 1, elite: 2 };

export function calcularTierDoQuiz(quiz: Partial<QuizAnswers> | null): Tier {
  if (!quiz) return "local";
  const total = (Object.values(quiz) as number[]).reduce((sum, v) => sum + (v ?? 0), 0);
  if (total >= 10) return "elite";
  if (total >= 5) return "open";
  return "local";
}

export function calcularTierEfetivo(quiz: Partial<QuizAnswers> | null, duplasPagas: number): Tier {
  const tierQuiz = calcularTierDoQuiz(quiz);
  let tierPorInscricoes: Tier = "local";
  if (duplasPagas >= 20) tierPorInscricoes = "elite";
  else if (duplasPagas >= 10) tierPorInscricoes = "open";
  return HIERARQUIA[tierQuiz] >= HIERARQUIA[tierPorInscricoes] ? tierQuiz : tierPorInscricoes;
}

export const TIER_LABEL: Record<Tier, string> = {
  local: "Local",
  open:  "Open",
  elite: "Elite",
};

export const TIER_STYLES: Record<Tier, string> = {
  local: "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
  open:  "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  elite: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
};
