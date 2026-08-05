"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, Goal, Lightbulb, ListChecks, Loader2, Pencil, Plus, RotateCcw, Settings2, Sparkles, Trash2, Wallet } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format";
import { pct, type Habit, type HabitLog } from "@/lib/performance";
import { criarHabito, editarHabito, excluirHabito, reativarHabito, registrarHabito, removerHabito } from "@/app/admin/performance/actions";
import { criarAporteLifeOS, criarAtividadeLifeOS, criarEventoLifeOS, criarItemEstudoLifeOS, criarMetaLifeOS, criarCategoriaLifeOS, criarRoadmapEstudosLifeOS, criarTarefaLifeOS, criarTreinoAcademiaLifeOS, editarAporteLifeOS, editarEventoLifeOS, editarItemEstudoLifeOS, editarTarefaLifeOS, editarTreinoAcademiaLifeOS, gerarInsightLifeOS, importarRoadmapEstudosLifeOS, registrarTarefaLifeOS, removerAporteLifeOS, removerCategoriaLifeOS, removerEventoLifeOS, removerItemEstudoLifeOS, removerTarefaLifeOS, removerTreinoAcademiaLifeOS, salvarCarteiraLifeOS, salvarRevisaoLifeOS, atualizarStatusEstudoLifeOS, atualizarValorMetaLifeOS } from "@/app/admin/performance/life-os-actions";
import { habitMonthStats, monthGrid, nextMonth, previousMonth, type DashboardRange, type TaskOccurrence, taskProgress } from "@/lib/performance-dashboard";
import { dayProgress, type LifeCategory, type LifeEvent, type LifeGoal, type LifeInsight, type LifeOSView, type PortfolioSnapshot, durationLabel, durationMinutes, goalNeedsAttention, goalProgress, isoDateToLabel, projectedGoalDate } from "@/lib/performance-life-os";
import { MetasDoDia as MetasDoDiaBase } from "@/components/performance/MetasDoDia";
import { PerfilEditor } from "@/components/performance/PerfilEditor";
import { RelatorioSemanal, type WeeklyReport } from "@/components/performance/RelatorioSemanal";
import { PesoCorpo } from "@/components/performance/PesoCorpo";
import { FutevoleiSection } from "@/components/performance/FutevoleiSection";
import { TreinosSection } from "@/components/performance/TreinosSection";
import { CalendarClient } from "@/components/performance/CalendarClient";
import { academyStreak, averageDuration, cumulativeContributions, investmentSummary, nextStudyItem, roadmapProgress, studyWeeklyStats, type InvestmentContribution, type StudyRoadmap, type StudyRoadmapItem } from "@/lib/performance-widgets";
import { HabitAnalytics } from "@/components/performance/HabitAnalytics";
import { AcademyWorkspace } from "@/components/performance/AcademyWorkspace";
import { StudiesWorkspace } from "@/components/performance/StudiesWorkspace";
import { InvestmentsWorkspace } from "@/components/performance/InvestmentsWorkspace";
import type { ConsistencyStatus } from "@/lib/performance-analytics";

/* The legacy view dispatcher is intentionally kept inline to preserve its existing URL behavior. */
/* eslint-disable react-hooks/static-components */

type ActivityRow = { id: string; title: string; date: string; area: string; type: string | null; durationMinutes: number | null; status: string; notes: string | null; muscleGroups: string[] };
type WithdrawalRow = { id: string; date: string; amount: number; institution: string | null; notes: string | null };
type Profile = { altura_cm?: number | null; data_nascimento?: string | null; lado?: string | null; pe_dominante?: string | null; peso_meta?: number | null; rating_meta?: number | null; treinos_semana_meta?: number | null } | null;

export type LifeOSProps = {
  today: string; monday: string; nome: string; username: string | null; fotoUrl: string | null;
  profile: Profile; alturaCm: number | null; pesoAtual: number | null;
  habits: Habit[]; allHabits: Habit[]; logs: HabitLog[]; valoresHoje: Record<string, number>;
  reportAtual: WeeklyReport | null; reportHistory: WeeklyReport[];
  weights: { data: string; peso_kg: number }[]; ratings: { id: string; data: string; rating: number }[];
  matches: { id: string; data: string; parceiro: string | null; adversario: string | null; resultado: "vitoria" | "derrota"; placar: string | null; obs: string | null }[];
  trainings: { id: string; data: string; tipo: string; duracao_min: number | null; obs: string | null }[];
  tests: { id: string; data: string; tipo_teste: string; valor: number; unidade: string | null }[];
  events: LifeEvent[]; activities: ActivityRow[]; goals: LifeGoal[]; snapshots: PortfolioSnapshot[]; withdrawals: WithdrawalRow[]; insights: LifeInsight[]; categories: LifeCategory[];
  contributions: InvestmentContribution[]; studyRoadmap: StudyRoadmap | null; studyItems: StudyRoadmapItem[]; range: DashboardRange; taskOccurrences: TaskOccurrence[]; consistency: ConsistencyStatus; schemaReady: boolean;
};

const nav: { id: LifeOSView; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Dashboard", icon: Activity }, { id: "agenda", label: "Agenda", icon: CalendarDays }, { id: "habits", label: "Habitos", icon: ListChecks },
  { id: "activities", label: "Academia", icon: Flame }, { id: "goals", label: "Estudos", icon: Goal }, { id: "investments", label: "Investimentos", icon: Wallet },
  { id: "reviews", label: "Revisoes", icon: RotateCcw }, { id: "insights", label: "Insights", icon: Sparkles }, { id: "settings", label: "Perfil", icon: Settings2 },
];

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";

function Field({ name, title, type = "text", required = false, value, onChange, placeholder, min }: { name: string; title: string; type?: string; required?: boolean; value?: string; onChange?: (value: string) => void; placeholder?: string; min?: string }) {
  return <label className="block text-xs font-medium text-gray-500">{title}<input name={name} type={type} required={required} min={min} value={onChange ? value : undefined} defaultValue={onChange ? undefined : value} placeholder={placeholder} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className={`${inputClass} mt-1`} /></label>;
}

function ActionForm({ action, children, onDone }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; children: React.ReactNode; onDone?: () => void }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form onSubmit={(event) => { event.preventDefault(); setError(null); const form = event.currentTarget; const data = new FormData(form); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else { form.reset(); onDone?.(); router.refresh(); } }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>;
}

