"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, Filter, CalendarRange, X, Clock, Users, Inbox,
} from "lucide-react";
import {
  addDaysISO, addMonthsISO, addYearsISO, dowOfISO, monthMatrixISO,
  weekLabel, monthLabel, dayLabel, DIAS_SEMANA_CURTO, MESES_PT_ABREV,
  NIVEL_LABEL, NIVEL_FILTRO_OPCOES,
  type ClassOccurrence, type NivelFiltro,
} from "@/lib/arena-dates";
import type { ArenaAgendaView } from "@/app/arena/[handle]/agenda/page";

export type AgendaOccurrence = ClassOccurrence & { confirmados: number | null };

const NIVEL_COR: Record<string, string> = {
  iniciante: "bg-emerald-500",
  intermediario: "bg-blue-500",
  avancado: "bg-purple-500",
};
const NIVEL_COR_DEFAULT = "bg-gray-400";

function corDoNivel(nivel: string | null): string {
  return nivel ? NIVEL_COR[nivel] ?? NIVEL_COR_DEFAULT : NIVEL_COR_DEFAULT;
}

function buildHref(handle: string, view: ArenaAgendaView, data: string, nivel: NivelFiltro): string {
  const params = new URLSearchParams({ view, data });
  if (nivel !== "todos") params.set("nivel", nivel);
  return `/arena/${handle}/agenda?${params.toString()}`;
}

