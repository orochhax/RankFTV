"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, CheckCircle2, Flame, Minus, RefreshCw, Sparkles, Target, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { gerarInsightLifeOS } from "@/app/admin/performance/life-os-actions";
import type { DailyLifeAnalysis, DailyLifeStatus } from "@/lib/daily-life-analysis";
import type { ConsistencyStatus } from "@/lib/performance-analytics";

type Props = {
  analysis: DailyLifeAnalysis | null;
  consistency: ConsistencyStatus;
};

const statusCopy: Record<DailyLifeStatus, { label: string; color: string; border: string }> = {
  excellent: { label: "Excelente", color: "text-emerald-300", border: "border-emerald-400/30" },
  good: { label: "Bom", color: "text-emerald-300", border: "border-emerald-400/30" },
  attention: { label: "Atenção", color: "text-amber-300", border: "border-amber-400/30" },
  critical: { label: "Crítico", color: "text-red-300", border: "border-red-400/30" },
  insufficient_data: { label: "Poucos dados", color: "text-white/55", border: "border-white/15" },
};

function generatedLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Análise diária";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bahia",
  }).format(date).replace(".", "");
}

function AnalysisAction({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return <div className={compact ? "" : "mt-5"}>
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        setError(null);
        const result = await gerarInsightLifeOS();
        if (!result.ok) setError(result.error ?? "Não foi possível atualizar a análise.");
        else router.refresh();
      })}
      className={`inline-flex items-center gap-2 rounded-lg border border-white/10 font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50 ${compact ? "size-9 justify-center p-0" : "px-3 py-2 text-sm"}`}
      title="Atualizar análise agora"
      aria-label="Atualizar análise agora"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {!compact && (pending ? "Analisando..." : "Analisar agora")}
    </button>
    {error && <p className="mt-2 max-w-md text-xs text-red-300" role="alert">{error}</p>}
  </div>;
}

function EmptyAnalysis() {
  return <section className="overflow-hidden rounded-lg border border-white/10 bg-[#15191f] text-white">
    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-300">
          <BrainCircuit className="size-4" />
          Visão diária
        </div>
        <h2 className="mt-3 text-xl font-semibold">Sua primeira leitura será preparada às 05:00</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">O sistema vai comparar seus compromissos concluídos, estudos, treinos, metas e demais dados registrados. Enquanto isso, você pode gerar a primeira leitura agora.</p>
        <AnalysisAction />
      </div>
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20">
        <Sparkles className="size-8 text-blue-300" />
      </div>
    </div>
  </section>;
}

export function DailyLifeAnalysisCard({ analysis, consistency }: Props) {
  if (!analysis) return <EmptyAnalysis />;

  const status = statusCopy[analysis.status];
  const TrendIcon = analysis.trend === "up" ? TrendingUp : analysis.trend === "down" ? TrendingDown : Minus;
  const trendColor = analysis.trend === "up" ? "text-emerald-300" : analysis.trend === "down" ? "text-red-300" : "text-white/45";

  return <section className={`overflow-hidden rounded-lg border bg-[#15191f] text-white ${status.border}`}>
    <div className="border-b border-white/10 px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase text-blue-300"><BrainCircuit className="size-4" />Visão diária</span>
        <span aria-hidden="true">·</span>
        <span>{generatedLabel(analysis.generatedAt)}</span>
        <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/55">{analysis.generation.mode === "ai" ? "Análise com IA" : "Leitura local"}</span>
        <div className="ml-auto"><AnalysisAction compact /></div>
      </div>
    </div>

    <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
      <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <p className={`text-xs font-semibold uppercase ${status.color}`}>{status.label}</p>
        <div className="mt-2 flex items-end gap-1">
          <strong className="text-5xl font-semibold leading-none">{analysis.score ?? "--"}</strong>
          <span className="pb-1 text-sm text-white/35">/100</span>
        </div>
        <div className={`mt-4 flex items-center gap-2 text-xs ${trendColor}`}>
          <TrendIcon className="size-4" />
          <span>{analysis.trend === "up" ? "Ritmo em alta" : analysis.trend === "down" ? "Ritmo em queda" : analysis.trend === "stable" ? "Ritmo estável" : "Sem comparação"}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/55">
          <Flame className={`size-4 ${consistency.streak ? "fill-orange-400 text-orange-400" : "text-white/25"}`} />
          <span><b className="text-white">{consistency.streak}</b> {consistency.streak === 1 ? "dia" : "dias"} de constância</span>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-white/35" title={`A nota usa somente: ${analysis.coverage.scoreBasis.join(", ") || "nenhuma area mensuravel"}.`}>Base: {analysis.coverage.scoreBasis.length ? analysis.coverage.scoreBasis.join(" + ") : "dados insuficientes"}</p>
      </div>

      <div className="p-5 sm:p-6">
        <h2 className="max-w-4xl text-xl font-semibold leading-7">{analysis.headline}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">{analysis.summary}</p>
        <div className={`mt-4 flex items-start gap-2 text-sm ${trendColor}`}>
          <TrendIcon className="mt-0.5 size-4 shrink-0" />
          <p>{analysis.comparison}</p>
        </div>
      </div>
    </div>

    <div className="grid border-t border-white/10 lg:grid-cols-3">
      <div className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-emerald-300" />O que avançou</h3>
        <div className="mt-4 space-y-4">
          {analysis.wins.length ? analysis.wins.map((item, index) => <div key={`${item.title}-${index}`}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/45">{item.evidence}</p>
          </div>) : <p className="text-xs leading-5 text-white/40">Nenhum avanço consistente apareceu nos dados desta janela.</p>}
        </div>
      </div>

      <div className="border-t border-white/10 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert className="size-4 text-amber-300" />Pontos de atenção</h3>
        <div className="mt-4 space-y-4">
          {analysis.alerts.length ? analysis.alerts.map((item, index) => <div key={`${item.title}-${index}`}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-white/45">{item.evidence}</p>
            <p className="mt-1 text-xs leading-5 text-amber-200/65">{item.impact}</p>
          </div>) : <p className="text-xs leading-5 text-white/40">Nenhum alerta relevante apareceu nos dados desta janela.</p>}
        </div>
      </div>

      <div className="border-t border-white/10 p-5 sm:p-6 lg:border-l lg:border-t-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-blue-300" />Plano de hoje</h3>
        <ol className="mt-4 space-y-4">
          {analysis.priorities.map((item, index) => <li key={`${item.title}-${index}`} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-xs font-semibold text-blue-300">{index + 1}</span>
            <div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-white/55">{item.action}</p><p className="mt-1 text-[11px] leading-5 text-white/35">{item.why}</p></div>
          </li>)}
        </ol>
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-5 py-3 text-xs text-white/40 sm:px-6">
      <p>{analysis.closingMessage}</p>
      <p>{analysis.coverage.available.length} áreas com dados{analysis.coverage.missing.length ? ` · faltando: ${analysis.coverage.missing.join(", ")}` : ""}</p>
    </div>
  </section>;
}
