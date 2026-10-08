"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  Flame,
  GraduationCap,
  Headphones,
  LibraryBig,
  Mic2,
  PencilLine,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import {
  LEARNERS,
  ROADMAP_DAYS,
  SOURCE_STRATEGY,
  TOTAL_YEAR_DAYS,
  YEAR_PHASES,
  type LearnerId,
  type RoadmapDay,
} from "./roadmap";
import { practiceIsReady, practiceResponseKey, PRACTICE_SETS } from "./practice";
import { ActivityCard, type PracticeInteractionProps } from "./ActivityCard";
import { readEnglishCourseData, writeEnglishCourseData, type PersistedData } from "./storage";

type ActiveView = "roadmap" | "sources";
const CYCLE_ACTIVITY_COUNT = ROADMAP_DAYS.reduce((total, day) => total + day.activities.length, 0);

function subscribeToHydration() {
  return () => undefined;
}

function dayIsComplete(day: RoadmapDay, completed: Record<string, boolean>) {
  return day.activities.every((activity) => completed[activity.id]);
}

function deriveTrackerView(data: PersistedData, activeLearner: LearnerId, selectedWeek: number) {
  const learner = LEARNERS.find((item) => item.id === activeLearner) ?? LEARNERS[0];
  const learnerProgress = data.progress[activeLearner];
  const allActivities = ROADMAP_DAYS.flatMap((day) => day.activities);
  const completedActivities = allActivities.filter((activity) => learnerProgress[activity.id]).length;
  const completedDays = ROADMAP_DAYS.filter((day) => dayIsComplete(day, learnerProgress)).length;
  const currentDay = ROADMAP_DAYS.find((day) => !dayIsComplete(day, learnerProgress)) ?? ROADMAP_DAYS[ROADMAP_DAYS.length - 1];
  return {
    learner,
    learnerProgress,
    learnerPracticeResponses: data.practiceResponses[activeLearner],
    learnerPracticeSubmissions: data.practiceSubmissions[activeLearner],
    completedActivities,
    completedDays,
    currentDay,
    cyclePercentage: Math.round((completedActivities / allActivities.length) * 100),
    weekDays: ROADMAP_DAYS.filter((day) => day.week === selectedWeek),
  };
}

export function EnglishRoadmapTracker() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!hydrated) {
    return <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 sm:px-7 sm:py-8 lg:px-10"><div className="mx-auto h-72 max-w-7xl animate-pulse rounded-[2rem] bg-slate-200" /></main>;
  }
  return <HydratedEnglishRoadmapTracker />;
}