export function ArenaAgendaClient({
  handle,
  view,
  anchorDate,
  nivelFiltro,
  todayISO,
  occurrences,
  monthMatrix,
  hasClasses,
}: {
  handle: string;
  view: ArenaAgendaView;
  anchorDate: string;
  nivelFiltro: NivelFiltro;
  todayISO: string;
  occurrences: AgendaOccurrence[];
  monthMatrix: string[][] | null;
  hasClasses: boolean;
}) {
  const router = useRouter();
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  function go(nextView: ArenaAgendaView, nextData: string, nextNivel: NivelFiltro = nivelFiltro) {
    router.push(buildHref(handle, nextView, nextData, nextNivel));
  }

  function navigate(dir: -1 | 1) {
    if (view === "dia") return go(view, addDaysISO(anchorDate, dir));
    if (view === "semana") return go(view, addDaysISO(anchorDate, dir * 7));
    if (view === "mes") return go(view, addMonthsISO(anchorDate, dir));
    return go(view, addYearsISO(anchorDate, dir));
  }

  const occByDate = useMemo(() => {
    const map = new Map<string, AgendaOccurrence[]>();
    for (const o of occurrences) {
      const list = map.get(o.date) ?? [];
      list.push(o);
      map.set(o.date, list);
    }
    return map;
  }, [occurrences]);

  const titulo =
    view === "dia" ? dayLabel(anchorDate) :
    view === "semana" ? weekLabel(anchorDate) :
    view === "mes" ? monthLabel(anchorDate) :
    anchorDate.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-6">
      {/* ── Barra de controle: desktop ── */}
      <div className="mb-4 hidden flex-wrap items-center justify-between gap-3 md:flex">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {(["ano", "mes", "semana", "dia"] as ArenaAgendaView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => go(v, anchorDate)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Período anterior"
              className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Próximo período"
              className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(view, todayISO)}
              className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Hoje
            </button>
          </div>
          <h2 className="text-base font-bold capitalize text-gray-900">{titulo}</h2>
        </div>

        <div className="flex items-center gap-2">
          <NivelSelect
            value={nivelFiltro}
            onChange={(n) => go(view, anchorDate, n)}
          />
          <Link
            href={`/arena/${handle}/aulas#nova-aula`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="size-4" /> Nova aula
          </Link>
        </div>
      </div>

      {/* ── Barra de controle: mobile ── */}
      <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Período anterior"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="min-w-0 truncate text-sm font-bold capitalize text-gray-900">{titulo}</h2>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Próximo período"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(view, todayISO)}
            className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-gray-600"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Filtrar por categoria"
            className={`flex size-11 items-center justify-center rounded-xl ${nivelFiltro !== "todos" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <Filter className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setViewSheetOpen(true)}
            aria-label="Escolher visualização do calendário"
            className="flex size-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
          >
            <CalendarRange className="size-5" />
          </button>
        </div>
      </div>

      {!hasClasses ? (
        <EmptyState handle={handle} />
      ) : (
        <>
          {/* ── Desktop ── */}
          <div className="hidden md:block">
            {view === "semana" && (
              <WeekGrid anchorDate={anchorDate} todayISO={todayISO} occByDate={occByDate} handle={handle} />
            )}
            {view === "dia" && (
              <DayGrid date={anchorDate} todayISO={todayISO} occurrences={occByDate.get(anchorDate) ?? []} handle={handle} />
            )}
            {view === "mes" && monthMatrix && (
              <MonthGrid
                monthMatrix={monthMatrix}
                anchorDate={anchorDate}
                todayISO={todayISO}
                occByDate={occByDate}
                onSelectDate={(d) => go("dia", d)}
              />
            )}
            {view === "ano" && (
              <YearGrid anchorDate={anchorDate} todayISO={todayISO} occByDate={occByDate} onSelectDate={(d) => go("dia", d)} />
            )}
          </div>

          {/* ── Mobile ── */}
          <div className="md:hidden">
            {(view === "semana" || view === "dia") && (
              <MobileDayAgenda
                view={view}
                anchorDate={anchorDate}
                todayISO={todayISO}
                occByDate={occByDate}
                handle={handle}
                onSelectDay={(d) => go(view, d)}
              />
            )}
            {view === "mes" && monthMatrix && (
              <CompactMonth
                monthMatrix={monthMatrix}
                anchorDate={anchorDate}
                todayISO={todayISO}
                occByDate={occByDate}
                onSelectDate={(d) => go("dia", d)}
              />
            )}
            {view === "ano" && (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 12 }, (_, i) => {
                  const monthAnchor = `${anchorDate.slice(0, 4)}-${String(i + 1).padStart(2, "0")}-01`;
                  return (
                    <MiniMonth
                      key={i}
                      monthAnchor={monthAnchor}
                      todayISO={todayISO}
                      occByDate={occByDate}
                      onSelectDate={(d) => go("dia", d)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Bottom sheet: visualização (mobile) ── */}
      {viewSheetOpen && (
        <BottomSheet title="Visualização" onClose={() => setViewSheetOpen(false)}>
          {(["ano", "mes", "semana", "dia"] as ArenaAgendaView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { setViewSheetOpen(false); go(v, anchorDate); }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-medium capitalize ${
                view === v ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {v}
            </button>
          ))}
        </BottomSheet>
      )}

      {/* ── Bottom sheet: filtro de categoria (mobile) ── */}
      {filterSheetOpen && (
        <BottomSheet title="Categoria / nível" onClose={() => setFilterSheetOpen(false)}>
          {NIVEL_FILTRO_OPCOES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { setFilterSheetOpen(false); go(view, anchorDate, o.value); }}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-medium ${
                nivelFiltro === o.value ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </BottomSheet>
      )}

      {/* Botão flutuante — nova aula (mobile) */}
      <Link
        href={`/arena/${handle}/aulas#nova-aula`}
        aria-label="Nova aula"
        className="fixed bottom-[max(env(safe-area-inset-bottom),16px)] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 md:hidden"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function NivelSelect({ value, onChange }: { value: NivelFiltro; onChange: (v: NivelFiltro) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as NivelFiltro)}
      aria-label="Filtrar por categoria/nível"
      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {NIVEL_FILTRO_OPCOES.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function EmptyState({ handle }: { handle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-12 text-center ring-1 ring-black/5">
      <Inbox className="size-10 text-gray-200" />
      <p className="font-semibold text-gray-700">Nenhuma aula cadastrada ainda</p>
      <p className="max-w-xs text-sm text-gray-400">
        Cadastre as aulas e horários recorrentes da arena pra elas aparecerem aqui na agenda.
      </p>
      <Link
        href={`/arena/${handle}/aulas#nova-aula`}
        className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus className="size-4" /> Cadastrar primeira aula
      </Link>
    </div>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white pb-[max(env(safe-area-inset-bottom),16px)] shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-2">{children}</div>
      </div>
    </div>
  );
}

// ── Chip de evento (usado nas listas mobile e no grid mensal/anual) ────────

function OccurrenceCard({ occ, handle }: { occ: AgendaOccurrence; handle: string }) {
  const nivelLabel = occ.nivel ? NIVEL_LABEL[occ.nivel] ?? occ.nivel : "Todos os níveis";
  const temLimite = occ.maxAlunos != null;
  const confirmados = occ.confirmados ?? 0;
  const lotada = temLimite && occ.confirmados != null && confirmados >= (occ.maxAlunos as number);

  return (
    <Link
      href={`/arena/${handle}/aula/${occ.classId}?data=${occ.date}`}
      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/5 transition-colors hover:ring-blue-300"
    >
      <span className={`h-10 w-1 shrink-0 rounded-full ${corDoNivel(occ.nivel)}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
          <Clock className="size-3.5" />
          {occ.horaInicio ?? "—"}{occ.horaFim && `–${occ.horaFim}`}
        </div>
        <p className="truncate text-sm font-semibold text-gray-900">{occ.titulo}</p>
        <p className="text-xs text-gray-400">{nivelLabel}</p>
      </div>
      {occ.confirmados != null && (
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${lotada ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}>
          <Users className="size-3" />
          {temLimite ? `${confirmados}/${occ.maxAlunos}` : confirmados}
        </span>
      )}
    </Link>
  );
}

// ── Mobile: faixa semanal (seg-dom) + lista do dia selecionado ─────────────

function MobileDayAgenda({
  view, anchorDate, todayISO, occByDate, handle, onSelectDay,
}: {
  view: "semana" | "dia";
  anchorDate: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  handle: string;
  onSelectDay: (d: string) => void;
}) {
  const weekDays = useMemo(() => {
    if (view !== "semana") return [];
    const monday = addDaysISO(anchorDate, -((dowOfISO(anchorDate) + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  }, [anchorDate, view]);

  const dayOccurrences = (occByDate.get(anchorDate) ?? []).slice().sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));

  return (
    <div className="space-y-4">
      {view === "semana" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weekDays.map((d) => {
            const selecionado = d === anchorDate;
            const hoje = d === todayISO;
            const temAula = (occByDate.get(d)?.length ?? 0) > 0;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`flex min-w-[44px] flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors ${
                  selecionado ? "bg-blue-600 text-white" : hoje ? "bg-blue-50 text-blue-700" : "bg-white text-gray-600 ring-1 ring-black/5"
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{DIAS_SEMANA_CURTO[dowOfISO(d)]}</span>
                <span className="text-sm font-bold">{Number(d.slice(8, 10))}</span>
                {temAula && <span className={`size-1 rounded-full ${selecionado ? "bg-white" : "bg-blue-500"}`} />}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm font-semibold capitalize text-gray-700">{dayLabel(anchorDate)}</p>

      {dayOccurrences.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Sem aula ou reserva neste dia.
        </p>
      ) : (
        <div className="space-y-2">
          {dayOccurrences.map((occ) => (
            <OccurrenceCard key={`${occ.classId}-${occ.date}`} occ={occ} handle={handle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mês compacto (mobile) ───────────────────────────────────────────────────

function CompactMonth({
  monthMatrix, anchorDate, todayISO, occByDate, onSelectDate,
}: {
  monthMatrix: string[][];
  anchorDate: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  onSelectDate: (d: string) => void;
}) {
  const mesAtual = anchorDate.slice(5, 7);
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/5">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400">
        {DIAS_SEMANA_CURTO.map((d, i) => <span key={i}>{d[0]}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthMatrix.flat().map((d) => {
          const foraDoMes = d.slice(5, 7) !== mesAtual;
          const hoje = d === todayISO;
          const qtd = occByDate.get(d)?.length ?? 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm ${
                foraDoMes ? "text-gray-300" : hoje ? "bg-blue-600 text-white font-bold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {Number(d.slice(8, 10))}
              {qtd > 0 && <span className={`size-1 rounded-full ${hoje ? "bg-white" : "bg-blue-500"}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniMonth({
  monthAnchor, todayISO, occByDate, onSelectDate,
}: {
  monthAnchor: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  onSelectDate: (d: string) => void;
}) {
  const weeks = useMemo(() => monthMatrixISO(monthAnchor), [monthAnchor]);
  const mesIdx = Number(monthAnchor.slice(5, 7)) - 1;
  const mesAtual = monthAnchor.slice(5, 7);
  return (
    <div className="rounded-2xl bg-white p-2.5 ring-1 ring-black/5">
      <p className="mb-1.5 px-1 text-xs font-bold text-gray-700">{MESES_PT_ABREV[mesIdx]}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((d) => {
          const foraDoMes = d.slice(5, 7) !== mesAtual;
          const hoje = d === todayISO;
          const qtd = occByDate.get(d)?.length ?? 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={`flex aspect-square items-center justify-center rounded text-[10px] ${
                foraDoMes ? "text-gray-200" : hoje ? "bg-blue-600 font-bold text-white" : qtd > 0 ? "font-semibold text-blue-600" : "text-gray-500"
              }`}
            >
              {Number(d.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({
  anchorDate, todayISO, occByDate, onSelectDate,
}: {
  anchorDate: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  onSelectDate: (d: string) => void;
}) {
  const ano = anchorDate.slice(0, 4);
  return (
    <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}-01`).map((m) => (
        <MiniMonth key={m} monthAnchor={m} todayISO={todayISO} occByDate={occByDate} onSelectDate={onSelectDate} />
      ))}
    </div>
  );
}

function MonthGrid({
  monthMatrix, anchorDate, todayISO, occByDate, onSelectDate,
}: {
  monthMatrix: string[][];
  anchorDate: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  onSelectDate: (d: string) => void;
}) {
  const mesAtual = anchorDate.slice(5, 7);
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DIAS_SEMANA_CURTO.map((d, i) => (
          <div key={i} className="px-2 py-2 text-center text-xs font-bold text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthMatrix.flat().map((d) => {
          const foraDoMes = d.slice(5, 7) !== mesAtual;
          const hoje = d === todayISO;
          const occs = (occByDate.get(d) ?? []).slice().sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));
          const visiveis = occs.slice(0, 3);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={`min-h-[104px] border-b border-r border-gray-50 p-1.5 text-left align-top last:border-r-0 ${
                foraDoMes ? "bg-gray-50/40" : "hover:bg-blue-50/40"
              }`}
            >
              <span className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                hoje ? "bg-blue-600 text-white" : foraDoMes ? "text-gray-300" : "text-gray-600"
              }`}>
                {Number(d.slice(8, 10))}
              </span>
              <div className="space-y-0.5">
                {visiveis.map((o) => (
                  <div key={`${o.classId}-${o.date}`} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${corDoNivel(o.nivel)}`}>
                    {o.horaInicio && `${o.horaInicio} `}{o.titulo}
                  </div>
                ))}
                {occs.length > visiveis.length && (
                  <p className="px-1 text-[10px] font-semibold text-gray-400">+{occs.length - visiveis.length} mais</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Grid de horários (semana/dia, desktop) ──────────────────────────────────

const ROW_HEIGHT = 56; // px por hora

function computeGridHours(occs: AgendaOccurrence[]): { startHour: number; endHour: number } {
  let min = 7; // 07:00 de margem antes
  let max = 21; // 22:00 de margem depois (exclusivo)
  for (const o of occs) {
    if (!o.horaInicio) continue;
    const h0 = Number(o.horaInicio.slice(0, 2));
    const h1 = o.horaFim ? Math.ceil(Number(o.horaFim.slice(0, 2)) + (Number(o.horaFim.slice(3, 5)) > 0 ? 1 : 0)) : h0 + 1;
    min = Math.min(min, h0 - 1);
    max = Math.max(max, h1 + 1);
  }
  return { startHour: Math.max(0, Math.min(min, 6)), endHour: Math.min(24, Math.max(max, 22)) };
}

type LaidOutOcc = AgendaOccurrence & { lane: number; lanesCount: number; startMin: number; endMin: number };

function layoutOverlaps(occs: AgendaOccurrence[]): LaidOutOcc[] {
  const withMinutes = occs
    .filter((o) => o.horaInicio)
    .map((o) => {
      const [h0, m0] = o.horaInicio!.split(":").map(Number);
      const startMin = h0 * 60 + m0;
      let endMin = startMin + 30;
      if (o.horaFim) {
        const [h1, m1] = o.horaFim.split(":").map(Number);
        endMin = h1 * 60 + m1;
        if (endMin <= startMin) endMin = startMin + 30;
      }
      return { ...o, startMin, endMin, lane: 0, lanesCount: 1 };
    })
    .sort((a, b) => (a.startMin - b.startMin) || (a.endMin - b.endMin));

  const lanesEnd: number[] = [];
  let clusterStartIdx = 0;
  let clusterEnd = -1;

  function closeCluster(endIdx: number) {
    const maxLanes = Math.max(...withMinutes.slice(clusterStartIdx, endIdx).map((o) => o.lane)) + 1;
    for (let i = clusterStartIdx; i < endIdx; i++) withMinutes[i].lanesCount = maxLanes;
  }

  withMinutes.forEach((o, idx) => {
    if (idx > clusterStartIdx && o.startMin >= clusterEnd) {
      closeCluster(idx);
      lanesEnd.length = 0;
      clusterStartIdx = idx;
    }
    let lane = lanesEnd.findIndex((end) => o.startMin >= end);
    if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(o.endMin); }
    else lanesEnd[lane] = o.endMin;
    o.lane = lane;
    clusterEnd = Math.max(clusterEnd, o.endMin);
  });
  if (withMinutes.length > 0) closeCluster(withMinutes.length);

  return withMinutes;
}

function TimeAxis({ startHour, endHour }: { startHour: number; endHour: number }) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  return (
    <div className="w-14 shrink-0">
      <div style={{ height: ROW_HEIGHT / 2 }} />
      {hours.map((h) => (
        <div key={h} style={{ height: ROW_HEIGHT }} className="relative">
          <span className="absolute -top-2 right-2 text-[11px] text-gray-400">{String(h).padStart(2, "0")}:00</span>
        </div>
      ))}
    </div>
  );
}

function DayColumn({
  startHour, endHour, occurrences, handle,
}: {
  startHour: number;
  endHour: number;
  occurrences: AgendaOccurrence[];
  handle: string;
}) {
  const laidOut = useMemo(() => layoutOverlaps(occurrences), [occurrences]);
  const totalHeight = (endHour - startHour) * ROW_HEIGHT + ROW_HEIGHT / 2;

  return (
    <div className="relative flex-1 border-l border-gray-100" style={{ height: totalHeight }}>
      {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-gray-50" style={{ top: ROW_HEIGHT / 2 + i * ROW_HEIGHT }} />
      ))}
      {laidOut.map((o) => {
        const top = ROW_HEIGHT / 2 + (o.startMin - startHour * 60) * (ROW_HEIGHT / 60);
        const height = Math.max(24, (o.endMin - o.startMin) * (ROW_HEIGHT / 60));
        const widthPct = 100 / o.lanesCount;
        const leftPct = o.lane * widthPct;
        const nivelLabel = o.nivel ? NIVEL_LABEL[o.nivel] ?? o.nivel : "Todos";
        const temLimite = o.maxAlunos != null;
        const confirmados = o.confirmados ?? 0;
        const lotada = temLimite && confirmados >= (o.maxAlunos as number);
        return (
          <Link
            key={`${o.classId}-${o.date}`}
            href={`/arena/${handle}/aula/${o.classId}?data=${o.date}`}
            style={{ top, height, left: `${leftPct}%`, width: `calc(${widthPct}% - 3px)` }}
            className={`absolute overflow-hidden rounded-lg px-2 py-1 text-left text-white shadow-sm transition-opacity hover:opacity-90 ${corDoNivel(o.nivel)} ${lotada ? "ring-2 ring-red-400" : ""}`}
          >
            <p className="truncate text-[11px] font-bold leading-tight">{o.horaInicio}{o.horaFim && `–${o.horaFim}`}</p>
            <p className="truncate text-[11px] font-medium leading-tight">{o.titulo}</p>
            {height > 40 && (
              <p className="truncate text-[10px] leading-tight opacity-90">
                {nivelLabel} · {temLimite ? `${confirmados}/${o.maxAlunos}` : `${confirmados} confirmado${confirmados === 1 ? "" : "s"}`}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function WeekGrid({
  anchorDate, todayISO, occByDate, handle,
}: {
  anchorDate: string;
  todayISO: string;
  occByDate: Map<string, AgendaOccurrence[]>;
  handle: string;
}) {
  const monday = addDaysISO(anchorDate, -((dowOfISO(anchorDate) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const allOccs = days.flatMap((d) => occByDate.get(d) ?? []);
  const { startHour, endHour } = computeGridHours(allOccs);

  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
      <div className="flex min-w-[760px]">
        <div className="w-14 shrink-0 border-r border-gray-100 pt-10" />
        {days.map((d) => (
          <div key={d} className={`flex-1 border-r border-gray-100 py-2 text-center last:border-r-0 ${d === todayISO ? "bg-blue-50/50" : ""}`}>
            <p className="text-[11px] font-bold uppercase text-gray-400">{DIAS_SEMANA_CURTO[dowOfISO(d)]}</p>
            <p className={`text-sm font-bold ${d === todayISO ? "text-blue-600" : "text-gray-800"}`}>{Number(d.slice(8, 10))}</p>
          </div>
        ))}
      </div>
      <div className="flex min-w-[760px]">
        <TimeAxis startHour={startHour} endHour={endHour} />
        {days.map((d) => (
          <DayColumn key={d} startHour={startHour} endHour={endHour} occurrences={occByDate.get(d) ?? []} handle={handle} />
        ))}
      </div>
    </div>
  );
}

function DayGrid({
  date, todayISO, occurrences, handle,
}: {
  date: string;
  todayISO: string;
  occurrences: AgendaOccurrence[];
  handle: string;
}) {
  const { startHour, endHour } = computeGridHours(occurrences);
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className={`border-b border-gray-100 py-2.5 text-center ${date === todayISO ? "bg-blue-50/50" : ""}`}>
        <p className={`text-sm font-bold capitalize ${date === todayISO ? "text-blue-600" : "text-gray-800"}`}>{dayLabel(date)}</p>
      </div>
      <div className="flex max-w-md mx-auto">
        <TimeAxis startHour={startHour} endHour={endHour} />
        <DayColumn startHour={startHour} endHour={endHour} occurrences={occurrences} handle={handle} />
      </div>
      {occurrences.length === 0 && (
        <p className="border-t border-gray-50 px-4 py-6 text-center text-sm text-gray-400">Sem aula ou reserva neste dia.</p>
      )}
    </div>
  );
}
