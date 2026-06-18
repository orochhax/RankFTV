"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Search, FileText, X, Package, Bell, CheckSquare, Square } from "lucide-react";
import { toggleProduced, bulkMarkProduced, saveEntrega, notifyAthletes } from "@/app/painel/campeonatos/[id]/camisas/actions";
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
  const keys    = Object.keys(map);
  const regular = sortSizes(keys.filter((k) => k !== "—"));
  const ordered = [...regular, ...(map["—"] ? ["—"] : [])];
  return ordered.map((k) => ({ size: k, ...map[k] }));
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ─── modal de entrega ─── */

type EntregaModalData = {
  athleteId:    string;
  nome:         string;
  retiradoPor:  string | null;
  dataRetirada: string | null;
};

function EntregaModal({ data, champId, onClose }: { data: EntregaModalData; champId: string; onClose: () => void }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [retiradoPor,  setRetiradoPor]  = useState(data.retiradoPor  ?? "");
  const [dataRetirada, setDataRetirada] = useState(data.dataRetirada ?? hoje);
  const [isPending, startTransition]    = useTransition();

  const jaEntregue = !!data.dataRetirada;
  const canSave    = retiradoPor.trim() !== "" || dataRetirada !== "";

  function handleSave() {
    startTransition(async () => {
      await saveEntrega(champId, data.athleteId, retiradoPor.trim() || null, dataRetirada || null);
      onClose();
    });
  }
  function handleRemove() {
    startTransition(async () => {
      await saveEntrega(champId, data.athleteId, null, null);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <Package className="size-3.5" /> Entrega do Kit
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">{data.nome}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="size-4 text-gray-500" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600">Retirado por</label>
            <input
              type="text" value={retiradoPor} onChange={(e) => setRetiradoPor(e.target.value)}
              placeholder="Nome de quem retirou o kit"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600">Data de retirada</label>
            <input
              type="date" value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <button
            onClick={handleSave} disabled={!canSave || isPending}
            className="w-full rounded-2xl bg-gray-900 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30 hover:bg-gray-800"
          >
            {isPending ? "Salvando…" : "Salvar entrega"}
          </button>
          {jaEntregue && (
            <button onClick={handleRemove} disabled={isPending}
              className="w-full py-2 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors">
              Remover registro de entrega
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── modal de confirmação de notificação ─── */

function NotifyModal({
  total,
  campNome,
  onConfirm,
  onClose,
  isPending,
}: {
  total:     number;
  campNome:  string;
  onConfirm: () => void;
  onClose:   () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Bell className="size-5 text-blue-600" />
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-base font-semibold text-gray-900">Notificar todos os atletas?</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            <strong className="text-gray-700">{total} atleta{total !== 1 ? "s" : ""}</strong> inscritos em{" "}
            <strong className="text-gray-700">{campNome}</strong> receberão uma notificação que
            as camisas estão prontas para retirada.
          </p>
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
            ⚠ Isso inclui atletas cuja camisa ainda <strong>não</strong> foi marcada como
            pronta. Certifique-se que o lote está realmente disponível antes de enviar.
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onConfirm} disabled={isPending}
            className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 hover:bg-blue-700"
          >
            {isPending ? "Enviando…" : "Sim, notificar todos"}
          </button>
          <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── componente principal ─── */

export function CamisasClient({
  champId,
  campNome,
  athletes,
}: {
  champId:  string;
  campNome: string;
  athletes: AthleteShirt[];
}) {
  /* ── estado ── */
  const [overrides, setOverrides]       = useState<Record<string, boolean>>({});
  const [entregaModal, setEntregaModal] = useState<EntregaModalData | null>(null);
  const [notifyModal, setNotifyModal]   = useState(false);
  const [sizeOpen, setSizeOpen]         = useState(true);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [filterSize, setFilterSize]     = useState<string | null>(null);

  /* modo seleção múltipla */
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());

  const [isPending,       startTransition]       = useTransition();
  const [isNotifyPending, startNotifyTransition] = useTransition();

  /* ── atletas com estado efetivo ── */
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

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.athleteId));

  /* ── ações ── */
  function handleToggle(athleteId: string, current: boolean) {
    const next = !current;
    setOverrides((prev) => ({ ...prev, [athleteId]: next }));
    startTransition(async () => { await toggleProduced(champId, athleteId, next); });
  }

  function handleBulk(athleteIds: string[], produced: boolean) {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of athleteIds) next[id] = produced;
      return next;
    });
    startTransition(async () => { await bulkMarkProduced(champId, athleteIds, produced); });
  }

  function handleBulkSelected() {
    const ids = Array.from(selected);
    handleBulk(ids, true);
    setSelected(new Set());
    setSelectMode(false);
  }

  function toggleSelect(athleteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.delete(a.athleteId));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((a) => next.add(a.athleteId));
        return next;
      });
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleNotifyConfirm() {
    startNotifyTransition(async () => {
      await notifyAthletes(champId, athletes.map((a) => a.athleteId), campNome);
      setNotifyModal(false);
    });
  }

  /* ── export PDF ── */
  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc        = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin     = 20;
    const pageW      = 210;
    const colNome    = margin;
    const colTam     = margin + 110;
    const colStatus  = margin + 130;
    const colEntrega = margin + 155;
    let y = margin;

    const totalAtletas = athletes.length;
    const semTamanho   = effective.filter((a) => !a.tamanho).length;
    const sorted = [...effective].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 15, 19);
    doc.text("Camisas / Kit", margin, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(156, 163, 175);
    doc.text(campNome, margin, y); y += 4;
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, y); y += 8;
    doc.setDrawColor(229, 231, 235); doc.line(margin, y, pageW - margin, y); y += 8;

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(55, 65, 81);
    doc.text(`Total de atletas = ${totalAtletas}`, margin, y); y += 6;
    doc.text(`Camisas prontas = ${totalDone} / ${totalAtletas}`, margin, y); y += 6;
    if (semTamanho > 0) doc.setTextColor(180, 90, 0);
    doc.text(`Sem informação de tamanho = ${semTamanho}`, margin, y); y += 10;

    doc.setDrawColor(229, 231, 235); doc.setTextColor(55, 65, 81);
    doc.line(margin, y, pageW - margin, y); y += 7;

    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text("ATLETA", colNome, y); doc.text("TAM.", colTam, y);
    doc.text("STATUS", colStatus, y); doc.text("ENTREGA", colEntrega, y);
    y += 3; doc.setDrawColor(229, 231, 235); doc.line(margin, y, pageW - margin, y); y += 6;

    const rowH = 7; doc.setFontSize(9);
    for (let i = 0; i < sorted.length; i++) {
      if (y > 272) { doc.addPage(); y = margin; }
      const a = sorted[i];
      if (i % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin - 2, y - 4.5, pageW - margin * 2 + 4, rowH, "F");
      }
      let nome = a.nome;
      while (nome.length > 1 && doc.getTextWidth(nome) > 95) nome = nome.slice(0, -1);
      if (nome !== a.nome) nome += "…";
      doc.setFont("helvetica", a.produced ? "normal" : "bold");
      doc.setTextColor(a.produced ? 156 : 17, a.produced ? 163 : 24, a.produced ? 175 : 39);
      doc.text(nome, colNome, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(55, 65, 81);
      doc.text(a.tamanho ?? "—", colTam, y);
      if (a.produced) {
        doc.setFont("helvetica", "bold"); doc.setTextColor(4, 120, 87); doc.text("Pronta", colStatus, y);
      } else {
        doc.setFont("helvetica", "normal"); doc.setTextColor(156, 163, 175); doc.text("Pendente", colStatus, y);
      }
      if (a.dataRetirada) {
        doc.setFont("helvetica", "bold"); doc.setTextColor(4, 120, 87);
        doc.text(`Entregue ${formatDateBR(a.dataRetirada)}`, colEntrega, y);
      } else {
        doc.setFont("helvetica", "normal"); doc.setTextColor(156, 163, 175); doc.text("—", colEntrega, y);
      }
      y += rowH;
    }
    doc.setDrawColor(229, 231, 235); doc.line(margin, y, pageW - margin, y);
    doc.save("camisas-kit.pdf");
  }

  /* ────────────────────────── render ────────────────────────── */

  return (
    <>
      <div className="space-y-4">

        {/* ── notificar atletas ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <Bell className="size-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Notificar todos os atletas</p>
              <p className="text-xs text-gray-400">Avisa que as camisas estão prontas para retirada.</p>
            </div>
            <button
              onClick={() => setNotifyModal(true)}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Enviar aviso
            </button>
          </div>
        </div>

        {/* ── resumo por tamanho ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <button
            onClick={() => setSizeOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">Resumo por tamanho</span>
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
            <ChevronDown className={`size-4 text-gray-400 transition-transform ${sizeOpen ? "rotate-180" : ""}`} />
          </button>

          {sizeOpen && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
              {sizeStats.map(({ size, total, done, ids }) => {
                const pct        = total > 0 ? (done / total) * 100 : 0;
                const allDone    = done === total;
                const pendingIds = ids.filter((id) => !(overrides[id] ?? athletes.find((a) => a.athleteId === id)?.produced));
                return (
                  <div key={size} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 rounded-lg bg-gray-100 py-1 text-center text-xs font-bold text-gray-700">{size}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{done} de {total} pronta{total !== 1 ? "s" : ""}</span>
                        {allDone ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <Check className="size-3" /> Concluído
                          </span>
                        ) : (
                          <button onClick={() => handleBulk(pendingIds, true)} disabled={isPending || pendingIds.length === 0}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40">
                            Marcar todas →
                          </button>
                        )}
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700">{done}/{total}</span>
                  </div>
                );
              })}
              <div className="flex justify-end pt-1">
                <button onClick={exportPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                  <FileText className="size-3.5" /> Exportar PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── lista de atletas ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

          {/* filtros + ações */}
          <div className="space-y-3 border-b border-gray-100 px-5 pb-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar atleta..."
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
              {/* toggle modo seleção */}
              {!selectMode ? (
                <button onClick={() => setSelectMode(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <CheckSquare className="size-4" /> Selecionar
                </button>
              ) : (
                <button onClick={exitSelectMode}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                  <X className="size-4" /> Cancelar
                </button>
              )}
            </div>

            {/* controles de seleção (visível no modo seleção) */}
            {selectMode && (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2">
                <span className="text-xs font-medium text-blue-700">
                  {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
                </span>
                <button onClick={toggleAllFiltered} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              {(["all", "pending", "done"] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterStatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : "Prontas"}
                </button>
              ))}
            </div>

            {allSizes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                <button onClick={() => setFilterSize(null)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterSize === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  Todos
                </button>
                {allSizes.map((sz) => (
                  <button key={sz} onClick={() => setFilterSize(sz === filterSize ? null : sz)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterSize === sz ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {sz}
                  </button>
                ))}
              </div>
            )}

            {!selectMode && (
              <p className="text-[11px] text-gray-400">Clique no nome do atleta para registrar a entrega do kit.</p>
            )}
          </div>

          {/* lista */}
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Nenhum atleta encontrado.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((a) => {
                const isSelected = selected.has(a.athleteId);
                return (
                  <li
                    key={a.athleteId}
                    onClick={selectMode ? () => toggleSelect(a.athleteId) : undefined}
                    className={`flex items-center gap-2.5 px-5 py-3 ${selectMode ? "cursor-pointer hover:bg-gray-50" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    {/* checkbox (só no modo seleção) */}
                    {selectMode && (
                      <div className={`size-4 shrink-0 rounded-[4px] border-2 transition-colors ${
                        isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                      } flex items-center justify-center`}>
                        {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                      </div>
                    )}

                    {/* dot */}
                    {!selectMode && (
                      <div className={`size-2 shrink-0 rounded-full ${a.produced ? "bg-emerald-500" : "bg-gray-300"}`} />
                    )}

                    {/* nome */}
                    {selectMode ? (
                      <span className={`min-w-0 flex-1 truncate text-sm ${a.produced ? "text-gray-400 line-through" : "font-medium text-gray-900"}`}>
                        {a.nome}
                      </span>
                    ) : (
                      <button
                        onClick={() => setEntregaModal({ athleteId: a.athleteId, nome: a.nome, retiradoPor: a.retiradoPor, dataRetirada: a.dataRetirada })}
                        title={a.dataRetirada ? `Entregue em ${formatDateBR(a.dataRetirada)}${a.retiradoPor ? ` para ${a.retiradoPor}` : ""}` : "Clique para registrar entrega"}
                        className={`min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-blue-600 ${a.produced ? "text-gray-400 line-through" : "font-medium text-gray-900"}`}
                      >
                        {a.nome}
                      </button>
                    )}

                    {/* tag tamanho */}
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${a.tamanho ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-600"}`}>
                      {a.tamanho ?? "—"}
                    </span>

                    {/* tag entrega */}
                    {a.dataRetirada ? (
                      <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Entregue</span>
                    ) : (
                      <span className="shrink-0 rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-400">Pendente</span>
                    )}

                    {/* toggle pronta (oculto no modo seleção) */}
                    {!selectMode && (
                      <button
                        onClick={() => handleToggle(a.athleteId, a.produced)} disabled={isPending}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                          a.produced ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}>
                        {a.produced
                          ? <span className="flex items-center gap-1"><Check className="size-3" /> Pronta</span>
                          : "Marcar"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {filtered.length > 0 && (
            <div className="border-t border-gray-50 px-5 py-3 text-xs text-gray-400">
              {filtered.length} atleta{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
              {search || filterStatus !== "all" || filterSize ? ` (filtrado de ${athletes.length})` : ""}
            </div>
          )}
        </div>

      </div>

      {/* ── barra flutuante de seleção múltipla ── */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40 flex items-center justify-between gap-3 rounded-2xl bg-gray-900 px-5 py-4 shadow-xl md:bottom-6">
          <span className="text-sm font-medium text-white">
            {selected.size} atleta{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleBulkSelected} disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-40 transition-colors"
          >
            <Check className="size-4" /> Marcar como prontas
          </button>
        </div>
      )}

      {/* modais */}
      {entregaModal && (
        <EntregaModal data={entregaModal} champId={champId} onClose={() => setEntregaModal(null)} />
      )}
      {notifyModal && (
        <NotifyModal
          total={athletes.length}
          campNome={campNome}
          onConfirm={handleNotifyConfirm}
          onClose={() => setNotifyModal(false)}
          isPending={isNotifyPending}
        />
      )}
    </>
  );
}
