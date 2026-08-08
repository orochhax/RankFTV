import { AlertTriangle, CalendarClock, PencilLine, RefreshCw } from "lucide-react";
import { dateLabel, primaryButtonClass, secondaryButtonClass } from "@/components/performance/investments/ui";

export function InvestmentRouteHeader({ lastCheckinDate, snapshotAgeDays, dataIsEstimated, dataUnavailable = false, onCheckin, onEditPlan, hasPlan }: { lastCheckinDate: string | null; snapshotAgeDays: number | null; dataIsEstimated: boolean; dataUnavailable?: boolean; onCheckin: () => void; onEditPlan: () => void; hasPlan: boolean }) {
  const stale = snapshotAgeDays != null && snapshotAgeDays > 35;
  return <header className="space-y-4 text-white">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/80">
          <CalendarClock className="size-4" aria-hidden="true" /> GPS patrimonial
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Carteira em Rota</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50 sm:text-base">Veja para onde seu ritmo atual está levando você — e qual ação de hoje mantém seu plano vivo.</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
          <span>Último check-in: {dataUnavailable ? "indisponível" : lastCheckinDate ? dateLabel(lastCheckinDate) : "ainda não realizado"}</span>
          {dataIsEstimated && <span className="inline-flex items-center gap-1 text-amber-200"><AlertTriangle className="size-3.5" aria-hidden="true" /> valor atual estimado</span>}
        </div>
      </div>
      <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
        <button type="button" onClick={onCheckin} className={primaryButtonClass}><RefreshCw className="size-4" aria-hidden="true" />Fazer check-in</button>
        {hasPlan && <button type="button" onClick={onEditPlan} className={secondaryButtonClass}><PencilLine className="size-4" aria-hidden="true" />Ajustar plano</button>}
      </div>
    </div>
    {stale && <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm leading-6 text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>Sua carteira não é atualizada há {snapshotAgeDays} dias. Faça um check-in para recalcular a rota com uma leitura mais confiável.</p>
    </div>}
  </header>;
}
