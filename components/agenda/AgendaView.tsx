"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, List, MapPin } from "lucide-react";
import type { AgendaEvent } from "@/lib/agenda";
import type { ChampionshipStatus } from "@/lib/mock/types";

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAYS_MIN = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTHS_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Cor de cada status — a "bolinha" do evento e o bloco de data na lista.
const STATUS_STYLE: Record<ChampionshipStatus, { dot: string; block: string }> = {
  inscricoes_abertas: { dot: "bg-emerald-500", block: "bg-emerald-500 text-white" },
  em_andamento:       { dot: "bg-amber-500",   block: "bg-amber-500 text-white" },
  encerrado:          { dot: "bg-gray-400",    block: "bg-gray-200 text-gray-600" },
  rascunho:           { dot: "bg-gray-400",    block: "bg-gray-200 text-gray-600" },
};

// Quando um dia tem eventos de status diferentes, a cor do bloco de data segue
// o mais "ativo" (em andamento > inscrições abertas > encerrado).
const STATUS_PRIORITY: Record<ChampionshipStatus, number> = {
  em_andamento: 0,
  inscricoes_abertas: 1,
  rascunho: 2,
  encerrado: 3,
};

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dominantStatus(events: AgendaEvent[]): ChampionshipStatus {
  return [...events].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  )[0].status;
}

// Chip de um evento — reaproveitado na lista e no painel do calendário.
// Eventos reais de circuitos externos não têm página própria, então o chip só
// vira link quando o evento traz um `href`.
function EventChip({ event }: { event: AgendaEvent }) {
  const local = event.estado ? `${event.cidade} - ${event.estado}` : event.cidade;
  const baseClass =
    "flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-black/5";

  const inner = (
    <>
      <span className={`size-2 shrink-0 rounded-full ${STATUS_STYLE[event.status].dot}`} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium leading-tight text-gray-900">
          {event.nome}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="size-3" />
          {local}
        </span>
      </span>
    </>
  );

  if (event.href) {
    return (
      <Link href={event.href} className={`${baseClass} transition-colors hover:bg-gray-100`}>
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}

export function AgendaView({ events }: { events: AgendaEvent[] }) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [showFinished, setShowFinished] = useState(false);

  // Quantos eventos já finalizados existem (conta cada evento uma vez, não por dia).
  const finishedCount = useMemo(() => {
    const ids = new Set<string>();
    for (const e of events) if (e.status === "encerrado") ids.add(e.id);
    return ids.size;
  }, [events]);

  // Por padrão escondemos os já finalizados; o botão revela.
  const visibleEvents = useMemo(
    () =>
      showFinished ? events : events.filter((e) => e.status !== "encerrado"),
    [events, showFinished],
  );

  // Agrupa os eventos visíveis por dia uma vez só.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of visibleEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [visibleEvents]);

  const sortedDates = useMemo(
    () => [...eventsByDate.keys()].sort(),
    [eventsByDate],
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho: título, seletor de visão e o botão de finalizados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agenda</h1>
          <div className="flex rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setView("lista")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "lista" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              <List className="size-4" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setView("calendario")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "calendario" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              <CalendarDays className="size-4" /> Calendário
            </button>
          </div>
        </div>

        {/* Só aparece quando há eventos já finalizados pra revelar */}
        {finishedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowFinished((v) => !v)}
            aria-pressed={showFinished}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              showFinished
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {showFinished ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {showFinished
              ? "Ocultar finalizados"
              : `Mostrar finalizados (${finishedCount})`}
          </button>
        )}
      </div>

      {view === "lista" ? (
        <ListView sortedDates={sortedDates} eventsByDate={eventsByDate} />
      ) : (
        <CalendarView eventsByDate={eventsByDate} />
      )}
    </div>
  );
}

// ─────────────────────────── Visão LISTA ───────────────────────────
// Só mostra os dias que têm evento. Dia sem nada não aparece.
function ListView({
  sortedDates,
  eventsByDate,
}: {
  sortedDates: string[];
  eventsByDate: Map<string, AgendaEvent[]>;
}) {
  if (sortedDates.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
        <p className="text-sm text-gray-500">Nenhum evento na agenda ainda.</p>
      </div>
    );
  }

  let lastMonthKey = "";

  return (
    <div className="space-y-3">
      {sortedDates.map((iso) => {
        const date = parseDate(iso);
        const dayEvents = eventsByDate.get(iso)!;
        const status = dominantStatus(dayEvents);

        // Separador de mês quando vira o mês.
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const showMonth = monthKey !== lastMonthKey;
        lastMonthKey = monthKey;

        return (
          <div key={iso}>
            {showMonth && (
              <p className="mb-2 mt-4 px-1 text-xs font-semibold uppercase tracking-widest text-gray-400 first:mt-0">
                {MONTHS[date.getMonth()]} {date.getFullYear()}
              </p>
            )}
            <div className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              {/* Bloco de data */}
              <div
                className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center ${STATUS_STYLE[status].block}`}
              >
                <span className="text-[10px] font-semibold uppercase">
                  {WEEKDAYS_SHORT[date.getDay()]}
                </span>
                <span className="text-2xl font-bold leading-none">{date.getDate()}</span>
                <span className="text-[10px] font-medium uppercase">
                  {MONTHS_ABREV[date.getMonth()]}
                </span>
              </div>

              {/* Eventos do dia, lado a lado */}
              <div className="flex flex-1 flex-wrap content-center items-center gap-2">
                {dayEvents.map((e) => (
                  <EventChip key={e.id} event={e} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Visão CALENDÁRIO ───────────────────────────
// Mês completo (todos os dias). Clicar num dia com evento mostra os eventos
// daquele dia logo abaixo.
function CalendarView({
  eventsByDate,
}: {
  eventsByDate: Map<string, AgendaEvent[]>;
}) {
  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(
    eventsByDate.has(todayISO) ? todayISO : null,
  );

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  // Células: brancos antes do dia 1 + os dias do mês.
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goPrev() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  }
  function goNext() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  }
  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    if (eventsByDate.has(todayISO)) setSelected(todayISO);
  }

  const selectedEvents = selected ? eventsByDate.get(selected) : undefined;

  return (
    <div className="space-y-4">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            {MONTHS[cursor.month]} {cursor.year}
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Hoje
          </button>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Grade do mês */}
      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
          {WEEKDAYS_MIN.map((w, i) => (
            <div key={i} className="py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />;

            const iso = toISO(cursor.year, cursor.month, day);
            const dayEvents = eventsByDate.get(iso);
            const hasEvents = !!dayEvents?.length;
            const isToday = iso === todayISO;
            const isSelected = iso === selected;

            return (
              <button
                key={iso}
                type="button"
                disabled={!hasEvents}
                onClick={() => setSelected(iso)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : hasEvents
                      ? "bg-blue-50 text-gray-900 hover:bg-blue-100"
                      : "text-gray-400"
                } ${isToday && !isSelected ? "ring-1 ring-blue-400" : ""}`}
              >
                <span className={isToday ? "font-bold" : ""}>{day}</span>
                {hasEvents && (
                  <span className="flex gap-0.5">
                    {dayEvents!.slice(0, 3).map((e, idx) => (
                      <span
                        key={idx}
                        className={`size-1.5 rounded-full ${
                          isSelected ? "bg-white" : STATUS_STYLE[e.status].dot
                        }`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia selecionado */}
      {selectedEvents && selectedEvents.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {parseDate(selected!).getDate()} de {MONTHS[parseDate(selected!).getMonth()]}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedEvents.map((e) => (
              <EventChip key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
