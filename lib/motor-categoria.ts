// Motor de categoria balanceada do RankFTV.
// Recebe os ratings dos atletas e as categorias do campeonato,
// devolve qual categoria é a certa e se há risco de sandbagging.

import type { Genero, GeneroCategoria } from "@/lib/types";

// ── Questionário de nível ─────────────────────────────────────────────────────

export type RespostasQuestionario = {
  tempo:            "menos_1" | "1_3" | "3_6" | "mais_6";
  nivel:            "recreativo" | "amador" | "competitivo" | "alto_nivel";
  frequencia:       "1x" | "2_3x" | "4_5x" | "todo_dia";
  melhor_resultado: "nunca" | "sem_podio" | "top4" | "campeao";
  categoria_usual:  "nunca" | "D" | "C" | "B" | "A_elite";
};

const PESOS: Record<keyof RespostasQuestionario, Record<string, number>> = {
  tempo:            { menos_1: 0, "1_3": 200, "3_6": 450, mais_6: 700 },
  nivel:            { recreativo: 0, amador: 200, competitivo: 450, alto_nivel: 700 },
  frequencia:       { "1x": 0, "2_3x": 100, "4_5x": 200, todo_dia: 300 },
  melhor_resultado: { nunca: 0, sem_podio: 150, top4: 350, campeao: 600 },
  categoria_usual:  { nunca: 0, D: 50, C: 200, B: 350, A_elite: 500 },
};

// Perguntas + opções pro formulário do atleta (/perfil/questionario-nivel).
// As `key`/`valor` batem exatamente com RespostasQuestionario e PESOS acima.
export const PERGUNTAS_NIVEL: {
  key: keyof RespostasQuestionario;
  pergunta: string;
  opcoes: { valor: string; label: string }[];
}[] = [
  {
    key: "tempo",
    pergunta: "Há quanto tempo você joga futevôlei?",
    opcoes: [
      { valor: "menos_1", label: "Menos de 1 ano" },
      { valor: "1_3",     label: "De 1 a 3 anos" },
      { valor: "3_6",     label: "De 3 a 6 anos" },
      { valor: "mais_6",  label: "Mais de 6 anos" },
    ],
  },
  {
    key: "nivel",
    pergunta: "Como você classificaria seu nível de jogo?",
    opcoes: [
      { valor: "recreativo",  label: "Recreativo" },
      { valor: "amador",      label: "Amador" },
      { valor: "competitivo", label: "Competitivo" },
      { valor: "alto_nivel",  label: "Alto nível" },
    ],
  },
  {
    key: "frequencia",
    pergunta: "Com que frequência você joga?",
    opcoes: [
      { valor: "1x",       label: "1x por semana" },
      { valor: "2_3x",     label: "2 a 3x por semana" },
      { valor: "4_5x",     label: "4 a 5x por semana" },
      { valor: "todo_dia", label: "Praticamente todo dia" },
    ],
  },
  {
    key: "melhor_resultado",
    pergunta: "Qual seu melhor resultado em campeonatos?",
    opcoes: [
      { valor: "nunca",     label: "Nunca joguei um campeonato" },
      { valor: "sem_podio", label: "Já joguei, sem pódio" },
      { valor: "top4",      label: "Já fiquei entre os 4 primeiros" },
      { valor: "campeao",   label: "Já fui campeão" },
    ],
  },
  {
    key: "categoria_usual",
    pergunta: "Qual categoria você costuma jogar?",
    opcoes: [
      { valor: "nunca",   label: "Nunca joguei categoria" },
      { valor: "D",       label: "Categoria D" },
      { valor: "C",       label: "Categoria C" },
      { valor: "B",       label: "Categoria B" },
      { valor: "A_elite", label: "Categoria A / Elite" },
    ],
  },
];

export function calcularRatingQuestionario(r: RespostasQuestionario): number {
  const soma =
    (PESOS.tempo[r.tempo]                       ?? 0) +
    (PESOS.nivel[r.nivel]                       ?? 0) +
    (PESOS.frequencia[r.frequencia]             ?? 0) +
    (PESOS.melhor_resultado[r.melhor_resultado] ?? 0) +
    (PESOS.categoria_usual[r.categoria_usual]   ?? 0);
  return 100 + soma; // mínimo 100, máximo ~2900
}

