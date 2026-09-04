export type ChampionshipOperationalSnapshot = {
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  local: string;
};

export function buildChampionshipChangeNotice(before: ChampionshipOperationalSnapshot, after: ChampionshipOperationalSnapshot) {
  const scheduleChanged = before.dataInicio !== after.dataInicio || before.dataFim !== after.dataFim;
  const locationChanged = before.cidade !== after.cidade || before.estado !== after.estado || before.local !== after.local;
  if (!scheduleChanged && !locationChanged) return null;
  const parts = [];
  if (scheduleChanged) parts.push(`Nova data: ${after.dataInicio} a ${after.dataFim}.`);
  if (locationChanged) parts.push(`Novo local: ${after.local}, ${after.cidade} - ${after.estado}.`);
  return {
    kind: scheduleChanged ? "schedule" as const : "location" as const,
    title: scheduleChanged && locationChanged ? "Data e local atualizados" : scheduleChanged ? "Data do campeonato atualizada" : "Local do campeonato atualizado",
    message: parts.join(" "),
  };
}
