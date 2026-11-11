"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Columns3,
  LayoutList,
  Megaphone,
  Pencil,
  Play,
  Radio,
  Search,
  Timer,
  X,
} from "lucide-react";
import { courtConflicts, formatCourtLabel, type CourtMatch } from "@/lib/court-operations";
import { OperationalDelay } from "@/components/painel/OperationalDelay";
import { atualizarOperacaoPartida } from "@/app/painel/campeonatos/[id]/quadras/actions";

export type CourtBoardMatch = {
  id: string;
  categoryId: string;
  categoryName: string;
  roundIndex: number;
  matchIndex: number;
  teamA: string;
  teamB: string;
  setsA: number | null;
  setsB: number | null;
  courtLabel: string | null;
  scheduledAt: string | null;
  status: CourtMatch["status"];
};

const STATUS_META: Record<
  CourtMatch["status"],
  { label: string; pill: string; border: string }
> = {
  scheduled: {
    label: "Agendada",
    pill: "bg-surface-2 text-ink-muted border-border",
    border: "border-border",
  },
  called: {
    label: "Chamada",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    border: "border-amber-300",
  },
  in_progress: {
    label: "Em quadra",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-emerald-300",
  },
  finished: {
    label: "Finalizada",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    border: "border-border/70 opacity-80",
  },
};

function formatDateTimeShort(iso: string | null) {
  if (!iso) return "Sem horário";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  try {
    const dt = new Date(iso);
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dt);
    return parts.replace(" ", "T");
  } catch {
    return iso.slice(0, 16);
  }
}