export type Categoria = {
  id: string;
  nome: string;
  corte_rating_min: number;
  corte_rating_max: number;
  genero?: GeneroCategoria;
};

/**
 * Filtra as categorias elegíveis para o gênero do atleta.
 * Categorias do mesmo gênero + categorias mistas (abertas a todos).
 * Se o gênero não for informado, devolve todas.
 */
export function categoriasDoGenero(
  categorias: Categoria[],
  genero: Genero | null | undefined
): Categoria[] {
  if (!genero || genero === "outro") return categorias;
  return categorias.filter((c) => c.genero === genero || c.genero === "mista");
}

/**
 * Faixas de rating por nome de categoria predefinido.
 * O organizador escolhe o nome — o sistema aplica os cortes automaticamente.
 */
export const RATING_POR_CATEGORIA: Record<string, { min: number; max: number }> = {
  Aprendiz:       { min: 100,  max: 399  },
  Iniciante:      { min: 400,  max: 749  },
  Intermediário:  { min: 750,  max: 1149 },
  Amador:         { min: 1150, max: 1549 },
  Qualify:        { min: 1550, max: 1949 },
  Profissional:   { min: 1950, max: 2900 },
};

/** Rating combinado de uma dupla (média simples). */
export function calcularRatingDupla(
  rating1: number,
  rating2: number | null
): number {
  if (!rating2) return rating1;
  return Math.round((rating1 + rating2) / 2);
}

/**
 * Categoria recomendada para o rating da dupla.
 * O gênero SEMPRE prevalece: filtra primeiro pelas categorias do gênero
 * do atleta (+ mistas) e só então escolhe pela faixa de rating.
 * Retorna a categoria cujo intervalo contém o rating,
 * ou a mais baixa/alta se o rating ficar fora de todas.
 */
export function recomendarCategoria(
  ratingDupla: number,
  categorias: Categoria[],
  genero?: Genero | null
): Categoria | null {
  const elegiveis = categoriasDoGenero(categorias, genero);
  if (!elegiveis.length) return null;

  // Ordena do menor pro maior corte mínimo
  const ordenadas = [...elegiveis].sort(
    (a, b) => a.corte_rating_min - b.corte_rating_min
  );

  // Busca a categoria cujo intervalo contém o rating
  const match = ordenadas.find(
    (c) => ratingDupla >= c.corte_rating_min && ratingDupla <= c.corte_rating_max
  );
  if (match) return match;

  // Rating abaixo de todas → a mais baixa disponível
  if (ratingDupla < ordenadas[0].corte_rating_min) return ordenadas[0];

  // Rating acima de todas → a mais alta
  return ordenadas[ordenadas.length - 1];
}

/**
 * Detecta sandbagging: atleta tentando se inscrever numa categoria
 * significativamente abaixo do seu rating recomendado.
 *
 * Considera sandbagging quando a categoria escolhida tem corte máximo
 * pelo menos 300 pontos abaixo do rating da dupla.
 */
export function detectarSandbagging(
  ratingDupla: number,
  categoriaSelecionada: Categoria
): boolean {
  return ratingDupla > categoriaSelecionada.corte_rating_max + 300;
}

/** Rótulo legível para o resultado da comparação. */
export type StatusCategoria =
  | "recomendada"
  | "acima_do_nivel"
  | "sandbagging";

export function statusCategoria(
  ratingDupla: number,
  categoriaEscolhida: Categoria
): StatusCategoria {
  // Bem acima do teto da categoria → sandbagging
  if (detectarSandbagging(ratingDupla, categoriaEscolhida)) return "sandbagging";
  // Abaixo do piso da categoria escolhida → categoria acima do nível do atleta
  if (ratingDupla < categoriaEscolhida.corte_rating_min) return "acima_do_nivel";
  return "recomendada";
}
