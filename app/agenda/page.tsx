import { getAgendaEvents, getAgendaRangeEvents } from "@/lib/agenda";
import { AgendaView } from "@/components/agenda/AgendaView";
import { createClient } from "@/lib/supabase/server";
import type { ChampionshipStatus } from "@/lib/types";

// Agenda de eventos — lista por mês (mini cards com intervalo de datas) +
// visão de calendário do mês.
export default async function AgendaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("championships")
    .select("id, nome, status, cidade, estado, data_inicio, data_fim")
    .neq("status", "rascunho")
    .order("data_inicio", { ascending: true });

  const source = (data ?? []).map((championship) => ({
    id: championship.id,
    nome: championship.nome,
    status: championship.status as ChampionshipStatus,
    cidade: championship.cidade,
    estado: championship.estado,
    dataInicio: championship.data_inicio,
    dataFim: championship.data_fim,
    href: `/campeonatos/${championship.id}`,
  }));
  const events = getAgendaEvents(source);
  const rangeEvents = getAgendaRangeEvents(source);
  return <AgendaView events={events} rangeEvents={rangeEvents} />;
}
