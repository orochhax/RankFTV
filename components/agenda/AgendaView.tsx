"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, List, MapPin } from "lucide-react";
import type { AgendaEvent, AgendaRangeEvent } from "@/lib/agenda";
import type { ChampionshipStatus } from "@/lib/types";

const WEEKDAYS_MIN = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Cor de cada status — a "bolinha" do evento e o bloco de data na lista.
const STATUS_STYLE: Record<ChampionshipStatus, { dot: string; block: string }> = {
  inscricoes_abertas: { dot: "bg-blue-500", block: "bg-blue-500 text-white" },
  em_andamento:       { dot: "bg-amber-500",   block: "bg-amber-500 text-white" },
  encerrado:          { dot: "bg-gray-400",    block: "bg-gray-200 text-gray-600" },
  rascunho:           { dot: "bg-gray-400",    block: "bg-gray-200 text-gray-600" },
};

// Cor do bloco de data por circuito (substitui o verde padrão de status).
const CIRCUITO_BLOCK: Record<string, string> = {
  "Brasil Open":                      "bg-gradient-to-b from-blue-600 via-yellow-400 to-blue-500 text-white",
  "Big WolfCup":                      "bg-gray-500 text-white",
  "TAFC":                             "bg-gray-900 text-white",
  "Circuito Brasileiro de Futevôlei": "bg-blue-700 text-white",
};

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// "2026-06-16" → "16/06". Intervalo vira "16/06 ~ 19/06" (ou só "16/06" se 1 dia).
function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function formatRange(inicio: string, fim: string): string {
  return inicio === fim ? ddmm(inicio) : `${ddmm(inicio)} ~ ${ddmm(fim)}`;
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

export function AgendaView({
  events,
  rangeEvents,
}: {
  events: AgendaEvent[];
  rangeEvents: AgendaRangeEvent[];
}) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [showFinished, setShowFinished] = useState(false);

  // Quantos eventos já finalizados existem (cada evento conta uma vez).
  const finishedCount = useMemo(
    () => rangeEvents.filter((e) => e.status === "encerrado").length,
    [rangeEvents],
  );

  // Por padrão escondemos os já finalizados; o botão revela.
  const visibleEvents = useMemo(
    () =>
      showFinished ? events : events.filter((e) => e.status !== "encerrado"),
    [events, showFinished],
  );

  const visibleRangeEvents = useMemo(
    () =>
      showFinished
        ? rangeEvents
        : rangeEvents.filter((e) => e.status !== "encerrado"),
    [rangeEvents, showFinished],
  );

  // Agrupa os eventos visíveis por dia uma vez só (visão calendário).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of visibleEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [visibleEvents]);

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Agenda</h1>
            <div className="flex rounded-full bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setView("lista")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "lista" ? "bg-white text-gray-900 shadow-sm" : "text-white/60 hover:text-white/80"
                }`}
              >
                <List className="size-4" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setView("calendario")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "calendario" ? "bg-white text-gray-900 shadow-sm" : "text-white/60 hover:text-white/80"
                }`}
              >
                <CalendarDays className="size-4" /> Calendário
              </button>
            </div>
          </div>

          {finishedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowFinished((v) => !v)}
              aria-pressed={showFinished}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                showFinished
                  ? "bg-white text-gray-900"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {showFinished ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {showFinished ? "Ocultar finalizados" : `Mostrar finalizados (${finishedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Seção branca com curva ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          {view === "lista" ? (
            <ListView events={visibleRangeEvents} />
          ) : (
            <CalendarView eventsByDate={eventsByDate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Visão LISTA ───────────────────────────
// Agrupada por mês. Dentro de cada mês, um mini card por evento com o nome do
// circuito e o intervalo de datas (ex.: "16/06 ~ 19/06").
function ListView({ events }: { events: AgendaRangeEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
        <p className="text-sm text-gray-500">Nenhum evento na agenda ainda.</p>
      </div>
    );
  }

  // Agrupa por mês (a partir da data de início), preservando a ordem cronológica.
  const meses: { key: string; label: string; eventos: AgendaRangeEvent[] }[] = [];
  for (const e of events) {
    const d = parseDate(e.dataInicio);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let grupo = meses.find((m) => m.key === key);
    if (!grupo) {
      grupo = { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, eventos: [] };
      meses.push(grupo);
    }
    grupo.eventos.push(e);
  }

  return (
    <div className="space-y-7">
      {meses.map((mes) => (
        <section key={mes.key}>
          <p className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {mes.label}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {mes.eventos.map((e) => (
              <MiniCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Mini card de um evento na lista por mês. Vira link só quando o evento tem
// página própria (href).
function MiniCard({ event }: { event: AgendaRangeEvent }) {
  const local = event.estado ? `${event.cidade} - ${event.estado}` : event.cidade;
  const acento = CIRCUITO_BLOCK[event.nome] ?? STATUS_STYLE[event.status].block;

  const inner = (
    <div className="flex items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-black/5">
      {/* Faixa colorida do circuito */}
      <span className={`w-1.5 shrink-0 rounded-full ${acento}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-gray-900">
          {event.nome}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <CalendarDays className="size-3.5 text-gray-400" />
          {formatRange(event.dataInicio, event.dataFim)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="size-3" />
          {local}
        </p>
      </div>
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className="block transition-shadow hover:shadow-sm">
        {inner}
      </Link>
    );
  }
  return inner;
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
