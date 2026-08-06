"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, BookOpenCheck, CheckCircle2, Clock3, Flame, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { PortfolioSnapshot } from "@/lib/performance-life-os";
import {
  academyDurationSeries,
  academyStreak,
  averageDuration,
  investmentSummary,
  nextStudyItem,
  portfolioSeriesVariation,
  portfolioValueSeries,
  roadmapProgress,
  studyWeeklyStats,
  type InvestmentContribution,
  type InvestmentWithdrawal,
  type MetricActivity,
  type PortfolioChartPeriod,
  type StudyRoadmap,
  type StudyRoadmapItem,
  type StudyRoadmapModule,
} from "@/lib/performance-widgets";

type Weight = { data: string; peso_kg: number };

export function AcademyDashboardWidget({ activities, today, weights }: { activities: MetricActivity[]; today: string; weights: Weight[] }) {
  const router = useRouter();
  const completed = activities.filter((item) => item.status === "completed");
  const chart = academyDurationSeries(completed, today);
  const streak = academyStreak(completed.map((item) => item.date), today);
  const average = averageDuration(completed);
  const currentWeight = [...weights].sort((a, b) => a.data.localeCompare(b.data)).at(-1)?.peso_kg;
  const hasDuration = chart.some((item) => item.minutes > 0);

  return <section className="flex min-h-[390px] flex-col rounded-lg border border-white/10 bg-[#11151a] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
    <WidgetHeader title="Academia" subtitle="Ritmo dos ultimos 7 dias" icon={<Flame className="size-4 text-orange-400" />} onOpen={() => router.replace("/admin/performance?view=activities", { scroll: false })} />

    <div className="mt-5 flex items-end gap-3">
      <strong className="text-5xl font-semibold leading-none tabular-nums">{streak}</strong>
      <span className="pb-1 text-sm leading-tight text-white/45">dias em<br />sequencia</span>
    </div>

    <div className="mt-5 h-36" role="img" aria-label="Duracao dos treinos nos ultimos sete dias">
      {hasDuration ? <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.06} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }} />
          <YAxis hide domain={[0, "dataMax + 10"]} />
          <Tooltip labelFormatter={(_, payload) => payload[0]?.payload.fullLabel ?? ""} formatter={(value) => [`${Number(value)} min`, "Treino"]} cursor={{ fill: "rgba(255,255,255,0.03)" }} contentStyle={tooltipStyle} itemStyle={{ color: "#ffffff" }} labelStyle={{ color: "rgba(255,255,255,0.55)", marginBottom: 4 }} />
          <Bar dataKey="minutes" radius={[4, 4, 2, 2]} maxBarSize={30} isAnimationActive={false}>
            {chart.map((item) => <Cell key={item.date} fill={item.date === today ? "#34d399" : "#3b82f6"} fillOpacity={item.minutes > 0 ? 1 : 0.18} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer> : <EmptyChart text="Registre a duracao do treino para formar o grafico." />}
    </div>

    <div className="mt-auto grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4 text-sm">
      <div className="pr-4"><p className="text-xs text-white/35">Tempo medio de treino</p><p className="mt-1 font-semibold tabular-nums">{minutesLabel(average)}</p></div>
      <div className="pl-4"><p className="text-xs text-white/35">Peso atual</p><p className="mt-1 font-semibold tabular-nums">{currentWeight != null ? `${currentWeight.toLocaleString("pt-BR")} kg` : "Sem registro"}</p></div>
    </div>
  </section>;
}

