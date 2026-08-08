"use client";

import { useEffect, useState } from "react";
import { Beaker, RotateCcw, Save, Sparkles } from "lucide-react";
import type { ScenarioDraft, ScenarioResultModel } from "@/components/performance/investments/types";
import { Field, inputClass, money, primaryButtonClass, secondaryButtonClass, signedMoney, Surface } from "@/components/performance/investments/ui";

export function InvestmentScenarioLab({ draft, result, dirty, canApply, applyBlockedReason = null, applying = false, conservativeReturn, today, onChange, onReset, onApply }: { draft: ScenarioDraft; result: ScenarioResultModel; dirty: boolean; canApply: boolean; applyBlockedReason?: string | null; applying?: boolean; conservativeReturn: number; today: string; onChange: (next: ScenarioDraft) => void; onReset: () => void; onApply: () => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!dirty) return setAnnouncement("");
      setAnnouncement(result.error ? "Não foi possível recalcular a simulação." : `Simulação recalculada. Valor projetado: ${money(result.projectedValue)}.`);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [dirty, result.error, result.projectedValue]);

  const update = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) => onChange({ ...draft, [key]: value });
  const shortcut = (kind: "plus200" | "plus500" | "pause" | "earlier" | "conservative") => {
    if (kind === "plus200") update("monthlyContribution", draft.monthlyContribution + 200);
    if (kind === "plus500") update("monthlyContribution", draft.monthlyContribution + 500);
    if (kind === "pause") update("pauseMonths", 3);
    if (kind === "conservative") update("annualReturn", conservativeReturn);
    if (kind === "earlier") {
      const candidate = endOfMonth(addYearsClamped(draft.targetDate, -2));
      update("targetDate", candidate > today ? candidate : earliestTargetMonthEnd(today));
    }
  };

  return <Surface className="p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-300"><Beaker className="size-5" aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200/70">Laboratório</p><h2 className="mt-1 text-lg font-semibold">E se?</h2><p className="mt-1 text-sm leading-6 text-white/55">Experimente mudanças sem alterar o plano salvo.</p></div></div>
      {dirty && <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-xs font-semibold text-violet-200"><Sparkles className="size-3.5" aria-hidden="true" />Simulação não salva</span>}
    </div>
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Atalhos de simulação">
      <Shortcut onClick={() => shortcut("plus200")}>+ R$ 200 por mês</Shortcut><Shortcut onClick={() => shortcut("plus500")}>+ R$ 500 por mês</Shortcut><Shortcut onClick={() => shortcut("pause")}>Pausar por 3 meses</Shortcut><Shortcut onClick={() => shortcut("earlier")}>Antecipar a meta em 2 anos</Shortcut><Shortcut onClick={() => shortcut("conservative")}>Cenário mais conservador</Shortcut>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NumberField id="scenario-monthly" label="Aporte mensal" value={draft.monthlyContribution} onChange={(value) => update("monthlyContribution", value)} />
      <div className="grid gap-2"><NumberField id="scenario-extra" label="Aporte extra único" value={draft.oneTimeContribution} onChange={(value) => update("oneTimeContribution", value)} />{draft.oneTimeContribution > 0 && <Field label="Data do aporte extra" htmlFor="scenario-extra-date"><input id="scenario-extra-date" type="date" min={addCivilDays(today, 1)} max={draft.targetDate} value={draft.oneTimeContributionDate} onChange={(event) => update("oneTimeContributionDate", event.target.value)} className={inputClass} /></Field>}</div>
      <NumberField id="scenario-pause" label="Pausa em aportes" value={draft.pauseMonths} onChange={(value) => update("pauseMonths", Math.max(0, Math.round(value)))} suffix="meses" step="1" />
      <Field label="Mês-alvo" htmlFor="scenario-target-date" hint="A projeção usa o último dia do mês escolhido."><input id="scenario-target-date" type="month" min={earliestTargetMonthEnd(today).slice(0, 7)} value={draft.targetDate.slice(0, 7)} onChange={(event) => update("targetDate", event.target.value ? endOfMonth(`${event.target.value}-01`) : "")} className={inputClass} /></Field>
      <NumberField id="scenario-target" label="Valor-alvo" value={draft.targetValue} onChange={(value) => update("targetValue", value)} />
      <button type="button" onClick={() => setAdvanced((value) => !value)} className={`${secondaryButtonClass} self-end`} aria-expanded={advanced}>Premissas avançadas</button>
    </div>
    {advanced && <div className="mt-4 grid gap-4 rounded-lg border border-white/[0.07] bg-[#0f1318] p-4 sm:grid-cols-2">
      <div className="grid gap-2"><NumberField id="scenario-withdrawal" label="Retirada futura opcional" value={draft.futureWithdrawal} onChange={(value) => update("futureWithdrawal", value)} />{draft.futureWithdrawal > 0 && <Field label="Data da retirada" htmlFor="scenario-withdrawal-date"><input id="scenario-withdrawal-date" type="date" min={addCivilDays(today, 1)} max={draft.targetDate} value={draft.futureWithdrawalDate} onChange={(event) => update("futureWithdrawalDate", event.target.value)} className={inputClass} /></Field>}</div>
      <NumberField id="scenario-return" label="Taxa anual líquida" value={draft.annualReturn * 100} onChange={(value) => update("annualReturn", value / 100)} suffix="% a.a." step="0.1" min={-99.99} />
    </div>}
    <div className="mt-5 rounded-lg border border-violet-300/15 bg-violet-300/[0.055] p-4" aria-live="off">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Result label="Projeção simulada" value={money(result.projectedValue)} /><Result label="Diferença para o plano" value={signedMoney(result.deltaValue)} /><Result label="Mudança no aporte" value={signedMoney(result.contributionDelta)} /><Result label="Mudança no prazo" value={scenarioMonthDifferenceLabel(result.targetDateDeltaMonths)} /><Result label="Alcance estimado" value={result.reachDate ? new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${result.reachDate}T12:00:00Z`)).replace(".", "") : "Não alcançada"} /></div>
      {result.error && <p role="alert" className="mt-3 text-sm text-red-300">{result.error}</p>}
    </div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {(draft.oneTimeContribution > 0 || draft.pauseMonths > 0 || draft.futureWithdrawal > 0) && <p className="mt-4 text-xs leading-5 text-white/50">Aporte extra, pausa e retirada são hipóteses temporárias e não viram movimentações reais. Zere essas hipóteses antes de aplicar uma revisão; registre aportes e retiradas quando eles realmente acontecerem.</p>}
    {dirty && !canApply && !result.error && <p className="mt-3 text-xs leading-5 text-amber-200">{applyBlockedReason ?? "Para criar uma revisão, altere o aporte mensal, a meta, o prazo ou a taxa."}</p>}
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onReset} disabled={!dirty || applying} className={secondaryButtonClass}><RotateCcw className="size-4" aria-hidden="true" />Descartar simulação</button>
      <button type="button" onClick={onApply} disabled={!dirty || !canApply || Boolean(result.error) || applying} className={primaryButtonClass}><Save className="size-4" aria-hidden="true" />{applying ? "Aplicando…" : "Aplicar ao plano"}</button>
    </div>
  </Surface>;
}

function NumberField({ id, label, value, onChange, suffix, step = "0.01", min = 0 }: { id: string; label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: string; min?: number }) { return <Field label={label} htmlFor={id}><div className="relative"><input id={id} type="number" min={min} step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className={`${inputClass} ${suffix ? "pr-16" : ""}`} />{suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/50">{suffix}</span>}</div></Field>; }
function Shortcut({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-white/60 transition-colors hover:border-violet-300/25 hover:bg-violet-300/[0.08] hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">{children}</button>; }
function Result({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-white/50">{label}</p><p className="mt-1 truncate text-sm font-semibold tabular-nums text-white/80" title={value}>{value}</p></div>; }
function scenarioMonthDifferenceLabel(value: number | null): string { if (value == null) return "Indisponível"; if (value === 0) return "Sem mudança"; const count = Math.abs(value); return `${count} ${count === 1 ? "mês" : "meses"} ${value < 0 ? "antes" : "depois"}`; }
function addCivilDays(date: string, days: number): string { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function addYearsClamped(date: string, years: number): string { const [year, month, day] = date.split("-").map(Number); const targetYear = Math.max(1970, year + years); const lastDay = new Date(Date.UTC(targetYear, month, 0, 12)).getUTCDate(); return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`; }
function endOfMonth(date: string): string { const [year, month] = date.split("-").map(Number); return `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0, 12)).getUTCDate()).padStart(2, "0")}`; }
function earliestTargetMonthEnd(today: string): string { const currentMonthEnd = endOfMonth(today); return currentMonthEnd > today ? currentMonthEnd : endOfMonth(addCivilDays(today, 1)); }
