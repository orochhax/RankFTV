"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Activity, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, Goal, ListChecks, Loader2, Pencil, Plus, Settings2, Trash2, Wallet } from "lucide-react";
import { formatDateBR } from "@/lib/format";
import type { Habit, HabitLog } from "@/lib/performance";
import { criarHabito, editarHabito, excluirHabito, reativarHabito, registrarHabito, removerHabito } from "@/app/admin/performance/actions";
import { criarAtividadeLifeOS, criarEventoLifeOS, criarMetaLifeOS, criarTarefaLifeOS, editarEventoLifeOS, editarTarefaLifeOS, registrarTarefaLifeOS, removerEventoLifeOS, removerTarefaLifeOS, salvarCarteiraLifeOS } from "@/app/admin/performance/life-os-actions";
import { habitMonthStats, monthGrid, nextMonth, previousMonth, type DashboardRange, type TaskOccurrence, taskProgress } from "@/lib/performance-dashboard";
import { dayProgress, type LifeCategory, type LifeEvent, type LifeGoal, type LifeInsight, type LifeOSView, type PortfolioSnapshot, durationLabel, durationMinutes, isoDateToLabel } from "@/lib/performance-life-os";
import { MetasDoDia as MetasDoDiaBase } from "@/components/performance/MetasDoDia";
import { PerfilEditor } from "@/components/performance/PerfilEditor";
import type { WeeklyReport } from "@/components/performance/RelatorioSemanal";
import { CalendarClient } from "@/components/performance/CalendarClient";
import type { InvestmentContribution, StudyAssessmentAttempt, StudyAssessmentQuestion, StudyRoadmap, StudyRoadmapItem, StudyRoadmapModule, StudySessionMetadata } from "@/lib/performance-widgets";
import { HabitAnalytics } from "@/components/performance/HabitAnalytics";
import { AcademyWorkspace } from "@/components/performance/AcademyWorkspace";
import { StudiesWorkspace } from "@/components/performance/StudiesWorkspace";
import { InvestmentsWorkspace } from "@/components/performance/InvestmentsWorkspace";
import { AcademyDashboardWidget, FinanceDashboardWidget, StudyDashboardWidget } from "@/components/performance/DashboardMetricWidgets";
import type { ConsistencyStatus } from "@/lib/performance-analytics";
import type { RoadmapDraftSummary, RoadmapGenerationJob } from "@/lib/study-roadmap-ai";
import type { DailyLifeAnalysis } from "@/lib/daily-life-analysis";
import { DailyLifeAnalysisCard } from "@/components/performance/DailyLifeAnalysisCard";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { AllDayEventRows, BAHIA_TIME_LABEL_FORMATTER, CurrentDayTimeline, dateKeyInBahia } from "@/components/performance/PerformanceTimeline";

type ActivityRow = { id: string; title: string; date: string; area: string; type: string | null; durationMinutes: number | null; status: string; notes: string | null; muscleGroups: string[]; studySession: StudySessionMetadata | null };
type WithdrawalRow = { id: string; date: string; amount: number; institution: string | null; notes: string | null };
type Profile = { altura_cm?: number | null; data_nascimento?: string | null; lado?: string | null; pe_dominante?: string | null; peso_meta?: number | null; rating_meta?: number | null; treinos_semana_meta?: number | null } | null;

