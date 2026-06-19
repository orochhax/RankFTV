import { REAL_EVENTS } from "@/lib/mock/agenda-events";
import type { ChampionshipStatus } from "@/lib/types";

// Um "evento" da agenda é um circuito em UM dia específico. Um evento de vários
// dias vira vários eventos (um por dia que ele ocupa) — assim ele aparece em
// todos os dias dele, tanto na lista quanto no calendário.
export type AgendaEvent = {
  id: string;
  nome: string;
  status: ChampionshipStatus;
  cidade: string;
  estado: string;
  date: string; // "YYYY-MM-DD"
  href?: string; // link opcional (eventos reais externos não têm página)
};

// Enumera todos os dias entre início e fim (inclusive), em "YYYY-MM-DD".
function eachDay(startISO: string, endISO: string): string[] {
  const [ys, ms, ds] = startISO.split("-").map(Number);
  const [ye, me, de] = endISO.split("-").map(Number);
  const cur = new Date(ys, ms - 1, ds);
  const end = new Date(ye, me - 1, de);
  const days: string[] = [];
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Cor do evento na agenda conforme a data: futuro = "vem aí" (verde), rolando
// agora = amarelo, já passou = cinza. Reaproveita as cores de status existentes.
function statusByDate(inicio: string, fim: string): ChampionshipStatus {
  const hoje = todayISO();
  if (fim < hoje) return "encerrado";
  if (inicio > hoje) return "inscricoes_abertas";
  return "em_andamento";
}

// Fonte da agenda: o calendário real da temporada (lib/mock/agenda-events.ts).
export function getAgendaEvents(): AgendaEvent[] {
  const events: AgendaEvent[] = [];
  for (const e of REAL_EVENTS) {
    const status = statusByDate(e.dataInicio, e.dataFim);
    for (const date of eachDay(e.dataInicio, e.dataFim)) {
      events.push({
        id: e.id,
        nome: e.circuito,
        status,
        cidade: e.cidade,
        estado: e.estado,
        date,
      });
    }
  }
  return events;
}
