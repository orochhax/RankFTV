"use client";

import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import type { FinancialHealthResult, FinancialHealthTone } from "@/lib/financial-cockpit";

const TONE_MAP: Record<
  FinancialHealthTone,
  { ring: string; badge: string; bar: string; text: string }
> = {
  emerald: {
    ring: "stroke-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  blue: {
    ring: "stroke-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    bar: "bg-blue-600",
    text: "text-blue-600",
  },
  amber: {
    ring: "stroke-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  rose: {
    ring: "stroke-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
};

export function FinancialHealthCard({
  health,
  onNavigateTab,
}: {
  health: FinancialHealthResult;
  onNavigateTab?: (tab: "visao" | "carteira" | "despesas" | "relatorios" | "taxas") => void;
}) {
  const palette = TONE_MAP[health.tone];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Activity className="size-3.5 text-blue-600" />
            Saúde Financeira Inteligente
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Diagnóstico automático do equilíbrio entre caixa, margem e contas.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${palette.badge}`}
        >
          {health.bandLabel}
        </span>
      </div>

      {/* Gauge + Pontuação */}
      <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-surface-2/40 p-3.5">
        <div className="relative flex size-24 shrink-0 items-center justify-center">
          <svg className="size-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
            <circle
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="8"
              fill="none"
              className="stroke-slate-200"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`${palette.ring} transition-all duration-500`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black leading-none ${palette.text}`}>
              {health.score}
            </span>
            <span className="mt-0.5 text-[10px] font-semibold text-ink-muted">/ 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          {health.pillars.map((pillar) => {
            const pPalette = TONE_MAP[pillar.tone];
            const pct = Math.round((pillar.score / pillar.max) * 100);
            return (
              <div key={pillar.id}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate font-semibold text-ink">{pillar.label}</span>
                  <span className="shrink-0 font-bold text-ink-muted">
                    {pillar.score}/{pillar.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${pPalette.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recomendações acionáveis */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Recomendações & Alertas
        </p>
        {health.insights.map((insight) => (
          <div
            key={insight.id}
            className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-surface p-3"
          >
            {insight.severity === "danger" ? (
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-600" />
            ) : insight.severity === "warn" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink">{insight.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {insight.description}
              </p>
              {insight.actionTab && onNavigateTab && insight.actionTab !== "visao" && (
                <button
                  type="button"
                  onClick={() => onNavigateTab(insight.actionTab!)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Abrir aba correspondente
                  <ArrowRight className="size-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