export type LifeOSProps = {
  today: string; monday: string; userId: string; nome: string; username: string | null; fotoUrl: string | null; email: string; telefone: string | null; dataNascimento: string | null;
  profile: Profile; alturaCm: number | null; pesoAtual: number | null;
  habits: Habit[]; allHabits: Habit[]; logs: HabitLog[]; valoresHoje: Record<string, number>;
  reportAtual: WeeklyReport | null; reportHistory: WeeklyReport[];
  weights: { data: string; peso_kg: number }[]; ratings: { id: string; data: string; rating: number }[];
  matches: { id: string; data: string; parceiro: string | null; adversario: string | null; resultado: "vitoria" | "derrota"; placar: string | null; obs: string | null }[];
  trainings: { id: string; data: string; tipo: string; duracao_min: number | null; obs: string | null }[];
  tests: { id: string; data: string; tipo_teste: string; valor: number; unidade: string | null }[];
  events: LifeEvent[]; activities: ActivityRow[]; goals: LifeGoal[]; snapshots: PortfolioSnapshot[]; withdrawals: WithdrawalRow[]; insights: LifeInsight[]; categories: LifeCategory[];
  contributions: InvestmentContribution[]; studyRoadmap: StudyRoadmap | null; studyRoadmaps: StudyRoadmap[]; studyItems: StudyRoadmapItem[]; studyModules: StudyRoadmapModule[]; studyQuestions: StudyAssessmentQuestion[]; studyAttempts: StudyAssessmentAttempt[]; studyDrafts: RoadmapDraftSummary[]; studyGenerationJobs: RoadmapGenerationJob[]; studyDraftsReady: boolean; studyEnhancementsReady: boolean; studyReferenceStandardReady: boolean; studyV2Ready: boolean; range: DashboardRange; taskOccurrences: TaskOccurrence[]; consistency: ConsistencyStatus; dailyAnalysis: DailyLifeAnalysis | null; schemaReady: boolean;
};

const nav: { id: LifeOSView; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Dashboard", icon: Activity }, { id: "agenda", label: "Agenda", icon: CalendarDays }, { id: "habits", label: "Habitos", icon: ListChecks },
  { id: "activities", label: "Academia", icon: Flame }, { id: "goals", label: "Estudos", icon: Goal }, { id: "investments", label: "Investimentos", icon: Wallet },
  { id: "settings", label: "Perfil", icon: Settings2 },
];

const inputClass = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

function Field({ name, title, type = "text", required = false, value, onChange, placeholder, min }: { name: string; title: string; type?: string; required?: boolean; value?: string; onChange?: (value: string) => void; placeholder?: string; min?: string }) {
  return <label className="block text-xs font-medium text-white/45">{title}<input name={name} type={type} required={required} min={min} value={onChange ? value : undefined} defaultValue={onChange ? undefined : value} placeholder={placeholder} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className={`${inputClass} mt-1`} /></label>;
}

function ActionForm({ action, children, onDone }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; children: React.ReactNode; onDone?: () => void }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form onSubmit={(event) => { event.preventDefault(); setError(null); const form = event.currentTarget; const data = new FormData(form); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else { form.reset(); onDone?.(); router.refresh(); } }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>;
}

