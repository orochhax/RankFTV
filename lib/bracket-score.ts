export type BracketSetScore = { a: number; b: number };

export function validateBracketScore(
  setsA: number,
  setsB: number,
  setDetails: BracketSetScore[] | null,
): string | null {
  if (
    !Number.isInteger(setsA) || !Number.isInteger(setsB) ||
    setsA < 0 || setsB < 0 || setsA > 9 || setsB > 9
  ) {
    return "Informe um placar por sets entre 0 e 9.";
  }
  if (setsA === setsB) return "A partida precisa ter uma dupla vencedora.";

  const expectedSets = setsA + setsB;
  if (!setDetails || setDetails.length !== expectedSets) {
    return `Informe os pontos dos ${expectedSets} sets disputados.`;
  }

  let winsA = 0;
  let winsB = 0;
  for (let index = 0; index < setDetails.length; index += 1) {
    const set = setDetails[index];
    if (
      !Number.isInteger(set.a) || !Number.isInteger(set.b) ||
      set.a < 0 || set.b < 0 || set.a > 99 || set.b > 99
    ) {
      return `Informe pontos válidos no set ${index + 1}.`;
    }
    if (set.a === set.b) return `O set ${index + 1} não pode terminar empatado.`;
    if (set.a > set.b) winsA += 1;
    else winsB += 1;
  }

  if (winsA !== setsA || winsB !== setsB) {
    return `O placar por sets (${setsA} × ${setsB}) não corresponde aos pontos informados (${winsA} × ${winsB} em sets vencidos).`;
  }
  return null;
}