export function QuadrasBoardClient({
  champId,
  matches,
}: {
  champId: string;
  matches: CourtBoardMatch[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<"ativas" | "todas" | CourtMatch["status"]>("ativas");
  const [editingMatch, setEditingMatch] = useState<CourtBoardMatch | null>(null);
  const [editCourt, setEditCourt] = useState("");
  const [editScheduled, setEditScheduled] = useState("");
  const [editStatus, setEditStatus] = useState<CourtMatch["status"]>("scheduled");
  const [savingId, setSavingId] = useState<string | null>(null);

  const conflicts = useMemo(
    () =>
      courtConflicts(
        matches.map((m) => ({
          id: m.id,
          courtLabel: m.courtLabel,
          scheduledAt: m.scheduledAt,
          status: m.status,
        })),
      ),
    [matches],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(matches.map((m) => m.categoryName))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [matches],
  );

  const knownCourts = useMemo(() => {
    const raw = Array.from(
      new Set(matches.map((m) => m.courtLabel?.trim()).filter(Boolean) as string[]),
    );
    return raw.sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }),
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter((m) => {
      if (categoryFilter !== "todas" && m.categoryName !== categoryFilter) return false;
      if (statusFilter === "ativas" && m.status === "finished") return false;
      if (
        statusFilter !== "ativas" &&
        statusFilter !== "todas" &&
        m.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        m.teamA.toLowerCase().includes(q) ||
        m.teamB.toLowerCase().includes(q) ||
        m.categoryName.toLowerCase().includes(q) ||
        (m.courtLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [matches, categoryFilter, statusFilter, search]);

  const counts = useMemo(
    () => ({
      total: matches.length,
      inProgress: matches.filter((m) => m.status === "in_progress").length,
      called: matches.filter((m) => m.status === "called").length,
      scheduled: matches.filter((m) => m.status === "scheduled").length,
      finished: matches.filter((m) => m.status === "finished").length,
      conflicts: conflicts.size,
    }),
    [matches, conflicts],
  );

  const kanbanColumns = useMemo(() => {
    const unqueued = filteredMatches.filter((m) => !m.courtLabel?.trim());
    const byCourt = new Map<string, CourtBoardMatch[]>();
    for (const court of knownCourts) {
      byCourt.set(court, []);
    }
    for (const m of filteredMatches) {
      const label = m.courtLabel?.trim();
      if (!label) continue;
      const list = byCourt.get(label) ?? [];
      list.push(m);
      byCourt.set(label, list);
    }

    const cols: Array<{ key: string; title: string; items: CourtBoardMatch[]; isQueue?: boolean }> = [
      { key: "__fila__", title: "Fila de espera (Sem quadra)", items: unqueued, isQueue: true },
    ];
    for (const [court, items] of byCourt.entries()) {
      cols.push({
        key: court,
        title: formatCourtLabel(court) ?? court,
        items,
      });
    }
    return cols;
  }, [filteredMatches, knownCourts]);

  function openEditor(match: CourtBoardMatch) {
    setEditingMatch(match);
    setEditCourt(match.courtLabel ?? "");
    setEditScheduled(toDatetimeLocalValue(match.scheduledAt));
    setEditStatus(match.status);
  }

  function submitUpdate(
    match: CourtBoardMatch,
    overrides: {
      courtLabel?: string | null;
      scheduledAt?: string | null;
      status?: CourtMatch["status"];
    },
  ) {
    setSavingId(match.id);
    const fd = new FormData();
    fd.set("championship_id", champId);
    fd.set("match_id", match.id);
    fd.set("court_label", overrides.courtLabel !== undefined ? (overrides.courtLabel ?? "") : (match.courtLabel ?? ""));
    const rawSched =
      overrides.scheduledAt !== undefined
        ? overrides.scheduledAt ?? ""
        : toDatetimeLocalValue(match.scheduledAt);
    fd.set("scheduled_at", rawSched);
    fd.set("status", overrides.status ?? match.status);

    startTransition(async () => {
      await atualizarOperacaoPartida(fd);
      setSavingId(null);
      setEditingMatch(null);
      router.refresh();
    });
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <Radio className="mx-auto size-8 text-ink-muted/60" />
        <h3 className="mt-3 text-base font-semibold text-ink">Nenhuma partida gerada ainda</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Gere as chaves na aba Chaveamento para distribuir horários e chamar duplas às quadras.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs de Operação ao Vivo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Total</p>
          <p className="mt-1 text-2xl font-bold text-ink">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Em quadra</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{counts.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Chamadas</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{counts.called}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Agendadas</p>
          <p className="mt-1 text-2xl font-bold text-ink">{counts.scheduled}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Finalizadas</p>
          <p className="mt-1 text-2xl font-bold text-ink-muted">{counts.finished}</p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-3 ${
            counts.conflicts > 0
              ? "border-rose-300 bg-rose-50"
              : "border-border bg-surface"
          }`}
        >
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              counts.conflicts > 0 ? "text-rose-700" : "text-ink-muted"
            }`}
          >
            Conflitos
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              counts.conflicts > 0 ? "text-rose-700" : "text-ink"
            }`}
          >
            {counts.conflicts}
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Alternador de Visão */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar dupla ou quadra..."
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="todas">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ativas" | "todas" | CourtMatch["status"])
            }
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="ativas">Somente ativas</option>
            <option value="todas">Todos os estados</option>
            <option value="scheduled">Agendadas</option>
            <option value="called">Chamadas</option>
            <option value="in_progress">Em quadra</option>
            <option value="finished">Finalizadas</option>
          </select>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "kanban"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Columns3 className="size-3.5" />
            Kanban por Quadra
          </button>
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "lista"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <LayoutList className="size-3.5" />
            Edição em Lista
          </button>
        </div>
      </div>

      {/* Visão Kanban */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {kanbanColumns.map((col) => (
            <div
              key={col.key}
              className={`w-80 shrink-0 rounded-2xl border p-3.5 flex flex-col gap-3 ${
                col.isQueue
                  ? "border-dashed border-border bg-surface-2/40"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {!col.isQueue && (
                    <span className="flex size-2.5 shrink-0 rounded-full bg-brand" />
                  )}
                  <h3 className="truncate text-sm font-bold text-ink">{col.title}</h3>
                </div>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-muted">
                  {col.items.length}
                </span>
              </div>

              {col.items.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-muted">
                  Nenhuma partida nesta coluna.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {col.items.map((match) => {
                    const meta = STATUS_META[match.status];
                    const hasConflict = conflicts.has(match.id);
                    const busy = isPending && savingId === match.id;
                    return (
                      <div
                        key={match.id}
                        className={`rounded-xl border bg-surface p-3.5 shadow-2xs transition-all ${
                          hasConflict ? "border-rose-400 ring-1 ring-rose-200" : meta.border
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-[11px] font-semibold text-ink-muted">
                            {match.categoryName} · Fase {match.roundIndex + 1}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.pill}`}
                          >
                            {meta.label}
                          </span>
                        </div>

                        {hasConflict && (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <AlertTriangle className="size-3.5" />
                            Conflito de horário/quadra
                          </div>
                        )}

                        <div className="mt-2.5 space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-2 font-semibold text-ink">
                            <span className="truncate">{match.teamA}</span>
                            {match.setsA != null && (
                              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-bold">
                                {match.setsA}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-ink-muted">
                            <span className="truncate">{match.teamB}</span>
                            {match.setsB != null && (
                              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-bold text-ink">
                                {match.setsB}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3.5" />
                            {formatDateTimeShort(match.scheduledAt)}
                          </span>
                          <OperationalDelay
                            scheduledAt={match.scheduledAt}
                            status={match.status}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5">
                          {match.status === "scheduled" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => submitUpdate(match, { status: "called" })}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            >
                              <Megaphone className="size-3" />
                              Chamar
                            </button>
                          )}
                          {(match.status === "scheduled" || match.status === "called") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => submitUpdate(match, { status: "in_progress" })}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Play className="size-3" />
                              Iniciar
                            </button>
                          )}
                          {match.status === "in_progress" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => submitUpdate(match, { status: "finished" })}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                              <CheckCircle2 className="size-3" />
                              Finalizar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditor(match)}
                            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-2"
                          >
                            <Pencil className="size-3" />
                            Ajustar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Visão em Lista para Edição em Lote */
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredMatches.map((match) => {
            const hasConflict = conflicts.has(match.id);
            return (
              <form
                key={match.id}
                action={atualizarOperacaoPartida}
                className={`rounded-2xl border bg-surface p-4 ${
                  hasConflict ? "border-rose-400 ring-1 ring-rose-200" : "border-border"
                }`}
              >
                <input type="hidden" name="championship_id" value={champId} />
                <input type="hidden" name="match_id" value={match.id} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-muted">
                      {match.categoryName} · Fase {match.roundIndex + 1}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{match.teamA}</p>
                    <p className="text-sm text-ink-muted">vs. {match.teamB}</p>
                    <OperationalDelay
                      scheduledAt={match.scheduledAt}
                      status={match.status}
                    />
                  </div>
                  {hasConflict && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                      <AlertTriangle className="size-3" />
                      Conflito
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-ink-muted">
                    Quadra
                    <input
                      name="court_label"
                      defaultValue={match.courtLabel ?? ""}
                      placeholder="Ex.: 1"
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                    />
                  </label>
                  <label className="text-xs text-ink-muted sm:col-span-2">
                    Horário
                    <input
                      type="datetime-local"
                      name="scheduled_at"
                      defaultValue={toDatetimeLocalValue(match.scheduledAt)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                    />
                  </label>
                  <label className="text-xs text-ink-muted sm:col-span-2">
                    Estado
                    <select
                      name="status"
                      defaultValue={match.status}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                    >
                      <option value="scheduled">Agendada</option>
                      <option value="called">Chamada</option>
                      <option value="in_progress">Em quadra</option>
                      <option value="finished">Finalizada</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="mt-auto flex items-center justify-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    <Timer className="size-4" />
                    Salvar
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}

      {/* Modal Rápido de Ajuste da Partida */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                  {editingMatch.categoryName} · Fase {editingMatch.roundIndex + 1}
                </p>
                <h3 className="mt-1 text-base font-bold text-ink">
                  {editingMatch.teamA} vs. {editingMatch.teamB}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted">Quadra</label>
                <input
                  type="text"
                  value={editCourt}
                  onChange={(e) => setEditCourt(e.target.value)}
                  placeholder="Ex.: 1 ou Quadra Central"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
                />
                {knownCourts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {knownCourts.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditCourt(c)}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          editCourt === c
                            ? "border-brand bg-brand-soft text-brand-ink"
                            : "border-border bg-surface-2 text-ink-muted hover:text-ink"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted">Horário</label>
                <input
                  type="datetime-local"
                  value={editScheduled}
                  onChange={(e) => setEditScheduled(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as CourtMatch["status"])}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="scheduled">Agendada</option>
                  <option value="called">Chamada</option>
                  <option value="in_progress">Em quadra</option>
                  <option value="finished">Finalizada</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  submitUpdate(editingMatch, {
                    courtLabel: editCourt.trim() || null,
                    scheduledAt: editScheduled || null,
                    status: editStatus,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                <Timer className="size-4" />
                {isPending ? "Salvando…" : "Salvar alteração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
