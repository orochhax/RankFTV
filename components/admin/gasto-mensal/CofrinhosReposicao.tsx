"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarReposicaoCofrinho,
  apagarReposicaoCofrinho,
  apagarRetiradaCofrinho,
  criarRetiradaCofrinho,
} from "@/app/admin/gasto-mensal/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  formatBRLInput,
  parseBRLInput,
  savingsTotals,
  savingsWithdrawalProgress,
  type SavingsWithdrawal,
} from "@/lib/monthly-budget";
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

const fieldClass = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const labelClass = "text-xs font-semibold text-gray-600";

function ModalFrame({ title, icon, onClose, children }: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-violet-700">{icon}<h3 className="text-lg font-bold text-gray-900">{title}</h3></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Fechar"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function WithdrawalForm({ today, jarNames, onClose, onSaved }: { today: string; jarNames: string[]; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [jarName, setJarName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [withdrawnOn, setWithdrawnOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <ModalFrame title="Registrar retirada" icon={<ArrowDownToLine className="size-5" />} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await criarRetiradaCofrinho({ jarName, purpose, amount, withdrawnOn, note });
          if (!result.ok) { setError(result.error ?? "Não foi possível registrar a retirada."); return; }
          router.refresh(); onSaved(); onClose();
        });
      }} className="space-y-4">
        <div><label className={labelClass}>Cofrinho</label><input autoFocus required maxLength={80} list="savings-jar-names" value={jarName} onChange={(e) => setJarName(e.target.value)} className={fieldClass} placeholder="Ex: Reserva de emergência — Mercado Pago" /><datalist id="savings-jar-names">{jarNames.map((name) => <option key={name} value={name} />)}</datalist></div>
        <div><label className={labelClass}>Para que retirou?</label><input required maxLength={160} value={purpose} onChange={(e) => setPurpose(e.target.value)} className={fieldClass} placeholder="Ex: Conserto do carro" /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Valor retirado</label><input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => { const parsed = parseBRLInput(amount); if (Number.isFinite(parsed)) setAmount(formatBRLInput(parsed)); }} className={fieldClass} placeholder="0,00" /></div>
          <div><label className={labelClass}>Data da retirada</label><input required type="date" max={today} value={withdrawnOn} onChange={(e) => setWithdrawnOn(e.target.value)} className={fieldClass} /></div>
        </div>
        <div><label className={labelClass}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} placeholder="Algum detalhe que ajude a lembrar" /></div>
        <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-700">Esta retirada não altera as receitas, despesas ou depósitos mensais. Ela cria somente um valor a repor.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1"><button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Salvando…" : "Registrar retirada"}</button><button type="button" onClick={onClose} disabled={pending} className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60">Cancelar</button></div>
      </form>
    </ModalFrame>
  );
}

function RepaymentForm({ withdrawal, today, onClose, onSaved }: { withdrawal: SavingsWithdrawal; today: string; onClose: () => void; onSaved: () => void }) {
  const router = useRouter();
  const progress = savingsWithdrawalProgress(withdrawal);
  const [amount, setAmount] = useState("");
  const [repaidOn, setRepaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <ModalFrame title="Registrar reposição" icon={<RotateCcw className="size-5" />} onClose={onClose}>
      <div className="mb-4 rounded-xl bg-gray-50 p-3">
        <p className="text-xs text-gray-500">{withdrawal.jarName} · {withdrawal.purpose}</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">Ainda falta {formatBRL(progress.remaining)}</p>
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await adicionarReposicaoCofrinho({ withdrawalId: withdrawal.id, amount, repaidOn, note });
          if (!result.ok) { setError(result.error ?? "Não foi possível registrar a reposição."); return; }
          router.refresh(); onSaved(); onClose();
        });
      }} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className={labelClass}>Valor reposto</label><input autoFocus required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => { const parsed = parseBRLInput(amount); if (Number.isFinite(parsed)) setAmount(formatBRLInput(parsed)); }} className={fieldClass} placeholder="0,00" /><button type="button" onClick={() => setAmount(formatBRLInput(progress.remaining))} className="mt-1 text-xs font-medium text-violet-600 hover:text-violet-800">Preencher o valor que falta</button></div>
          <div><label className={labelClass}>Data da reposição</label><input required type="date" min={withdrawal.withdrawnOn} max={today} value={repaidOn} onChange={(e) => setRepaidOn(e.target.value)} className={fieldClass} /></div>
        </div>
        <div><label className={labelClass}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} placeholder="Ex: parte do 13º salário" /></div>
        <p className="text-xs leading-relaxed text-gray-400">Registre apenas devoluções dessa retirada. O depósito mensal normal do cofrinho fica fora deste controle.</p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1"><button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Salvando…" : "Registrar reposição"}</button><button type="button" onClick={onClose} disabled={pending} className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60">Cancelar</button></div>
      </form>
    </ModalFrame>
  );
}

