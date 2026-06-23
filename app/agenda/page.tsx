import { getAgendaEvents, getAgendaRangeEvents } from "@/lib/agenda";
import { AgendaView } from "@/components/agenda/AgendaView";

// Agenda de eventos — lista por mês (mini cards com intervalo de datas) +
// visão de calendário do mês.
export default function AgendaPage() {
  const events = getAgendaEvents();
  const rangeEvents = getAgendaRangeEvents();
  return <AgendaView events={events} rangeEvents={rangeEvents} />;
}
