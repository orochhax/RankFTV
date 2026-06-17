// Motor de categoria balanceada do RankFTV.
// Recebe os ratings dos atletas e as categorias do campeonato,
// devolve qual categoria é a certa e se há risco de sandbagging.

export type Categoria = {
  id: string;
  nome: string;
  corte_rating_min: number;
  corte_rating_max: number;
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

  // Rating acima de todas → retorna a mais alta
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
  categoriaEscolhida: Categoria,
  categoriaRecomendada: Categoria | null
): StatusCategoria {
  if (!categoriaRecomendada) return "recomendada";
  if (detectarSandbagging(ratingDupla, categoriaEscolhida)) return "sandbagging";
  if (categoriaEscolhida.corte_rating_min > (categoriaRecomendada.corte_rating_max ?? 9999))
    return "acima_do_nivel";
  return "recomendada";
}