export function FinanceDashboardWidget({ contributions, snapshots, withdrawals }: { contributions: InvestmentContribution[]; snapshots: PortfolioSnapshot[]; withdrawals: InvestmentWithdrawal[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState<PortfolioChartPeriod>("month");
  const summary = investmentSummary(contributions, snapshots, withdrawals);
  const chart = portfolioValueSeries(snapshots, period);
  const variation = portfolioSeriesVariation(chart);
  const positive = (variation?.amount ?? 0) >= 0;

  return <section className="flex min-h-[390px] flex-col rounded-lg border border-white/10 bg-[#11151a] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
    <WidgetHeader title="Investimentos" subtitle="Evolucao da carteira" icon={<Wallet className="size-4 text-emerald-400" />} onOpen={() => router.replace("/admin/performance?view=investments", { scroll: false })} />

    <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs text-white/35">Valor atual</p><strong className="mt-1 block text-3xl font-semibold leading-none tabular-nums">{snapshots.length ? formatBRL(summary.currentValue) : "Nao atualizada"}</strong></div>
      <div className="text-right"><p className={`text-base font-semibold tabular-nums ${variation ? positive ? "text-emerald-400" : "text-red-400" : "text-white/35"}`}>{variation?.percent == null ? "Sem comparacao" : `${positive ? "+" : ""}${variation.percent.toFixed(2)}%`}</p><p className="mt-0.5 text-[10px] uppercase text-white/30">no periodo</p></div>
    </div>

    <div className="mt-4 h-36" role="img" aria-label="Evolucao do valor da carteira">
      {chart.length ? <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart} margin={{ top: 8, right: 3, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.06} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={18} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }} />
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip labelFormatter={(_, payload) => payload[0]?.payload.fullLabel ?? ""} formatter={(value) => [formatBRL(Number(value)), "Carteira"]} contentStyle={tooltipStyle} itemStyle={{ color: "#ffffff" }} labelStyle={{ color: "rgba(255,255,255,0.55)", marginBottom: 4 }} />
          <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} fill="#34d399" fillOpacity={0.1} dot={false} activeDot={{ r: 4, fill: "#11151a", stroke: "#34d399", strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer> : <EmptyChart text="Atualize o valor da carteira para iniciar a evolucao." />}
    </div>

    <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-black/25 p-1" aria-label="Periodo do grafico">
      {([ ["day", "Dias"], ["week", "Semanas"], ["month", "Meses"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${period === value ? "bg-white/12 text-white ring-1 ring-white/10" : "text-white/35 hover:text-white/65"}`} aria-pressed={period === value}>{label}</button>)}
    </div>

    <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4 text-center">
      <FinanceMetric label="Aportado" value={formatBRL(summary.netInvested)} />
      <FinanceMetric label="Resultado" value={formatBRL(summary.result)} tone={summary.result < 0 ? "negative" : "positive"} />
      <FinanceMetric label="Retorno" value={summary.returnPercent == null ? "Sem base" : `${summary.returnPercent >= 0 ? "+" : ""}${summary.returnPercent.toFixed(1)}%`} tone={summary.returnPercent != null && summary.returnPercent < 0 ? "negative" : "positive"} />
    </div>
  </section>;
}

export function StudyDashboardWidget({ roadmap, items, modules, activities, monday, today }: { roadmap: StudyRoadmap | null; items: StudyRoadmapItem[]; modules: StudyRoadmapModule[]; activities: MetricActivity[]; monday: string; today: string }) {
  const router = useRouter();
  const roadmapItems = roadmap ? items.filter((item) => item.roadmapId === roadmap.id) : [];
  const roadmapModules = roadmap ? modules.filter((module) => module.roadmapId === roadmap.id) : [];
  const next = nextStudyItem(roadmapItems);
  const currentModule = next?.moduleId ? roadmapModules.find((module) => module.id === next.moduleId) : null;
  const progress = roadmapProgress(roadmapItems);
  const completed = roadmapItems.filter((item) => item.status === "completed").length;
  const remainingMinutes = roadmapItems.filter((item) => item.status !== "completed").reduce((sum, item) => sum + Math.max(0, item.estimatedMinutes ?? 0), 0);
  const weekly = studyWeeklyStats(activities, monday, today);

  return <section className="flex min-h-[300px] flex-col rounded-lg border border-white/10 bg-[#11151a] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
    <WidgetHeader title="Estudos" subtitle={roadmap ? "Roadmap ativo" : "Nenhum roadmap ativo"} icon={<BookOpenCheck className="size-4 text-amber-300" />} onOpen={() => router.replace("/admin/performance?view=goals", { scroll: false })} />
    {!roadmap ? <div className="flex flex-1 flex-col items-center justify-center py-10 text-center"><BookOpenCheck className="size-7 text-white/20" /><p className="mt-3 text-sm font-medium text-white/65">Escolha uma trilha de estudos</p><p className="mt-1 max-w-sm text-xs leading-5 text-white/30">O progresso e a proxima etapa aparecerao aqui.</p></div> : <>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-lg font-semibold leading-6 text-white">{roadmap.title}</p><p className="mt-1 text-xs text-white/35">{currentModule ? `Agora: ${currentModule.title}` : progress === 100 ? "Trilha concluida" : `${roadmapModules.length} modulos planejados`}</p></div>
        <div className="text-right"><strong className="text-4xl font-semibold leading-none tabular-nums">{progress}%</strong><p className="mt-1 text-[10px] uppercase text-white/30">progresso</p></div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>

      <div className="mt-5 flex min-h-20 items-center gap-3 border-y border-white/[0.07] py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300"><ArrowUpRight className="size-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase text-white/30">Proxima etapa</p><p className="mt-1 line-clamp-2 text-sm font-medium text-white/80">{next?.title ?? "Todas as etapas foram concluidas"}</p></div>
        {next?.estimatedMinutes ? <span className="shrink-0 text-xs tabular-nums text-white/35">{minutesLabel(next.estimatedMinutes)}</span> : null}
      </div>

      <div className="mt-auto grid grid-cols-3 divide-x divide-white/10 pt-4 text-center">
        <StudyMetric icon={<CheckCircle2 className="size-3.5" />} label="Etapas" value={`${completed}/${roadmapItems.length}`} />
        <StudyMetric icon={<Clock3 className="size-3.5" />} label="Nesta semana" value={minutesLabel(weekly.totalMinutes)} />
        <StudyMetric icon={<BookOpenCheck className="size-3.5" />} label="Carga restante" value={minutesLabel(remainingMinutes)} />
      </div>
    </>}
  </section>;
}

function WidgetHeader({ title, subtitle, icon, onOpen }: { title: string; subtitle: string; icon: React.ReactNode; onOpen: () => void }) {
  return <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">{icon}</span><div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-xs text-white/35">{subtitle}</p></div><button type="button" onClick={onOpen} className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white" title={`Ver detalhes de ${title}`} aria-label={`Ver detalhes de ${title}`}><ArrowUpRight className="size-4" /></button></div>;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center border-y border-white/[0.06] px-5 text-center text-xs leading-relaxed text-white/30">{text}</div>;
}

function FinanceMetric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return <div className="min-w-0 px-2"><p className="truncate text-[10px] text-white/30">{label}</p><p className={`mt-1 truncate text-xs font-semibold tabular-nums ${tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "text-white/85"}`} title={value}>{value}</p></div>;
}

function StudyMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0 px-2"><span className="mx-auto flex size-6 items-center justify-center text-white/30">{icon}</span><p className="mt-1 truncate text-[10px] text-white/30">{label}</p><p className="mt-1 truncate text-xs font-semibold tabular-nums text-white/80" title={value}>{value}</p></div>;
}

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ""}`;
}

const tooltipStyle = {
  background: "#0b0d10",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  fontSize: 12,
};
