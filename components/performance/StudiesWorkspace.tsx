"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Loader2,
  Pause,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Swords,
  Upload,
  Wrench,
} from "lucide-react";
import {
  atualizarStatusEstudoLifeOS,
  criarAtividadeLifeOS,
  criarItemEstudoLifeOS,
  criarRoadmapEstudosLifeOS,
  enviarAvaliacaoEstudoLifeOS,
  importarRoadmapEstudosLifeOS,
} from "@/app/admin/performance/life-os-actions";
import { RoadmapAiWizard } from "@/components/performance/RoadmapAiWizard";
import { formatDateBR } from "@/lib/format";
import { ROADMAP_IMPORT_MAX_BYTES } from "@/lib/performance-analytics";
import {
  nextStudyItem,
  roadmapProgress,
  studyWeeklyStats,
  type StudyAssessmentAttempt,
  type StudyAssessmentQuestion,
  type StudyItemKind,
  type StudyRoadmap,
  type StudyRoadmapItem,
  type StudyRoadmapModule,
} from "@/lib/performance-widgets";

type StudyActivity = { id: string; title: string; date: string; area: string; durationMinutes: number | null; status: string };
type PomodoroMode = "focus" | "short" | "long";
type PomodoroSettings = { focus: number; short: number; long: number; cycles: number };
type ModuleView = { id: string; title: string; objective: string | null; successCriteria: string | null; topics: string[]; estimatedMinutes: number | null; orderIndex: number; items: StudyRoadmapItem[]; legacy: boolean };

const DEFAULT_SETTINGS: PomodoroSettings = { focus: 25, short: 5, long: 20, cycles: 4 };
const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";

const kindMeta: Record<StudyItemKind, { label: string; icon: typeof BookOpen; className: string }> = {
  reading: { label: "Leitura", icon: BookOpen, className: "bg-sky-50 text-sky-700" },
  video: { label: "Videoaula", icon: PlayCircle, className: "bg-red-50 text-red-700" },
  practice: { label: "Atividade", icon: Wrench, className: "bg-blue-50 text-blue-700" },
  quiz: { label: "Prova", icon: CircleHelp, className: "bg-violet-50 text-violet-700" },
  challenge: { label: "Desafio", icon: Swords, className: "bg-amber-50 text-amber-700" },
  project: { label: "Projeto", icon: FolderKanban, className: "bg-emerald-50 text-emerald-700" },
  checkpoint: { label: "Checagem", icon: Check, className: "bg-cyan-50 text-cyan-700" },
  core: { label: "Essencial", icon: FileText, className: "bg-gray-100 text-gray-700" },
  reinforcement: { label: "Reforco", icon: RotateCcw, className: "bg-amber-50 text-amber-700" },
  check: { label: "Checagem", icon: Check, className: "bg-cyan-50 text-cyan-700" },
  criterion: { label: "Criterio", icon: Check, className: "bg-emerald-50 text-emerald-700" },
  general: { label: "Etapa", icon: FileText, className: "bg-gray-100 text-gray-700" },
};

