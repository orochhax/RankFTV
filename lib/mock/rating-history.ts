// Histórico de rating fictício, só pra desenhar o gráfico de evolução do
// perfil (ftv.md seção 8.5). O RatingHistory de verdade só existe a partir da
// Fase 2, quando os jogos passam a atualizar o rating de cada atleta.
export type RatingPoint = { mes: string; rating: number };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
const DELTAS_ATE_HOJE = [-180, -140, -95, -55, -20, 0];

export function fakeRatingHistory(currentRating: number): RatingPoint[] {
  return DELTAS_ATE_HOJE.map((delta, i) => ({
    mes: MESES[i],
    rating: currentRating + delta,
  }));
}