function HydratedEnglishRoadmapTracker() {
  const [activeLearner, setActiveLearner] = useState<LearnerId>("carlos");
  const [activeView, setActiveView] = useState<ActiveView>("roadmap");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [data, setData] = useState<PersistedData>(readEnglishCourseData);

  useEffect(() => {
    writeEnglishCourseData(data);
  }, [data]);

  const {
    learner,
    learnerProgress,
    learnerPracticeResponses,
    learnerPracticeSubmissions,
    completedActivities,
    completedDays,
    currentDay,
    cyclePercentage,
    weekDays,
  } = deriveTrackerView(data, activeLearner, selectedWeek);

  function toggleActivity(activityId: string) {
    setData((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [activeLearner]: {
          ...current.progress[activeLearner],
          [activityId]: !current.progress[activeLearner][activityId],
        },
      },
    }));
  }

  function setPracticeResponse(activityId: string, itemId: string, value: string) {
    const key = practiceResponseKey(activityId, itemId);
    setData((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [activeLearner]: { ...current.progress[activeLearner], [activityId]: false },
      },
      practiceResponses: {
        ...current.practiceResponses,
        [activeLearner]: { ...current.practiceResponses[activeLearner], [key]: value },
      },
      practiceSubmissions: {
        ...current.practiceSubmissions,
        [activeLearner]: { ...current.practiceSubmissions[activeLearner], [activityId]: false },
      },
    }));
  }

  function submitPractice(activityId: string) {
    const set = PRACTICE_SETS[activityId];
    if (!set || !practiceIsReady(set, learnerPracticeResponses)) return;
    setData((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [activeLearner]: { ...current.progress[activeLearner], [activityId]: true },
      },
      practiceSubmissions: {
        ...current.practiceSubmissions,
        [activeLearner]: { ...current.practiceSubmissions[activeLearner], [activityId]: true },
      },
    }));
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-5 text-slate-950 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Hero />

        <section aria-label="Escolher aluno" className="grid gap-3 sm:grid-cols-2">
          {LEARNERS.map((item) => {
            const selected = item.id === activeLearner;
            const itemCompleted = ROADMAP_DAYS.filter((day) => dayIsComplete(day, data.progress[item.id])).length;
            return <button key={item.id} type="button" onClick={() => setActiveLearner(item.id)} aria-pressed={selected} className={`flex min-h-20 items-center gap-4 rounded-2xl border p-3.5 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${selected ? "border-[#16387d] bg-[#102963] text-white shadow-[#102963]/15" : "border-slate-200 bg-white text-slate-800 hover:border-sky-200 hover:bg-sky-50/40"}`}>
              <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${selected ? "bg-white/12 text-cyan-200" : "bg-sky-50 text-[#16387d]"}`}>{item.initials}</span>
              <span className="min-w-0 flex-1"><span className={`block text-xs font-semibold uppercase tracking-[.12em] ${selected ? "text-sky-200/75" : "text-slate-400"}`}>Progresso de</span><span className="mt-0.5 block text-lg font-semibold">{item.name}</span></span>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${selected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>{itemCompleted}/35 dias</span>
            </button>;
          })}
        </section>

        <nav aria-label="Seções do curso" className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-fit">
          <ViewButton active={activeView === "roadmap"} onClick={() => setActiveView("roadmap")} icon={BookOpen} label="Plano diário" />
          <ViewButton active={activeView === "sources"} onClick={() => setActiveView("sources")} icon={LibraryBig} label="Fontes e curadoria" />
        </nav>

        {activeView === "roadmap" ? (
          <RoadmapView
            learnerName={learner.name}
            progress={learnerProgress}
            completedDays={completedDays}
            completedActivities={completedActivities}
            percentage={cyclePercentage}
            currentDay={currentDay}
            weekDays={weekDays}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            onToggle={toggleActivity}
            practiceResponses={learnerPracticeResponses}
            practiceSubmissions={learnerPracticeSubmissions}
            onPracticeResponse={setPracticeResponse}
            onPracticeSubmit={submitPractice}
          />
        ) : (
          <SourcesView />
        )}

        <footer className="flex flex-col gap-2 border-t border-slate-200 py-2 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Progresso e respostas salvos neste navegador e neste dispositivo.</span><span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-sky-700" />Mesmo conteúdo, acompanhamento individual.</span></footer>
      </div>
    </main>
  );
}

function Hero() {
  return <section className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0b1739_0%,#102963_58%,#0f7490_140%)] px-6 py-7 text-white shadow-[0_25px_70px_-38px_rgba(15,41,99,.9)] sm:px-9 sm:py-10">
    <div className="absolute -right-16 -top-24 -z-10 size-80 rounded-full border-[46px] border-white/5" />
    <div className="absolute -bottom-44 left-1/3 -z-10 size-96 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-[.08em] text-sky-50"><GraduationCap className="size-4 text-cyan-300" /> PROJETO CARLOS E JÚLIA · 1 ANO</div><h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Inglês construído um dia de cada vez.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-sky-100/75 sm:text-base">Aulas selecionadas, prática diária e progresso separado — do absoluto zero à autonomia.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]"><div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><p className="text-xs text-sky-100/65">Projeto completo</p><p className="mt-1 text-2xl font-semibold">{TOTAL_YEAR_DAYS} dias</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4"><p className="text-xs text-sky-100/65">1º ciclo publicado</p><p className="mt-1 text-2xl font-semibold">5 semanas</p></div></div>
    </div>
  </section>;
}

type RoadmapViewProps = PracticeInteractionProps & {
  learnerName: string;
  progress: Record<string, boolean>;
  completedDays: number;
  completedActivities: number;
  percentage: number;
  currentDay: RoadmapDay;
  weekDays: RoadmapDay[];
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  onToggle: (id: string) => void;
};

function RoadmapView({ learnerName, progress, completedDays, completedActivities, percentage, currentDay, weekDays, selectedWeek, onSelectWeek, onToggle, practiceResponses, practiceSubmissions, onPracticeResponse, onPracticeSubmit }: RoadmapViewProps) {
  const practiceProps = { practiceResponses, practiceSubmissions, onPracticeResponse, onPracticeSubmit };
  return <div className="space-y-6">
    <section className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Visão de {learnerName}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Ciclo 1 · Base A0–A1</h2><p className="mt-1 text-sm text-slate-500">Todos os dias: aprender, escutar, responder e falar.</p></div><div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(#0ea5e9 ${percentage}%, #e2e8f0 0)` }}><div className="grid size-16 place-items-center rounded-full bg-white text-lg font-bold">{percentage}%</div></div></div><div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5"><Metric icon={CheckCircle2} label="Dias concluídos" value={`${completedDays}/35`} tone="text-emerald-700" bg="bg-emerald-50" /><Metric icon={Target} label="Atividades" value={`${completedActivities}/${CYCLE_ACTIVITY_COUNT}`} tone="text-sky-700" bg="bg-sky-50" /><Metric icon={Flame} label="Próximo dia" value={`${currentDay.day}`} tone="text-orange-700" bg="bg-orange-50" /></div></div>
      <aside className="rounded-3xl border border-emerald-200 bg-[linear-gradient(145deg,#ecfdf5,#f8fafc)] p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><Sparkles aria-hidden="true" className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-700">Ritmo recomendado</p><h2 className="mt-1 text-lg font-semibold">1 roteiro por dia</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Avance na ordem do plano e conclua os 4 pilares do dia. O progresso de {learnerName} fica salvo separadamente neste navegador.</p></aside>
    </section>

    <section className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Roteiro diário</p><h2 className="mt-1 text-2xl font-semibold">Imersão guiada · primeiro ciclo</h2><p className="mt-1 text-sm text-slate-500">Aula, vlog incorporado, exercícios corrigidos e conversação pronta dentro de cada dia.</p><PillarLegend /></div><div className="flex gap-2 overflow-x-auto pb-1">{[1, 2, 3, 4, 5].map((week) => <button key={week} type="button" onClick={() => onSelectWeek(week)} className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${selectedWeek === week ? "bg-[#102963] text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"}`}>Semana {week}</button>)}</div><div className="grid gap-3">{weekDays.map((day) => <DayDetails key={day.id} day={day} progress={progress} current={day.id === currentDay.id} onToggle={onToggle} {...practiceProps} />)}</div></section>

    <YearMap />
  </div>;
}

const PILLARS = [
  { label: "1. Aprender", icon: CirclePlay, className: "border-sky-200 bg-sky-50 text-sky-900" },
  { label: "2. Escutar", icon: Headphones, className: "border-cyan-200 bg-cyan-50 text-cyan-900" },
  { label: "3. Responder", icon: PencilLine, className: "border-violet-200 bg-violet-50 text-violet-900" },
  { label: "4. Falar", icon: Mic2, className: "border-rose-200 bg-rose-50 text-rose-900" },
] as const;

function PillarLegend() {
  return <div aria-label="Cores dos pilares do estudo" className="mt-3 flex flex-wrap gap-2">{PILLARS.map(({ label, icon: Icon, className }) => <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}><Icon aria-hidden="true" className="size-3.5" />{label}</span>)}</div>;
}

function SourcesView() {
  return <section className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Curadoria</p><h2 className="mt-1 text-2xl font-semibold">O que entra e o que fica de fora</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Visualizações ajudam a identificar aulas validadas pelo público, mas a sequência pedagógica e a ausência de repetição têm prioridade.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{SOURCE_STRATEGY.map((source) => <article key={source.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">{source.role}</span><h3 className="mt-3 font-semibold text-slate-900">{source.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{source.note}</p></article>)}</div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="font-semibold text-emerald-950">Selecionado para o ciclo 1</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900"><li>• 25 aulas estruturadas e 35 sessões de input compreensível.</li><li>• Vídeos incorporados para estudar sem sair da página.</li><li>• Exercícios corrigidos e conversação guiada todos os dias.</li><li>• Missões semanais levando o inglês para a vida real.</li></ul></div><div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold text-amber-950">Retirado da playlist de 230 vídeos</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900"><li>• Propagandas, cadastro VIP e certificados.</li><li>• Palestras, imigração e conteúdos fora do inglês.</li><li>• Dezenas de músicas repetindo o mesmo método.</li><li>• Aulas duplicadas ou sem ganho para a sequência.</li></ul></div></div></section>;
}

type DayDetailsProps = PracticeInteractionProps & {
  day: RoadmapDay;
  progress: Record<string, boolean>;
  current: boolean;
  onToggle: (id: string) => void;
};

function DayDetails({ day, progress, current, onToggle, practiceResponses, practiceSubmissions, onPracticeResponse, onPracticeSubmit }: DayDetailsProps) {
  const complete = dayIsComplete(day, progress);
  const count = day.activities.filter((activity) => progress[activity.id]).length;
  return <details open={current} className={`group overflow-hidden rounded-2xl border bg-white shadow-sm ${complete ? "border-emerald-300" : current ? "border-sky-400" : "border-slate-300"}`}><summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:px-5"><div className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${complete ? "bg-emerald-600 text-white" : current ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-800"}`}>{complete ? <Check aria-hidden="true" className="size-5" /> : day.day}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{day.weekday} · {day.title}</p><span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">{day.level}</span></div><p className="mt-1 text-xs text-slate-600">{count}/{day.activities.length} atividades concluídas</p></div><ChevronDown aria-hidden="true" className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" /></summary><div className="grid gap-3 border-t border-slate-200 bg-slate-100/90 p-4 md:grid-cols-2 sm:p-5">{day.activities.map((activity) => <ActivityCard key={activity.id} activity={activity} checked={Boolean(progress[activity.id])} onToggle={() => onToggle(activity.id)} compact practiceResponses={practiceResponses} practiceSubmissions={practiceSubmissions} onPracticeResponse={onPracticeResponse} onPracticeSubmit={onPracticeSubmit} />)}</div></details>;
}

function YearMap() {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#102963] text-cyan-200"><CalendarDays className="size-5" /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Mapa do ano</p><h2 className="mt-1 text-xl font-semibold">Do absoluto zero à autonomia</h2></div></div><div className="mt-6 grid gap-3 lg:grid-cols-5">{YEAR_PHASES.map((phase, index) => <div key={phase.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className={`mb-4 h-1.5 w-12 rounded-full ${phase.color}`} /><p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-400">Fase {index + 1}</p><p className="mt-1 font-semibold">{phase.name}</p><p className="mt-3 text-xs text-slate-500">{phase.range}</p><p className="mt-1 text-sm font-semibold text-slate-700">{phase.level}</p></div>)}</div><div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-4 py-3.5 text-sm leading-6 text-sky-950"><BookOpen className="mt-0.5 size-5 shrink-0 text-sky-700" /><p><strong>Construção progressiva:</strong> o primeiro ciclo já tem links e práticas reais. Os próximos links enviados serão avaliados e encaixados sem duplicar conteúdo.</p></div></section>;
}

type IconComponent = typeof CheckCircle2;

function ViewButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: IconComponent; label: string; count?: string }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${active ? "bg-[#102963] text-white" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="size-4" />{label}{count ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span> : null}</button>;
}

function Metric({ icon: Icon, label, value, tone, bg }: { icon: IconComponent; label: string; value: string; tone: string; bg: string }) {
  return <div className="min-w-0"><div className={`mb-2 grid size-9 place-items-center rounded-xl ${bg} ${tone}`}><Icon className="size-4" /></div><p className="truncate text-[11px] text-slate-500 sm:text-xs">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums sm:text-xl">{value}</p></div>;
}