export function StudiesWorkspace({
  roadmaps,
  items: allItems,
  modules,
  questions,
  attempts,
  activities,
  today,
  monday,
  v2Ready,
}: {
  roadmaps: StudyRoadmap[];
  items: StudyRoadmapItem[];
  modules: StudyRoadmapModule[];
  questions: StudyAssessmentQuestion[];
  attempts: StudyAssessmentAttempt[];
  activities: StudyActivity[];
  today: string;
  monday: string;
  v2Ready: boolean;
}) {
  const router = useRouter();
  const defaultRoadmapId = roadmaps.find((roadmap) => roadmap.status === "active")?.id ?? roadmaps[0]?.id ?? "";
  const [preferredRoadmapId, setPreferredRoadmapId] = useState(defaultRoadmapId);
  const selectedRoadmapId = roadmaps.some((roadmap) => roadmap.id === preferredRoadmapId) ? preferredRoadmapId : defaultRoadmapId;
  const [importError, setImportError] = useState<string | null>(null);
  const [importPending, startImport] = useTransition();
  const [newItem, setNewItem] = useState(false);
  const [aiWizard, setAiWizard] = useState(false);

  const roadmap = roadmaps.find((entry) => entry.id === selectedRoadmapId) ?? null;
  const items = useMemo(() => allItems.filter((item) => item.roadmapId === selectedRoadmapId).sort((a, b) => a.orderIndex - b.orderIndex), [allItems, selectedRoadmapId]);
  const moduleViews = useMemo(() => buildModuleViews(selectedRoadmapId, modules, items), [selectedRoadmapId, modules, items]);
  const weekly = studyWeeklyStats(activities.filter((item) => item.area === "estudos"), monday, today);

  const exportRoadmap = () => {
    if (!roadmap) return;
    const payload = {
      version: 3,
      title: roadmap.title,
      description: roadmap.description,
      sections: moduleViews.map((module) => ({
        title: module.title,
        objective: module.objective,
        successCriteria: module.successCriteria,
        topics: module.topics,
        items: module.items.map((item) => ({
          title: item.title,
          description: item.description,
          instructions: item.instructions,
          completionCriteria: item.completionCriteria,
          resourceTitle: item.resourceTitle,
          resourceUrl: item.resourceUrl,
          resourceChannel: item.resourceChannel,
          estimatedMinutes: item.estimatedMinutes,
          itemKind: item.itemKind,
        })),
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `roadmap-${roadmap.title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "estudos"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="space-y-5">
    {!v2Ready && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-study-modules.sql</b> para liberar modulos, provas e multiplos roadmaps. O conteudo atual continua visivel.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5 text-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Roadmaps de estudo</h2><p className="mt-1 text-xs text-gray-400">Escolha um plano e avance pelos modulos no seu ritmo.</p></div>
            <RoadmapActions
              importPending={importPending}
              canExport={Boolean(items.length)}
              onAi={() => setAiWizard(true)}
              onExport={exportRoadmap}
              onImport={(file) => {
                setImportError(null);
                if (file.size > ROADMAP_IMPORT_MAX_BYTES) {
                  const sizeMb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
                  setImportError(`O arquivo tem ${sizeMb} MB. O limite para importacao e 5 MB.`);
                  return;
                }
                startImport(async () => {
                  const result = await importarRoadmapEstudosLifeOS(await file.text());
                  if (!result.ok) setImportError(result.error ?? "Falha ao importar.");
                  else { setPreferredRoadmapId(""); router.refresh(); }
                });
              }}
            />
          </div>
          {importError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{importError}</p>}
          {roadmaps.length > 0 && <label className="mt-5 block text-xs font-medium text-gray-500">Roadmap exibido
            <select value={selectedRoadmapId} onChange={(event) => setPreferredRoadmapId(event.target.value)} className={`${inputClass} mt-1`}>
              {roadmaps.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}{entry.status === "archived" ? " (arquivado)" : entry.status === "completed" ? " (concluido)" : ""}</option>)}
            </select>
          </label>}
          {roadmap ? <RoadmapSummary roadmap={roadmap} items={items} moduleCount={moduleViews.length} /> : <CreateRoadmap onDone={() => router.refresh()} />}
        </section>

        {roadmap && <section className="rounded-lg bg-white p-5 text-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">Modulos</h3><p className="mt-1 text-xs text-gray-400">Siga a ordem sugerida. Os passos nao possuem dia fixo.</p></div>
            <button type="button" onClick={() => setNewItem(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="size-4" />Etapa manual</button>
          </div>
          <div className="mt-5 space-y-3">{moduleViews.map((module, index) => <StudyModule
            key={module.id}
            module={module}
            number={index + 1}
            questions={questions}
            attempts={attempts}
            onRefresh={() => router.refresh()}
          />)}{!moduleViews.length && <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">Este roadmap ainda nao possui modulos.</p>}</div>
        </section>}
      </div>

      <PomodoroTimer />
    </div>

    <section className="rounded-lg bg-white p-5 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Sessoes realizadas</h3><p className="mt-1 text-xs text-gray-400">{weekly.totalMinutes} minutos nesta semana - media de {weekly.averageMinutes} minutos por dia</p></div></div>
      <div className="mt-4"><StudySessionForm today={today} onDone={() => router.refresh()} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activities.filter((item) => item.area === "estudos").slice(0, 9).map((item) => <div key={item.id} className="rounded-lg border border-gray-100 p-3"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-gray-400">{formatDateBR(item.date)} - {item.durationMinutes ?? 0} min</p></div>)}</div>
    </section>

    {newItem && roadmap && <Modal title="Nova etapa" onClose={() => setNewItem(false)}><NewStudyItem roadmapId={roadmap.id} sections={moduleViews.map((module) => module.title)} order={items.length} onDone={() => { setNewItem(false); router.refresh(); }} /></Modal>}
    {aiWizard && <Modal title="Criar roadmap com IA" wide onClose={() => setAiWizard(false)}><RoadmapAiWizard today={today} onClose={() => setAiWizard(false)} onDone={() => { setAiWizard(false); setPreferredRoadmapId(""); router.refresh(); }} /></Modal>}
  </section>;
}

function buildModuleViews(roadmapId: string, modules: StudyRoadmapModule[], items: StudyRoadmapItem[]): ModuleView[] {
  if (!roadmapId) return [];
  const result: ModuleView[] = modules.filter((module) => module.roadmapId === roadmapId).sort((a, b) => a.orderIndex - b.orderIndex).map((module) => ({
    id: module.id,
    title: module.title,
    objective: module.objective,
    successCriteria: module.successCriteria,
    topics: module.topics,
    estimatedMinutes: module.estimatedMinutes,
    orderIndex: module.orderIndex,
    items: items.filter((item) => item.moduleId === module.id),
    legacy: false,
  }));
  const assignedIds = new Set(result.flatMap((module) => module.items.map((item) => item.id)));
  const legacyGroups = new Map<string, StudyRoadmapItem[]>();
  items.filter((item) => !assignedIds.has(item.id)).forEach((item) => {
    const section = item.section?.split(" / ").at(-1)?.trim() || "Geral";
    legacyGroups.set(section, [...(legacyGroups.get(section) ?? []), item]);
  });
  for (const [title, legacyItems] of legacyGroups) {
    result.push({ id: `legacy:${title}`, title, objective: null, successCriteria: null, topics: [], estimatedMinutes: legacyItems.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0) || null, orderIndex: result.length, items: legacyItems, legacy: true });
  }
  return result;
}

function RoadmapActions({ importPending, canExport, onAi, onExport, onImport }: { importPending: boolean; canExport: boolean; onAi: () => void; onExport: () => void; onImport: (file: File) => void }) {
  return <div className="flex flex-wrap gap-2">
    <label className={`inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 ${importPending ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
      {importPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importPending ? "Importando..." : "Importar"}
      <input type="file" accept=".md,.markdown,.txt,.json,text/markdown,application/json" className="hidden" disabled={importPending} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ""; if (file) onImport(file); }} />
    </label>
    <button type="button" onClick={onAi} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"><Sparkles className="size-4" />Criar com IA</button>
    <button type="button" onClick={onExport} disabled={!canExport} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Download className="size-4" />Exportar</button>
  </div>;
}

function RoadmapSummary({ roadmap, items, moduleCount }: { roadmap: StudyRoadmap; items: StudyRoadmapItem[]; moduleCount: number }) {
  const progress = roadmapProgress(items);
  const hours = Math.round(((roadmap.totalEstimatedMinutes ?? items.reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0)) / 60) * 10) / 10;
  return <div className="mt-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-semibold">{roadmap.title}</p>{roadmap.description && <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">{roadmap.description}</p>}<p className="mt-2 text-xs text-gray-500">Proximo: <b>{nextStudyItem(items)?.title ?? "Roadmap concluido"}</b></p></div><b>{progress}%</b></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} /></div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400"><span>{moduleCount} modulos</span><span>{items.length} etapas</span><span>{hours}h estimadas</span>{roadmap.qualityScore != null && <span>Definicao {roadmap.qualityScore}%</span>}{roadmap.workloadScore != null && <span>Exigencia {roadmap.workloadScore}%</span>}</div>
  </div>;
}

function StudyModule({ module, number, questions, attempts, onRefresh }: { module: ModuleView; number: number; questions: StudyAssessmentQuestion[]; attempts: StudyAssessmentAttempt[]; onRefresh: () => void }) {
  const completed = module.items.filter((item) => item.status === "completed").length;
  const progress = module.items.length ? Math.round((completed / module.items.length) * 100) : 0;
  const [open, setOpen] = useState(progress > 0 && progress < 100 || number === 1);
  return <article className="overflow-hidden rounded-lg border border-gray-200">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${progress === 100 ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600"}`}>{progress === 100 ? <Check className="size-4" /> : number}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-gray-900">{module.title}</span><span className="mt-1 block text-xs text-gray-400">{completed} de {module.items.length} etapas - {module.estimatedMinutes ?? 0} min</span></span>
      <span className="hidden w-24 sm:block"><span className="block h-1.5 overflow-hidden rounded-full bg-gray-100"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }} /></span><span className="mt-1 block text-right text-[10px] text-gray-400">{progress}%</span></span>
      <ChevronDown className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="border-t border-gray-100 bg-gray-50/50 p-4">
      {(module.objective || module.successCriteria) && <div className="grid gap-3 pb-4 text-xs sm:grid-cols-2"><div><p className="font-semibold uppercase text-gray-400">Objetivo</p><p className="mt-1 leading-5 text-gray-600">{module.objective ?? "Concluir as etapas deste modulo."}</p></div><div><p className="font-semibold uppercase text-gray-400">Dominio esperado</p><p className="mt-1 leading-5 text-gray-600">{module.successCriteria ?? "Aplicar o conteudo sem depender do passo a passo."}</p></div></div>}
      {module.topics.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{module.topics.map((topic) => <span key={topic} className="rounded bg-white px-2 py-1 text-[11px] text-gray-500 ring-1 ring-gray-200">{topic}</span>)}</div>}
      <div className="space-y-2">{module.items.map((item, index) => <StudyStep key={item.id} item={item} number={index + 1} questions={questions.filter((question) => question.itemId === item.id)} attempts={attempts.filter((attempt) => attempt.itemId === item.id)} onRefresh={onRefresh} />)}</div>
    </div>}
  </article>;
}

function StudyStep({ item, number, questions, attempts, onRefresh }: { item: StudyRoadmapItem; number: number; questions: StudyAssessmentQuestion[]; attempts: StudyAssessmentAttempt[]; onRefresh: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = kindMeta[item.itemKind ?? "general"] ?? kindMeta.general;
  const Icon = meta.icon;
  const hasAssessment = questions.length > 0;
  const latestAttempt = attempts[0];
  const toggleComplete = () => startTransition(async () => {
    await atualizarStatusEstudoLifeOS(item.id, item.status === "completed" ? "pending" : "completed");
    router.refresh();
    onRefresh();
  });

  return <section className="rounded-lg border border-gray-200 bg-white">
    <div className="flex items-start gap-3 p-3">
      <button type="button" onClick={hasAssessment ? () => setOpen(true) : toggleComplete} disabled={pending} title={hasAssessment ? "Responda a avaliacao para concluir" : item.status === "completed" ? "Marcar como pendente" : "Marcar como concluido"} className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ${item.status === "completed" ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-gray-400 ring-gray-300"}`}>{pending ? <Loader2 className="size-3 animate-spin" /> : item.status === "completed" ? <Check className="size-3.5" /> : <span className="text-[10px] font-bold">{number}</span>}</button>
      <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}><Icon className="size-3" />{meta.label}</span>{item.estimatedMinutes && <span className="text-[10px] text-gray-400">{item.estimatedMinutes} min</span>}{latestAttempt && <span className={`text-[10px] font-semibold ${latestAttempt.score >= 70 ? "text-emerald-600" : "text-amber-600"}`}>Ultima nota {latestAttempt.score}%</span>}</span>
        <span className={`mt-1 block text-sm font-medium ${item.status === "completed" ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.title}</span>
        {!open && item.description && <span className="mt-1 block line-clamp-1 text-xs text-gray-400">{item.description}</span>}
      </button>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100" title="Ver detalhes"><ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    </div>
    {open && <div className="border-t border-gray-100 px-4 py-4">
      {item.description && <p className="text-sm leading-6 text-gray-600">{item.description}</p>}
      {item.instructions && <div className="mt-4"><p className="text-xs font-semibold uppercase text-gray-400">Passo a passo</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{item.instructions}</p></div>}
      {item.resourceUrl && <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-red-700"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.resourceTitle ?? "Abrir videoaula"}</span>{item.resourceChannel && <span className="mt-0.5 block text-xs text-red-500">{item.resourceChannel}</span>}</span><ExternalLink className="size-4 shrink-0" /></a>}
      {item.completionCriteria && <div className="mt-4 rounded-lg bg-emerald-50 p-3"><p className="text-xs font-semibold uppercase text-emerald-700">Concluido quando</p><p className="mt-1 text-sm leading-6 text-emerald-900">{item.completionCriteria}</p></div>}
      {hasAssessment ? <AssessmentPanel itemId={item.id} questions={questions} onRefresh={() => { router.refresh(); onRefresh(); }} /> : <div className="mt-4 flex justify-end"><button type="button" onClick={toggleComplete} disabled={pending} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${item.status === "completed" ? "bg-gray-100 text-gray-600" : "bg-emerald-600 text-white"}`}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{item.status === "completed" ? "Reabrir etapa" : "Concluir etapa"}</button></div>}
    </div>}
  </section>;
}

function AssessmentPanel({ itemId, questions, onRefresh }: { itemId: string; questions: StudyAssessmentQuestion[]; onRefresh: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof enviarAvaliacaoEstudoLifeOS>> | null>(null);
  const [pending, startTransition] = useTransition();
  const feedbackByQuestion = new Map(result?.feedback?.map((entry) => [entry.questionId, entry]) ?? []);
  const complete = questions.every((question) => Number.isInteger(answers[question.id]));

  return <div className="mt-5 border-t border-gray-100 pt-4">
    <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-gray-900">Avaliacao do modulo</p><p className="mt-1 text-xs text-gray-400">Responda tudo e envie para receber a nota.</p></div>{result?.score != null && <span className={`rounded-md px-2 py-1 text-sm font-bold ${result.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{result.score}%</span>}</div>
    <div className="mt-4 space-y-5">{questions.map((question, questionIndex) => {
      const feedback = feedbackByQuestion.get(question.id);
      return <fieldset key={question.id}><legend className="text-sm font-medium text-gray-800">{questionIndex + 1}. {question.prompt}</legend><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => {
        const selected = answers[question.id] === optionIndex;
        const isCorrectAnswer = feedback?.correctOptionIndex === optionIndex;
        const isWrongSelection = Boolean(feedback && selected && !feedback.correct);
        return <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${isCorrectAnswer ? "border-emerald-300 bg-emerald-50 text-emerald-800" : isWrongSelection ? "border-red-300 bg-red-50 text-red-700" : selected ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-600"}`}><input type="radio" name={`question-${question.id}`} checked={selected} disabled={Boolean(result)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="mt-0.5 accent-blue-600" />{option}</label>;
      })}</div>{feedback && <p className={`mt-2 text-xs leading-5 ${feedback.correct ? "text-emerald-700" : "text-red-600"}`}>{feedback.correct ? "Resposta correta. " : "Resposta incorreta. "}{feedback.explanation}</p>}</fieldset>;
    })}</div>
    {result?.error && <p className="mt-3 text-sm text-red-600">{result.error}</p>}
    <div className="mt-5 flex justify-end">{result ? <button type="button" onClick={() => { setAnswers({}); setResult(null); }} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600">Tentar novamente</button> : <button type="button" disabled={pending || !complete} onClick={() => startTransition(async () => { const response = await enviarAvaliacaoEstudoLifeOS(itemId, answers); setResult(response); if (response.ok) onRefresh(); })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Corrigindo..." : "Enviar respostas"}</button>}</div>
  </div>;
}

