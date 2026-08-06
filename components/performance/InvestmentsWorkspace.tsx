"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { criarAporteLifeOS, editarAporteLifeOS, removerAporteLifeOS, salvarCarteiraLifeOS } from "@/app/admin/performance/life-os-actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { monthlyContributionSeries, monthlyPortfolioSeries } from "@/lib/performance-analytics";
import { investmentSummary, type InvestmentContribution } from "@/lib/performance-widgets";
import type { PortfolioSnapshot } from "@/lib/performance-life-os";

type Withdrawal = { id: string; date: string; amount: number; institution: string | null; notes: string | null };
const inputClass = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

export function InvestmentsWorkspace({ contributions, snapshots, withdrawals, today }: { contributions: InvestmentContribution[]; snapshots: PortfolioSnapshot[]; withdrawals: Withdrawal[]; today: string }) {
  const router = useRouter();
  const [newContribution, setNewContribution] = useState(false);
  const [editing, setEditing] = useState<InvestmentContribution | null>(null);
  const [newSnapshot, setNewSnapshot] = useState(false);
  const summary = investmentSummary(contributions, snapshots, withdrawals);
  const portfolioData = monthlyPortfolioSeries(snapshots);
  const contributionData = monthlyContributionSeries(contributions);

  return <section className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric title="Total aportado" value={formatBRL(summary.totalContributed)} />
      <Metric title="Carteira atual" value={snapshots.length ? formatBRL(summary.currentValue) : "Nao atualizada"} />
      <Metric title="Resultado" value={formatBRL(summary.result)} tone={summary.result < 0 ? "negative" : "positive"} />
      <Metric title="Rentabilidade" value={summary.returnPercent == null ? "Sem base" : `${summary.returnPercent >= 0 ? "+" : ""}${summary.returnPercent.toFixed(2)}%`} tone={summary.returnPercent != null && summary.returnPercent < 0 ? "negative" : "positive"} />
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Evolucao mensal da carteira" description="Ultimo valor registrado em cada mes">
        {portfolioData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={portfolioData} margin={{ top: 8, right: 10, left: 2, bottom: 0 }}><CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} /><YAxis width={72} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }} tickFormatter={(value) => compactMoney(Number(value))} /><Tooltip formatter={(value) => [formatBRL(Number(value)), "Carteira"]} contentStyle={tooltipStyle} itemStyle={{ color: "#ffffff" }} labelStyle={{ color: "rgba(255,255,255,0.55)" }} /><Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#15191f", strokeWidth: 2 }} /></LineChart></ResponsiveContainer> : <EmptyChart text="Atualize o valor da carteira para formar a evolucao." />}
      </ChartCard>
      <ChartCard title="Aportes mensais" description="Quanto foi investido em cada mes">
        {contributionData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={contributionData} margin={{ top: 8, right: 10, left: 2, bottom: 0 }}><CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} /><YAxis width={72} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }} tickFormatter={(value) => compactMoney(Number(value))} /><Tooltip formatter={(value) => [formatBRL(Number(value)), "Aportado"]} cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={tooltipStyle} itemStyle={{ color: "#ffffff" }} labelStyle={{ color: "rgba(255,255,255,0.55)" }} /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer> : <EmptyChart text="Registre aportes para comparar os meses." />}
      </ChartCard>
    </div>

    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Movimentacoes da carteira</h2><p className="mt-1 text-xs text-white/35">O valor real vem do Investidor10 e os aportes permanecem editaveis.</p></div><div className="flex gap-2"><button type="button" onClick={() => setNewSnapshot(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><Wallet className="size-4" />Atualizar carteira</button><button type="button" onClick={() => setNewContribution(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Novo aporte</button></div></div>
      <div className="mt-5 divide-y divide-white/10">{[...contributions].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-semibold">{formatBRL(item.amount)}</p><p className="mt-0.5 text-xs text-white/35">{formatDateBR(item.date)} · {item.institution ?? "Sem instituicao"}</p></div><button type="button" onClick={() => setEditing(item)} className="rounded-md p-1.5 text-white/35 hover:bg-white/10 hover:text-blue-300" title="Editar aporte"><Pencil className="size-4" /></button><button type="button" onClick={async () => { if (window.confirm("Excluir este aporte?")) { await removerAporteLifeOS(item.id); router.refresh(); } }} className="rounded-md p-1.5 text-white/25 hover:bg-red-400/10 hover:text-red-300" title="Excluir aporte"><Trash2 className="size-4" /></button></div>)}{!contributions.length && <p className="py-8 text-center text-sm text-white/35">Nenhum aporte registrado.</p>}</div>
    </section>

    {newContribution && <Modal title="Novo aporte" onClose={() => setNewContribution(false)}><ContributionForm today={today} onDone={() => { setNewContribution(false); router.refresh(); }} /></Modal>}
    {editing && <Modal title="Editar aporte" onClose={() => setEditing(null)}><ContributionForm today={today} item={editing} onDone={() => { setEditing(null); router.refresh(); }} /></Modal>}
    {newSnapshot && <Modal title="Atualizar carteira" onClose={() => setNewSnapshot(false)}><AsyncForm action={salvarCarteiraLifeOS} onDone={() => { setNewSnapshot(false); router.refresh(); }}><Field name="date" label="Data" type="date" defaultValue={today} required /><Field name="total_value" label="Valor atual da carteira" type="number" step="0.01" required /><Field name="notes" label="Observacao" /></AsyncForm></Modal>}
  </section>;
}

function ContributionForm({ today, item, onDone }: { today: string; item?: InvestmentContribution; onDone: () => void }) { return <AsyncForm action={item ? (data) => editarAporteLifeOS(item.id, data) : criarAporteLifeOS} onDone={onDone}><div className="grid grid-cols-2 gap-3"><Field name="amount" label="Valor" type="number" step="0.01" defaultValue={item?.amount.toFixed(2)} required /><Field name="date" label="Data" type="date" defaultValue={item?.date ?? today} required /></div><Field name="institution" label="Instituicao" defaultValue={item?.institution ?? undefined} /><Field name="notes" label="Observacao" defaultValue={item?.notes ?? undefined} /></AsyncForm>; }
function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-white/35">{description}</p><div className="mt-5 h-64">{children}</div></section>; }
function EmptyChart({ text }: { text: string }) { return <div className="flex h-full items-center justify-center rounded-lg bg-white/[0.02] px-5 text-center text-sm text-white/35">{text}</div>; }
function compactMoney(value: number): string { if (Math.abs(value) >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`; if (Math.abs(value) >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`; return `R$${value}`; }
const tooltipStyle = { background: "#0b0d10", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#ffffff", fontSize: 12 };
function Metric({ title, value, tone }: { title: string; value: string; tone?: "positive" | "negative" }) { return <div className="rounded-lg border border-white/10 bg-[#15191f] p-4 text-white"><p className="text-xs text-white/45">{title}</p><p className={`mt-2 font-bold ${tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : ""}`}>{value}</p></div>; }
function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) { const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-300">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>; }
function Field({ name, label, type = "text", defaultValue, required, step }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; step?: string }) { return <label className="block text-xs font-medium text-white/45">{label}<input name={name} type={type} step={step} defaultValue={defaultValue} required={required} className={`${inputClass} mt-1`} /></label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-5 text-white"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-white/45">Fechar</button></div>{children}</div></div>; }