export function LifeOSDashboard(props: LifeOSProps) {
  const router = useRouter(); const params = useSearchParams(); const requested = params.get("view") as LifeOSView | null;
  const view = requested && nav.some((item) => item.id === requested) ? requested : "today";
  const [quick, setQuick] = useState<"event" | "activity" | "goal" | "portfolio" | "review" | null>(params.get("newEvent") === "1" ? "event" : null);
  const go = (next: LifeOSView) => router.replace(`/admin/performance?view=${next}`, { scroll: false });
  const progress = dayProgress(props.habits, props.logs, props.today);
  const todayEvents = props.events.filter((event) => event.startAt.slice(0, 10) === props.today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const ActivitiesView: React.FC<{ activities?: ActivityRow[] }> = () => <AcademyWorkspace activities={props.activities} weights={props.weights} today={props.today} heightCm={props.alturaCm} currentWeight={props.pesoAtual} targetWeight={props.profile?.peso_meta ?? null} />;
  const GoalsView: React.FC<{ goals?: LifeGoal[]; today?: string; onNew?: () => void }> = () => <StudiesWorkspace roadmap={props.studyRoadmap} items={props.studyItems} activities={props.activities} today={props.today} monday={props.monday} />;
  const InvestmentsView: React.FC<{ snapshots?: PortfolioSnapshot[]; withdrawals?: WithdrawalRow[]; contributions?: InvestmentContribution[] }> = () => <InvestmentsWorkspace snapshots={props.snapshots} withdrawals={props.withdrawals} contributions={props.contributions} today={props.today} />;
  const MetasDoDia: React.FC<{ habits: Habit[]; valoresIniciais: Record<string, number>; hoje: string }> = (input) => <><MetasDoDiaBase {...input} /><HabitAnalytics habits={props.habits} logs={props.logs} today={props.today} /></>;
  const LegacyAgenda: React.FC<{ events: LifeEvent[]; onNew?: () => void }> = ({ events }) => <CalendarClient events={events} embedded initialDate={props.today} />;
  const DashboardView = (_input: LifeOSProps & { progress: ReturnType<typeof dayProgress>; todayEvents: LifeEvent[]; onQuick: (quick: "event" | "activity" | "goal" | "portfolio" | "review" | null) => void }) => <DashboardViewLegacy {...props} progress={progress} todayEvents={todayEvents} onQuick={setQuick} />;
  return <div className="min-h-screen bg-[#0b0d10] text-white"><header className="border-b border-white/10 bg-[#0b0d10] px-4 pb-5 pt-4 sm:px-6"><div className="mx-auto max-w-7xl"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Carlos Life OS</p><h1 className="mt-1 text-2xl font-bold">Ola, {props.nome.split(" ")[0]}</h1><p className="mt-1 text-sm text-white/50">{isoDateToLabel(props.today)} · evolucao real e decisoes por dados.</p></div>{props.fotoUrl ? <img src={props.fotoUrl} alt={props.nome} className="size-11 rounded-full object-cover" /> : <div className="flex size-11 items-center justify-center rounded-full bg-blue-600 font-bold">{props.nome.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>}</div><nav className="mt-5 flex gap-1 overflow-x-auto pb-1" aria-label="Life OS">{nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${view === id ? "bg-white text-gray-900" : "text-white/55 hover:bg-white/10 hover:text-white"}`}><Icon className="size-4" />{label}</button>)}</nav></div></header><main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6">{!props.schemaReady && <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">A migracao nova ainda nao foi aplicada. Os dados antigos continuam disponiveis.</p>}{view === "today" && <DashboardView {...props} progress={progress} todayEvents={todayEvents} onQuick={setQuick} />}{view === "agenda" && <LegacyAgenda events={props.events} onNew={() => setQuick("event")} />}{view === "habits" && <MetasDoDia habits={props.habits} valoresIniciais={props.valoresHoje} hoje={props.today} />}{view === "activities" && <ActivitiesView activities={props.activities} />}{view === "goals" && <GoalsView goals={props.goals} today={props.today} onNew={() => setQuick("goal")} />}{view === "investments" && <InvestmentsView snapshots={props.snapshots} withdrawals={props.withdrawals} contributions={props.contributions} />}{view === "reviews" && <RelatorioSemanal relatorioAtual={props.reportAtual} historico={props.reportHistory} semanaAtual={props.monday} stats={{ aderenciaSemana: progress.percent / 100, diasRegistrados: new Set(props.logs.map((log) => log.data)).size, melhorHabito: null, habitoFraco: null }} />}{view === "insights" && <InsightsView insights={props.insights} />}{view === "settings" && <SettingsView {...props} />}</main>{quick === "event" && <Modal title="Novo evento" onClose={() => setQuick(null)}><EventForm onDone={() => setQuick(null)} /></Modal>}{quick === "activity" && <Modal title="Registrar atividade" onClose={() => setQuick(null)}><ActionForm action={criarAtividadeLifeOS} onDone={() => setQuick(null)}><Field name="area" title="Area" required /><Field name="date" title="Data" type="date" required /><Field name="title" title="Titulo" required /><Field name="duration_minutes" title="Duracao (min)" type="number" /><Field name="notes" title="Observacao" /></ActionForm></Modal>}{quick === "goal" && <Modal title="Nova meta" onClose={() => setQuick(null)}><ActionForm action={criarMetaLifeOS} onDone={() => setQuick(null)}><Field name="name" title="Nome" required /><Field name="target_value" title="Valor-alvo" type="number" required /><Field name="area" title="Area" /><Field name="unit" title="Unidade" /></ActionForm></Modal>}{quick === "portfolio" && <Modal title="Atualizar carteira" onClose={() => setQuick(null)}><ActionForm action={salvarCarteiraLifeOS} onDone={() => setQuick(null)}><Field name="date" title="Data" type="date" required /><Field name="total_value" title="Valor atual" type="number" required /></ActionForm></Modal>}{quick === "review" && <Modal title="Nova revisao" onClose={() => setQuick(null)}><ActionForm action={salvarRevisaoLifeOS} onDone={() => setQuick(null)}><Field name="period_start" title="Inicio" type="date" required /><Field name="period_end" title="Fim" type="date" required /><Field name="rating" title="Nota" type="number" /></ActionForm></Modal>}</div>;
}

function DashboardViewLegacy({ ...p }: LifeOSProps & { progress: ReturnType<typeof dayProgress>; todayEvents: LifeEvent[]; onQuick: (quick: "event" | "activity" | "goal" | "portfolio" | "review" | null) => void }) {
  const router = useRouter();
  const [taskForm, setTaskForm] = useState<TaskOccurrence | null>(null);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [manageHabits, setManageHabits] = useState(false);
  const [from, setFrom] = useState(p.range.from);
  const [to, setTo] = useState(p.range.to);
  const progress = taskProgress(p.taskOccurrences);
  const apply = (period: string) => router.replace(`/admin/performance?view=today&period=${period}`, { scroll: false });
  const applyCustom = () => router.replace(`/admin/performance?view=today&period=custom&from=${from}&to=${to}`, { scroll: false });
  const events = [...p.events].sort((a, b) => a.startAt.localeCompare(b.startAt));

  return <div className="space-y-5">
    <section className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#15191f] p-3">
      <div className="flex flex-wrap gap-1">{[["today", "Hoje"], ["week", "Semana"], ["month", "Mes"], ["custom", "Personalizado"]].map(([value, label]) => <button type="button" key={value} onClick={() => apply(value)} className={`rounded-lg px-3 py-2 text-sm ${p.range.period === value ? "bg-white text-gray-900" : "text-white/60 hover:bg-white/10"}`}>{label}</button>)}</div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-white/45">{formatDateBR(p.range.from)} - {formatDateBR(p.range.to)}</span>
        <ConsistencyBadge status={p.consistency} />
      </div>
      {p.range.period === "custom" && <div className="flex w-full flex-wrap items-end gap-2 border-t border-white/10 pt-3"><Field name="from" title="De" type="date" value={from} onChange={setFrom} /><Field name="to" title="Ate" type="date" value={to} onChange={setTo} /><button type="button" onClick={applyCustom} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold">Aplicar</button></div>}
    </section>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)]">
      <div className="space-y-5">
        <TaskPanel occurrences={p.taskOccurrences} progress={progress} onNew={() => setTaskForm({ id: "", title: "", startDate: p.today, recurrenceType: "none", recurrenceEndDate: null, active: true, occurrenceDate: p.today, completed: false, completedAt: null })} onEdit={setTaskForm} onToggle={async (item) => { await registrarTarefaLifeOS(item.id, item.occurrenceDate, !item.completed); router.refresh(); }} onDelete={async (id) => { if (window.confirm("Excluir esta tarefa?")) { await removerTarefaLifeOS(id); router.refresh(); } }} />
        <HabitPanel habits={p.habits} logs={p.logs} today={p.today} onManage={() => setManageHabits(true)} onOpen={setHabit} onToggle={async (item, done) => { await registrarHabito(item.id, done ? (item.alvo ?? 1) : 0, p.today); router.refresh(); }} />
        <LifeOSWidgets {...p} />
      </div>
      <TimelinePanel events={events} onNew={() => p.onQuick("event")} onCalendar={() => router.push("/admin/performance?view=agenda")} />
    </div>

    {taskForm && <Modal title={taskForm.id ? "Editar tarefa" : "Nova tarefa"} onClose={() => setTaskForm(null)}><TaskForm task={taskForm} onDone={() => { setTaskForm(null); router.refresh(); }} /></Modal>}
    {manageHabits && <HabitManagerModal habits={p.allHabits} onClose={() => setManageHabits(false)} />}
    {habit && <HabitConstancyModal habit={habit} logs={p.logs} today={p.today} onClose={() => setHabit(null)} />}
  </div>;
}

function ConsistencyBadge({ status }: { status: ConsistencyStatus }) {
  return <div className="group relative flex items-center gap-2 rounded-lg border border-orange-400/20 bg-orange-400/10 px-3 py-2" title={`Um dia entra na ofensiva ao atingir ${status.threshold}% dos compromissos planejados.`}><Flame className={`size-4 ${status.streak ? "fill-orange-400 text-orange-400" : "text-white/30"}`} /><div><p className="text-xs font-semibold text-white">{status.streak} {status.streak === 1 ? "dia" : "dias"}</p><p className="text-[10px] text-white/40">Hoje {status.todayPercent}%</p></div></div>;
}

function DashboardViewLegacyOld({ ...p }: LifeOSProps & { progress: ReturnType<typeof dayProgress>; todayEvents: LifeEvent[]; onQuick: (quick: "event" | "activity" | "goal" | "portfolio" | "review" | null) => void }) {
  const router = useRouter(); const [taskForm, setTaskForm] = useState<TaskOccurrence | null>(null); const [habit, setHabit] = useState<Habit | null>(null); const [manageHabits, setManageHabits] = useState(false); const [from, setFrom] = useState(p.range.from); const [to, setTo] = useState(p.range.to); const progress = taskProgress(p.taskOccurrences);
  const apply = (period: string) => router.replace(`/admin/performance?view=dashboard&period=${period}`, { scroll: false });
  const applyCustom = () => router.replace(`/admin/performance?view=dashboard&period=custom&from=${from}&to=${to}`, { scroll: false });
  const events = [...p.events].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return <div className="space-y-5"><section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#15191f] p-3"><div className="flex flex-wrap gap-1">{[["today", "Hoje"], ["week", "Semana"], ["month", "Mes"], ["custom", "Personalizado"]].map(([value, label]) => <button type="button" key={value} onClick={() => apply(value)} className={`rounded-lg px-3 py-2 text-sm ${p.range.period === value ? "bg-white text-gray-900" : "text-white/60 hover:bg-white/10"}`}>{label}</button>)}</div><span className="text-xs text-white/45">{formatDateBR(p.range.from)} - {formatDateBR(p.range.to)}</span>{p.range.period === "custom" && <div className="flex w-full flex-wrap items-end gap-2"><Field name="from" title="De" type="date" value={from} onChange={setFrom} /><Field name="to" title="Ate" type="date" value={to} onChange={setTo} /><button type="button" onClick={applyCustom} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold">Aplicar</button></div>}</section><div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)]"><div className="space-y-5"><TaskPanel occurrences={p.taskOccurrences} progress={progress} onNew={() => setTaskForm({ id: "", title: "", startDate: p.today, recurrenceType: "none", recurrenceEndDate: null, active: true, occurrenceDate: p.today, completed: false, completedAt: null })} onEdit={setTaskForm} onToggle={async (item) => { await registrarTarefaLifeOS(item.id, item.occurrenceDate, !item.completed); router.refresh(); }} onDelete={async (id) => { if (window.confirm("Excluir esta tarefa?")) { await removerTarefaLifeOS(id); router.refresh(); } }} /><HabitPanel habits={p.habits} logs={p.logs} today={p.today} onManage={() => setManageHabits(true)} onOpen={setHabit} onToggle={async (item, done) => { await registrarHabito(item.id, done ? (item.alvo ?? 1) : 0, p.today); router.refresh(); }} /></div><TimelinePanel events={events} onNew={() => p.onQuick("event")} onCalendar={() => router.push("/admin/performance?view=agenda")} /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary title="Academia" value={`${p.trainings.filter((item) => item.data >= p.range.from && item.data <= p.range.to).length} treinos`} icon={Activity} /><Summary title="Futevolei" value={`${p.matches.filter((item) => item.data >= p.range.from && item.data <= p.range.to).length} partidas`} icon={Flame} /><Summary title="Estudos" value={`${p.activities.filter((item) => item.area === "estudos" && item.date >= p.range.from && item.date <= p.range.to).length} sessoes`} icon={Lightbulb} /><Summary title="Metas" value={`${p.goals.filter((goal) => goal.status !== "cancelled").length} ativas`} icon={Goal} /></div>{taskForm && <Modal title={taskForm.id ? "Editar tarefa" : "Nova tarefa"} onClose={() => setTaskForm(null)}><TaskForm task={taskForm} onDone={() => { setTaskForm(null); router.refresh(); }} /></Modal>}{manageHabits && <HabitManagerModal habits={p.allHabits} onClose={() => setManageHabits(false)} />}{habit && <HabitConstancyModal habit={habit} logs={p.logs} today={p.today} onClose={() => setHabit(null)} />}</div>;
}

function TaskPanel({ occurrences, progress, onNew, onEdit, onToggle, onDelete }: { occurrences: TaskOccurrence[]; progress: ReturnType<typeof taskProgress>; onNew: () => void; onEdit: (item: TaskOccurrence) => void; onToggle: (item: TaskOccurrence) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const byTask = new Map<string, TaskOccurrence[]>();
  occurrences.forEach((item) => byTask.set(item.id, [...(byTask.get(item.id) ?? []), item]));
  const recurringGroups = [...byTask.values()].filter((items) => items[0]?.recurrenceType === "daily" && items.length > 1);
  const groupedTaskIds = new Set(recurringGroups.map((items) => items[0].id));
  const singleOccurrences = occurrences.filter((item) => !groupedTaskIds.has(item.id));
  const dateGroups = new Map<string, TaskOccurrence[]>();
  singleOccurrences.forEach((item) => dateGroups.set(item.occurrenceDate, [...(dateGroups.get(item.occurrenceDate) ?? []), item]));

  return <section className="rounded-lg bg-white p-5 text-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="font-semibold">Tarefas</h2><p className="text-xs text-gray-400">{progress.completed} de {progress.total} ocorrencias concluidas</p></div>
      <button type="button" onClick={onNew} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Nova tarefa</button>
    </div>
    <div className="mt-4 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-blue-600" style={{ width: `${progress.percent}%` }} /></div>
      <b className="w-12 text-right text-sm">{progress.percent}%</b>
    </div>

    {recurringGroups.length > 0 && <div className="mt-5 space-y-3">
      <p className="text-xs font-semibold uppercase text-gray-400">Tarefas recorrentes</p>
      {recurringGroups.map((items) => {
        const task = items[0];
        const completed = items.filter((item) => item.completed).length;
        const percent = Math.round((completed / items.length) * 100);
        const isExpanded = Boolean(expanded[task.id]);
        return <div key={task.id} className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 p-3">
            <button type="button" onClick={() => setExpanded((current) => ({ ...current, [task.id]: !isExpanded }))} className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100" title={isExpanded ? "Recolher dias" : "Ver dias"}>
              <ChevronRight className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>
            <button type="button" onClick={() => setExpanded((current) => ({ ...current, [task.id]: !isExpanded }))} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-gray-700">{task.title}</p>
              <p className="mt-0.5 text-xs text-gray-400">Diaria · {completed} de {items.length} dias</p>
            </button>
            <div className="hidden w-20 sm:block"><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-blue-600" style={{ width: `${percent}%` }} /></div></div>
            <span className="w-9 text-right text-xs font-semibold text-gray-500">{percent}%</span>
            <button type="button" onClick={() => onEdit(task)} className="rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-blue-600" title="Editar tarefa"><Pencil className="size-4" /></button>
            <button type="button" onClick={() => onDelete(task.id)} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500" title="Excluir tarefa"><Trash2 className="size-4" /></button>
          </div>
          {isExpanded && <div className="border-t border-gray-100 bg-gray-50">
            <div className="max-h-[540px] overflow-y-auto overscroll-contain px-3" aria-label={`Dias de ${task.title}`}>
            {items.map((item) => <div key={`${item.id}-${item.occurrenceDate}`} className="flex h-9 items-center gap-3 border-b border-gray-100 last:border-0">
              <button type="button" onClick={() => onToggle(item)} className={`flex size-5 items-center justify-center rounded-md ring-1 ${item.completed ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}>{item.completed && <Check className="size-3 text-white" />}</button>
              <span className={`flex-1 text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-600"}`}>{formatDateBR(item.occurrenceDate)}</span>
            </div>)}
            </div>
          </div>}
        </div>;
      })}
    </div>}

    <div className="mt-5 space-y-4">
      {[...dateGroups].map(([date, items]) => <div key={date}>
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">{formatDateBR(date)}</p>
        {items.map((item) => <div key={`${item.id}-${date}`} className="flex items-center gap-3 border-b border-gray-100 py-2">
          <button type="button" onClick={() => onToggle(item)} className={`flex size-5 items-center justify-center rounded-md ring-1 ${item.completed ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}>{item.completed && <Check className="size-3 text-white" />}</button>
          <button type="button" onClick={() => onEdit(item)} className={`flex-1 text-left text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.title}{item.recurrenceType === "daily" && <span className="ml-2 text-[10px] text-blue-500">diaria</span>}</button>
          <button type="button" onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-500" title="Excluir"><Trash2 className="size-4" /></button>
        </div>)}
      </div>)}
      {!occurrences.length && <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">Nenhuma tarefa neste periodo.</p>}
    </div>
  </section>;
}

