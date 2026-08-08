import { ArrowDown, ArrowUp, Equal, Info, Landmark, UserRound } from "lucide-react";
import type { RouteBreakdownModel } from "@/components/performance/investments/types";
import { dateLabel, money, percent, signedMoney, Surface } from "@/components/performance/investments/ui";

export function InvestmentRouteBreakdown({ model }: { model: RouteBreakdownModel | null }) {
  return <Surface className="p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300"><Equal className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">O que moveu sua rota</p><h2 className="mt-1 text-lg font-semibold">Ações sob seu controle e movimento da carteira</h2>{model && <p className="mt-1 text-xs text-white/50">De {dateLabel(model.from)} a {dateLabel(model.to)}</p>}</div></div>
    {!model ? <div className="mt-6 rounded-lg border border-dashed border-white/10 px-5 py-10 text-center text-sm leading-6 text-white/50">Faça ao menos dois check-ins para decompor o que moveu a carteira entre eles.</div> : <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <BreakdownGroup icon={<UserRound className="size-4" />} title="Suas ações" tone="blue">
          <BreakdownLine icon={<ArrowUp className="size-3.5" />} label="Aportes" value={model.contributions} tone="positive" />
          <BreakdownLine icon={<ArrowDown className="size-3.5" />} label="Retiradas" value={-model.withdrawals} tone="negative" />
          <BreakdownLine label="Aporte líquido" value={model.contributions - model.withdrawals} />
        </BreakdownGroup>
        <BreakdownGroup icon={<Landmark className="size-4" />} title="Movimento da carteira" tone="violet">
          <BreakdownLine label="Resultado residual" value={model.residual} tone={model.residual < 0 ? "negative" : "positive"} />
          <BreakdownLine label="Variação total" value={model.totalChange} tone={model.totalChange < 0 ? "negative" : "positive"} />
          <div className="flex items-center justify-between gap-3 pt-2 text-xs"><span className="text-white/50">Retorno Modified Dietz</span><span className="font-semibold tabular-nums text-white/65">{model.modifiedDietzReturn == null ? "Indisponível" : percent(model.modifiedDietzReturn * 100, 2)}</span></div>
        </BreakdownGroup>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-[#0f1318] px-4 py-3 text-sm"><span className="text-white/55">Carteira</span><span className="font-medium text-white/70">{money(model.initialValue)} <span className="px-1 text-white/60">→</span> {money(model.finalValue)}</span><span className={`font-semibold tabular-nums ${model.totalChange < 0 ? "text-red-300" : "text-emerald-300"}`}>{signedMoney(model.totalChange)}</span></div>
      {model.planChange && <div className="mt-4 rounded-lg border border-violet-300/15 bg-violet-300/[0.055] px-4 py-3 text-xs leading-5 text-violet-100"><span className="font-semibold">Mudança de plano no período:</span> {model.planChange}</div>}
      <div className="mt-4 space-y-1.5 text-xs leading-5 text-white/50"><p className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Resultado estimado entre seus check-ins. Ele também pode incluir juros, taxas, impostos, ativos não cadastrados ou ajustes no valor informado.</p><p>{model.valueModeNote}</p></div>
    </>}
  </Surface>;
}

function BreakdownGroup({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: "blue" | "violet"; children: React.ReactNode }) { return <div className="rounded-lg border border-white/[0.07] bg-[#0f1318] p-4"><h3 className={`flex items-center gap-2 text-sm font-semibold ${tone === "blue" ? "text-blue-200" : "text-violet-200"}`}><span aria-hidden="true">{icon}</span>{title}</h3><div className="mt-4 space-y-3">{children}</div></div>; }
function BreakdownLine({ icon, label, value, tone = "neutral" }: { icon?: React.ReactNode; label: string; value: number; tone?: "positive" | "negative" | "neutral" }) { return <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-1.5 text-white/55">{icon && <span aria-hidden="true">{icon}</span>}{label}</span><span className={`font-semibold tabular-nums ${tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-white/70"}`}>{signedMoney(value)}</span></div>; }