export function LifeOSDashboard(props: LifeOSProps) {
  const router = useRouter(); const params = useSearchParams(); const requested = params.get("view") as LifeOSView | null;
  const view = requested && nav.some((item) => item.id === requested) ? requested : "today";
  const [quick, setQuick] = useState<"event" | "activity" | "goal" | "portfolio" | null>(params.get("newEvent") === "1" ? "event" : null);
  const go = (next: LifeOSView) => router.replace(`/admin/performance?view=${next}`, { scroll: false });
  const progress = dayProgress(props.habits, props.logs, props.today);
  const todayEvents = props.events.filter((event) => event.startAt.slice(0, 10) === props.today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  return <div className="life-os-theme min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0b0d10] text-white">
    <header className="border-b border-white/10 bg-[#0b0d10] px-3 pb-5 pt-4 sm:px-4 lg:px-6 2xl:px-8">
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0"><p className="text-xs uppercase text-white/40">Life OS</p><h1 className="mt-1 truncate text-2xl font-bold">Ola, {props.nome.split(" ")[0]}</h1><p className="mt-1 text-sm text-white/50">{isoDateToLabel(props.today)} · evolucao real e decisoes por dados.</p></div>
          {props.fotoUrl ? <Image src={props.fotoUrl} alt={props.nome} width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" /> : <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold">{props.nome.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>}
        </div>
        <nav className="mt-5 flex gap-1 overflow-x-auto pb-1" aria-label="Life OS">{nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => go(id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${view === id ? "bg-white text-gray-900" : "text-white/55 hover:bg-white/10 hover:text-white"}`}><Icon className="size-4" />{label}</button>)}</nav>
      </div>
    </header>
    <main className="w-full min-w-0 px-3 py-5 pb-24 sm:px-4 lg:px-6 2xl:px-8">
      {!props.schemaReady && <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Ha uma migracao do Life OS aguardando aplicacao. Seus dados atuais continuam preservados.</p>}
      {view === "today" && <DashboardViewLegacy {...props} progress={progress} todayEvents={todayEvents} onQuick={setQuick} />}
      {view === "agenda" && <CalendarClient events={props.events} embedded initialDate={props.today} />}
      {view === "habits" && <><MetasDoDiaBase habits={props.habits} valoresIniciais={props.valoresHoje} hoje={props.today} /><HabitAnalytics habits={props.habits} logs={props.logs} today={props.today} /></>}
      {view === "activities" && <AcademyWorkspace activities={props.activities} weights={props.weights} today={props.today} heightCm={props.alturaCm} currentWeight={props.pesoAtual} targetWeight={props.profile?.peso_meta ?? null} />}
      {view === "goals" && <StudiesWorkspace roadmaps={props.studyRoadmaps} items={props.studyItems} modules={props.studyModules} questions={props.studyQuestions} attempts={props.studyAttempts} drafts={props.studyDrafts} generationJobs={props.studyGenerationJobs} activities={props.activities} today={props.today} monday={props.monday} v2Ready={props.studyV2Ready} draftsReady={props.studyDraftsReady} enhancementsReady={props.studyEnhancementsReady} referenceStandardReady={props.studyReferenceStandardReady} />}
      {view === "investments" && <InvestmentsWorkspace snapshots={props.snapshots} withdrawals={props.withdrawals} contributions={props.contributions} today={props.today} />}
      {view === "settings" && <SettingsView {...props} />}
    </main>
    {quick === "event" && <Modal title="Novo evento" onClose={() => setQuick(null)}><EventForm onDone={() => setQuick(null)} /></Modal>}
    {quick === "activity" && <Modal title="Registrar atividade" onClose={() => setQuick(null)}><ActionForm action={criarAtividadeLifeOS} onDone={() => setQuick(null)}><Field name="area" title="Area" required /><Field name="date" title="Data" type="date" required /><Field name="title" title="Titulo" required /><Field name="duration_minutes" title="Duracao (min)" type="number" /><Field name="notes" title="Observacao" /></ActionForm></Modal>}
    {quick === "goal" && <Modal title="Nova meta" onClose={() => setQuick(null)}><ActionForm action={criarMetaLifeOS} onDone={() => setQuick(null)}><Field name="name" title="Nome" required /><Field name="target_value" title="Valor-alvo" type="number" required /><Field name="area" title="Area" /><Field name="unit" title="Unidade" /></ActionForm></Modal>}
    {quick === "portfolio" && <Modal title="Atualizar carteira" onClose={() => setQuick(null)}><ActionForm action={salvarCarteiraLifeOS} onDone={() => setQuick(null)}><Field name="date" title="Data" type="date" required /><Field name="total_value" title="Valor atual" type="number" required /></ActionForm></Modal>}
  </div>;
}

function DashboardViewLegacy({ ...p }: LifeOSProps & { progress: ReturnType<typeof dayProgress>; todayEvents: LifeEvent[]; onQuick: (quick: "event" | "activity" | "goal" | "portfolio" | null) => void }) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
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
    <DailyLifeAnalysisCard analysis={p.dailyAnalysis} consistency={p.consistency} />

    <section className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#15191f] p-3">
      <div className="flex flex-wrap gap-1">{[["today", "Hoje"], ["week", "Semana"], ["month", "Mes"], ["custom", "Personalizado"]].map(([value, label]) => <button type="button" key={value} onClick={() => apply(value)} className={`rounded-lg px-3 py-2 text-sm ${p.range.period === value ? "bg-white text-gray-900" : "text-white/60 hover:bg-white/10"}`}>{label}</button>)}</div>
      <span className="w-full text-xs text-white/45 sm:ml-auto sm:w-auto">{formatDateBR(p.range.from)} - {formatDateBR(p.range.to)}</span>
      {p.range.period === "custom" && <div className="grid w-full gap-2 border-t border-white/10 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"><Field name="from" title="De" type="date" value={from} onChange={setFrom} /><Field name="to" title="Ate" type="date" value={to} onChange={setTo} /><button type="button" onClick={applyCustom} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold sm:w-auto">Aplicar</button></div>}
    </section>

    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
      <div className="min-w-0 space-y-5">
        <TaskPanel occurrences={p.taskOccurrences} progress={progress} onNew={() => setTaskForm({ id: "", title: "", startDate: p.today, recurrenceType: "none", recurrenceEndDate: null, active: true, occurrenceDate: p.today, completed: false, completedAt: null })} onEdit={setTaskForm} onToggle={async (item) => { await registrarTarefaLifeOS(item.id, item.occurrenceDate, !item.completed); router.refresh(); }} onDelete={async (id) => { const approved = await confirm({ title: "Excluir tarefa?", description: "A tarefa e todas as ocorrencias dela serao removidas definitivamente.", confirmLabel: "Excluir tarefa" }); if (!approved) return; await removerTarefaLifeOS(id); router.refresh(); }} />
        <HabitPanel habits={p.habits} logs={p.logs} today={p.today} onManage={() => setManageHabits(true)} onOpen={setHabit} onToggle={async (item, done) => { await registrarHabito(item.id, done ? (item.alvo ?? 1) : 0, p.today); router.refresh(); }} />
        <LifeOSWidgets {...p} />
      </div>
      <TimelinePanel events={events} today={p.today} onNew={() => p.onQuick("event")} onCalendar={() => router.push("/admin/performance?view=agenda")} />
    </div>

    {taskForm && <Modal title={taskForm.id ? "Editar tarefa" : "Nova tarefa"} onClose={() => setTaskForm(null)}><TaskForm task={taskForm} onDone={() => { setTaskForm(null); router.refresh(); }} /></Modal>}
    {manageHabits && <HabitManagerModal habits={p.allHabits} onClose={() => setManageHabits(false)} />}
    {habit && <HabitConstancyModal habit={habit} logs={p.logs} today={p.today} onClose={() => setHabit(null)} />}
  </div>;
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

  return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white [&_.border-gray-100]:!border-white/10 [&_.border-gray-200]:!border-white/10 [&_.bg-gray-50]:!bg-[#11151a] [&_.bg-gray-100]:!bg-white/10 [&_.bg-white]:!bg-transparent [&_.ring-gray-300]:!ring-white/20 [&_.text-gray-300]:!text-white/25 [&_.text-gray-400]:!text-white/35 [&_.text-gray-500]:!text-white/45 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70">
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
  const confirm = usePerformanceConfirm();
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
      <button type="button" disabled={deletePending} onClick={async () => {
        const approved = await confirm({ title: "Excluir evento?", description: `O evento “${event.title}” sera removido da agenda definitivamente.`, confirmLabel: "Excluir evento" });
        if (!approved) return;
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

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compareDatesAroundCurrent(left: string, right: string, current: string): number {
  if (left === right) return 0;
  if (left === current) return -1;
  if (right === current) return 1;
  const leftIsFuture = left > current;
  const rightIsFuture = right > current;
  if (leftIsFuture !== rightIsFuture) return leftIsFuture ? -1 : 1;
  return leftIsFuture ? left.localeCompare(right) : right.localeCompare(left);
}

function useCurrentBahiaDate(initialDate: string) {
  const [dateKey, setDateKey] = useState(initialDate);

  useEffect(() => {
    const update = () => setDateKey(dateKeyInBahia(new Date()));
    update();
    const interval = window.setInterval(update, 1_000);
    const synchronize = () => { if (!document.hidden) update(); };
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);

  return dateKey;
}

function CompactDayTimeline({ events, onEvent }: { events: LifeEvent[]; onEvent: (event: LifeEvent) => void }) {
  const allDayEvents = events.filter((event) => event.allDay);
  const timedEvents = events.filter((event) => !event.allDay);

  return <>
    <AllDayEventRows events={allDayEvents} onEvent={onEvent} />
    {timedEvents.length > 0 && <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[52px] before:top-3 before:w-px before:bg-white/20">
    {timedEvents.map((event) => <div key={event.id} className="relative flex items-center gap-3">
      <div className="z-10 flex w-12 shrink-0 flex-col items-center">
        <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-blue-600"><Clock3 className="size-3.5" /></span>
        <span className="mt-1 w-full text-center text-[10px] tabular-nums text-white/45">{BAHIA_TIME_LABEL_FORMATTER.format(new Date(event.startAt))}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{event.title}</p>
          <p className="mt-1 text-xs text-white/45">{durationLabel(durationMinutes(event.startAt, event.endAt))} · {event.status === "completed" ? "Concluido" : "Planejado"}</p>
        </div>
        <button type="button" onClick={() => onEvent(event)} className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white" title="Editar evento" aria-label={`Editar ${event.title}`}>
          <Pencil className="size-4" />
        </button>
      </div>
    </div>)}
    </div>}
  </>;
}

function TimelinePanel({ events, today, onNew, onCalendar }: { events: LifeEvent[]; today: string; onNew: () => void; onCalendar: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState<LifeEvent | null>(null);
  const currentDateKey = useCurrentBahiaDate(today);
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
    const dateKey = dateKeyInBahia(eventDate);
    const monthKey = dateKey.slice(0, 7);
    const month = monthGroups.get(monthKey) ?? { label: monthLabelFormatter.format(eventDate), days: new Map() };
    const day = month.days.get(dateKey) ?? { label: dayLabelFormatter.format(eventDate), events: [] };
    day.events.push(event);
    month.days.set(dateKey, day);
    monthGroups.set(monthKey, month);
  });

  const currentDate = new Date(`${currentDateKey}T12:00:00-03:00`);
  const currentMonthKey = currentDateKey.slice(0, 7);
  const currentMonth = monthGroups.get(currentMonthKey) ?? { label: monthLabelFormatter.format(currentDate), days: new Map() };
  if (!currentMonth.days.has(currentDateKey)) {
    currentMonth.days.set(currentDateKey, { label: dayLabelFormatter.format(currentDate), events: [] });
  }
  const currentDay = currentMonth.days.get(currentDateKey)!;
  const currentDayStart = new Date(`${currentDateKey}T00:00:00-03:00`).getTime();
  const nextDayStart = new Date(`${shiftDateKey(currentDateKey, 1)}T00:00:00-03:00`).getTime();
  const currentDayEventIds = new Set(currentDay.events.map((event: LifeEvent) => event.id));
  events.forEach((event) => {
    const eventStart = new Date(event.startAt).getTime();
    const eventEnd = new Date(event.endAt).getTime();
    if (eventStart < nextDayStart && eventEnd > currentDayStart && !currentDayEventIds.has(event.id)) {
      currentDay.events.push(event);
      currentDayEventIds.add(event.id);
    }
  });
  monthGroups.set(currentMonthKey, currentMonth);

  return <section className="min-w-0 rounded-lg border border-white/10 bg-[#15191f] p-4 text-white sm:p-5 xl:min-h-[620px]">
    <div className="flex items-center justify-between">
      <div><h2 className="font-semibold">Eventos</h2><p className="text-xs text-white/40">Linha do tempo completa</p></div>
      <div className="flex gap-1">
        <button type="button" onClick={onNew} className="rounded-lg bg-blue-600 p-2" title="Novo evento"><Plus className="size-4" /></button>
        <button type="button" onClick={onCalendar} className="rounded-lg bg-white/10 p-2" title="Abrir agenda" aria-label="Abrir agenda"><CalendarDays className="size-4" /></button>
      </div>
    </div>
    <div className="mt-5 space-y-7">
      {[...monthGroups].sort(([left], [right]) => compareDatesAroundCurrent(left, right, currentMonthKey)).map(([monthKey, month]) => <section key={monthKey}>
        <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
          <CalendarDays className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold capitalize text-white">{month.label}</h3>
        </div>
        <div className="space-y-6">
          {[...month.days].sort(([left], [right]) => compareDatesAroundCurrent(left, right, currentDateKey)).map(([dateKey, day]) => {
            const orderedEvents = [...day.events].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

            return <div key={dateKey}>
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold capitalize text-white/55">{day.label}{dateKey === currentDateKey && <span className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case text-red-400"><span className="size-1.5 rounded-full bg-red-500 motion-safe:animate-pulse" />Agora</span>}</p>
              {dateKey === currentDateKey
                ? <CurrentDayTimeline dateKey={dateKey} events={orderedEvents} onEvent={setSelectedEvent} />
                : <CompactDayTimeline events={orderedEvents} onEvent={setSelectedEvent} />}
            </div>;
          })}
        </div>
      </section>)}
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
  return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white [&_.bg-gray-50]:!bg-[#11151a] [&_.bg-gray-100]:!bg-white/10 [&_.bg-white]:!bg-transparent [&_.ring-gray-300]:!ring-white/20 [&_.text-gray-400]:!text-white/35 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70">
    <div className="flex items-center justify-between"><div><h2 className="font-semibold">Habitos</h2><p className="text-xs text-gray-400">{completed} de {habits.length} concluidos hoje</p></div><button type="button" onClick={onManage} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600"><Settings2 className="size-4" />Editar</button></div>
    <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div><b className="w-10 text-right text-xs">{percent}%</b></div>
    <div className="mt-4 space-y-1">{habits.map((habit) => { const done = (todayLogs.get(habit.id) ?? 0) >= (habit.alvo ?? 1); return <div key={habit.id} className="flex items-center gap-3 py-2"><button type="button" onClick={() => onToggle(habit, !done)} className={`flex size-5 items-center justify-center rounded-md ring-1 ${done ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}>{done && <Check className="size-3 text-white" />}</button><button type="button" onClick={() => onOpen(habit)} className="flex-1 text-left text-sm text-gray-700">{habit.label}</button></div>; })}{!habits.length && <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-400">Nenhum habito ativo.</p>}</div>
  </section>;
}

function HabitManagerModal({ habits, onClose }: { habits: Habit[]; onClose: () => void }) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
  const [editing, setEditing] = useState<Habit | null>(null);

  return <Modal title="Editar habitos" onClose={onClose}>
    <ActionForm action={criarHabito} onDone={() => router.refresh()}><Field name="label" title="Novo habito" required /><input type="hidden" name="tipo" value="binario" /></ActionForm>
    <div className="mt-5 space-y-2">{habits.map((habit) => <div key={habit.id} className="rounded-lg border border-gray-100 p-3"><div className="flex items-center gap-2"><span className="flex-1 text-sm">{habit.label}</span>{habit.ativo ? <><button type="button" onClick={() => setEditing(habit)} title="Editar"><Pencil className="size-4" /></button><button type="button" onClick={async () => { await removerHabito(habit.id); router.refresh(); }} className="text-xs text-amber-600">Arquivar</button></> : <><button type="button" onClick={async () => { await reativarHabito(habit.id); router.refresh(); }} className="text-xs text-blue-600">Reativar</button><button type="button" onClick={async () => { const approved = await confirm({ title: "Excluir historico do habito?", description: `Todos os registros de “${habit.label}” serao apagados definitivamente.`, confirmLabel: "Excluir historico" }); if (!approved) return; await excluirHabito(habit.id); router.refresh(); }} title="Excluir historico"><Trash2 className="size-4 text-red-500" /></button></>}</div></div>)}</div>
    {editing && <Modal title="Editar habito" onClose={() => setEditing(null)}><ActionForm action={editarHabito} onDone={() => setEditing(null)}><input type="hidden" name="id" value={editing.id} /><input type="hidden" name="tipo" value={editing.tipo} /><Field name="label" title="Nome" value={editing.label} required /></ActionForm></Modal>}
  </Modal>;
}

function HabitConstancyModal({ habit, logs, today, onClose }: { habit: Habit; logs: HabitLog[]; today: string; onClose: () => void }) { const [month, setMonth] = useState(today.slice(0, 7)); const stats = habitMonthStats(habit, logs, month, today); const current = today.slice(0, 7); const weeks = monthGrid(month); const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01T12:00:00Z")); return <Modal title={habit.label} onClose={onClose}><div className="flex items-center justify-between"><button type="button" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-5" /></button><div className="text-center"><p className="font-semibold capitalize">{title}</p><p className={stats.status === "good" ? "text-sm text-emerald-600" : stats.status === "bad" ? "text-sm text-red-600" : "text-sm text-gray-400"}>{stats.status === "good" ? "Bom" : stats.status === "bad" ? "Ruim" : "Sem dados"} · {stats.percent}%</p></div><button type="button" disabled={month >= current} onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-5" /></button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">{["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => <span key={index}>{day}</span>)}</div><div className="mt-1 space-y-1">{weeks.map((week, index) => <div key={index} className="grid grid-cols-7 gap-1">{week.map((date, dayIndex) => { if (!date) return <span key={dayIndex} className="aspect-square" />; const value = logs.find((log) => log.habit_id === habit.id && log.data === date)?.valor; const done = value != null && (habit.tipo === "binario" ? value >= 1 : habit.alvo ? value >= habit.alvo : value > 0); return <span key={date} title={formatDateBR(date)} className={`aspect-square rounded-sm ${done ? "bg-emerald-500" : "bg-gray-100"}`} />; })}</div>)}</div><p className="mt-4 text-center text-sm text-gray-500">{stats.completed} de {stats.eligible} dias concluidos</p></Modal>; }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-5 text-white shadow-2xl [&_.border-gray-100]:!border-white/10 [&_.bg-gray-100]:!bg-white/10 [&_.text-gray-400]:!text-white/35 [&_.text-gray-500]:!text-white/45 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-white/45 hover:bg-white/10 hover:text-white">Fechar</button></div>{children}</div></div>; }

function LifeOSWidgets(props: LifeOSProps) {
  const academy = props.activities.filter((item) => item.area === "academia" && item.status === "completed");
  const studies = props.activities.filter((item) => item.area === "estudos" && item.status === "completed");
  return <section className="grid gap-4 sm:grid-cols-2">
    <AcademyDashboardWidget activities={academy} today={props.today} weights={props.weights} />
    <FinanceDashboardWidget contributions={props.contributions} snapshots={props.snapshots} withdrawals={props.withdrawals} />
    <div className="sm:col-span-2">
      <StudyDashboardWidget roadmap={props.studyRoadmap} items={props.studyItems} modules={props.studyModules} activities={studies} monday={props.monday} today={props.today} />
    </div>
  </section>;
}

function SettingsView(props: LifeOSProps) { return <PerfilEditor userId={props.userId} nome={props.nome} email={props.email} telefone={props.telefone} dataNascimento={props.dataNascimento} fotoUrl={props.fotoUrl} />; }
