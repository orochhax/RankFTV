import { getAgendaEvents } from "@/lib/agenda";
import { AgendaView } from "@/components/agenda/AgendaView";

// Agenda de eventos — lista (só dias com algo) + visão de calendário do mês.
export default function AgendaPage() {
  const events = getAgendaEvents();
  return <AgendaView events={events} />;
}
