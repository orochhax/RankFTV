import { getAgendaEvents } from "@/lib/agenda";
import { AgendaView } from "@/components/agenda/AgendaView";

// Agenda de eventos — lista (só dias com algo) + visão de calendário do mês.
export default function AgendaPage() {
  const events = getAgendaEvents();
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <AgendaView events={events} />
    </div>
  );
}
