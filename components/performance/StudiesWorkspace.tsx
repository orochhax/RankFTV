"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  ExternalLink,
  FileClock,
  FileText,
  FolderKanban,
  Languages,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import {
  ativarRoadmapEstudosLifeOS,
  atualizarStatusEstudoLifeOS,
  criarItemEstudoLifeOS,
  dispensarFalhaGeracaoRoadmapLifeOS,
  editarSessaoEstudoLifeOS,
  enviarAvaliacaoEstudoLifeOS,
  importarRoadmapEstudosLifeOS,
  obterRascunhoRoadmapLifeOS,
  reiniciarAvaliacaoEstudoLifeOS,
  removerRascunhoRoadmapLifeOS,
  removerRoadmapEstudosLifeOS,
  removerSessaoEstudoLifeOS,
  renomearRascunhoRoadmapLifeOS,
  renomearRoadmapEstudosLifeOS,
  salvarSessaoEstudoLifeOS,
} from "@/app/admin/performance/life-os-actions";
import { RoadmapAiWizard } from "@/components/performance/RoadmapAiWizard";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { formatDateBR } from "@/lib/format";
import { ROADMAP_IMPORT_MAX_BYTES } from "@/lib/performance-analytics";
import { roadmapDraftStats, type RoadmapDraftDetail, type RoadmapDraftSummary, type RoadmapGenerationJob } from "@/lib/study-roadmap-ai";
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
  type StudySessionMetadata,
} from "@/lib/performance-widgets";

type StudyActivity = { id: string; title: string; date: string; area: string; durationMinutes: number | null; status: string; notes: string | null; studySession: StudySessionMetadata | null };
type PomodoroMode = "focus" | "short" | "long";
type PomodoroSettings = { focus: number; short: number; long: number; cycles: number };
type ModuleView = { id: string; title: string; objective: string | null; successCriteria: string | null; topics: string[]; estimatedMinutes: number | null; orderIndex: number; items: StudyRoadmapItem[]; legacy: boolean };

const DEFAULT_SETTINGS: PomodoroSettings = { focus: 25, short: 5, long: 20, cycles: 4 };
const inputClass = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

const kindMeta: Record<StudyItemKind, { label: string; icon: typeof BookOpen; className: string }> = {
  reading: { label: "Leitura", icon: BookOpen, className: "bg-sky-400/10 text-sky-300" },
  video: { label: "Videoaula", icon: PlayCircle, className: "bg-red-400/10 text-red-300" },
  practice: { label: "Atividade", icon: Wrench, className: "bg-blue-400/10 text-blue-300" },
  quiz: { label: "Prova", icon: CircleHelp, className: "bg-violet-400/10 text-violet-300" },
  challenge: { label: "Desafio", icon: Swords, className: "bg-amber-400/10 text-amber-300" },
  project: { label: "Projeto", icon: FolderKanban, className: "bg-emerald-400/10 text-emerald-300" },
  checkpoint: { label: "Checagem", icon: Check, className: "bg-cyan-400/10 text-cyan-300" },
  core: { label: "Essencial", icon: FileText, className: "bg-white/[0.06] text-white/60" },
  reinforcement: { label: "Reforco", icon: RotateCcw, className: "bg-amber-400/10 text-amber-300" },
  check: { label: "Checagem", icon: Check, className: "bg-cyan-400/10 text-cyan-300" },
  criterion: { label: "Criterio", icon: Check, className: "bg-emerald-400/10 text-emerald-300" },
  general: { label: "Etapa", icon: FileText, className: "bg-white/[0.06] text-white/60" },
};

