"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarAporteCofrinho, adicionarReposicaoCofrinho, apagarReposicaoCofrinho,
  apagarRetiradaCofrinho, criarCofrinho, criarRetiradaCofrinho,
} from "@/app/admin/gasto-mensal/actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  formatBRLInput, parseBRLInput, savingsJarBalance, savingsTotalBalance,
  savingsTotals, savingsWithdrawalProgress, type SavingsJar,
  type SavingsMovement, type SavingsWithdrawal,
} from "@/lib/monthly-budget";
import {
  ArrowDownToLine, ArrowUpToLine, CheckCircle2, ChevronDown, Landmark,
  Loader2, Plus, RotateCcw, Trash2, WalletCards, X,
} from "lucide-react";

const field = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const label = "text-xs font-semibold text-gray-600";
const movementLabels: Record<SavingsMovement["type"], string> = {
  opening_balance: "Saldo inicial", contribution: "Aporte", withdrawal: "Retirada", repayment: "Reposição",
};

function moneyBlur(value: string, setValue: (value: string) => void) {
  const parsed = parseBRLInput(value);
  if (Number.isFinite(parsed)) setValue(formatBRLInput(parsed));
}

function Modal({ title, icon, close, children }: { title: string; icon: React.ReactNode; close: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 text-violet-700">{icon}<h3 className="text-lg font-bold text-gray-900">{title}</h3></div><button type="button" onClick={close} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Fechar"><X className="size-5" /></button></div>
      {children}
    </div>
  </div>;
}

function Actions({ pending, text, close }: { pending: boolean; text: string; close: () => void }) {
  return <div className="flex gap-2 pt-1"><button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending && <Loader2 className="size-4 animate-spin" />}{pending ? "Salvando…" : text}</button><button type="button" onClick={close} disabled={pending} className="rounded-2xl bg-gray-100 px-5 text-sm text-gray-700">Cancelar</button></div>;
}

function NewJar({ today, close, saved }: { today: string; close: () => void; saved: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(""), [institution, setInstitution] = useState(""), [openingBalance, setBalance] = useState(""), [asOf, setAsOf] = useState(today), [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null), [pending, start] = useTransition();
  return <Modal title="Novo cofrinho" icon={<WalletCards className="size-5" />} close={close}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
    const result = await criarCofrinho({ name, institution, openingBalance, asOf, note });
    if (!result.ok) return setError(result.error ?? "Não foi possível criar o cofrinho.");
    router.refresh(); saved(); close();
  }); }}>
    <div><label className={label}>Nome do cofrinho</label><input autoFocus required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Ex: Reserva de emergência" /></div>
    <div><label className={label}>Banco ou instituição (opcional)</label><input maxLength={80} value={institution} onChange={(e) => setInstitution(e.target.value)} className={field} placeholder="Ex: Mercado Pago" /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Quanto já tem hoje?</label><input inputMode="decimal" value={openingBalance} onChange={(e) => setBalance(e.target.value)} onBlur={() => moneyBlur(openingBalance, setBalance)} className={field} placeholder="0,00" /></div><div><label className={label}>Data desse saldo</label><input required type="date" max={today} value={asOf} onChange={(e) => setAsOf(e.target.value)} className={field} /></div></div>
    <div><label className={label}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} /></div>
    <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-700">Esse valor vira o saldo inicial. Depois, registre cada novo aporte em “Adicionar dinheiro”.</p>
    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Actions pending={pending} text="Criar cofrinho" close={close} />
  </form></Modal>;
}

function AddMoney({ jar, today, close, saved }: { jar: SavingsJar; today: string; close: () => void; saved: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState(""), [date, setDate] = useState(today), [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null), [pending, start] = useTransition();
  return <Modal title={`Adicionar em ${jar.name}`} icon={<ArrowUpToLine className="size-5" />} close={close}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
    const result = await adicionarAporteCofrinho({ jarId: jar.id, amount, contributedOn: date, note });
    if (!result.ok) return setError(result.error ?? "Não foi possível registrar o aporte.");
    router.refresh(); saved(); close();
  }); }}>
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Valor do aporte</label><input autoFocus required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => moneyBlur(amount, setAmount)} className={field} placeholder="0,00" /></div><div><label className={label}>Data do aporte</label><input required type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></div></div>
    <div><label className={label}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} placeholder="Ex: aporte mensal de setembro" /></div>
    <p className="text-xs text-gray-500">O aporte aumenta o saldo, mas não abate nenhuma retirada pendente.</p>
    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Actions pending={pending} text="Adicionar dinheiro" close={close} />
  </form></Modal>;
}

