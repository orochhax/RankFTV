"use server";

import { confirmarPresenca, type PresencaResult } from "@/app/arena/actions";

export type PresencaState = PresencaResult;

// Marca presença na aula de HOJE. Delega pra confirmarPresenca, que valida
// aluno ativo, horário, vagas e o limite semanal do plano — regra única
// pros dois fluxos (página do aluno e página pública da arena).
export async function marcarPresenca(
  classId: string,
  arenaId: string,
): Promise<PresencaState> {
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  return confirmarPresenca(arenaId, classId, hoje);
}
