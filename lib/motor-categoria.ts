// Motor de categoria balanceada do RankFTV.
// Recebe os ratings dos atletas e as categorias do campeonato,
// devolve qual categoria é a certa e se há risco de sandbagging.

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
};

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
 * Retorna a categoria cujo intervalo contém o rating,
 * ou a mais alta se o rating ultrapassar todas.
 */
export function recomendarCategoria(
  ratingDupla: number,
  categorias: Categoria[]
): Categoria | null {
  if (!categorias.length) return null;

  // Ordena do menor pro maior corte mínimo
  const ordenadas = [...categorias].sort(
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
