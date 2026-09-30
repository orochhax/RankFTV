import { createHash } from "node:crypto";

export type ChampionshipOperationalSnapshot = {
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  local: string;
};

export function buildChampionshipChangeNotice(
  before: ChampionshipOperationalSnapshot,
  after: ChampionshipOperationalSnapshot,
  operationKey?: string,
) {
  const scheduleChanged = before.dataInicio !== after.dataInicio || before.dataFim !== after.dataFim;
  const locationChanged = before.cidade !== after.cidade || before.estado !== after.estado || before.local !== after.local;
  if (!scheduleChanged && !locationChanged) return null;
  const parts: string[] = [];
  if (scheduleChanged) {
    parts.push(`Data anterior: ${before.dataInicio} a ${before.dataFim}.`);
    parts.push(`Nova data: ${after.dataInicio} a ${after.dataFim}.`);
  }
  if (locationChanged) {
    parts.push(`Local anterior: ${before.local}, ${before.cidade} - ${before.estado}.`);
    parts.push(`Novo local: ${after.local}, ${after.cidade} - ${after.estado}.`);
  }
  const dedupeKey = createHash("sha256")
    .update(JSON.stringify({ before, after, operationKey }))
    .digest("hex");
  return {
    kind: scheduleChanged ? "schedule" as const : "location" as const,
    title: scheduleChanged && locationChanged ? "Data e local atualizados" : scheduleChanged ? "Data do campeonato atualizada" : "Local do campeonato atualizado",
    message: parts.join(" "),
    dedupeKey,
  };
}