export function StudiesWorkspace({
  roadmaps,
  items: allItems,
  modules,
  questions,
  attempts,
  drafts,
  generationJobs,
  activities,
  today,
  monday,
  v2Ready,
  draftsReady,
  enhancementsReady,
  referenceStandardReady,
}: {
  roadmaps: StudyRoadmap[];
  items: StudyRoadmapItem[];
  modules: StudyRoadmapModule[];
  questions: StudyAssessmentQuestion[];
  attempts: StudyAssessmentAttempt[];
  drafts: RoadmapDraftSummary[];
  generationJobs: RoadmapGenerationJob[];
  activities: StudyActivity[];
  today: string;
  monday: string;
  v2Ready: boolean;
  draftsReady: boolean;
  enhancementsReady: boolean;
  referenceStandardReady: boolean;
}) {
  const router = useRouter();
  const defaultRoadmapId = roadmaps.find((roadmap) => roadmap.status === "active")?.id ?? roadmaps[0]?.id ?? "";
  const [preferredRoadmapId, setPreferredRoadmapId] = useState(defaultRoadmapId);
  const selectedRoadmapId = roadmaps.some((roadmap) => roadmap.id === preferredRoadmapId) ? preferredRoadmapId : defaultRoadmapId;
  const [importPending, startImport] = useTransition();
  const [newItem, setNewItem] = useState(false);
  const [aiWizard, setAiWizard] = useState(false);
  const [draftLibrary, setDraftLibrary] = useState(false);
  const [openedDraft, setOpenedDraft] = useState<RoadmapDraftDetail | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftPending, startDraftTransition] = useTransition();
  const [roadmapPending, startRoadmapTransition] = useTransition();
  const [, startGenerationTransition] = useTransition();
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [recentGeneration, setRecentGeneration] = useState<{ generationId: string; title: string } | null>(null);
  const [dismissedGenerationIds, setDismissedGenerationIds] = useState<Set<string>>(() => new Set());

  const roadmap = roadmaps.find((entry) => entry.id === selectedRoadmapId) ?? null;
  const items = useMemo(() => allItems.filter((item) => item.roadmapId === selectedRoadmapId).sort((a, b) => a.orderIndex - b.orderIndex), [allItems, selectedRoadmapId]);
  const moduleViews = useMemo(() => buildModuleViews(selectedRoadmapId, modules, items), [selectedRoadmapId, modules, items]);
  const weekly = studyWeeklyStats(activities.filter((item) => item.area === "estudos"), monday, today);
  const visibleGenerationJobs = useMemo(() => generationJobs.filter((job) => !dismissedGenerationIds.has(job.generationId)), [dismissedGenerationIds, generationJobs]);
  const readyRecentDraft = recentGeneration ? drafts.find((draft) => draft.generationId === recentGeneration.generationId) ?? null : null;
  const recentFailed = recentGeneration ? visibleGenerationJobs.some((job) => job.generationId === recentGeneration.generationId && job.status === "failed") : false;
  const shouldPollGeneration = visibleGenerationJobs.some((job) => job.status === "generating") || Boolean(recentGeneration && !readyRecentDraft && !recentFailed);

  useEffect(() => {
    if (!shouldPollGeneration) return;
    const interval = window.setInterval(() => router.refresh(), 4_000);
    return () => window.clearInterval(interval);
  }, [router, shouldPollGeneration]);

  const dismissGenerationFailure = (generationId: string) => {
    setDismissedGenerationIds((current) => new Set(current).add(generationId));
    setRecentGeneration((current) => current?.generationId === generationId ? null : current);
    startGenerationTransition(async () => {
      await dispensarFalhaGeracaoRoadmapLifeOS(generationId);
      router.refresh();
    });
  };

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
          requirements: item.requirements,
          workspace: item.workspace,
          preparationSteps: item.preparationSteps,
          instructions: item.instructions,
          practiceExercises: item.practiceExercises,
          reflectionQuestions: [],
          completionChecklist: item.completionChecklist,
          evidence: item.evidence,
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

  const importRoadmap = (file: File) => {
    setDraftError(null);
    if (file.size > ROADMAP_IMPORT_MAX_BYTES) {
      const sizeMb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
      setDraftError(`O arquivo tem ${sizeMb} MB. O limite para importacao e 5 MB.`);
      return;
    }
    startImport(async () => {
      const result = await importarRoadmapEstudosLifeOS(await file.text(), file.name);
      if (!result.ok) setDraftError(result.error ?? "Falha ao importar.");
      else if (result.generationId && result.preview) {
        const stats = roadmapDraftStats(result.preview);
        setOpenedDraft({
          generationId: result.generationId,
          origin: "import",
          originalFilename: file.name,
          title: stats.title,
          description: stats.description,
          moduleCount: stats.moduleCount,
          stepCount: stats.stepCount,
          totalEstimatedMinutes: stats.totalEstimatedMinutes,
          createdAt: new Date().toISOString(),
          plan: result.preview,
          answers: null,
        });
        setDraftLibrary(false);
        router.refresh();
      } else setDraftError("A IA nao devolveu uma previa valida.");
    });
  };

  const openRoadmapDraft = (generationId: string) => {
    setDraftError(null);
    startDraftTransition(async () => {
      const result = await obterRascunhoRoadmapLifeOS(generationId);
      if (!result.ok || !result.draft) {
        setDraftError(result.error ?? "Nao foi possivel abrir o rascunho.");
        setDraftLibrary(true);
      } else {
        setOpenedDraft(result.draft);
        setDraftLibrary(false);
      }
    });
  };

  return <section className="min-w-0 space-y-5">
    {!v2Ready && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-study-modules.sql</b> para liberar modulos, provas e multiplos roadmaps. O conteudo atual continua visivel.</p>}
    {!draftsReady && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-roadmap-drafts.sql</b> para salvar e recuperar rascunhos gerados pela IA.</p>}
    {!enhancementsReady && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-study-question-types.sql</b> para liberar desafios detalhados e atividades de ordenacao. Roadmaps e perguntas anteriores continuam preservados.</p>}
    {!referenceStandardReady && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-study-reference-standard.sql</b> para liberar preparacao, pratica sem consulta, perguntas de checagem, criterios objetivos e evidencias nos novos roadmaps.</p>}
    <RoadmapGenerationPanel
      jobs={visibleGenerationJobs}
      recentGeneration={recentGeneration}
      readyDraft={readyRecentDraft}
      onOpenReady={() => {
        if (!readyRecentDraft) return;
        setRecentGeneration(null);
        openRoadmapDraft(readyRecentDraft.generationId);
      }}
      onDismiss={dismissGenerationFailure}
      onRetry={(generationId) => {
        dismissGenerationFailure(generationId);
        setAiWizard(true);
      }}
    />
    <div className="grid min-w-0 items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-[#15191f] p-4 text-white sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Roadmaps de estudo</h2><p className="mt-1 text-xs text-gray-400">Escolha um plano e avance pelos modulos no seu ritmo.</p></div>
            <RoadmapActions
              onAi={() => setAiWizard(true)}
              showCreate={roadmaps.length > 0}
              draftCount={drafts.length}
              draftsReady={draftsReady}
              onDrafts={() => { setDraftError(null); setDraftLibrary(true); }}
            />
          </div>
          {roadmaps.length > 0 && <label className="mt-5 block text-xs font-medium text-gray-500">Roadmap ativo
            <span className="mt-1 flex items-center gap-2">
              <select value={selectedRoadmapId} disabled={roadmapPending} onChange={(event) => {
                const roadmapId = event.target.value;
                setRoadmapError(null);
                startRoadmapTransition(async () => {
                  const result = await ativarRoadmapEstudosLifeOS(roadmapId);
                  if (!result.ok) setRoadmapError(result.error ?? "Nao foi possivel ativar o roadmap.");
                  else {
                    setPreferredRoadmapId(roadmapId);
                    router.refresh();
                  }
                });
              }} className={inputClass}>
                {roadmaps.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}{entry.status === "active" ? " (ativo)" : entry.status === "completed" ? " (concluido)" : ""}</option>)}
              </select>
              {roadmapPending && <Loader2 className="size-4 shrink-0 animate-spin text-blue-400" />}
            </span>
          </label>}
          {roadmapError && <p role="alert" className="mt-2 text-xs text-red-400">{roadmapError}</p>}
          <div className="flex-1">{roadmap ? <RoadmapSummary roadmap={roadmap} items={items} moduleCount={moduleViews.length} /> : <EmptyRoadmap draftsReady={draftsReady} onCreate={() => setAiWizard(true)} />}</div>
        </section>

      <PomodoroTimer roadmap={roadmap} modules={moduleViews} today={today} onSaved={() => router.refresh()} />
    </div>

        {roadmap && <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
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
          />)}{!moduleViews.length && <p className="rounded-lg border border-dashed border-white/15 p-5 text-center text-sm text-white/40">Este roadmap ainda nao possui modulos.</p>}</div>
        </section>}

    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Sessoes realizadas</h3><p className="mt-1 text-xs text-gray-400">{weekly.totalMinutes} minutos de foco nesta semana - media de {weekly.averageMinutes} minutos por dia</p></div></div>
      <StudySessions activities={activities.filter((item) => item.area === "estudos")} roadmap={roadmap} modules={moduleViews} today={today} onDone={() => router.refresh()} />
    </section>

    {newItem && roadmap && <Modal title="Nova etapa" onClose={() => setNewItem(false)}><NewStudyItem roadmapId={roadmap.id} sections={moduleViews.map((module) => module.title)} order={items.length} onDone={() => { setNewItem(false); router.refresh(); }} /></Modal>}
    {aiWizard && <Modal title="Criar roadmap com IA" wide onClose={() => setAiWizard(false)}><RoadmapAiWizard today={today} onClose={() => setAiWizard(false)} onGenerationStarted={(generation) => { setRecentGeneration(generation); setAiWizard(false); router.refresh(); }} onDone={() => { setAiWizard(false); setPreferredRoadmapId(""); router.refresh(); }} /></Modal>}
    {openedDraft && <Modal title={openedDraft.origin === "import" ? "Roadmap ajustado pela IA" : "Rascunho de roadmap"} wide onClose={() => setOpenedDraft(null)}><RoadmapAiWizard today={today} initialDraft={openedDraft} onClose={() => setOpenedDraft(null)} onGenerationStarted={(generation) => { setRecentGeneration(generation); setOpenedDraft(null); setDraftLibrary(false); router.refresh(); }} onDone={() => { setOpenedDraft(null); setDraftLibrary(false); setPreferredRoadmapId(""); router.refresh(); }} /></Modal>}
    {draftLibrary && <Modal title="Meus Roadmaps" wide onClose={() => setDraftLibrary(false)}><RoadmapLibrary
      roadmaps={roadmaps}
      drafts={drafts}
      pending={draftPending}
      importPending={importPending}
      draftsReady={draftsReady}
      canExport={Boolean(items.length)}
      error={draftError}
      onImport={importRoadmap}
      onExport={exportRoadmap}
      onActivate={(roadmapId) => startDraftTransition(async () => {
        setDraftError(null);
        const result = await ativarRoadmapEstudosLifeOS(roadmapId);
        if (!result.ok) setDraftError(result.error ?? "Nao foi possivel ativar o roadmap.");
        else { setPreferredRoadmapId(roadmapId); setDraftLibrary(false); router.refresh(); }
      })}
      onDeleteRoadmap={(roadmapId) => startDraftTransition(async () => {
        setDraftError(null);
        const result = await removerRoadmapEstudosLifeOS(roadmapId);
        if (!result.ok) setDraftError(result.error ?? "Nao foi possivel excluir o roadmap.");
        else { setPreferredRoadmapId(""); router.refresh(); }
      })}
      onOpen={openRoadmapDraft}
      onDelete={(generationId) => startDraftTransition(async () => {
        setDraftError(null);
        const result = await removerRascunhoRoadmapLifeOS(generationId);
        if (!result.ok) setDraftError(result.error ?? "Nao foi possivel descartar o rascunho.");
        else router.refresh();
      })}
    /></Modal>}
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

const roadmapGenerationMessages = [
  "Analisando seu objetivo, nivel atual e tempo disponivel...",
  "Organizando os assuntos na ordem certa de pre-requisitos...",
  "Montando modulos, atividades praticas e criterios de conclusao...",
  "Buscando recursos adequados e eliminando tarefas genericas...",
  "Revisando a carga para que o plano seja exigente e realizavel...",
] as const;

