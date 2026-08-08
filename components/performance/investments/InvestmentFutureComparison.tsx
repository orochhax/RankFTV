import { ArrowRight, CalendarDays, Route, Target } from "lucide-react";
import type { FutureModel } from "@/components/performance/investments/types";
import { dateLabel, money, signedMoney, Surface } from "@/components/performance/investments/ui";

export function InvestmentFutureComparison({ currentPace, followingPlan, hasBehaviorHistory }: { currentPace: FutureModel; followingPlan: FutureModel; hasBehaviorHistory: boolean }) {
  return <Surface className="p-5 sm:p-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Dois futuros</p><h2 className="mt-1 text-lg font-semibold">A diferença entre manter o ritmo e seguir o plano</h2><p className="mt-1 text-sm leading-6 text-white/55">Mesma meta, duas atitudes mensais comparadas no cenário-base.</p></div>
    {!hasBehaviorHistory && <div role="status" className="mt-5 rounded-lg border border-blue-300/15 bg-blue-300/[0.07] px-4 py-3 text-sm leading-6 text-blue-100">Ainda estamos formando seu ritmo real. São necessários pelo menos três meses encerrados.</div>}
    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
      <FutureCard model={currentPace} tone="current" unavailable={!hasBehaviorHistory} />
      <span className="hidden items-center text-white/20 lg:flex"><ArrowRight className="size-5" aria-hidden="true" /></span>
      <FutureCard model={followingPlan} tone="plan" unavailable={false} />
    </div>
  </Surface>;
}
function FutureCard({ model, tone, unavailable }: { model: FutureModel; tone: "current" | "plan"; unavailable: boolean }) {
  return <article className={`rounded-lg border p-4 sm:p-5 ${tone === "plan" ? "border-blue-300/20 bg-blue-300/[0.055]" : "border-white/[0.08] bg-[#0f1318]"}`}>
    <div className="flex items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone === "plan" ? "bg-blue-400/10 text-blue-300" : "bg-emerald-400/10 text-emerald-300"}`}>{tone === "plan" ? <Target className="size-4" aria-hidden="true" /> : <Route className="size-4" aria-hidden="true" />}</span><div><h3 className="font-semibold">{model.title}</h3><p className="mt-1 text-xs leading-5 text-white/50">{model.description}</p></div></div>
    {unavailable ? <p className="mt-6 text-sm text-white/55">Projeção comportamental indisponível até completar três meses de histórico.</p> : <>
      <div className="mt-6"><p className="text-xs text-white/50">Projeção na data-alvo</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(model.projectedValue)}</p><p className={`mt-1 text-xs ${model.targetDifference != null && model.targetDifference >= 0 ? "text-emerald-300" : "text-amber-200"}`}>{model.targetDifference == null ? "Diferença indisponível" : `${signedMoney(model.targetDifference)} em relação à meta`}</p></div>
      <dl className="mt-5 space-y-3 border-t border-white/[0.07] pt-4 text-sm">
        <FutureDetail label="Aporte usado" value={`${money(model.monthlyContribution)} / mês`} />
        <FutureDetail label="Alcance estimado" value={model.reachDate ? dateLabel(model.reachDate) : "Não alcançada nas premissas atuais"} icon={<CalendarDays className="size-3.5" />} />
        <FutureDetail label="Diferença de prazo" value={model.monthDifference == null ? "Indisponível" : monthDifferenceLabel(model.monthDifference)} />
        <FutureDetail label="Qualidade da leitura" value={model.qualityLabel} />
      </dl>
    </>}
  </article>;
}

function FutureDetail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="flex items-start justify-between gap-3"><dt className="flex items-center gap-1.5 text-white/50">{icon}{label}</dt><dd className="max-w-[58%] text-right font-medium text-white/70">{value}</dd></div>; }
function monthDifferenceLabel(value: number): string { if (value === 0) return "No mês planejado"; const count = Math.abs(value); return `${count} ${count === 1 ? "mês" : "meses"} ${value < 0 ? "antes" : "depois"}`; }