function PomodoroTimer() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const durationFor = (value: PomodoroMode, config = settings) => config[value] * 60;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setTotalSeconds((value) => value + 1);
      setRemaining((value) => {
        if (value > 1) return value - 1;
        setRunning(false);
        if (mode === "focus") {
          const nextCycle = cycles + 1;
          setCycles(nextCycle);
          const nextMode: PomodoroMode = nextCycle % settings.cycles === 0 ? "long" : "short";
          setMode(nextMode);
          return settings[nextMode] * 60;
        }
        setMode("focus");
        return settings.focus * 60;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cycles, mode, running, settings]);

  const selectMode = (value: PomodoroMode) => { setMode(value); setRemaining(durationFor(value)); setRunning(false); };
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const total = `${Math.floor(totalSeconds / 3600)}h ${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")}min`;

  return <section className="sticky top-5 rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
    <div className="flex items-start justify-between"><div><h2 className="font-semibold">Pomodoro</h2><p className="mt-1 text-xs text-white/40">Foco com pausas intencionais.</p></div><button type="button" onClick={() => setShowSettings(true)} className="rounded-md p-2 text-white/45 hover:bg-white/10 hover:text-white" title="Configurar"><Settings2 className="size-4" /></button></div>
    <div className="mt-5 grid grid-cols-3 rounded-lg bg-black/20 p-1">{(["focus", "short", "long"] as PomodoroMode[]).map((value) => <button key={value} type="button" onClick={() => selectMode(value)} className={`rounded-md px-2 py-2 text-xs font-semibold ${mode === value ? "bg-white text-gray-900" : "text-white/50"}`}>{value === "focus" ? "Pomodoro" : value === "short" ? "Pausa rapida" : "Pausa longa"}</button>)}</div>
    <p className="mt-8 text-center text-6xl font-semibold tabular-nums sm:text-7xl">{display}</p>
    <div className="mt-7 flex justify-center gap-2"><button type="button" onClick={() => setRunning((value) => !value)} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold">{running ? <Pause className="size-5" /> : <Play className="size-5" />}{running ? "Pausar" : "Iniciar"}</button><button type="button" onClick={() => { setRunning(false); setRemaining(durationFor(mode)); }} className="rounded-lg bg-white/10 p-3 text-white/60" title="Reiniciar"><RotateCcw className="size-5" /></button></div>
    <div className="mt-7 grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4 text-center"><div><p className="text-xs text-white/40">Ciclo atual</p><p className="mt-1 font-semibold">{Math.min((cycles % settings.cycles) + 1, settings.cycles)} de {settings.cycles}</p></div><div><p className="text-xs text-white/40">Tempo total</p><p className="mt-1 font-semibold">{total}</p></div></div>
    <p className="mt-4 text-center text-[11px] text-white/35">O tempo total inclui foco e pausas. Concluir atividades continua sendo a medida principal.</p>
    {showSettings && <Modal title="Configurar Pomodoro" onClose={() => setShowSettings(false)}><PomodoroSettingsForm settings={settings} onSave={(next) => { setSettings(next); setRemaining(next[mode] * 60); setRunning(false); setShowSettings(false); }} /></Modal>}
  </section>;
}