function eventLocalFields(value: string): { date: string; time: string } {
  const instant = new Date(value);
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant).map((part) => [part.type, part.value]));
  return {
    date: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    time: instant.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Bahia" }),
  };
}

function EventForm({ onDone, initialDate, event }: { onDone: () => void; initialDate?: string; event?: LifeEvent }) {
  const router = useRouter();
  const initialStart = event ? eventLocalFields(event.startAt) : { date: initialDate ?? "", time: "09:00" };
  const initialEnd = event ? eventLocalFields(event.endAt) : { date: initialDate ?? "", time: "10:00" };
  const [date, setDate] = useState(initialStart.date);
  const [start, setStart] = useState(initialStart.time);
  const [end, setEnd] = useState(initialEnd.time);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const action = async (data: FormData) => {
    const eventDate = String(data.get("event_date") ?? "");
    const eventStart = String(data.get("event_start") ?? "");
    const eventEnd = String(data.get("event_end") ?? "");
    if (!eventDate || !eventStart || !eventEnd) return { ok: false, error: "Informe data e horarios." };
    if (eventEnd <= eventStart) return { ok: false, error: "O horario de termino deve ser depois do inicio." };
    data.set("start_at", `${eventDate}T${eventStart}:00-03:00`);
    data.set("end_at", `${eventDate}T${eventEnd}:00-03:00`);
    return event ? editarEventoLifeOS(event.id, data) : criarEventoLifeOS(data);
  };
  return <div>
    <ActionForm action={action} onDone={onDone}>
      <Field name="title" title="Nome" value={event?.title} required />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field name="event_date" title="Data" type="date" value={date} onChange={setDate} required />
        <Field name="event_start" title="Inicio" type="time" value={start} onChange={(value) => { setStart(value); if (value && end <= value) setEnd(value); }} required />
        <Field name="event_end" title="Termino" type="time" value={end} min={start} onChange={setEnd} required />
      </div>
      <Field name="description" title="Descricao" value={event?.description ?? undefined} />
    </ActionForm>
    {event && <div className="mt-5 border-t border-gray-100 pt-4">
      {deleteError && <p className="mb-2 text-xs text-red-600">{deleteError}</p>}
      <button type="button" disabled={deletePending} onClick={() => {
        if (!window.confirm("Excluir este evento?")) return;
        setDeleteError(null);
        startDelete(async () => {
          const result = await removerEventoLifeOS(event.id);
          if (!result.ok) setDeleteError(result.error ?? "Nao foi possivel excluir o evento.");
          else { onDone(); router.refresh(); }
        });
      }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
        {deletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Excluir evento
      </button>
    </div>}
  </div>;
}

function TaskForm({ task, onDone }: { task: TaskOccurrence; onDone: () => void }) { const [repeat, setRepeat] = useState(task.recurrenceType === "daily"); const action = task.id ? (data: FormData) => editarTarefaLifeOS(task.id, data) : criarTarefaLifeOS; return <ActionForm action={action} onDone={onDone}><Field name="title" title="Nome" value={task.title} required /><Field name="start_date" title="Data" type="date" value={task.startDate} required /><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="recurrence_type" value="daily" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />Repetir diariamente</label>{repeat && <Field name="recurrence_end_date" title="Repetir ate" type="date" value={task.recurrenceEndDate ?? task.startDate} required />}</ActionForm>; }

function TimelinePanel({ events, onNew, onCalendar }: { events: LifeEvent[]; onNew: () => void; onCalendar: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState<LifeEvent | null>(null);
  const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    month: "long",
    year: "numeric",
  });
  const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const monthGroups = new Map<string, { label: string; days: Map<string, { label: string; events: LifeEvent[] }> }>();

  events.forEach((event) => {
    const eventDate = new Date(event.startAt);
    const parts = Object.fromEntries(dateKeyFormatter.formatToParts(eventDate).map((part) => [part.type, part.value]));
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const monthKey = dateKey.slice(0, 7);
    const month = monthGroups.get(monthKey) ?? { label: monthLabelFormatter.format(eventDate), days: new Map() };
    const day = month.days.get(dateKey) ?? { label: dayLabelFormatter.format(eventDate), events: [] };
    day.events.push(event);
    month.days.set(dateKey, day);
    monthGroups.set(monthKey, month);
  });

  return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white lg:min-h-[620px]">
    <div className="flex items-center justify-between">
      <div><h2 className="font-semibold">Eventos</h2><p className="text-xs text-white/40">Linha do tempo completa</p></div>
      <div className="flex gap-1">
        <button type="button" onClick={onNew} className="rounded-lg bg-blue-600 p-2" title="Novo evento"><Plus className="size-4" /></button>
        <button type="button" onClick={onCalendar} className="rounded-lg bg-white/10 p-2" title="Abrir agenda" aria-label="Abrir agenda"><CalendarDays className="size-4" /></button>
      </div>
    </div>
    <div className="mt-5 space-y-7">
      {[...monthGroups].map(([monthKey, month]) => <section key={monthKey}>
        <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
          <CalendarDays className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold capitalize text-white">{month.label}</h3>
        </div>
        <div className="space-y-6">
          {[...month.days].map(([dateKey, day]) => <div key={dateKey}>
            <p className="mb-3 text-xs font-semibold capitalize text-white/55">{day.label}</p>
            <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[52px] before:top-3 before:w-px before:bg-white/20">
              {day.events.map((event) => <div key={event.id} className="relative flex items-center gap-3">
                <div className="z-10 flex w-12 shrink-0 flex-col items-center">
                  <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-blue-600"><Clock3 className="size-3.5" /></span>
                  <span className="mt-1 w-full text-center text-[10px] tabular-nums text-white/45">{new Date(event.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="mt-1 text-xs text-white/45">{durationLabel(durationMinutes(event.startAt, event.endAt))} · {event.status === "completed" ? "Concluido" : "Planejado"}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedEvent(event)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white" title="Editar evento" aria-label={`Editar ${event.title}`}>
                    <Pencil className="size-4" />
                  </button>
                </div>
              </div>)}
            </div>
          </div>)}
        </div>
      </section>)}
      {!events.length && <p className="rounded-lg border border-dashed border-white/15 p-5 text-center text-sm text-white/40">Nenhum evento cadastrado.</p>}
    </div>
    {selectedEvent && <Modal title="Editar evento" onClose={() => setSelectedEvent(null)}>
      <EventForm event={selectedEvent} onDone={() => setSelectedEvent(null)} />
    </Modal>}
  </section>;
}

function HabitPanel({ habits, logs, today, onManage, onOpen, onToggle }: { habits: Habit[]; logs: HabitLog[]; today: string; onManage: () => void; onOpen: (habit: Habit) => void; onToggle: (habit: Habit, done: boolean) => void }) {
  const todayLogs = new Map(logs.filter((log) => log.data === today).map((log) => [log.habit_id, log.valor]));
  const completed = habits.filter((habit) => (todayLogs.get(habit.id) ?? 0) >= (habit.alvo ?? 1)).length;
  const percent = habits.length ? Math.round((completed / habits.length) * 100) : 0;
  return <section className="rounded-lg bg-white p-5 text-gray-900">
    <div className="flex items-center justify-between"><div><h2 className="font-semibold">Habitos</h2><p className="text-xs text-gray-400">{completed} de {habits.length} concluidos hoje</p></div><button type="button" onClick={onManage} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600"><Settings2 className="size-4" />Editar</button></div>
    <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div><b className="w-10 text-right text-xs">{percent}%</b></div>
    <div className="mt-4 space-y-1">{habits.map((habit) => { const done = (todayLogs.get(habit.id) ?? 0) >= (habit.alvo ?? 1); return <div key={habit.id} className="flex items-center gap-3 py-2"><button type="button" onClick={() => onToggle(habit, !done)} className={`flex size-5 items-center justify-center rounded-md ring-1 ${done ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}>{done && <Check className="size-3 text-white" />}</button><button type="button" onClick={() => onOpen(habit)} className="flex-1 text-left text-sm text-gray-700">{habit.label}</button></div>; })}{!habits.length && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-400">Nenhum habito ativo.</p>}</div>
  </section>;
}

function HabitManagerModal({ habits, onClose }: { habits: Habit[]; onClose: () => void }) { const router = useRouter(); return <Modal title="Editar habitos" onClose={onClose}><ActionForm action={criarHabito} onDone={() => router.refresh()}><Field name="label" title="Novo habito" required /><input type="hidden" name="tipo" value="binario" /></ActionForm><div className="mt-5 space-y-2">{habits.map((habit) => <div key={habit.id} className="rounded-lg border border-gray-100 p-3"><div className="flex items-center gap-2"><span className="flex-1 text-sm">{habit.label}</span>{habit.ativo ? <><button type="button" onClick={async () => { const data = new FormData(); data.set("id", habit.id); data.set("label", window.prompt("Nome", habit.label) ?? habit.label); data.set("tipo", habit.tipo); await editarHabito(data); router.refresh(); }} title="Editar"><Pencil className="size-4" /></button><button type="button" onClick={async () => { await removerHabito(habit.id); router.refresh(); }} className="text-xs text-amber-600">Arquivar</button></> : <><button type="button" onClick={async () => { await reativarHabito(habit.id); router.refresh(); }} className="text-xs text-blue-600">Reativar</button><button type="button" onClick={async () => { if (window.confirm("Excluir historico?")) { await excluirHabito(habit.id); router.refresh(); } }}><Trash2 className="size-4 text-red-500" /></button></>}</div></div>)}</div></Modal>; }

function HabitConstancyModal({ habit, logs, today, onClose }: { habit: Habit; logs: HabitLog[]; today: string; onClose: () => void }) { const [month, setMonth] = useState(today.slice(0, 7)); const stats = habitMonthStats(habit, logs, month, today); const current = today.slice(0, 7); const weeks = monthGrid(month); const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01T12:00:00Z")); return <Modal title={habit.label} onClose={onClose}><div className="flex items-center justify-between"><button type="button" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-5" /></button><div className="text-center"><p className="font-semibold capitalize">{title}</p><p className={stats.status === "good" ? "text-sm text-emerald-600" : stats.status === "bad" ? "text-sm text-red-600" : "text-sm text-gray-400"}>{stats.status === "good" ? "Bom" : stats.status === "bad" ? "Ruim" : "Sem dados"} · {stats.percent}%</p></div><button type="button" disabled={month >= current} onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-5" /></button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">{["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => <span key={index}>{day}</span>)}</div><div className="mt-1 space-y-1">{weeks.map((week, index) => <div key={index} className="grid grid-cols-7 gap-1">{week.map((date, dayIndex) => { if (!date) return <span key={dayIndex} className="aspect-square" />; const value = logs.find((log) => log.habit_id === habit.id && log.data === date)?.valor; const done = value != null && (habit.tipo === "binario" ? value >= 1 : habit.alvo ? value >= habit.alvo : value > 0); return <span key={date} title={formatDateBR(date)} className={`aspect-square rounded-sm ${done ? "bg-emerald-500" : "bg-gray-100"}`} />; })}</div>)}</div><p className="mt-4 text-center text-sm text-gray-500">{stats.completed} de {stats.eligible} dias concluidos</p></Modal>; }

function Summary({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Activity }) { return <div className="rounded-lg bg-white p-4 text-gray-900"><Icon className="size-4 text-blue-600" /><p className="mt-3 text-xs text-gray-400">{title}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-gray-900"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-gray-500">Fechar</button></div>{children}</div></div>; }

function LegacyAgenda({ events }: { events: LifeEvent[]; onNew: () => void }) { return <CalendarClient events={events} embedded initialDate={events[0]?.startAt.slice(0, 10) ?? "2026-01-01"} />; }
function minutesText(value: number): string { if (value < 60) return `${value} min`; return `${Math.floor(value / 60)}h${value % 60 ? ` ${value % 60}min` : ""}`; }

function LifeOSWidgets(props: LifeOSProps) {
  const router = useRouter();
  const academy = props.activities.filter((item) => item.area === "academia" && item.status === "completed");
  const studies = props.activities.filter((item) => item.area === "estudos" && item.status === "completed");
  const studyStats = studyWeeklyStats(studies, props.monday, props.today);
  const investment = investmentSummary(props.contributions, props.snapshots, props.withdrawals);
  const next = nextStudyItem(props.studyItems);
  const academyDays = new Set(academy.map((item) => item.date));
  return <section className="grid gap-4 sm:grid-cols-2">
    <WidgetShell title="Academia" icon={<Flame className="size-4 text-orange-500" />} onOpen={() => router.replace("/admin/performance?view=activities", { scroll: false })}>
      <div className="flex items-center gap-3"><span className="text-3xl">{academyStreak([...academyDays], props.today)}</span><span className="text-sm text-gray-500">dias seguidos</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-400">Tempo medio</p><p className="mt-1 font-semibold">{minutesText(averageDuration(academy.map((item) => ({ date: item.date, durationMinutes: item.durationMinutes }))))}</p></div><div><p className="text-xs text-gray-400">Peso atual</p><p className="mt-1 font-semibold">{props.weights.at(-1)?.peso_kg ? `${props.weights.at(-1)?.peso_kg} kg` : "Sem registro"}</p></div></div>
    </WidgetShell>
    <WidgetShell title="Estudos" icon={<Lightbulb className="size-4 text-amber-500" />} onOpen={() => router.replace("/admin/performance?view=goals", { scroll: false })}>
      <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-400">Media diaria</p><p className="mt-1 font-semibold">{minutesText(studyStats.averageMinutes)}</p></div><div><p className="text-xs text-gray-400">Semana</p><p className="mt-1 font-semibold">{minutesText(studyStats.totalMinutes)}</p></div></div>
      <p className="mt-4 truncate text-sm text-gray-600">Proximo: <b>{next?.title ?? "Nenhum assunto definido"}</b></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-amber-500" style={{ width: `${roadmapProgress(props.studyItems)}%` }} /></div>
    </WidgetShell>
    <WidgetShell title="Investimentos" icon={<Wallet className="size-4 text-emerald-600" />} onOpen={() => router.replace("/admin/performance?view=investments", { scroll: false })}>
      <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-400">Aportado</p><p className="mt-1 font-semibold">{formatBRL(investment.totalContributed)}</p></div><div><p className="text-xs text-gray-400">Carteira</p><p className="mt-1 font-semibold">{props.snapshots.length ? formatBRL(investment.currentValue) : "Nao atualizada"}</p></div></div>
      <p className={`mt-4 text-sm font-semibold ${investment.returnPercent != null && investment.returnPercent < 0 ? "text-red-600" : "text-emerald-600"}`}>{investment.returnPercent == null ? "Sem base para rentabilidade" : `${investment.returnPercent >= 0 ? "+" : ""}${investment.returnPercent.toFixed(2)}% de retorno`}</p>
    </WidgetShell>
  </section>;
}

function WidgetShell({ title, icon, onOpen, children }: { title: string; icon: React.ReactNode; onOpen: () => void; children: React.ReactNode }) { return <section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex items-center gap-2"><span>{icon}</span><h2 className="flex-1 font-semibold">{title}</h2><button type="button" onClick={onOpen} className="text-xs font-semibold text-blue-600">Ver detalhes</button></div><div className="mt-4">{children}</div></section>; }

function AcademyView(props: LifeOSProps) {
  const router = useRouter(); const [editing, setEditing] = useState<ActivityRow | null>(null); const [creating, setCreating] = useState(false);
  const activities = props.activities.filter((item) => item.area === "academia").sort((a, b) => b.date.localeCompare(a.date));
  const streak = academyStreak(activities.filter((item) => item.status === "completed").map((item) => item.date), props.today);
  const form = (activity?: ActivityRow) => <ActionForm action={activity ? (data) => editarTreinoAcademiaLifeOS(activity.id, data) : criarTreinoAcademiaLifeOS} onDone={() => { setCreating(false); setEditing(null); router.refresh(); }}><Field name="title" title="Nome do treino" value={activity?.title} required /><div className="grid gap-3 sm:grid-cols-2"><Field name="date" title="Data" type="date" value={activity?.date ?? props.today} required /><Field name="duration_minutes" title="Duracao (min)" type="number" value={activity?.durationMinutes?.toString()} /></div><Field name="type" title="Tipo" value={activity?.type ?? undefined} placeholder="Forca, cardio..." /><Field name="notes" title="Observacao" value={activity?.notes ?? undefined} /></ActionForm>;
  return <section className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><Metric title="Sequencia" value={`${streak} dias`} /><Metric title="Tempo medio" value={minutesText(averageDuration(activities.map((item) => ({ date: item.date, durationMinutes: item.durationMinutes }))))} /><Metric title="Peso atual" value={props.weights.at(-1)?.peso_kg ? `${props.weights.at(-1)?.peso_kg} kg` : "Sem registro"} /></div><section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Historico de academia</h2><p className="text-xs text-gray-400">{activities.length} registros</p></div><button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Novo treino</button></div><div className="mt-4 space-y-2">{activities.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="text-xs text-gray-400">{formatDateBR(item.date)} · {item.durationMinutes ? minutesText(item.durationMinutes) : "Duracao nao informada"}</p></div><button type="button" onClick={() => setEditing(item)} title="Editar"><Pencil className="size-4 text-gray-400" /></button><button type="button" onClick={async () => { if (window.confirm("Excluir este treino?")) { await removerTreinoAcademiaLifeOS(item.id); router.refresh(); } }} title="Excluir"><Trash2 className="size-4 text-gray-300 hover:text-red-500" /></button></div>)}{!activities.length && <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">Nenhum treino de academia registrado.</p>}</div></section>{creating && <Modal title="Novo treino" onClose={() => setCreating(false)}>{form()}</Modal>}{editing && <Modal title="Editar treino" onClose={() => setEditing(null)}>{form(editing)}</Modal>}</section>;
}

function StudiesView(props: LifeOSProps) {
  const router = useRouter(); const [editing, setEditing] = useState<StudyRoadmapItem | null>(null); const [importError, setImportError] = useState<string | null>(null); const roadmap = props.studyRoadmap; const items = props.studyItems.filter((item) => !roadmap || item.roadmapId === roadmap.id).sort((a, b) => a.orderIndex - b.orderIndex);
  const exportRoadmap = () => { const sections = new Map<string, { title: string; items: object[] }>(); items.forEach((item) => { const key = item.section ?? "Geral"; const section = sections.get(key) ?? { title: key, items: [] }; section.items.push({ title: item.title, description: item.description, estimatedMinutes: item.estimatedMinutes }); sections.set(key, section); }); const blob = new Blob([JSON.stringify({ version: 1, title: roadmap?.title ?? "Roadmap de estudos", description: roadmap?.description ?? null, sections: [...sections.values()] }, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "roadmap-estudos.json"; link.click(); URL.revokeObjectURL(link.href); };
  return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Estudos</h2><p className="text-sm text-white/50">Roadmap, materias e tempo dedicado.</p></div><div className="flex gap-2"><label className="cursor-pointer rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900">Importar<input type="file" accept="application/json" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const result = await importarRoadmapEstudosLifeOS(await file.text()); if (!result.ok) setImportError(result.error ?? "Falha ao importar."); else router.refresh(); }} /></label><button type="button" onClick={exportRoadmap} disabled={!items.length} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Exportar</button></div></div>{importError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{importError}</p>}{!roadmap ? <section className="rounded-lg bg-white p-5 text-gray-900"><h3 className="font-semibold">Criar roadmap</h3><div className="mt-4"><ActionForm action={criarRoadmapEstudosLifeOS} onDone={() => router.refresh()}><Field name="title" title="Nome" required /><Field name="description" title="Descricao" /><div className="grid gap-3 sm:grid-cols-2"><Field name="start_date" title="Inicio" type="date" value={props.today} /><Field name="target_date" title="Data alvo" type="date" /></div></ActionForm></div></section> : <section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{roadmap.title}</h3><p className="text-xs text-gray-400">{roadmapProgress(items)}% concluido · {nextStudyItem(items)?.title ?? "Roadmap concluido"}</p></div><div className="text-right text-sm font-semibold">{roadmapProgress(items)}%</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-amber-500" style={{ width: `${roadmapProgress(items)}%` }} /></div><div className="mt-5 flex flex-wrap items-center gap-2"><ActionForm action={(data) => criarItemEstudoLifeOS(roadmap.id, data)} onDone={() => router.refresh()}><div className="grid gap-2 sm:grid-cols-3"><Field name="title" title="Nova materia" required /><Field name="section" title="Etapa" /><Field name="estimated_minutes" title="Minutos" type="number" /><input type="hidden" name="order_index" value={String(items.length)} /></div></ActionForm></div><div className="mt-4 space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3"><button type="button" onClick={async () => { await atualizarStatusEstudoLifeOS(item.id, item.status === "completed" ? "pending" : "completed"); router.refresh(); }} className={`flex size-5 items-center justify-center rounded-md ring-1 ${item.status === "completed" ? "bg-emerald-500 ring-emerald-500" : "ring-gray-300"}`}>{item.status === "completed" && <Check className="size-3 text-white" />}</button><div className="min-w-0 flex-1"><p className={`font-medium ${item.status === "completed" ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.title}</p><p className="text-xs text-gray-400">{item.section ?? "Geral"}{item.estimatedMinutes ? ` · ${minutesText(item.estimatedMinutes)}` : ""}</p></div><button type="button" onClick={() => setEditing(item)} title="Editar"><Pencil className="size-4 text-gray-400" /></button><button type="button" onClick={async () => { if (window.confirm("Excluir esta materia?")) { await removerItemEstudoLifeOS(item.id); router.refresh(); } }} title="Excluir"><Trash2 className="size-4 text-gray-300 hover:text-red-500" /></button></div>)}</div></section>}<section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex items-center justify-between"><h3 className="font-semibold">Sessoes de estudo</h3><span className="text-sm text-gray-400">{minutesText(studyWeeklyStats(props.activities.filter((item) => item.area === "estudos"), props.monday, props.today).totalMinutes)} nesta semana</span></div><div className="mt-4"><ActionForm action={criarAtividadeLifeOS} onDone={() => router.refresh()}><input type="hidden" name="area" value="estudos" /><div className="grid gap-3 sm:grid-cols-3"><Field name="title" title="Assunto" required /><Field name="date" title="Data" type="date" value={props.today} required /><Field name="duration_minutes" title="Duracao (min)" type="number" required /></div><Field name="notes" title="Observacao" /></ActionForm></div></section>{editing && <Modal title="Editar materia" onClose={() => setEditing(null)}><ActionForm action={(data) => editarItemEstudoLifeOS(editing.id, data)} onDone={() => { setEditing(null); router.refresh(); }}><Field name="title" title="Nome" value={editing.title} required /><Field name="section" title="Etapa" value={editing.section ?? undefined} /><Field name="order_index" title="Ordem" type="number" value={String(editing.orderIndex)} /><Field name="estimated_minutes" title="Minutos" type="number" value={editing.estimatedMinutes?.toString()} /><Field name="description" title="Descricao" value={editing.description ?? undefined} /></ActionForm></Modal>}</section>;
}

function InvestmentsDetailedView(props: LifeOSProps) {
  const router = useRouter(); const [editing, setEditing] = useState<InvestmentContribution | null>(null); const [newContribution, setNewContribution] = useState(false); const [newSnapshot, setNewSnapshot] = useState(false); const summary = investmentSummary(props.contributions, props.snapshots, props.withdrawals); const chart = cumulativeContributions(props.contributions);
  const contributionForm = (item?: InvestmentContribution) => <ActionForm action={item ? (data) => editarAporteLifeOS(item.id, data) : criarAporteLifeOS} onDone={() => { setEditing(null); setNewContribution(false); router.refresh(); }}><div className="grid gap-3 sm:grid-cols-2"><Field name="amount" title="Valor" type="number" value={item?.amount.toFixed(2)} required /><Field name="date" title="Data" type="date" value={item?.date ?? props.today} required /></div><Field name="institution" title="Instituicao" value={item?.institution ?? undefined} /><Field name="notes" title="Observacao" value={item?.notes ?? undefined} /></ActionForm>;
  return <section className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Total aportado" value={formatBRL(summary.totalContributed)} /><Metric title="Carteira atual" value={formatBRL(summary.currentValue)} /><Metric title="Resultado" value={formatBRL(summary.result)} /><Metric title="Rentabilidade" value={summary.returnPercent == null ? "Sem base" : `${summary.returnPercent.toFixed(2)}%`} /></div><section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Aportes</h2><p className="text-xs text-gray-400">Total acumulado por mes</p></div><div className="flex gap-2"><button type="button" onClick={() => setNewSnapshot(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Atualizar carteira</button><button type="button" onClick={() => setNewContribution(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Novo aporte</button></div></div><div className="mt-4 space-y-2">{chart.map((item) => <div key={item.month} className="flex items-center gap-3 text-sm"><span className="w-20 text-gray-400">{item.month}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-emerald-500" style={{ width: `${summary.totalContributed ? Math.min(100, (item.cumulative / summary.totalContributed) * 100) : 0}%` }} /></div><b className="w-28 text-right">{formatBRL(item.cumulative)}</b></div>)}{!chart.length && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-400">Nenhum aporte registrado.</p>}</div><div className="mt-5 space-y-2">{[...props.contributions].sort((a, b) => b.date.localeCompare(a.date)).map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{formatBRL(item.amount)}</p><p className="text-xs text-gray-400">{formatDateBR(item.date)} · {item.institution ?? "Sem instituicao"}</p></div><button type="button" onClick={() => setEditing(item)} title="Editar"><Pencil className="size-4 text-gray-400" /></button><button type="button" onClick={async () => { if (window.confirm("Excluir este aporte?")) { await removerAporteLifeOS(item.id); router.refresh(); } }} title="Excluir"><Trash2 className="size-4 text-gray-300 hover:text-red-500" /></button></div>)}</div></section>{newContribution && <Modal title="Novo aporte" onClose={() => setNewContribution(false)}>{contributionForm()}</Modal>}{editing && <Modal title="Editar aporte" onClose={() => setEditing(null)}>{contributionForm(editing)}</Modal>}{newSnapshot && <Modal title="Atualizar carteira" onClose={() => setNewSnapshot(false)}><ActionForm action={salvarCarteiraLifeOS} onDone={() => { setNewSnapshot(false); router.refresh(); }}><Field name="date" title="Data" type="date" value={props.today} required /><Field name="total_value" title="Valor atual" type="number" required /><Field name="notes" title="Observacao" /></ActionForm></Modal>}</section>;
}

function ActivitiesView({ activities }: { activities: ActivityRow[] }) { return <section className="rounded-lg bg-white p-5 text-gray-900"><h2 className="font-semibold">Atividades legadas</h2><div className="mt-4 space-y-2">{activities.map((item) => <p key={item.id} className="rounded-lg border border-gray-100 p-3 text-sm">{item.title} · {item.area} · {formatDateBR(item.date)}</p>)}</div></section>; }
function GoalsView({ goals, today, onNew }: { goals: LifeGoal[]; today: string; onNew: () => void }) { const router = useRouter(); return <section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex items-center justify-between"><h2 className="font-semibold">Metas</h2><button type="button" onClick={onNew} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Nova meta</button></div><div className="mt-4 space-y-3">{goals.map((goal) => <div key={goal.id} className="rounded-lg border border-gray-100 p-4"><div className="flex justify-between"><span>{goal.name}</span><span>{pct(goalProgress(goal))}%</span></div><div className="mt-2 h-2 rounded-full bg-gray-100"><div className={`h-full rounded-full ${goalNeedsAttention(goal, today) ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${pct(goalProgress(goal))}%` }} /></div><div className="mt-2 flex justify-between text-xs text-gray-400"><span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span><button type="button" onClick={async () => { const value = Number(window.prompt("Novo valor", String(goal.currentValue))); if (Number.isFinite(value)) { await atualizarValorMetaLifeOS(goal.id, value); router.refresh(); } }}>{projectedGoalDate(goal, today) ?? "Sem projecao"}</button></div></div>)}</div></section>; }
function InvestmentsView({ snapshots, withdrawals, contributions }: { snapshots: PortfolioSnapshot[]; withdrawals: WithdrawalRow[]; contributions: { amount: number; date: string; name: string }[] }) { const total = contributions.reduce((sum, item) => sum + item.amount, 0) - withdrawals.reduce((sum, item) => sum + item.amount, 0); return <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric title="Carteira" value={snapshots[0] ? formatBRL(snapshots[0].totalValue) : "Sem registro"} /><Metric title="Aportado" value={formatBRL(total)} /><Metric title="Retiradas" value={formatBRL(withdrawals.reduce((sum, item) => sum + item.amount, 0))} /></div></section>; }
function Metric({ title, value }: { title: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-[#15191f] p-4 text-white"><p className="text-xs text-white/45">{title}</p><p className="mt-2 font-bold">{value}</p></div>; }
function InsightsView({ insights }: { insights: LifeInsight[] }) { const router = useRouter(); const [pending, startTransition] = useTransition(); return <section className="rounded-lg bg-white p-5 text-gray-900"><div className="flex justify-between"><h2 className="font-semibold">Insights</h2><button type="button" disabled={pending} onClick={() => startTransition(async () => { await gerarInsightLifeOS(); router.refresh(); })} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white"><Sparkles className="size-4" />Gerar</button></div><div className="mt-4 space-y-2">{insights.map((item) => <article key={item.id} className="rounded-lg border border-gray-100 p-3"><p className="font-medium">{item.diagnosis}</p><p className="mt-1 text-sm text-gray-500">{item.recommendedAction}</p></article>)}</div></section>; }
function SettingsView(props: LifeOSProps) { return <div className="space-y-5"><PerfilEditor alturaCm={props.alturaCm} dataNascimento={props.profile?.data_nascimento ?? null} lado={props.profile?.lado ?? null} peDominante={props.profile?.pe_dominante ?? null} pesoAtual={props.pesoAtual} pesoMeta={props.profile?.peso_meta ?? null} ratingMeta={props.profile?.rating_meta ?? null} treinosSemanaMeta={props.profile?.treinos_semana_meta ?? null} /><CategoryManager categories={props.categories} /><PesoCorpo pesos={props.weights} pesoMeta={props.profile?.peso_meta ?? null} hoje={props.today} /><FutevoleiSection ratings={props.ratings} jogos={props.matches} ratingMeta={props.profile?.rating_meta ?? null} hoje={props.today} /><TreinosSection treinos={props.trainings} testes={props.tests} treinosMeta={props.profile?.treinos_semana_meta ?? null} hoje={props.today} segunda={props.monday} /></div>; }
function CategoryManager({ categories }: { categories: LifeCategory[] }) { const router = useRouter(); return <section className="rounded-lg bg-white p-5 text-gray-900"><h2 className="font-semibold">Categorias</h2><div className="mt-3"><ActionForm action={criarCategoriaLifeOS}><Field name="name" title="Nova categoria" required /></ActionForm></div><div className="mt-3 space-y-2">{categories.map((category) => <div key={category.id} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm"><span>{category.name}</span><button type="button" onClick={async () => { await removerCategoriaLifeOS(category.id); router.refresh(); }} className="text-xs text-red-500">Arquivar</button></div>)}</div></section>; }
