// Elo adaptado para duplas de futevôlei.
// K=32 é padrão para esportes com volume moderado de partidas.
const K = 32;
export const DEFAULT_RATING = 1000; // rating inicial quando profiles.rating = 0

function elo(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

export type EloResult = {
  atleta1Winner: number;
  atleta2Winner: number;
  atleta1Loser: number;
  atleta2Loser: number;
};

/**
 * Calcula os novos ratings para os 4 atletas de um confronto de duplas.
 * Retorna os deltas (pode ser negativo para os perdedores).
 */
export function calcElo(
  r1w: number, // rating atleta 1 da dupla vencedora
  r2w: number, // rating atleta 2 da dupla vencedora (0 se solo/BYE)
  r1l: number, // rating atleta 1 da dupla perdedora
  r2l: number, // rating atleta 2 da dupla perdedora (0 se solo/BYE)
): EloResult {
  const rw = r1w || DEFAULT_RATING;
  const rl = r1l || DEFAULT_RATING;

  // Usa média do time (ou o único atleta se r2 = 0)
  const avgW = r2w ? (rw + (r2w || DEFAULT_RATING)) / 2 : rw;
  const avgL = r2l ? (rl + (r2l || DEFAULT_RATING)) / 2 : rl;

  const ew = elo(avgW, avgL); // probabilidade esperada de vitória do time W
  const el = 1 - ew;

  const deltaW = Math.round(K * (1 - ew)); // ganho dos vencedores
  const deltaL = Math.round(K * (0 - el)); // perda dos perdedores (negativo)

  return {
    atleta1Winner: deltaW,
    atleta2Winner: deltaW,
    atleta1Loser:  deltaL,
    atleta2Loser:  deltaL,
  };
}