function PomodoroSettingsForm({ settings, onSave }: { settings: PomodoroSettings; onSave: (settings: PomodoroSettings) => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ focus: Math.max(1, Number(data.get("focus"))), short: Math.max(1, Number(data.get("short"))), long: Math.max(1, Number(data.get("long"))), cycles: Math.max(1, Number(data.get("cycles"))) }); }} className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field name="focus" label="Pomodoro (min)" type="number" defaultValue={String(settings.focus)} /><Field name="short" label="Pausa rapida (min)" type="number" defaultValue={String(settings.short)} /><Field name="long" label="Pausa longa (min)" type="number" defaultValue={String(settings.long)} /><Field name="cycles" label="Ciclos ate pausa longa" type="number" defaultValue={String(settings.cycles)} /></div><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Aplicar</button></form>;
}

function CreateRoadmap({ onDone }: { onDone: () => void }) { return <div className="mt-5"><AsyncForm action={criarRoadmapEstudosLifeOS} onDone={onDone}><Field name="title" label="Nome do roadmap" required /><Field name="start_date" label="Data inicial" type="date" /><p className="text-xs text-gray-400">Voce tambem pode importar um arquivo ou criar um plano completo com IA.</p></AsyncForm></div>; }
function NewStudyItem({ roadmapId, sections, order, onDone }: { roadmapId: string; sections: string[]; order: number; onDone: () => void }) { return <AsyncForm action={(data) => criarItemEstudoLifeOS(roadmapId, data)} onDone={onDone}><Field name="title" label="Nome da etapa" required /><label className="block text-xs font-medium text-gray-500">Modulo<select name="section" defaultValue={sections[0] ?? "Geral"} className={`${inputClass} mt-1`}>{(sections.length ? sections : ["Geral"]).map((section) => <option key={section}>{section}</option>)}</select></label><Field name="estimated_minutes" label="Tempo estimado (min)" type="number" /><input type="hidden" name="order_index" value={order} /><input type="hidden" name="item_kind" value="general" /></AsyncForm>; }
function StudySessionForm({ today, onDone }: { today: string; onDone: () => void }) { return <AsyncForm action={criarAtividadeLifeOS} onDone={onDone}><input type="hidden" name="area" value="estudos" /><div className="grid gap-3 sm:grid-cols-3"><Field name="title" label="Assunto estudado" required /><Field name="date" label="Data" type="date" defaultValue={today} required /><Field name="duration_minutes" label="Tempo de foco (min)" type="number" required /></div></AsyncForm>; }

function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) { const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>; }
function Field({ name, label, type = "text", defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label className="block text-xs font-medium text-gray-500">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 1 : undefined} className={`${inputClass} mt-1`} /></label>; }
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center"><div className={`max-h-[94vh] w-full overflow-y-auto rounded-lg bg-white p-5 text-gray-900 ${wide ? "max-w-5xl" : "max-w-lg"}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-gray-500">Fechar</button></div>{children}</div></div>; }
