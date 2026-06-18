"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Search, AlignLeft } from "lucide-react";
import { toggleProduced, bulkMarkProduced } from "@/app/painel/campeonatos/[id]/camisas/actions";
import type { AthleteShirt } from "@/app/painel/campeonatos/[id]/camisas/page";

/* ─── ordem de tamanhos ─── */
const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XGG", "XG", "XXG"];

function sortSizes(sizes: string[]) {
  return sizes.sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function computeSizeStats(athletes: Array<AthleteShirt & { produced: boolean }>) {
  const map: Record<string, { total: number; done: number; ids: string[] }> = {};
  for (const a of athletes) {
    const key = a.tamanho ?? "—";
    if (!map[key]) map[key] = { total: 0, done: 0, ids: [] };
    map[key].total++;
    map[key].ids.push(a.athleteId);
    if (a.produced) map[key].done++;
  }
  const keys = Object.keys(map);
  const regular = sortSizes(keys.filter((k) => k !== "—"));
  const ordered = [...regular, ...(map["—"] ? ["—"] : [])];
  return ordered.map((k) => ({ size: k, ...map[k] }));
}

/* ─── componente principal ─── */

export function CamisasClient({
  champId,
  athletes,
}: {
  champId:  string;
  athletes: AthleteShirt[];
}) {
  /* ── estado ── */
  const [overrides, setOverrides]       = useState<Record<string, boolean>>({});
  const [sizeOpen, setSizeOpen]         = useState(true);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [filterSize, setFilterSize]     = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  /* ── atletas com estado efetivo (local override > servidor) ── */
  const effective = athletes.map((a) => ({
    ...a,
    produced: overrides[a.athleteId] ?? a.produced,
  }));

  const totalDone = effective.filter((a) => a.produced).length;
  const sizeStats = computeSizeStats(effective);
  const allSizes  = sizeStats.map((s) => s.size);

  /* ── lista filtrada ── */
  const filtered = effective.filter((a) => {
    if (filterStatus === "pending" &&  a.produced) return false;
    if (filterStatus === "done"    && !a.produced) return false;
    if (filterSize && (a.tamanho ?? "—") !== filterSize) return false;
    if (search && !a.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ── ações ── */
  function handleToggle(athleteId: string, current: boolean) {
    const next = !current;
    setOverrides((prev) => ({ ...prev, [athleteId]: next }));
    startTransition(async () => {
      await toggleProduced(champId, athleteId, next);
    });
  }

  function handleBulk(athleteIds: string[], produced: boolean) {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of athleteIds) next[id] = produced;
      return next;
    });
    startTransition(async () => {
      await bulkMarkProduced(champId, athleteIds, produced);
    });
  }

  function exportTxt() {
    const lines = ["LISTA DE CAMISAS / KIT", "=".repeat(40), ""];
    for (const stat of sizeStats) {
      lines.push(`Tamanho ${stat.size} — ${stat.total} camisa(s)`);
      const group = effective
        .filter((a) => (a.tamanho ?? "—") === stat.size)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      for (const a of group) {
        lines.push(`  ${a.produced ? "[✓]" : "[ ]"} ${a.nome}`);
      }
      lines.push("");
    }
    lines.push("=".repeat(40));
    lines.push(`Prontas: ${totalDone} / ${athletes.length}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.download = "camisas.txt";
    a.href     = url;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ────────────────────────── render ────────────────────────── */

  return (
    <div className="space-y-4">

      {/* ── card resumo por tamanho ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

        {/* cabeçalho clicável */}
        <button
          onClick={() => setSizeOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">Resumo por tamanho</span>
            {/* barra de progresso geral */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${athletes.length ? (totalDone / athletes.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{totalDone} / {athletes.length}</span>
            </div>
          </div>
          <ChevronDown
            className={`size-4 text-gray-400 transition-transform ${sizeOpen ? "rotate-180" : ""}`}
          />
        </button>

        {sizeOpen && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">

            {sizeStats.map(({ size, total, done, ids }) => {
              const pct     = total > 0 ? (done / total) * 100 : 0;
              const allDone = done === total;
              const pendingIds = ids.filter((id) => !(overrides[id] ?? athletes.find((a) => a.athleteId === id)?.produced));

              return (
                <div key={size} className="flex items-center gap-3">
                  {/* badge tamanho */}
                  <span className="w-10 shrink-0 rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">
                    {size}
                  </span>

                  {/* barra de progresso */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {done} de {total} pronta{total !== 1 ? "s" : ""}
                      </span>
                      {allDone ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Check className="size-3" /> Concluído
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBulk(pendingIds, true)}
                          disabled={isPending || pendingIds.length === 0}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                        >
                          Marcar todas →
                        </button>
                      )}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-blue-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* contagem */}
                  <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700">
                    {done}/{total}
                  </span>
                </div>
              );
            })}

            {/* exportar */}
            <div className="flex justify-end pt-1">
              <button
                onClick={exportTxt}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <AlignLeft className="size-3.5" />
                Exportar lista TXT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── lista de atletas ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

        {/* filtros */}
        <div className="space-y-3 border-b border-gray-100 px-5 pb-4 pt-4">

          {/* busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar atleta..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* filtro status */}
          <div className="flex gap-2">
            {(["all", "pending", "done"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : "Prontas"}
              </button>
            ))}
          </div>

          {/* filtro por tamanho */}
          {allSizes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFilterSize(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterSize === null
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              {allSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFilterSize(sz === filterSize ? null : sz)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterSize === sz
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* lista */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Nenhum atleta encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((a) => (
              <li key={a.athleteId} className="flex items-center gap-3 px-5 py-3">
                {/* indicador */}
                <div className={`size-2 shrink-0 rounded-full ${a.produced ? "bg-emerald-500" : "bg-gray-300"}`} />

                {/* nome */}
                <span className={`flex-1 text-sm ${a.produced ? "text-gray-400 line-through" : "text-gray-900 font-medium"}`}>
                  {a.nome}
                </span>

                {/* tamanho */}
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  a.tamanho
                    ? "bg-gray-100 text-gray-600"
                    : "bg-amber-50 text-amber-600"
                }`}>
                  {a.tamanho ?? "—"}
                </span>

                {/* toggle */}
                <button
                  onClick={() => handleToggle(a.athleteId, a.produced)}
                  disabled={isPending}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                    a.produced
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {a.produced ? (
                    <span className="flex items-center gap-1"><Check className="size-3" /> Pronta</span>
                  ) : (
                    "Marcar"
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* rodapé com contagem */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-50 px-5 py-3 text-xs text-gray-400">
            {filtered.length} atleta{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
            {search || filterStatus !== "all" || filterSize
              ? ` (filtrado de ${athletes.length})`
              : ""}
          </div>
        )}
      </div>
    </div>
  );
}
