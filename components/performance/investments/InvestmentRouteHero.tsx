import { AlertCircle, AlertTriangle, CheckCircle2, CircleDashed, Flag, Gauge, TrendingUp } from "lucide-react";
import type { RouteHeroModel, RouteStatusKey } from "@/components/performance/investments/types";
import { dateLabel, money, percent, Surface } from "@/components/performance/investments/ui";

const statusConfig: Record<RouteStatusKey, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Concluída", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200", icon: CheckCircle2 },
  ahead: { label: "Adiantada", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200", icon: TrendingUp },
  on_track: { label: "No caminho", className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200", icon: CheckCircle2 },
  attention: { label: "Atenção", className: "border-amber-300/25 bg-amber-300/10 text-amber-200", icon: AlertTriangle },
  off_track: { label: "Fora da rota", className: "border-red-300/25 bg-red-300/10 text-red-200", icon: AlertCircle },
  calculating: { label: "Calculando sua rota", className: "border-blue-300/25 bg-blue-300/10 text-blue-200", icon: CircleDashed },
  update_required: { label: "Atualização necessária", className: "border-amber-300/25 bg-amber-300/10 text-amber-200", icon: AlertTriangle },
  insufficient_data: { label: "Dados insuficientes", className: "border-white/15 bg-white/[0.05] text-white/65", icon: CircleDashed },
};

export function InvestmentRouteHero({ model }: { model: RouteHeroModel }) {
  const config = statusConfig[model.status];
  const StatusIcon = config.icon;
  const progress = model.progressPercent == null ? 0 : Math.max(0, Math.min(100, model.progressPercent));
  return <Surface className="relative overflow-hidden p-5 sm:p-6 lg:p-7">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Seu destino</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}><StatusIcon className="size-3.5" aria-hidden="true" />{config.label}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{model.title}</h2>
        {model.scheduledEffectiveFrom && <p className="mt-2 rounded-lg border border-blue-300/15 bg-blue-300/[0.055] px-3 py-2 text-xs leading-5 text-blue-100">A revisão mais recente está agendada para {dateLabel(model.scheduledEffectiveFrom)}. As projeções futuras abaixo já refletem essa mudança; a meta do mês atual continua usando a revisão vigente.</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HeroMetric label="Destino" value={money(model.targetValue)} detail={dateLabel(model.targetDate)} />
          <HeroMetric label={model.currentIsEstimated ? "Posição estimada" : "Posição observada"} value={money(model.currentValue)} detail={model.currentIsEstimated ? "Desde o último check-in" : "Valor do último check-in"} />
          <HeroMetric label="Projeção no prazo" value={model.projectedBase == null ? "Indisponível" : money(model.projectedBase)} detail={model.projectedLow != null && model.projectedHigh != null ? `${money(model.projectedLow)} a ${money(model.projectedHigh)}` : "Aguardando dados"} />
        </div>
        <div className="mt-5" aria-label={model.progressPercent == null ? "Progresso indisponível" : `${percent(model.progressPercent)} do valor-alvo`}>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-white/55">Patrimônio atual sobre o alvo</span><span className="font-semibold tabular-nums text-white/70">{percent(model.progressPercent)}</span></div>
          {model.progressPercent == null ? <p className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs text-white/60">Faça um check-in para calcular o progresso sem tratar dado ausente como zero.</p> : <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${progress}%` }} /></div>}
        </div>
        {model.currentIsEstimated && <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2 text-xs leading-5 text-amber-100">Estimado desde o último check-in: soma apenas aportes e retiradas posteriores e não inclui o movimento da carteira após essa data.</p>}
      </div>
      <aside className="w-full rounded-lg border border-white/10 bg-[#0f1318] p-4 xl:max-w-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300"><Gauge className="size-4" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-white/50">Leitura da rota</p><p className="mt-1 text-sm leading-6 text-white/70">{model.explanation}</p></div>
        </div>
        <dl className="mt-4 divide-y divide-white/[0.07] border-t border-white/[0.07] text-sm">
          <HeroDetail icon={<Flag className="size-3.5" />} label="Aporte mensal estimado" value={money(model.requiredMonthlyContribution)} />
          <HeroDetail icon={<TrendingUp className="size-3.5" />} label="Diferença para o plano" value={model.planDifference == null ? "Indisponível" : money(model.planDifference)} />
        </dl>
        <p className="mt-3 text-xs leading-5 text-white/50">{model.valueModeLabel} · referência {dateLabel(model.referenceDate)}{model.realConversionApproximate ? ". A conversão dos valores observados usa a inflação configurada e é aproximada." : "."}</p>
      </aside>
    </div>
  </Surface>;
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0"><p className="text-xs text-white/50">{label}</p><p className="mt-1 truncate text-xl font-semibold tabular-nums text-white sm:text-2xl" title={value}>{value}</p><p className="mt-1 truncate text-xs text-white/50" title={detail}>{detail}</p></div>;
}

function HeroDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-2 py-3"><span className="text-white/50" aria-hidden="true">{icon}</span><dt className="min-w-0 flex-1 text-white/55">{label}</dt><dd className="shrink-0 font-semibold tabular-nums text-white/80">{value}</dd></div>;
}