function Withdraw({ jar, today, close, saved }: { jar: SavingsJar; today: string; close: () => void; saved: () => void }) {
  const router = useRouter(); const balance = savingsJarBalance(jar);
  const [purpose, setPurpose] = useState(""), [amount, setAmount] = useState(""), [date, setDate] = useState(today), [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null), [pending, start] = useTransition();
  return <Modal title={`Retirar de ${jar.name}`} icon={<ArrowDownToLine className="size-5" />} close={close}>
    <div className="mb-4 rounded-xl bg-gray-50 p-3 text-gray-900"><p className="text-xs text-gray-500">Saldo disponível</p><p className="font-bold">{formatBRL(balance)}</p></div>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
      const result = await criarRetiradaCofrinho({ jarId: jar.id, purpose, amount, withdrawnOn: date, note });
      if (!result.ok) return setError(result.error ?? "Não foi possível registrar a retirada.");
      router.refresh(); saved(); close();
    }); }}>
      <div><label className={label}>Para que retirou?</label><input autoFocus required maxLength={160} value={purpose} onChange={(e) => setPurpose(e.target.value)} className={field} placeholder="Ex: Conserto do carro" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Valor retirado</label><input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => moneyBlur(amount, setAmount)} className={field} placeholder="0,00" /></div><div><label className={label}>Data</label><input required type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></div></div>
      <div><label className={label}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} /></div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Diminui o saldo e cria um valor a repor. Não é possível retirar mais que o disponível.</p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Actions pending={pending} text="Registrar retirada" close={close} />
    </form>
  </Modal>;
}

function Repay({ withdrawal, today, close, saved }: { withdrawal: SavingsWithdrawal; today: string; close: () => void; saved: () => void }) {
  const router = useRouter(), progress = savingsWithdrawalProgress(withdrawal);
  const [amount, setAmount] = useState(""), [date, setDate] = useState(today), [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null), [pending, start] = useTransition();
  return <Modal title="Registrar reposição" icon={<RotateCcw className="size-5" />} close={close}><div className="mb-4 rounded-xl bg-gray-50 p-3 text-gray-900"><p className="text-xs text-gray-500">{withdrawal.jarName} · {withdrawal.purpose}</p><p className="font-bold">Falta {formatBRL(progress.remaining)}</p></div><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
    const result = await adicionarReposicaoCofrinho({ withdrawalId: withdrawal.id, amount, repaidOn: date, note });
    if (!result.ok) return setError(result.error ?? "Não foi possível registrar a reposição.");
    router.refresh(); saved(); close();
  }); }}>
    <div className="grid gap-3 sm:grid-cols-2"><div><label className={label}>Valor reposto</label><input autoFocus required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => moneyBlur(amount, setAmount)} className={field} placeholder="0,00" /><button type="button" onClick={() => setAmount(formatBRLInput(progress.remaining))} className="mt-1 text-xs font-medium text-violet-600">Preencher o que falta</button></div><div><label className={label}>Data</label><input required type="date" min={withdrawal.withdrawnOn} max={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></div></div>
    <div><label className={label}>Observação (opcional)</label><textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={field} /></div>
    <p className="text-xs text-gray-500">A reposição aumenta o saldo e reduz o valor pendente dessa retirada.</p>
    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Actions pending={pending} text="Registrar reposição" close={close} />
  </form></Modal>;
}

