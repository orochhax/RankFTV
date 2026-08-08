"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, History, LockKeyhole, Pencil, Plus, Trash2 } from "lucide-react";
import type { InvestmentContribution } from "@/lib/performance-widgets";
import type { InvestmentWithdrawalRow, MovementData } from "@/components/performance/investments/types";
import { dateLabel, money, primaryButtonClass, secondaryButtonClass, Surface } from "@/components/performance/investments/ui";

type Filter = "all" | "contribution" | "withdrawal" | "checkin";
type Row = { id: string; date: string; kind: Exclude<Filter, "all">; amount: number; institution: string | null; notes: string | null; source?: string; sourceEntryId?: string | null };

export function InvestmentMovements({ data, onAddContribution, onAddWithdrawal, onCheckin, onEditContribution, onDeleteContribution, onEditWithdrawal, onDeleteWithdrawal }: { data: MovementData; onAddContribution: () => void; onAddWithdrawal: () => void; onCheckin: () => void; onEditContribution: (item: InvestmentContribution) => void; onDeleteContribution: (item: InvestmentContribution) => void; onEditWithdrawal: (item: InvestmentWithdrawalRow) => void; onDeleteWithdrawal: (item: InvestmentWithdrawalRow) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(12);
  const rows = useMemo<Row[]>(() => [
    ...data.contributions.map((item) => ({ id: item.id, date: item.date, kind: "contribution" as const, amount: item.amount, institution: item.institution, notes: item.notes, source: item.source, sourceEntryId: item.sourceEntryId })),
    ...data.withdrawals.map((item) => ({ id: item.id, date: item.date, kind: "withdrawal" as const, amount: item.amount, institution: item.institution, notes: item.notes })),
    ...data.snapshots.map((item) => ({ id: item.id, date: item.date, kind: "checkin" as const, amount: item.totalValue, institution: null, notes: item.notes })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [data]);
  const filtered = filter === "all" ? rows : rows.filter((row) => row.kind === filter);
  const visible = filtered.slice(0, limit);
  const contributionById = new Map(data.contributions.map((item) => [item.id, item]));
  const withdrawalById = new Map(data.withdrawals.map((item) => [item.id, item]));

  return <Surface className="scroll-mt-4 overflow-hidden" as="section">
    <div id="investment-movements" className="flex flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/55"><History className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Histórico detalhado</p><h2 className="mt-1 text-lg font-semibold">Movimentações e check-ins</h2><p className="mt-1 text-sm leading-6 text-white/55">Sem cadastro de ativos individuais: apenas movimentos que mudam sua rota.</p></div></div>
      <div className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={onAddContribution} className={primaryButtonClass}><ArrowDownToLine className="size-4" aria-hidden="true" />Aporte</button><button type="button" onClick={onAddWithdrawal} className={secondaryButtonClass}><ArrowUpFromLine className="size-4" aria-hidden="true" />Retirada</button><button type="button" onClick={onCheckin} className={secondaryButtonClass}><Plus className="size-4" aria-hidden="true" />Check-in</button></div>
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-white/[0.08] p-2" aria-label="Filtrar movimentações">{([ ["all", "Tudo"], ["contribution", "Aportes"], ["withdrawal", "Retiradas"], ["checkin", "Check-ins"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setFilter(value); setLimit(12); }} className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${filter === value ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white/75"}`} aria-pressed={filter === value}>{label}</button>)}</div>
    {!visible.length ? <p className="px-5 py-12 text-center text-sm text-white/50">{emptyMessage(filter)}</p> : <div className="divide-y divide-white/[0.07]">
      {visible.map((row) => { const contribution = row.kind === "contribution" ? contributionById.get(row.id) : null; const withdrawal = row.kind === "withdrawal" ? withdrawalById.get(row.id) : null; return <div key={`${row.kind}-${row.id}`} className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-6">
        <MovementIcon kind={row.kind} />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><p className={`font-semibold tabular-nums ${row.kind === "withdrawal" ? "text-amber-200" : row.kind === "contribution" ? "text-blue-200" : "text-emerald-200"}`}>{row.kind === "withdrawal" ? "− " : row.kind === "contribution" ? "+ " : ""}{money(row.amount)}</p><span className="text-xs text-white/60">{movementLabel(row.kind)}</span></div><p className="mt-1 truncate text-xs text-white/60">{dateLabel(row.date)}{row.institution ? ` · ${row.institution}` : ""}{row.source === "personal_finance" ? " · Controle financeiro" : ""}</p>{row.notes && <p className="mt-1 truncate text-xs text-white/60" title={row.notes}>{row.notes}</p>}</div>
        {contribution && row.source === "manual" && !row.sourceEntryId && <div className="flex shrink-0"><button type="button" onClick={() => onEditContribution(contribution)} className="inline-flex size-11 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label={`Editar aporte de ${money(row.amount)}`}><Pencil className="size-4" aria-hidden="true" /></button><button type="button" onClick={() => onDeleteContribution(contribution)} className="inline-flex size-11 items-center justify-center rounded-lg text-white/55 hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={`Excluir aporte de ${money(row.amount)}`}><Trash2 className="size-4" aria-hidden="true" /></button></div>}
        {contribution && (row.source !== "manual" || Boolean(row.sourceEntryId)) && <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-white/60 sm:inline-flex" title="Gerenciado no controle financeiro"><LockKeyhole className="size-3.5" aria-hidden="true" />Gerenciado no controle financeiro</span>}
        {withdrawal && <div className="flex shrink-0"><button type="button" onClick={() => onEditWithdrawal(withdrawal)} className="inline-flex size-11 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label={`Editar retirada de ${money(row.amount)}`}><Pencil className="size-4" aria-hidden="true" /></button><button type="button" onClick={() => onDeleteWithdrawal(withdrawal)} className="inline-flex size-11 items-center justify-center rounded-lg text-white/55 hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label={`Excluir retirada de ${money(row.amount)}`}><Trash2 className="size-4" aria-hidden="true" /></button></div>}
      </div>; })}
    </div>}
    {visible.length < filtered.length && <div className="border-t border-white/[0.07] p-4 text-center"><button type="button" onClick={() => setLimit((value) => value + 12)} className={secondaryButtonClass}>Mostrar mais</button></div>}
  </Surface>;
}

function MovementIcon({ kind }: { kind: Row["kind"] }) { const Icon = kind === "contribution" ? ArrowDownToLine : kind === "withdrawal" ? ArrowUpFromLine : CheckCircle2; const style = kind === "contribution" ? "bg-blue-400/10 text-blue-300" : kind === "withdrawal" ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-300"; return <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style}`}><Icon className="size-4" aria-hidden="true" /></span>; }
function movementLabel(kind: Row["kind"]): string { return kind === "contribution" ? "Aporte" : kind === "withdrawal" ? "Retirada" : "Check-in"; }
function emptyMessage(filter: Filter): string { if (filter === "contribution") return "Nenhum aporte foi registrado neste período."; if (filter === "withdrawal") return "Nenhuma retirada foi registrada neste período."; if (filter === "checkin") return "Nenhum check-in foi registrado neste período."; return "Nenhuma movimentação foi registrada neste período."; }