function RoadmapGenerationPanel({
  jobs,
  recentGeneration,
  readyDraft,
  onOpenReady,
  onDismiss,
  onRetry,
}: {
  jobs: RoadmapGenerationJob[];
  recentGeneration: { generationId: string; title: string } | null;
  readyDraft: RoadmapDraftSummary | null;
  onOpenReady: () => void;
  onDismiss: (generationId: string) => void;
  onRetry: (generationId: string) => void;
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const hasTrackedJob = recentGeneration ? jobs.some((job) => job.generationId === recentGeneration.generationId) : false;
  const visibleJobs = recentGeneration && !readyDraft && !hasTrackedJob
    ? [{ generationId: recentGeneration.generationId, status: "generating" as const, title: recentGeneration.title, error: null, createdAt: "" }, ...jobs]
    : jobs;
  const hasGenerating = visibleJobs.some((job) => job.status === "generating");

  useEffect(() => {
    if (!hasGenerating) return;
    const interval = window.setInterval(() => setMessageIndex((index) => (index + 1) % roadmapGenerationMessages.length), 3_500);
    return () => window.clearInterval(interval);
  }, [hasGenerating]);

  if (!visibleJobs.length && !readyDraft) return null;

  return <div className="space-y-3">
    {readyDraft && <section className="flex flex-wrap items-center gap-4 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] p-4 text-white">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300"><Check className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-emerald-300">Roadmap pronto</p><h3 className="mt-1 truncate text-sm font-semibold text-white">{readyDraft.title}</h3><p className="mt-1 text-xs text-white/40">A geracao terminou e o resultado esta salvo em Meus Roadmaps.</p></div>
      <button type="button" onClick={onOpenReady} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Ver roadmap</button>
    </section>}
    {visibleJobs.map((job) => job.status === "generating" ? <section key={job.generationId} role="status" aria-live="polite" className="rounded-lg border border-blue-400/25 bg-blue-400/[0.06] p-4 text-white">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-400/15 text-blue-300"><Loader2 className="size-5 animate-spin" /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-blue-300">Construindo roadmap</p><h3 className="mt-1 break-words text-sm font-semibold text-white">{job.title}</h3><p className="mt-1 text-xs leading-5 text-white/45">{roadmapGenerationMessages[messageIndex]}</p></div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/5 animate-pulse rounded-full bg-blue-500" /></div>
      <p className="mt-2 text-[11px] text-white/30">Voce pode continuar usando o sistema. Esta tela sera atualizada automaticamente.</p>
    </section> : <section key={job.generationId} role="alert" className="flex flex-wrap items-center gap-4 rounded-lg border border-red-400/25 bg-red-400/[0.06] p-4 text-white">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-400/15 text-red-300"><CircleHelp className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-red-300">Nao foi possivel concluir</p><h3 className="mt-1 break-words text-sm font-semibold text-white">{job.title}</h3><p className="mt-1 text-xs leading-5 text-white/45">{job.error ?? "A geracao encontrou um erro inesperado."}</p></div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onRetry(job.generationId)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"><Sparkles className="size-4" />Tentar novamente</button>
        <button type="button" onClick={() => onDismiss(job.generationId)} aria-label="Fechar aviso" title="Fechar aviso" className="flex size-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
      </div>
    </section>)}
  </div>;
}

function RoadmapActions({ draftCount, draftsReady, showCreate, onAi, onDrafts }: { draftCount: number; draftsReady: boolean; showCreate: boolean; onAi: () => void; onDrafts: () => void }) {
  return <div className="flex flex-wrap gap-2">
    {showCreate && <button type="button" onClick={onAi} disabled={!draftsReady} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Sparkles className="size-4" />Criar com IA</button>}
    <button type="button" onClick={onDrafts} disabled={!draftsReady} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75 disabled:opacity-40"><FileClock className="size-4" />Meus Roadmaps{draftCount > 0 ? ` (${draftCount} rasc.)` : ""}</button>
  </div>;
}

function EmptyRoadmap({ draftsReady, onCreate }: { draftsReady: boolean; onCreate: () => void }) {
  return <div className="flex min-h-64 w-full items-center justify-center px-4 py-8">
    <div className="max-w-md text-center">
      <span className="mx-auto flex size-11 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-400/10 text-blue-300"><Sparkles className="size-5" /></span>
      <h3 className="mt-4 text-base font-semibold text-white">Crie seu primeiro roadmap</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/40">Responda algumas perguntas sobre seu objetivo, nivel e tempo disponivel. A IA organiza uma trilha personalizada em modulos, atividades e criterios de conclusao.</p>
      <button type="button" onClick={onCreate} disabled={!draftsReady} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><Sparkles className="size-4" />Criar com IA</button>
    </div>
  </div>;
}

function RoadmapLibrary({ roadmaps, drafts, pending, importPending, draftsReady, canExport, error, onImport, onExport, onActivate, onDeleteRoadmap, onOpen, onDelete }: { roadmaps: StudyRoadmap[]; drafts: RoadmapDraftSummary[]; pending: boolean; importPending: boolean; draftsReady: boolean; canExport: boolean; error: string | null; onImport: (file: File) => void; onExport: () => void; onActivate: (roadmapId: string) => void; onDeleteRoadmap: (roadmapId: string) => void; onOpen: (generationId: string) => void; onDelete: (generationId: string) => void }) {
  const confirm = usePerformanceConfirm();
  const router = useRouter();
  const [renameTarget, setRenameTarget] = useState<{ kind: "roadmap" | "draft"; id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamePending, startRename] = useTransition();
  const busy = pending || importPending || renamePending;
  const beginRename = (kind: "roadmap" | "draft", id: string, title: string) => {
    setRenameTarget({ kind, id, title });
    setRenameValue(title);
    setRenameError(null);
  };
  const submitRename = () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (title.length < 3) {
      setRenameError("Informe um nome com pelo menos 3 caracteres.");
      return;
    }
    if (title === renameTarget.title) {
      setRenameTarget(null);
      return;
    }
    setRenameError(null);
    startRename(async () => {
      const result = renameTarget.kind === "roadmap"
        ? await renomearRoadmapEstudosLifeOS(renameTarget.id, title)
        : await renomearRascunhoRoadmapLifeOS(renameTarget.id, title);
      if (!result.ok) setRenameError(result.error ?? "Nao foi possivel alterar o nome.");
      else {
        setRenameTarget(null);
        router.refresh();
      }
    });
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm leading-6 text-white/50">Ative uma trilha anterior, retome um rascunho ou exclua definitivamente o que nao faz mais sentido.</p>
      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white/75 ${importPending || !draftsReady ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-white/15"}`}>
          {importPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importPending ? "Ajustando com IA..." : "Importar"}
          <input type="file" accept=".md,.markdown,.txt,.json,text/markdown,application/json" className="hidden" disabled={importPending || !draftsReady} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ""; if (file) onImport(file); }} />
        </label>
        <button type="button" onClick={onExport} disabled={!canExport} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"><Download className="size-4" />Exportar</button>
      </div>
    </div>
    {(error || renameError) && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{renameError ?? error}</p>}
    <div className="max-h-[64vh] space-y-5 overflow-y-auto pr-1">
      <section><h3 className="mb-2 text-xs font-semibold uppercase text-white/35">Roadmaps salvos</h3><div className="space-y-2">{roadmaps.map((roadmap) => <article key={roadmap.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${roadmap.status === "active" ? "border-blue-400/40 bg-blue-400/10" : "border-white/10 bg-white/[0.02]"}`}>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${roadmap.status === "active" ? "bg-blue-500 text-white" : "bg-white/[0.06] text-white/45"}`}><BookOpen className="size-4" /></span>
        <div className="min-w-0 flex-1">{renameTarget?.kind === "roadmap" && renameTarget.id === roadmap.id ? <RoadmapRenameField value={renameValue} pending={renamePending} onChange={setRenameValue} onSave={submitRename} onCancel={() => { setRenameTarget(null); setRenameError(null); }} /> : <p className="truncate text-sm font-semibold text-white/85">{roadmap.title}</p>}<p className="mt-1 text-xs text-white/35">{roadmap.status === "active" ? "Ativo agora" : roadmap.status === "completed" ? "Concluido" : "Arquivado"} - {roadmap.source === "ai" ? "Criado com IA" : roadmap.source === "import" ? "Importado" : "Manual"} - {roadmap.createdAt ? formatDraftDate(roadmap.createdAt) : formatDateBR(roadmap.startDate)}</p></div>
        {roadmap.status !== "active" && <button type="button" disabled={busy} onClick={() => onActivate(roadmap.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Ativar</button>}
        <button type="button" disabled={busy} onClick={() => beginRename("roadmap", roadmap.id, roadmap.title)} title="Alterar nome" className="flex size-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-50"><Pencil className="size-4" /></button>
        <button type="button" disabled={busy} onClick={async () => { const approved = await confirm({ title: "Excluir roadmap?", description: `“${roadmap.title}” sera apagado com todos os modulos, respostas e progresso. Esta acao nao pode ser desfeita.`, confirmLabel: "Excluir roadmap" }); if (approved) onDeleteRoadmap(roadmap.id); }} title="Excluir roadmap" className="flex size-8 items-center justify-center rounded-lg text-white/25 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="size-4" /></button>
      </article>)}{!roadmaps.length && <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-white/35">Nenhum roadmap salvo.</p>}</div></section>
      <section><h3 className="mb-2 text-xs font-semibold uppercase text-white/35">Rascunhos</h3><div className="space-y-2">{drafts.map((draft) => <article key={draft.generationId} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${draft.origin === "import" ? "bg-sky-400/10 text-sky-300" : "bg-violet-400/10 text-violet-300"}`}>{draft.origin === "import" ? <Upload className="size-4" /> : <Sparkles className="size-4" />}</span>
        <div className="min-w-0 flex-1">{renameTarget?.kind === "draft" && renameTarget.id === draft.generationId ? <RoadmapRenameField value={renameValue} pending={renamePending} onChange={setRenameValue} onSave={submitRename} onCancel={() => { setRenameTarget(null); setRenameError(null); }} /> : <p className="truncate text-sm font-semibold text-white/85">{draft.title}</p>}<p className="mt-1 text-xs text-white/35">{draft.origin === "import" ? `Importado${draft.originalFilename ? ` de ${draft.originalFilename}` : ""}` : "Criado com IA"} - {draft.moduleCount} modulos - {draft.stepCount} etapas - {formatDraftDate(draft.createdAt)}</p></div>
        <button type="button" disabled={busy} onClick={() => onOpen(draft.generationId)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Abrir</button>
        <button type="button" disabled={busy} onClick={() => beginRename("draft", draft.generationId, draft.title)} title="Alterar nome" className="flex size-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/10 hover:text-white disabled:opacity-50"><Pencil className="size-4" /></button>
        <button type="button" disabled={busy} onClick={async () => { const approved = await confirm({ title: "Descartar rascunho?", description: `O rascunho “${draft.title}” sera removido definitivamente.`, confirmLabel: "Descartar rascunho" }); if (approved) onDelete(draft.generationId); }} title="Descartar rascunho" className="flex size-8 items-center justify-center rounded-lg text-white/25 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"><Trash2 className="size-4" /></button>
      </article>)}{!drafts.length && <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-white/35">Nenhum rascunho salvo.</p>}</div></section>
    </div>
  </div>;
}

function RoadmapRenameField({ value, pending, onChange, onSave, onCancel }: { value: string; pending: boolean; onChange: (value: string) => void; onSave: () => void; onCancel: () => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSave(); }} className="flex min-w-0 items-center gap-1.5">
    <input autoFocus value={value} maxLength={160} onChange={(event) => onChange(event.target.value)} aria-label="Novo nome do roadmap" className="min-w-0 flex-1 rounded-md border border-blue-400/40 bg-[#0f1318] px-2.5 py-1.5 text-sm font-semibold text-white outline-none focus:border-blue-400" />
    <button type="submit" disabled={pending} title="Salvar nome" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white disabled:opacity-50">{pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}</button>
    <button type="button" disabled={pending} onClick={onCancel} title="Cancelar edicao" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-white/50 hover:text-white disabled:opacity-50"><X className="size-3.5" /></button>
  </form>;
}

function formatDraftDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" }).format(new Date(value)).replace(".", "");
}

function studyDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h${remainder ? ` ${remainder}min` : ""}`;
}

function moduleDuration(module: ModuleView): number {
  const itemMinutes = module.items.reduce((sum, item) => sum + Math.max(0, item.estimatedMinutes ?? 0), 0);
  return itemMinutes || Math.max(0, module.estimatedMinutes ?? 0);
}

function RoadmapSummary({ roadmap, items, moduleCount }: { roadmap: StudyRoadmap; items: StudyRoadmapItem[]; moduleCount: number }) {
  const progress = roadmapProgress(items);
  const totalMinutes = items.reduce((sum, item) => sum + Math.max(0, item.estimatedMinutes ?? 0), 0) || roadmap.totalEstimatedMinutes || 0;
  return <div className="mt-5 border-t border-white/10 pt-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><span className="inline-flex rounded bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-amber-300">Trilha ativa</span><p className="mt-2 break-words font-semibold text-white">{roadmap.title}</p>{roadmap.description && <p className="mt-1 text-xs leading-5 text-white/45">{roadmap.description}</p>}<p className="mt-3 text-xs text-white/55">Proxima etapa: <b className="text-white/85">{nextStudyItem(items)?.title ?? "Roadmap concluido"}</b></p></div><div className="shrink-0 text-right"><strong className="text-3xl font-semibold tabular-nums text-white">{progress}%</strong><p className="mt-1 text-[10px] uppercase text-white/30">concluido</p></div></div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/40"><span>{moduleCount} modulos</span><span>{items.length} etapas</span><span>{studyDurationLabel(totalMinutes)} planejadas</span>{roadmap.qualityScore != null && <span>Definicao {roadmap.qualityScore}%</span>}{roadmap.workloadScore != null && <span>Exigencia {roadmap.workloadScore}%</span>}</div>
  </div>;
}

function StudyModule({ module, number, questions, attempts, onRefresh }: { module: ModuleView; number: number; questions: StudyAssessmentQuestion[]; attempts: StudyAssessmentAttempt[]; onRefresh: () => void }) {
  const completed = module.items.filter((item) => item.status === "completed").length;
  const progress = module.items.length ? Math.round((completed / module.items.length) * 100) : 0;
  const estimatedMinutes = moduleDuration(module);
  const visibleTopics = module.topics.slice(0, 4);
  const hiddenTopicCount = Math.max(0, module.topics.length - visibleTopics.length);
  const [open, setOpen] = useState(progress > 0 && progress < 100 || number === 1);
  return <article className="overflow-hidden rounded-lg border border-white/10 bg-[#11151a]">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/[0.03]">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${progress === 100 ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/60"}`}>{progress === 100 ? <Check className="size-4" /> : number}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-white">{module.title}</span><span className="mt-1 block text-xs text-white/40">{module.items.length ? `${completed} de ${module.items.length} etapas` : "Sem etapas vinculadas"}{estimatedMinutes ? ` - ${studyDurationLabel(estimatedMinutes)}` : ""}</span></span>
      {module.items.length > 0 && <span className="hidden w-24 sm:block"><span className="block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }} /></span><span className="mt-1 block text-right text-[10px] text-white/35">{progress}%</span></span>}
      <ChevronDown className={`size-4 text-white/35 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="border-t border-white/10 p-4">
      {(module.objective || module.successCriteria) && <div className="grid gap-4 border-b border-white/10 pb-4 text-xs sm:grid-cols-2"><div><p className="font-semibold uppercase text-blue-300/70">Missao do modulo</p><p className="mt-1.5 leading-5 text-white/60">{module.objective ?? "Concluir as etapas deste modulo."}</p></div><div><p className="font-semibold uppercase text-emerald-300/70">Resultado esperado</p><p className="mt-1.5 leading-5 text-white/60">{module.successCriteria ?? "Aplicar o conteudo sem depender do passo a passo."}</p></div></div>}
      {visibleTopics.length > 0 && <div className="my-4 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[10px] font-semibold uppercase text-white/30">Competencias</span>{visibleTopics.map((topic) => <span key={topic} className="rounded bg-white/[0.05] px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10">{topic}</span>)}{hiddenTopicCount > 0 && <span title={module.topics.slice(visibleTopics.length).join(", ")} className="rounded px-2 py-1 text-[11px] text-white/35 ring-1 ring-white/10">+{hiddenTopicCount}</span>}</div>}
      <div className="space-y-2">{module.items.map((item, index) => <StudyStep key={item.id} item={item} number={index + 1} defaultOpen={index === 0 && item.status !== "completed"} questions={questions.filter((question) => question.itemId === item.id)} attempts={attempts.filter((attempt) => attempt.itemId === item.id)} onRefresh={onRefresh} />)}{!module.items.length && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">As etapas deste modulo nao foram carregadas. Troque o roadmap ativo e abra-o novamente.</p>}</div>
    </div>}
  </article>;
}

function StudyStep({ item, number, defaultOpen = false, questions, attempts, onRefresh }: { item: StudyRoadmapItem; number: number; defaultOpen?: boolean; questions: StudyAssessmentQuestion[]; attempts: StudyAssessmentAttempt[]; onRefresh: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const meta = kindMeta[item.itemKind ?? "general"] ?? kindMeta.general;
  const Icon = meta.icon;
  const hasAssessment = questions.length > 0;
  const latestAttempt = attempts[0];
  const preparationSteps = item.preparationSteps ?? [];
  const practiceExercises = item.practiceExercises ?? [];
  const completionChecklist = item.completionChecklist ?? [];
  const instructionTitle = item.itemKind === "challenge" ? "Como fazer o desafio" : item.itemKind === "project" ? "Plano de execucao" : "Passo a passo";
  const outcomeTitle = item.itemKind === "challenge" || item.itemKind === "project" ? "Resultado final" : "Concluido quando";
  const toggleComplete = () => startTransition(async () => {
    await atualizarStatusEstudoLifeOS(item.id, item.status === "completed" ? "pending" : "completed");
    router.refresh();
    onRefresh();
  });

  return <section className={`rounded-lg border bg-[#151a20] transition-colors ${open ? "border-blue-400/35" : "border-white/10"}`}>
    <div className="flex items-start gap-3 p-3">
      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ring-1 ${item.status === "completed" ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white/[0.04] text-white/45 ring-white/10"}`}>{item.status === "completed" ? <Check className="size-3.5" /> : number}</span>
      <button type="button" onClick={() => setOpen((value) => !value)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}><Icon className="size-3" />{meta.label}</span>{item.estimatedMinutes && <span className="text-[10px] text-gray-400">{item.estimatedMinutes} min</span>}{latestAttempt && <span className={`text-[10px] font-semibold ${latestAttempt.score >= 70 ? "text-emerald-600" : "text-amber-600"}`}>Ultima nota {latestAttempt.score}%</span>}</span>
        <span className={`mt-1 block text-sm font-medium ${item.status === "completed" ? "text-white/35 line-through" : "text-white/85"}`}>{item.title}</span>
        {!open && item.description && <span className="mt-1 block line-clamp-1 text-xs text-white/35">{item.description}</span>}
      </button>
      <button type="button" onClick={hasAssessment && item.status !== "completed" ? () => setOpen(true) : toggleComplete} disabled={pending} aria-pressed={item.status === "completed"} className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-semibold ${item.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-white/55 hover:bg-white/10 hover:text-white"}`} title={hasAssessment && item.status !== "completed" ? "Responder atividade" : item.status === "completed" ? "Marcar como pendente" : "Marcar como concluida"}>{pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}<span className="hidden sm:inline">{item.status === "completed" ? "Concluida" : hasAssessment ? "Responder" : "Concluir"}</span></button>
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-1.5 text-white/35 hover:bg-white/[0.06] hover:text-white" title="Ver detalhes"><ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    </div>
    {open && <div className="border-t border-white/10 px-4 py-4">
      {item.description && <p className="text-sm leading-6 text-white/55">{item.description}</p>}
      {(item.requirements || item.workspace) && <div className="mt-4 grid gap-4 border-y border-white/10 py-3 sm:grid-cols-2">
        {item.requirements && <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-white/35"><Wrench className="size-3.5" />O que voce precisa</p><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-white/70">{item.requirements}</p></div>}
        {item.workspace && <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-white/35"><MapPin className="size-3.5" />Onde fazer</p><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-white/70">{item.workspace}</p></div>}
      </div>}
      <StudyDetailList title="Preparacao" items={preparationSteps} marker="check" icon={Wrench} accentClass="text-sky-300" />
      {item.instructions && <div className="mt-4"><p className="text-xs font-semibold uppercase text-white/35">{instructionTitle}</p><InstructionChecklist value={item.instructions} /></div>}
      {item.resourceUrl && <>
        <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-red-200"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.resourceTitle ?? "Abrir videoaula"}</span>{item.resourceChannel && <span className="mt-0.5 block text-xs text-red-300/70">{item.resourceChannel}</span>}</span><ExternalLink className="size-4 shrink-0" /></a>
        {item.itemKind === "video" && <div className="mt-2 flex items-start gap-2 rounded-md bg-white/[0.03] px-3 py-2 text-[11px] leading-5 text-white/45"><Languages className="mt-0.5 size-3.5 shrink-0" /><p>Algumas videoaulas podem estar em ingles. No YouTube, abra <b className="font-semibold text-white/60">Configuracoes</b> e escolha <b className="font-semibold text-white/60">Faixa de audio &gt; Portugues (Brasil)</b>, quando essa opcao estiver disponivel.</p></div>}
      </>}
      <StudyDetailList title="Pratica sem consulta" items={practiceExercises} marker="number" icon={Swords} accentClass="text-amber-300" />
      {item.completionCriteria && <div className="mt-5 border-l-2 border-emerald-500 pl-3"><p className="text-xs font-semibold uppercase text-emerald-300">{outcomeTitle}</p><p className="mt-1 text-sm leading-6 text-emerald-100/80">{item.completionCriteria}</p></div>}
      <StudyDetailList title="Criterios objetivos" items={completionChecklist} marker="check" icon={Check} accentClass="text-emerald-300" />
      {item.evidence && <div className="mt-5 border-t border-white/10 pt-4"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-cyan-300"><FileText className="size-3.5" />Evidencia esperada</p><p className="mt-2 text-sm leading-6 text-white/65">{item.evidence}</p></div>}
      {hasAssessment && <AssessmentPanel key={latestAttempt?.id ?? "new-attempt"} itemId={item.id} itemKind={item.itemKind ?? "general"} questions={questions} latestAttempt={latestAttempt} onRefresh={() => { router.refresh(); onRefresh(); }} />}
    </div>}
  </section>;
}

function InstructionChecklist({ value }: { value: string }) {
  const normalizedValue = /^\s*\d+[.)]\s+/.test(value)
    ? value.replace(/\s+(?=\d+[.)]\s+)/g, "\n")
    : value;
  const lines = normalizedValue
    .split(/\n+|;\s+/)
    .map((line) => line.trim().replace(/^#{1,6}\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/^\[[ xX]\]\s*/, ""))
    .filter(Boolean);
  if (lines.length <= 1) return <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/70">{value}</p>;
  return <ol className="mt-3 space-y-3">{lines.map((line, index) => <li key={`${index}-${line}`} className="flex gap-3 text-sm leading-6 text-white/70"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-300 ring-1 ring-blue-400/20">{index + 1}</span><span>{line}</span></li>)}</ol>;
}

function StudyDetailList({ title, items, marker, icon: Icon, accentClass }: { title: string; items: string[]; marker: "number" | "check" | "question"; icon: typeof BookOpen; accentClass: string }) {
  if (!items.length) return null;
  return <section className="mt-5 border-t border-white/10 pt-4">
    <h4 className={`flex items-center gap-1.5 text-xs font-semibold uppercase ${accentClass}`}><Icon className="size-3.5" />{title}</h4>
    <ol className="mt-3 space-y-2.5">{items.map((item, index) => <li key={`${title}-${index}-${item}`} className="flex items-start gap-3 text-sm leading-6 text-white/70">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[10px] font-bold text-white/55 ring-1 ring-white/10">{marker === "check" ? <Check className="size-3.5" /> : marker === "question" ? "?" : index + 1}</span>
      <span>{item}</span>
    </li>)}</ol>
  </section>;
}

type AssessmentAnswer = number | number[];
type AssessmentResult = Awaited<ReturnType<typeof enviarAvaliacaoEstudoLifeOS>>;
type AssessmentFeedback = NonNullable<AssessmentResult["feedback"]>[number];

function initialAssessmentAnswers(questions: StudyAssessmentQuestion[]): Record<string, AssessmentAnswer> {
  return Object.fromEntries(questions.filter((question) => question.questionType === "ordering").map((question) => [question.id, question.options.map((_, index) => index)]));
}

function persistedAssessmentResult(attempt?: StudyAssessmentAttempt): AssessmentResult | null {
  return attempt ? { ok: true, score: attempt.score, correctCount: attempt.correctCount, totalCount: attempt.totalCount, passed: attempt.score >= 70, feedback: attempt.feedback } : null;
}

function AssessmentPanel({ itemId, itemKind, questions, latestAttempt, onRefresh }: { itemId: string; itemKind: StudyItemKind; questions: StudyAssessmentQuestion[]; latestAttempt?: StudyAssessmentAttempt; onRefresh: () => void }) {
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>(() => latestAttempt?.answers ?? initialAssessmentAnswers(questions));
  const [result, setResult] = useState<AssessmentResult | null>(() => persistedAssessmentResult(latestAttempt));
  const [pending, startTransition] = useTransition();
  const feedbackByQuestion = new Map(result?.feedback?.map((entry) => [entry.questionId, entry]) ?? []);
  const complete = questions.every((question) => {
    const answer = answers[question.id];
    return question.questionType === "ordering"
      ? Array.isArray(answer) && answer.length === question.options.length && new Set(answer).size === question.options.length
      : Number.isInteger(answer);
  });
  const panelTitle = itemKind === "practice" ? "Atividade interativa" : itemKind === "quiz" ? "Prova" : "Checagem do modulo";

  const moveOption = (question: StudyAssessmentQuestion, position: number, direction: -1 | 1) => {
    setAnswers((current) => {
      const order = Array.isArray(current[question.id]) ? [...current[question.id] as number[]] : question.options.map((_, index) => index);
      const target = position + direction;
      if (target < 0 || target >= order.length) return current;
      [order[position], order[target]] = [order[target], order[position]];
      return { ...current, [question.id]: order };
    });
  };

  return <div className="mt-5 border-t border-white/10 pt-4">
    <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-white/90">{panelTitle}</p><p className="mt-1 text-xs text-white/35">Responda tudo e envie para receber a correcao.</p></div>{result?.score != null && <span className={`rounded-md px-2 py-1 text-sm font-bold ${result.passed ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{result.score}%</span>}</div>
    <div className="mt-4 space-y-5">{questions.map((question, questionIndex) => {
      const feedback = feedbackByQuestion.get(question.id);
      if (question.questionType === "ordering") {
        const order = Array.isArray(answers[question.id]) ? answers[question.id] as number[] : question.options.map((_, index) => index);
        return <OrderingQuestion key={question.id} question={question} questionIndex={questionIndex} order={order} feedback={feedback} disabled={Boolean(result)} onMove={(position, direction) => moveOption(question, position, direction)} />;
      }
      return <fieldset key={question.id}><legend className="text-sm font-medium text-white/80">{questionIndex + 1}. {question.prompt}</legend><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => {
        const selected = answers[question.id] === optionIndex;
        const isCorrectAnswer = feedback?.correctOptionIndex === optionIndex;
        const isWrongSelection = Boolean(feedback && selected && !feedback.correct);
        return <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${isCorrectAnswer ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : isWrongSelection ? "border-red-400/40 bg-red-400/10 text-red-200" : selected ? "border-blue-400/50 bg-blue-400/10 text-blue-200" : "border-white/10 text-white/55"}`}><input type="radio" name={`question-${question.id}`} checked={selected} disabled={Boolean(result)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="mt-0.5 accent-blue-500" />{option}</label>;
      })}</div>{feedback && <p className={`mt-2 text-xs leading-5 ${feedback.correct ? "text-emerald-300" : "text-red-300"}`}>{feedback.correct ? "Resposta correta. " : "Resposta incorreta. "}{feedback.explanation}</p>}</fieldset>;
    })}</div>
    {result?.error && <p className="mt-3 text-sm text-red-300">{result.error}</p>}
    <div className="mt-5 flex justify-end">{result ? <button type="button" disabled={pending} onClick={() => startTransition(async () => { const response = await reiniciarAvaliacaoEstudoLifeOS(itemId); if (!response.ok) setResult({ ok: false, error: response.error }); else { setAnswers(initialAssessmentAnswers(questions)); setResult(null); onRefresh(); } })} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white/70 disabled:opacity-50">{pending && <Loader2 className="size-4 animate-spin" />}Tentar novamente</button> : <button type="button" disabled={pending || !complete} onClick={() => startTransition(async () => { const response = await enviarAvaliacaoEstudoLifeOS(itemId, answers); setResult(response); if (response.ok) onRefresh(); })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Corrigindo..." : "Enviar respostas"}</button>}</div>
  </div>;
}

function OrderingQuestion({ question, questionIndex, order, feedback, disabled, onMove }: { question: StudyAssessmentQuestion; questionIndex: number; order: number[]; feedback?: AssessmentFeedback; disabled: boolean; onMove: (position: number, direction: -1 | 1) => void }) {
  const correctSequence = feedback?.correctOrder.map((optionIndex) => question.options[optionIndex]).filter(Boolean) ?? [];
  return <fieldset>
    <legend className="text-sm font-medium text-white/80">{questionIndex + 1}. {question.prompt}</legend>
    <p className="mt-1 text-xs text-white/35">Organize os itens na sequencia correta.</p>
    <ol className={`mt-2 divide-y divide-white/10 overflow-hidden rounded-lg border ${feedback ? feedback.correct ? "border-emerald-400/40" : "border-red-400/40" : "border-white/10"}`}>
      {order.map((optionIndex, position) => <li key={`${question.id}-${optionIndex}`} className="flex min-h-11 items-center gap-2 bg-white/[0.02] px-2.5 py-2 text-sm text-white/65">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-bold text-white/45">{position + 1}</span>
        <span className="min-w-0 flex-1">{question.options[optionIndex]}</span>
        <button type="button" disabled={disabled || position === 0} onClick={() => onMove(position, -1)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/35 hover:bg-white/10 hover:text-white disabled:opacity-20" title="Mover para cima" aria-label={`Mover ${question.options[optionIndex]} para cima`}><ArrowUp className="size-3.5" /></button>
        <button type="button" disabled={disabled || position === order.length - 1} onClick={() => onMove(position, 1)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/35 hover:bg-white/10 hover:text-white disabled:opacity-20" title="Mover para baixo" aria-label={`Mover ${question.options[optionIndex]} para baixo`}><ArrowDown className="size-3.5" /></button>
      </li>)}
    </ol>
    {feedback && <div className={`mt-2 text-xs leading-5 ${feedback.correct ? "text-emerald-300" : "text-red-300"}`}><p>{feedback.correct ? "Ordem correta. " : "Ordem incorreta. "}{feedback.explanation}</p>{!feedback.correct && correctSequence.length > 0 && <p className="mt-1 font-medium">Sequencia correta: {correctSequence.join(" -> ")}</p>}</div>}
  </fieldset>;
}

type SessionEditorValue = {
  source: "pomodoro" | "manual";
  title: string;
  date: string;
  notes: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesCompleted: number;
  roadmapId: string | null;
  moduleIds: string[];
  itemIds: string[];
  startedAt: string | null;
  endedAt: string | null;
};

function roundedSessionMinutes(seconds: number, minimum = 0): number {
  if (seconds <= 0) return minimum;
  return Math.max(minimum, Math.round(seconds / 60));
}

function PomodoroTimer({ roadmap, modules, today, onSaved }: { roadmap: StudyRoadmap | null; modules: ModuleView[]; today: string; onSaved: () => void }) {
  const confirm = usePerformanceConfirm();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState<Record<PomodoroMode, number>>({ focus: 0, short: 0, long: 0 });
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const durationFor = (value: PomodoroMode, config = settings) => config[value] * 60;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => ({ ...value, [mode]: value[mode] + 1 }));
      setRemaining((value) => {
        if (value > 1) return value - 1;
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

  const selectMode = (value: PomodoroMode) => { setMode(value); setRemaining(durationFor(value)); };
  const startOrPause = () => {
    if (!startedAt) setStartedAt(new Date().toISOString());
    setRunning((value) => !value);
  };
  const resetSession = () => {
    setRunning(false);
    setMode("focus");
    setRemaining(settings.focus * 60);
    setCycles(0);
    setElapsed({ focus: 0, short: 0, long: 0 });
    setStartedAt(null);
    setShowSave(false);
  };
  const display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const totalSeconds = elapsed.focus + elapsed.short + elapsed.long;
  const total = `${Math.floor(totalSeconds / 3600)}h ${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")}min`;
  const sessionValue: SessionEditorValue = {
    source: "pomodoro",
    title: "",
    date: today,
    notes: "",
    focusMinutes: roundedSessionMinutes(elapsed.focus, 1),
    shortBreakMinutes: roundedSessionMinutes(elapsed.short),
    longBreakMinutes: roundedSessionMinutes(elapsed.long),
    cyclesCompleted: cycles,
    roadmapId: roadmap?.id ?? null,
    moduleIds: [],
    itemIds: [],
    startedAt,
    endedAt: new Date().toISOString(),
  };

  return <section className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-[#15191f] p-4 text-white sm:p-5 xl:sticky xl:top-5">
    <div className="flex items-start justify-between"><div><h2 className="font-semibold">Pomodoro</h2><p className="mt-1 text-xs text-white/40">Foco com pausas intencionais.</p></div><button type="button" onClick={() => setShowSettings(true)} className="rounded-md p-2 text-white/45 hover:bg-white/10 hover:text-white" title="Configurar"><Settings2 className="size-4" /></button></div>
    <div className="mt-5 grid grid-cols-3 rounded-lg bg-black/20 p-1">{(["focus", "short", "long"] as PomodoroMode[]).map((value) => <button key={value} type="button" onClick={() => selectMode(value)} className={`rounded-md px-1 py-2 text-[10px] font-semibold sm:px-2 sm:text-xs ${mode === value ? "bg-white text-gray-900" : "text-white/50"}`}>{value === "focus" ? "Pomodoro" : value === "short" ? "Pausa rapida" : "Pausa longa"}</button>)}</div>
    <p className="mt-8 text-center text-6xl font-semibold tabular-nums sm:text-7xl">{display}</p>
    <div className="mt-7 flex justify-center gap-2"><button type="button" onClick={startOrPause} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold">{running ? <Pause className="size-5" /> : <Play className="size-5" />}{running ? "Pausar" : startedAt ? "Continuar" : "Iniciar"}</button><button type="button" onClick={() => setRemaining(durationFor(mode))} className="rounded-lg bg-white/10 p-3 text-white/60" title="Reiniciar periodo atual"><RotateCcw className="size-5" /></button></div>
    <div className="mt-7 grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4 text-center"><div><p className="text-xs text-white/40">Ciclos concluidos</p><p className="mt-1 font-semibold">{cycles} / {settings.cycles}</p></div><div><p className="text-xs text-white/40">Tempo total</p><p className="mt-1 font-semibold">{total}</p></div></div>
    <div className="mt-5">
      {startedAt ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setRunning(false); setShowSave(true); }} className="rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white">Salvar sessao</button><button type="button" onClick={async () => { const approved = await confirm({ title: "Descartar sessao?", description: "Todo o tempo contabilizado nesta sessao sera perdido.", confirmLabel: "Descartar sessao" }); if (approved) resetSession(); }} className="rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white/60">Descartar</button></div> : <p className="text-center text-[11px] text-white/35">Ao iniciar, o tempo de foco e cada pausa passam a ser contabilizados.</p>}
    </div>
    {showSettings && <Modal title="Configurar Pomodoro" onClose={() => setShowSettings(false)}><PomodoroSettingsForm settings={settings} onSave={(next) => { setSettings(next); setRemaining(next[mode] * 60); setRunning(false); setShowSettings(false); }} /></Modal>}
    {showSave && <Modal title="Salvar sessao de estudo" wide onClose={() => setShowSave(false)}><StudySessionEditor initial={sessionValue} roadmap={roadmap} modules={modules} submitLabel="Salvar sessao" action={salvarSessaoEstudoLifeOS} onDone={() => { resetSession(); onSaved(); }} /></Modal>}
  </section>;
}

function PomodoroSettingsForm({ settings, onSave }: { settings: PomodoroSettings; onSave: (settings: PomodoroSettings) => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ focus: Math.max(1, Number(data.get("focus"))), short: Math.max(1, Number(data.get("short"))), long: Math.max(1, Number(data.get("long"))), cycles: Math.max(1, Number(data.get("cycles"))) }); }} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field name="focus" label="Pomodoro (min)" type="number" defaultValue={String(settings.focus)} /><Field name="short" label="Pausa rapida (min)" type="number" defaultValue={String(settings.short)} /><Field name="long" label="Pausa longa (min)" type="number" defaultValue={String(settings.long)} /><Field name="cycles" label="Ciclos ate pausa longa" type="number" defaultValue={String(settings.cycles)} /></div><button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Aplicar</button></form>;
}

function StudySessionEditor({ initial, roadmap, modules, submitLabel, action, onDone }: { initial: SessionEditorValue; roadmap: StudyRoadmap | null; modules: ModuleView[]; submitLabel: string; action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [focus, setFocus] = useState(initial.focusMinutes);
  const [shortBreak, setShortBreak] = useState(initial.shortBreakMinutes);
  const [longBreak, setLongBreak] = useState(initial.longBreakMinutes);
  const [moduleIds, setModuleIds] = useState(initial.moduleIds);
  const [itemIds, setItemIds] = useState(initial.itemIds);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const availableItems = modules.flatMap((module) => module.items.map((item) => ({ ...item, moduleTitle: module.title })));
  const selectedLabels = [
    ...modules.filter((module) => moduleIds.includes(module.id)).map((module) => module.title),
    ...availableItems.filter((item) => itemIds.includes(item.id)).map((item) => item.title),
  ];
  const canSubmit = focus >= 1 && (title.trim().length > 0 || selectedLabels.length > 0);
  const toggle = (values: string[], value: string, update: (values: string[]) => void) => update(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);

  return <form onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) setError(result.error ?? "Nao foi possivel salvar a sessao.");
      else onDone();
    });
  }} className="space-y-5">
    <input type="hidden" name="source" value={initial.source} />
    <input type="hidden" name="roadmap_id" value={initial.roadmapId ?? roadmap?.id ?? ""} />
    <input type="hidden" name="started_at" value={initial.startedAt ?? ""} />
    <input type="hidden" name="ended_at" value={initial.endedAt ?? ""} />
    <input type="hidden" name="cycles_completed" value={initial.cyclesCompleted} />
    {moduleIds.filter((id) => !id.startsWith("legacy:")).map((id) => <input key={id} type="hidden" name="module_ids" value={id} />)}
    {itemIds.map((id) => <input key={id} type="hidden" name="item_ids" value={id} />)}
    {selectedLabels.map((label, index) => <input key={`${label}-${index}`} type="hidden" name="subject_labels" value={label} />)}

    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
      <label className="text-xs font-medium text-white/45">Assunto livre
        <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Ex.: Revisao de arvore de decisao" className={inputClass} />
      </label>
      <label className="text-xs font-medium text-white/45">Data
        <input name="date" type="date" required defaultValue={initial.date} className={inputClass} />
      </label>
    </div>

    {roadmap && modules.length > 0 && <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div><p className="text-sm font-semibold text-white/80">Vincular ao roadmap ativo</p><p className="mt-1 text-xs text-white/35">Escolha um modulo inteiro, varios assuntos, ou mantenha apenas o nome livre.</p></div>
      <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">{modules.map((module) => <div key={module.id} className="rounded-lg border border-white/10 p-3">
        {!module.legacy && <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white/75"><input type="checkbox" checked={moduleIds.includes(module.id)} onChange={() => toggle(moduleIds, module.id, setModuleIds)} className="size-4 accent-blue-500" />Modulo inteiro: {module.title}</label>}
        <div className={`${module.legacy ? "" : "mt-3 border-t border-white/10 pt-3"} grid gap-2 sm:grid-cols-2`}>{module.items.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-white/50"><input type="checkbox" checked={itemIds.includes(item.id)} onChange={() => toggle(itemIds, item.id, setItemIds)} className="mt-0.5 size-4 shrink-0 accent-blue-500" /><span>{item.title}</span></label>)}</div>
      </div>)}</div>
    </section>}

    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-medium text-white/45">Pomodoro / foco (min)<input name="focus_minutes" type="number" min="1" required value={focus} onChange={(event) => setFocus(Math.max(0, Number(event.target.value)))} className={inputClass} /></label>
      <label className="text-xs font-medium text-white/45">Pausa rapida (min)<input name="short_break_minutes" type="number" min="0" required value={shortBreak} onChange={(event) => setShortBreak(Math.max(0, Number(event.target.value)))} className={inputClass} /></label>
      <label className="text-xs font-medium text-white/45">Pausa longa (min)<input name="long_break_minutes" type="number" min="0" required value={longBreak} onChange={(event) => setLongBreak(Math.max(0, Number(event.target.value)))} className={inputClass} /></label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-400/20 bg-blue-400/10 px-4 py-3"><p className="text-sm text-blue-100">Foco <b>{focus} min</b> + pausas <b>{shortBreak + longBreak} min</b></p><p className="font-semibold text-blue-200">Total {focus + shortBreak + longBreak} min</p></div>
    <label className="text-xs font-medium text-white/45">Observacoes <span className="font-normal text-white/25">Opcional</span><textarea name="notes" rows={2} defaultValue={initial.notes} maxLength={2000} className={inputClass} /></label>
    {error && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="flex justify-end"><button disabled={pending || !canSubmit} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Salvando..." : submitLabel}</button></div>
  </form>;
}

function activitySessionValue(activity: StudyActivity, today: string): SessionEditorValue {
  const session = activity.studySession;
  return {
    source: session?.source ?? "manual",
    title: activity.title,
    date: activity.date || today,
    notes: activity.notes ?? "",
    focusMinutes: Math.max(1, session?.focusMinutes ?? activity.durationMinutes ?? 1),
    shortBreakMinutes: session?.shortBreakMinutes ?? 0,
    longBreakMinutes: session?.longBreakMinutes ?? 0,
    cyclesCompleted: session?.cyclesCompleted ?? 0,
    roadmapId: session?.roadmapId ?? null,
    moduleIds: session?.moduleIds ?? [],
    itemIds: session?.itemIds ?? [],
    startedAt: session?.startedAt ?? null,
    endedAt: session?.endedAt ?? null,
  };
}

function StudySessions({ activities, roadmap, modules, today, onDone }: { activities: StudyActivity[]; roadmap: StudyRoadmap | null; modules: ModuleView[]; today: string; onDone: () => void }) {
  const confirm = usePerformanceConfirm();
  const [editor, setEditor] = useState<StudyActivity | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const manualInitial: SessionEditorValue = { source: "manual", title: "", date: today, notes: "", focusMinutes: 25, shortBreakMinutes: 0, longBreakMinutes: 0, cyclesCompleted: 0, roadmapId: roadmap?.id ?? null, moduleIds: [], itemIds: [], startedAt: null, endedAt: null };
  return <div className="mt-4">
    <div className="flex justify-end"><button type="button" onClick={() => setEditor("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="size-4" />Lancamento manual</button></div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="mt-4 max-h-[430px] divide-y divide-white/10 overflow-y-auto rounded-lg border border-white/10">{activities.map((activity) => {
      const session = activity.studySession;
      const totalMinutes = session?.totalMinutes ?? activity.durationMinutes ?? 0;
      return <article key={activity.id} className="flex items-center gap-3 bg-white/[0.015] px-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300"><BookOpen className="size-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white/80">{activity.title}</p><p className="mt-1 text-xs text-white/35">{formatDateBR(activity.date)} - foco {session?.focusMinutes ?? activity.durationMinutes ?? 0} min{session && session.shortBreakMinutes + session.longBreakMinutes > 0 ? ` - pausas ${session.shortBreakMinutes + session.longBreakMinutes} min` : ""} - total {totalMinutes} min</p>{session?.subjectLabels.length ? <p className="mt-1 truncate text-[11px] text-blue-300/60">{session.subjectLabels.join(" - ")}</p> : null}</div>
        <button type="button" onClick={() => setEditor(activity)} title="Editar sessao" className="flex size-8 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white"><Pencil className="size-4" /></button>
        <button type="button" disabled={pending} onClick={async () => { const approved = await confirm({ title: "Excluir sessao de estudo?", description: `A sessao “${activity.title}” e todo o tempo registrado nela serao removidos.`, confirmLabel: "Excluir sessao" }); if (!approved) return; setError(null); setPendingId(activity.id); startTransition(async () => { const result = await removerSessaoEstudoLifeOS(activity.id); if (!result.ok) setError(result.error ?? "Nao foi possivel excluir."); else onDone(); setPendingId(null); }); }} title="Excluir sessao" className="flex size-8 items-center justify-center rounded-md text-white/25 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40">{pending && pendingId === activity.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>
      </article>;
    })}{!activities.length && <p className="p-8 text-center text-sm text-white/35">Nenhuma sessao registrada ainda.</p>}</div>
    {editor && <Modal title={editor === "new" ? "Registrar sessao de estudo" : "Editar sessao de estudo"} wide onClose={() => setEditor(null)}><StudySessionEditor initial={editor === "new" ? manualInitial : activitySessionValue(editor, today)} roadmap={roadmap} modules={modules} submitLabel={editor === "new" ? "Salvar sessao" : "Salvar alteracoes"} action={editor === "new" ? salvarSessaoEstudoLifeOS : (data) => editarSessaoEstudoLifeOS(editor.id, data)} onDone={() => { setEditor(null); onDone(); }} /></Modal>}
  </div>;
}

function NewStudyItem({ roadmapId, sections, order, onDone }: { roadmapId: string; sections: string[]; order: number; onDone: () => void }) { return <AsyncForm action={(data) => criarItemEstudoLifeOS(roadmapId, data)} onDone={onDone}><Field name="title" label="Nome da etapa" required /><label className="block text-xs font-medium text-gray-500">Modulo<select name="section" defaultValue={sections[0] ?? "Geral"} className={`${inputClass} mt-1`}>{(sections.length ? sections : ["Geral"]).map((section) => <option key={section}>{section}</option>)}</select></label><Field name="estimated_minutes" label="Tempo estimado (min)" type="number" /><input type="hidden" name="order_index" value={order} /><input type="hidden" name="item_kind" value="general" /></AsyncForm>; }
function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) { const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-300">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>; }
function Field({ name, label, type = "text", defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label className="block text-xs font-medium text-white/45">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 1 : undefined} className={`${inputClass} mt-1`} /></label>; }
function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className={`max-h-[94vh] w-full overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-4 text-white shadow-2xl sm:p-5 ${wide ? "max-w-5xl" : "max-w-lg"}`}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="min-w-0 text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-sm text-white/45 hover:bg-white/10 hover:text-white">Fechar</button></div>{children}</div></div>; }