export function CofrinhosReposicao({ jars, withdrawals, todayDateKey, onMessage }: { jars: SavingsJar[]; withdrawals: SavingsWithdrawal[]; todayDateKey: string; onMessage: (message: string) => void }) {
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(false), [addTarget, setAddTarget] = useState<SavingsJar | null>(null), [withdrawTarget, setWithdrawTarget] = useState<SavingsJar | null>(null), [repayTarget, setRepayTarget] = useState<SavingsWithdrawal | null>(null);
  const [openJars, setOpenJars] = useState<Set<string>>(new Set()), [openWithdrawals, setOpenWithdrawals] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [, start] = useTransition();
  const totals = useMemo(() => savingsTotals(withdrawals), [withdrawals]);
  const ordered = useMemo(() => [...withdrawals].sort((a, b) => Number(savingsWithdrawalProgress(a).isComplete) - Number(savingsWithdrawalProgress(b).isComplete) || b.withdrawnOn.localeCompare(a.withdrawnOn)), [withdrawals]);
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((old) => { const next = new Set(old); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const removeWithdrawal = (item: SavingsWithdrawal) => { if (!confirm(`Excluir a retirada de ${formatBRL(item.amount)} de “${item.jarName}”? O saldo será recalculado.`)) return; setPendingId(item.id); start(async () => { const result = await apagarRetiradaCofrinho(item.id); setPendingId(null); if (!result.ok) return setError(result.error ?? "Não foi possível excluir."); onMessage("Retirada excluída e saldo recalculado."); router.refresh(); }); };
  const removeRepayment = (id: string, amount: number) => { if (!confirm(`Excluir a reposição de ${formatBRL(amount)}? Ela sairá do saldo e voltará a ficar pendente.`)) return; setPendingId(id); start(async () => { const result = await apagarReposicaoCofrinho(id); setPendingId(null); if (!result.ok) return setError(result.error ?? "Não foi possível excluir."); onMessage("Reposição excluída e saldo recalculado."); router.refresh(); }); };

  return <section className="rounded-3xl bg-violet-950 p-4 text-white shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-violet-800"><Landmark className="size-5 text-violet-200" /></span><div><h2 className="font-bold">Cofrinhos</h2><p className="mt-0.5 text-xs text-violet-200/70">Saldos, aportes, retiradas e valores que ainda precisam ser repostos.</p></div></div><button type="button" onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-800"><Plus className="size-4" /> Novo cofrinho</button></div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3"><Summary label="Total guardado" value={savingsTotalBalance(jars)} green /><Summary label="Retirado a repor" value={totals.withdrawn} /><Summary label="Ainda falta repor" value={totals.remaining} amber /></div>
    {error && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
    {jars.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-violet-700 p-7 text-center text-sm text-violet-200">Crie seu primeiro cofrinho e informe quanto já existe nele.</div> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{jars.map((jar) => <JarCard key={jar.id} jar={jar} open={openJars.has(jar.id)} toggle={() => toggle(setOpenJars, jar.id)} add={() => setAddTarget(jar)} withdraw={() => setWithdrawTarget(jar)} />)}</div>}
    <div className="mt-6 border-t border-violet-800 pt-5"><h3 className="text-sm font-semibold">Retiradas e reposições</h3><p className="mt-0.5 text-xs text-violet-300/60">Aporte aumenta o saldo; somente “Repor valor” abate uma retirada.</p>
      {ordered.length === 0 ? <div className="mt-3 rounded-2xl border border-dashed border-violet-700 p-5 text-center text-xs text-violet-300/70">Nenhuma retirada registrada.</div> : <div className="mt-3 space-y-2">{ordered.map((item) => <WithdrawalCard key={item.id} item={item} open={openWithdrawals.has(item.id)} pendingId={pendingId} toggle={() => toggle(setOpenWithdrawals, item.id)} repay={() => setRepayTarget(item)} remove={() => removeWithdrawal(item)} removeRepayment={removeRepayment} />)}</div>}
    </div>
    {newOpen && <NewJar today={todayDateKey} close={() => setNewOpen(false)} saved={() => onMessage("Cofrinho criado.")} />}
    {addTarget && <AddMoney jar={addTarget} today={todayDateKey} close={() => setAddTarget(null)} saved={() => onMessage("Dinheiro adicionado ao cofrinho.")} />}
    {withdrawTarget && <Withdraw jar={withdrawTarget} today={todayDateKey} close={() => setWithdrawTarget(null)} saved={() => onMessage("Retirada registrada.")} />}
    {repayTarget && <Repay withdrawal={repayTarget} today={todayDateKey} close={() => setRepayTarget(null)} saved={() => onMessage("Reposição registrada.")} />}
  </section>;
}

function Summary({ label: text, value, green, amber }: { label: string; value: number; green?: boolean; amber?: boolean }) { return <div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-violet-200/70">{text}</p><p className={`mt-1 text-lg font-bold ${green ? "text-emerald-300" : amber ? "text-amber-300" : ""}`}>{formatBRL(value)}</p></div>; }

function JarCard({ jar, open, toggle, add, withdraw }: { jar: SavingsJar; open: boolean; toggle: () => void; add: () => void; withdraw: () => void }) {
  const balance = savingsJarBalance(jar);
  return <article className="overflow-hidden rounded-2xl bg-white text-gray-900"><div className="p-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{jar.name}</h3><p className="text-xs text-gray-400">{jar.institution || "Sem instituição informada"}</p></div><div className="text-right"><p className="text-xs text-gray-400">Saldo atual</p><p className="font-bold text-emerald-600">{formatBRL(balance)}</p></div></div><div className="mt-4 flex gap-2"><button type="button" onClick={add} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-700"><ArrowUpToLine className="size-3.5" /> Adicionar dinheiro</button><button type="button" onClick={withdraw} disabled={balance <= 0} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-50 px-2 py-2 text-xs font-semibold text-amber-700 disabled:opacity-40"><ArrowDownToLine className="size-3.5" /> Retirar</button></div><button type="button" onClick={toggle} className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400"><ChevronDown className={`size-3.5 ${open ? "rotate-180" : ""}`} /> Movimentações ({jar.movements.length})</button></div>{open && <div className="border-t bg-gray-50 px-4 py-3">{jar.movements.length === 0 ? <p className="text-xs text-gray-400">Nenhuma movimentação.</p> : <ul className="space-y-2">{jar.movements.map((m) => <li key={m.id} className="flex items-center gap-2 text-xs"><span className={`flex size-7 items-center justify-center rounded-full ${m.amountDelta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{m.amountDelta >= 0 ? <ArrowUpToLine className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}</span><span className="min-w-0 flex-1"><b className="block text-gray-700">{movementLabels[m.type]}</b><span className="block truncate text-gray-400">{formatDateBR(m.movementDate)}{m.note ? ` · ${m.note}` : ""}</span></span><b className={m.amountDelta >= 0 ? "text-emerald-600" : "text-amber-600"}>{m.amountDelta >= 0 ? "+" : "−"}{formatBRL(Math.abs(m.amountDelta))}</b></li>)}</ul>}</div>}</article>;
}

function WithdrawalCard({ item, open, pendingId, toggle, repay, remove, removeRepayment }: { item: SavingsWithdrawal; open: boolean; pendingId: string | null; toggle: () => void; repay: () => void; remove: () => void; removeRepayment: (id: string, amount: number) => void }) {
  const p = savingsWithdrawalProgress(item);
  return <article className="overflow-hidden rounded-2xl bg-white text-gray-900"><div className="p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="font-semibold">{item.jarName}</h4>{p.isComplete && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3" /> Reposto</span>}</div><p className="text-sm text-gray-600">{item.purpose}</p><p className="text-xs text-gray-400">{formatDateBR(item.withdrawnOn)}{item.note ? ` · ${item.note}` : ""}</p></div><div className="text-right"><p className="text-xs text-gray-400">Falta repor</p><b className={p.isComplete ? "text-emerald-600" : "text-amber-600"}>{formatBRL(p.remaining)}</b></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className={p.isComplete ? "h-full bg-emerald-500" : "h-full bg-violet-500"} style={{ width: `${p.percentage}%` }} /></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span className="text-gray-500">{formatBRL(p.repaid)} de {formatBRL(p.withdrawn)}</span><div className="flex items-center gap-1">{!p.isComplete && <button type="button" onClick={repay} className="rounded-lg bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700">Repor valor</button>}<button type="button" onClick={toggle} className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-500"><ChevronDown className={`size-3.5 ${open ? "rotate-180" : ""}`} /> Histórico ({item.repayments.length})</button><button type="button" onClick={remove} disabled={pendingId === item.id} className="p-1.5 text-gray-300 hover:text-red-500" aria-label="Excluir retirada">{pendingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button></div></div></div>{open && <div className="border-t bg-gray-50 px-4 py-3">{item.repayments.length === 0 ? <p className="text-xs text-gray-400">Nenhuma reposição.</p> : <ul className="space-y-2">{item.repayments.map((r) => <li key={r.id} className="flex items-center gap-2 text-xs"><RotateCcw className="size-4 text-emerald-600" /><span className="flex-1"><b className="block">{formatBRL(r.amount)}</b><span className="text-gray-400">{formatDateBR(r.repaidOn)}{r.note ? ` · ${r.note}` : ""}</span></span><button type="button" onClick={() => removeRepayment(r.id, r.amount)} disabled={pendingId === r.id} className="p-1 text-gray-300 hover:text-red-500" aria-label="Excluir reposição"><Trash2 className="size-3.5" /></button></li>)}</ul>}</div>}</article>;
}