export function CofrinhosReposicao({ withdrawals, todayDateKey, onMessage }: {
  withdrawals: SavingsWithdrawal[];
  todayDateKey: string;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [withdrawalFormOpen, setWithdrawalFormOpen] = useState(false);
  const [repaymentTarget, setRepaymentTarget] = useState<SavingsWithdrawal | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const totals = useMemo(() => savingsTotals(withdrawals), [withdrawals]);
  const jarNames = useMemo(() => [...new Set(withdrawals.map((withdrawal) => withdrawal.jarName))].sort(), [withdrawals]);
  const ordered = useMemo(() => [...withdrawals].sort((a, b) => {
    const completeDiff = Number(savingsWithdrawalProgress(a).isComplete) - Number(savingsWithdrawalProgress(b).isComplete);
    return completeDiff || b.withdrawnOn.localeCompare(a.withdrawnOn);
  }), [withdrawals]);

  function removeWithdrawal(withdrawal: SavingsWithdrawal) {
    const detail = withdrawal.repayments.length ? " Todo o histórico de reposições dela também será apagado." : "";
    if (!window.confirm(`Excluir a retirada de ${formatBRL(withdrawal.amount)} do cofrinho “${withdrawal.jarName}”?${detail}`)) return;
    setError(null);
    setPendingId(withdrawal.id);
    startTransition(async () => {
      const result = await apagarRetiradaCofrinho(withdrawal.id);
      setPendingId(null);
      if (!result.ok) { setError(result.error ?? "Não foi possível excluir a retirada."); return; }
      onMessage("Retirada excluída."); router.refresh();
    });
  }

  function removeRepayment(id: string, amount: number) {
    if (!window.confirm(`Excluir a reposição de ${formatBRL(amount)}? O valor voltará a ficar pendente.`)) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await apagarReposicaoCofrinho(id);
      setPendingId(null);
      if (!result.ok) { setError(result.error ?? "Não foi possível excluir a reposição."); return; }
      onMessage("Reposição excluída."); router.refresh();
    });
  }

  return (
    <section className="rounded-3xl bg-violet-950 p-4 text-white shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-800"><Landmark className="size-5 text-violet-200" /></span><div><h2 className="font-bold">Reposição de cofrinhos</h2><p className="mt-0.5 max-w-xl text-xs leading-relaxed text-violet-200/70">Retiradas extraordinárias e o que você já devolveu. Seus depósitos mensais normais não entram aqui.</p></div></div>
        <button type="button" onClick={() => setWithdrawalFormOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"><Plus className="size-4" /> Registrar retirada</button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-violet-200/70">Total retirado</p><p className="mt-1 text-lg font-bold">{formatBRL(totals.withdrawn)}</p></div>
        <div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-violet-200/70">Já reposto</p><p className="mt-1 text-lg font-bold text-emerald-300">{formatBRL(totals.repaid)}</p></div>
        <div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-violet-200/70">Ainda falta repor</p><p className="mt-1 text-lg font-bold text-amber-300">{formatBRL(totals.remaining)}</p></div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200 ring-1 ring-red-400/20">{error}</p>}

      {ordered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-violet-700 px-4 py-6 text-center"><p className="text-sm text-violet-200">Nenhuma retirada registrada.</p><p className="mt-1 text-xs text-violet-300/60">Quando precisar usar um cofrinho, registre aqui para acompanhar a devolução.</p></div>
      ) : (
        <div className="mt-4 space-y-2">
          {ordered.map((withdrawal) => {
            const progress = savingsWithdrawalProgress(withdrawal);
            const isExpanded = expanded.has(withdrawal.id);
            return (
              <article key={withdrawal.id} className="overflow-hidden rounded-2xl bg-white text-gray-900">
                <div className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{withdrawal.jarName}</h3>{progress.isComplete && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3" /> Reposto</span>}</div><p className="mt-0.5 text-sm text-gray-600">{withdrawal.purpose}</p><p className="mt-1 text-xs text-gray-400">Retirado em {formatDateBR(withdrawal.withdrawnOn)}{withdrawal.note ? ` · ${withdrawal.note}` : ""}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-400">Falta repor</p><p className={`font-bold ${progress.isComplete ? "text-emerald-600" : "text-amber-600"}`}>{formatBRL(progress.remaining)}</p></div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${progress.isComplete ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${progress.percentage}%` }} /></div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><p className="text-gray-500">{formatBRL(progress.repaid)} de {formatBRL(progress.withdrawn)} · {Math.round(progress.percentage)}%</p><div className="flex items-center gap-1">{!progress.isComplete && <button type="button" onClick={() => setRepaymentTarget(withdrawal)} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700 hover:bg-violet-100"><RotateCcw className="size-3.5" /> Repor valor</button>}<button type="button" onClick={() => setExpanded((old) => { const next = new Set(old); if (next.has(withdrawal.id)) next.delete(withdrawal.id); else next.add(withdrawal.id); return next; })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-gray-500 hover:bg-gray-100"><ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} /> Histórico ({withdrawal.repayments.length})</button><button type="button" onClick={() => removeWithdrawal(withdrawal)} disabled={pendingId === withdrawal.id} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40" aria-label="Excluir retirada">{pendingId === withdrawal.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></div></div>
                </div>
                {isExpanded && <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">{withdrawal.repayments.length === 0 ? <p className="text-xs text-gray-400">Nenhuma reposição registrada ainda.</p> : <ul className="space-y-2">{withdrawal.repayments.map((repayment) => <li key={repayment.id} className="flex items-center gap-3 text-xs"><span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><RotateCcw className="size-3.5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-gray-700">{formatBRL(repayment.amount)}</span><span className="block truncate text-gray-400">{formatDateBR(repayment.repaidOn)}{repayment.note ? ` · ${repayment.note}` : ""}</span></span><button type="button" onClick={() => removeRepayment(repayment.id, repayment.amount)} disabled={pendingId === repayment.id} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-100 hover:text-red-500" aria-label="Excluir reposição">{pendingId === repayment.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></li>)}</ul>}</div>}
              </article>
            );
          })}
        </div>
      )}
      {withdrawalFormOpen && <WithdrawalForm today={todayDateKey} jarNames={jarNames} onClose={() => setWithdrawalFormOpen(false)} onSaved={() => onMessage("Retirada registrada.")} />}
      {repaymentTarget && <RepaymentForm withdrawal={repaymentTarget} today={todayDateKey} onClose={() => setRepaymentTarget(null)} onSaved={() => onMessage("Reposição registrada.")} />}
    </section>
  );
}
