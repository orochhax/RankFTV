import { ArrowDownToLine, CheckCircle2, CircleDollarSign, List } from "lucide-react";
import type { MonthlyActionModel } from "@/components/performance/investments/types";
import { money, primaryButtonClass, secondaryButtonClass, Surface } from "@/components/performance/investments/ui";

export function MonthlyInvestmentAction({ model, onAddContribution, onShowMovements }: { model: MonthlyActionModel; onAddContribution: () => void; onShowMovements: () => void }) {
  const progress = Math.max(0, Math.min(100, model.progressPercent ?? 0));
  const hasMonthlyTarget = model.planned != null && model.planned > 0;
  const complete = model.remaining <= 0 && hasMonthlyTarget;
  return <Surface className="h-full p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${complete ? "bg-emerald-400/10 text-emerald-300" : "bg-blue-400/10 text-blue-300"}`}>{complete ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <CircleDollarSign className="size-5" aria-hidden="true" />}</span>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Ação deste mês</p><h2 className="mt-1 text-lg font-semibold capitalize">{model.monthLabel}</h2></div>
    </div>
    <p className="mt-5 text-sm leading-6 text-white/70">{model.message}</p>
    <div className="mt-5">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs text-white/50">Já registrado</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(model.contributed)}</p></div><p className="text-right text-xs text-white/55">{hasMonthlyTarget ? `de ${money(model.planned)}` : "Sem meta mensal"}</p></div>
      {hasMonthlyTarget ? <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progresso do aporte mensal"><div className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-blue-500"}`} style={{ width: `${progress}%` }} /></div> : <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/55">A revisão aplicável não define aporte para este mês.</p>}
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-3">
      <MiniMetric label={hasMonthlyTarget ? (model.excess > 0 ? "Excedente" : "Falta") : "Meta do mês"} value={hasMonthlyTarget ? money(model.excess > 0 ? model.excess : model.remaining) : "Sem meta mensal"} tone={hasMonthlyTarget && model.excess > 0 ? "positive" : hasMonthlyTarget && model.remaining > 0 ? "attention" : "neutral"} />
      <MiniMetric label="Impacto no valor projetado" value={model.impact == null ? "Indisponível" : `+ ${money(model.impact)}`} tone={model.impact != null && model.impact > 0 ? "positive" : "neutral"} />
    </dl>
    <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      <button type="button" onClick={onAddContribution} className={primaryButtonClass}><ArrowDownToLine className="size-4" aria-hidden="true" />Registrar aporte</button>
      <button type="button" onClick={onShowMovements} className={secondaryButtonClass}><List className="size-4" aria-hidden="true" />Ver movimentações</button>
    </div>
    <p className="mt-4 text-xs leading-5 text-white/50">O mês atual permanece em andamento; ele não é classificado como falha antes do encerramento.</p>
  </Surface>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "positive" | "attention" | "neutral" }) {
  return <div className="rounded-lg border border-white/[0.07] bg-[#0f1318] p-3"><dt className="text-xs text-white/50">{label}</dt><dd className={`mt-1 truncate text-sm font-semibold tabular-nums ${tone === "positive" ? "text-emerald-300" : tone === "attention" ? "text-amber-200" : "text-white/75"}`} title={value}>{value}</dd></div>;
}
