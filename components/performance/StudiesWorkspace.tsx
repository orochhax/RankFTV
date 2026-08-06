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
  Loader2,
  MapPin,
  Pause,
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
} from "lucide-react";
import {
  ativarRoadmapEstudosLifeOS,
  atualizarStatusEstudoLifeOS,
  criarAtividadeLifeOS,
  criarItemEstudoLifeOS,
  criarRoadmapEstudosLifeOS,
  enviarAvaliacaoEstudoLifeOS,
  importarRoadmapEstudosLifeOS,
  obterRascunhoRoadmapLifeOS,
  removerRascunhoRoadmapLifeOS,
} from "@/app/admin/performance/life-os-actions";
import { RoadmapAiWizard } from "@/components/performance/RoadmapAiWizard";
import { formatDateBR } from "@/lib/format";
import { ROADMAP_IMPORT_MAX_BYTES } from "@/lib/performance-analytics";
import { roadmapDraftStats, type RoadmapDraftDetail, type RoadmapDraftSummary } from "@/lib/study-roadmap-ai";
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
  activities,
  today,
  monday,
  v2Ready,
  draftsReady,
  enhancementsReady,
}: {
  roadmaps: StudyRoadmap[];
  items: StudyRoadmapItem[];
  modules: StudyRoadmapModule[];
  questions: StudyAssessmentQuestion[];
  attempts: StudyAssessmentAttempt[];
  drafts: RoadmapDraftSummary[];
  activities: StudyActivity[];
  today: string;
  monday: string;
  v2Ready: boolean;
  draftsReady: boolean;
  enhancementsReady: boolean;
}) {
  const router = useRouter();
  const defaultRoadmapId = roadmaps.find((roadmap) => roadmap.status === "active")?.id ?? roadmaps[0]?.id ?? "";
  const [preferredRoadmapId, setPreferredRoadmapId] = useState(defaultRoadmapId);
  const selectedRoadmapId = roadmaps.some((roadmap) => roadmap.id === preferredRoadmapId) ? preferredRoadmapId : defaultRoadmapId;
  const [importError, setImportError] = useState<string | null>(null);
  const [importPending, startImport] = useTransition();
  const [newItem, setNewItem] = useState(false);
  const [aiWizard, setAiWizard] = useState(false);
  const [draftLibrary, setDraftLibrary] = useState(false);
  const [openedDraft, setOpenedDraft] = useState<RoadmapDraftDetail | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftPending, startDraftTransition] = useTransition();
  const [roadmapPending, startRoadmapTransition] = useTransition();
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

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
          requirements: item.requirements,
          workspace: item.workspace,
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
    {!draftsReady && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-roadmap-drafts.sql</b> para salvar e recuperar rascunhos gerados pela IA.</p>}
    {!enhancementsReady && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">Execute <b>performance-study-question-types.sql</b> para liberar desafios detalhados e atividades de ordenacao. Roadmaps e perguntas anteriores continuam preservados.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="space-y-5">
        <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Roadmaps de estudo</h2><p className="mt-1 text-xs text-gray-400">Escolha um plano e avance pelos modulos no seu ritmo.</p></div>
            <RoadmapActions
              importPending={importPending}
              canExport={Boolean(items.length)}
              onAi={() => setAiWizard(true)}
              draftCount={drafts.length}
              draftsReady={draftsReady}
              onDrafts={() => { setDraftError(null); setDraftLibrary(true); }}
              onExport={exportRoadmap}
              onImport={(file) => {
                setImportError(null);
                if (file.size > ROADMAP_IMPORT_MAX_BYTES) {
                  const sizeMb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
                  setImportError(`O arquivo tem ${sizeMb} MB. O limite para importacao e 5 MB.`);
                  return;
                }
                startImport(async () => {
                  const result = await importarRoadmapEstudosLifeOS(await file.text(), file.name);
                  if (!result.ok) setImportError(result.error ?? "Falha ao importar.");
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
                    router.refresh();
                  } else setImportError("A IA nao devolveu uma previa valida.");
                });
              }}
            />
          </div>
          {importError && <p className="mt-3 rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{importError}</p>}
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
          {roadmap ? <RoadmapSummary roadmap={roadmap} items={items} moduleCount={moduleViews.length} /> : <CreateRoadmap onDone={() => router.refresh()} />}
        </section>

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
      </div>

      <PomodoroTimer />
    </div>

    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Sessoes realizadas</h3><p className="mt-1 text-xs text-gray-400">{weekly.totalMinutes} minutos nesta semana - media de {weekly.averageMinutes} minutos por dia</p></div></div>
      <div className="mt-4"><StudySessionForm today={today} onDone={() => router.refresh()} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activities.filter((item) => item.area === "estudos").slice(0, 9).map((item) => <div key={item.id} className="border-l border-white/10 px-3 py-2"><p className="truncate text-sm font-medium text-white/80">{item.title}</p><p className="mt-1 text-xs text-white/35">{formatDateBR(item.date)} - {item.durationMinutes ?? 0} min</p></div>)}</div>
    </section>

    {newItem && roadmap && <Modal title="Nova etapa" onClose={() => setNewItem(false)}><NewStudyItem roadmapId={roadmap.id} sections={moduleViews.map((module) => module.title)} order={items.length} onDone={() => { setNewItem(false); router.refresh(); }} /></Modal>}
    {aiWizard && <Modal title="Criar roadmap com IA" wide onClose={() => setAiWizard(false)}><RoadmapAiWizard today={today} onClose={() => setAiWizard(false)} onDraftSaved={() => router.refresh()} onDone={() => { setAiWizard(false); setPreferredRoadmapId(""); router.refresh(); }} /></Modal>}
    {openedDraft && <Modal title={openedDraft.origin === "import" ? "Roadmap ajustado pela IA" : "Rascunho de roadmap"} wide onClose={() => setOpenedDraft(null)}><RoadmapAiWizard today={today} initialDraft={openedDraft} onClose={() => setOpenedDraft(null)} onDraftSaved={() => router.refresh()} onDone={() => { setOpenedDraft(null); setDraftLibrary(false); setPreferredRoadmapId(""); router.refresh(); }} /></Modal>}
    {draftLibrary && <Modal title="Rascunhos de roadmap" wide onClose={() => setDraftLibrary(false)}><DraftLibrary
      drafts={drafts}
      pending={draftPending}
      error={draftError}
      onOpen={(generationId) => startDraftTransition(async () => {
        setDraftError(null);
        const result = await obterRascunhoRoadmapLifeOS(generationId);
        if (!result.ok || !result.draft) setDraftError(result.error ?? "Nao foi possivel abrir o rascunho.");
        else { setOpenedDraft(result.draft); setDraftLibrary(false); }
      })}
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

function RoadmapActions({ importPending, canExport, draftCount, draftsReady, onAi, onDrafts, onExport, onImport }: { importPending: boolean; canExport: boolean; draftCount: number; draftsReady: boolean; onAi: () => void; onDrafts: () => void; onExport: () => void; onImport: (file: File) => void }) {
  return <div className="flex flex-wrap gap-2">
    <label className={`inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 ${importPending || !draftsReady ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
      {importPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{importPending ? "Ajustando com IA..." : "Importar"}
      <input type="file" accept=".md,.markdown,.txt,.json,text/markdown,application/json" className="hidden" disabled={importPending || !draftsReady} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; input.value = ""; if (file) onImport(file); }} />
    </label>
    <button type="button" onClick={onAi} disabled={!draftsReady} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Sparkles className="size-4" />Criar com IA</button>
    <button type="button" onClick={onDrafts} disabled={!draftsReady} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40"><FileClock className="size-4" />Rascunhos{draftCount > 0 ? ` (${draftCount})` : ""}</button>
    <button type="button" onClick={onExport} disabled={!canExport} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Download className="size-4" />Exportar</button>
  </div>;
}

function DraftLibrary({ drafts, pending, error, onOpen, onDelete }: { drafts: RoadmapDraftSummary[]; pending: boolean; error: string | null; onOpen: (generationId: string) => void; onDelete: (generationId: string) => void }) {
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-gray-500">Toda resposta concluida pela IA fica aqui ate ser salva como roadmap ou descartada por voce.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    {!drafts.length ? <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center"><FileClock className="mx-auto size-6 text-gray-300" /><p className="mt-2 text-sm text-gray-400">Nenhum rascunho salvo.</p></div> : <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">{drafts.map((draft) => <article key={draft.generationId} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${draft.origin === "import" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"}`}>{draft.origin === "import" ? <Upload className="size-4" /> : <Sparkles className="size-4" />}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-800">{draft.title}</p><p className="mt-1 text-xs text-gray-400">{draft.origin === "import" ? `Importado${draft.originalFilename ? ` de ${draft.originalFilename}` : ""}` : "Criado com IA"} - {draft.moduleCount} modulos - {draft.stepCount} etapas - {formatDraftDate(draft.createdAt)}</p></div>
      <button type="button" disabled={pending} onClick={() => onOpen(draft.generationId)} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Abrir</button>
      <button type="button" disabled={pending} onClick={() => { if (window.confirm("Descartar este rascunho?")) onDelete(draft.generationId); }} title="Descartar rascunho" className="flex size-8 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"><Trash2 className="size-4" /></button>
    </article>)}</div>}
  </div>;
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
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><span className="inline-flex rounded bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-amber-300">Trilha ativa</span><p className="mt-2 truncate font-semibold text-white">{roadmap.title}</p>{roadmap.description && <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">{roadmap.description}</p>}<p className="mt-3 text-xs text-white/55">Proxima etapa: <b className="text-white/85">{nextStudyItem(items)?.title ?? "Roadmap concluido"}</b></p></div><div className="text-right"><strong className="text-3xl font-semibold tabular-nums text-white">{progress}%</strong><p className="mt-1 text-[10px] uppercase text-white/30">concluido</p></div></div>
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
  const instructionTitle = item.itemKind === "challenge" ? "Como fazer o desafio" : item.itemKind === "project" ? "Plano de execucao" : "Passo a passo";
  const outcomeTitle = item.itemKind === "challenge" || item.itemKind === "project" ? "Resultado final" : "Concluido quando";
  const toggleComplete = () => startTransition(async () => {
    await atualizarStatusEstudoLifeOS(item.id, item.status === "completed" ? "pending" : "completed");
    router.refresh();
    onRefresh();
  });

  return <section className="rounded-lg border border-white/10 bg-[#151a20]">
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
      {item.instructions && <div className="mt-4"><p className="text-xs font-semibold uppercase text-white/35">{instructionTitle}</p><InstructionChecklist value={item.instructions} /></div>}
      {item.resourceUrl && <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-red-200"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.resourceTitle ?? "Abrir videoaula"}</span>{item.resourceChannel && <span className="mt-0.5 block text-xs text-red-300/70">{item.resourceChannel}</span>}</span><ExternalLink className="size-4 shrink-0" /></a>}
      {item.completionCriteria && <div className="mt-4 border-l-2 border-emerald-500 pl-3"><p className="text-xs font-semibold uppercase text-emerald-300">{outcomeTitle}</p><p className="mt-1 text-sm leading-6 text-emerald-100/80">{item.completionCriteria}</p></div>}
      {hasAssessment && <AssessmentPanel itemId={item.id} itemKind={item.itemKind ?? "general"} questions={questions} onRefresh={() => { router.refresh(); onRefresh(); }} />}
    </div>}
  </section>;
}

function InstructionChecklist({ value }: { value: string }) {
  const lines = value
    .split(/\n+|;\s+/)
    .map((line) => line.trim().replace(/^#{1,6}\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/^\[[ xX]\]\s*/, ""))
    .filter(Boolean);
  if (lines.length <= 1) return <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/70">{value}</p>;
  return <ol className="mt-3 space-y-3">{lines.map((line, index) => <li key={`${index}-${line}`} className="flex gap-3 text-sm leading-6 text-white/70"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-300 ring-1 ring-blue-400/20">{index + 1}</span><span>{line}</span></li>)}</ol>;
}

type AssessmentAnswer = number | number[];
type AssessmentResult = Awaited<ReturnType<typeof enviarAvaliacaoEstudoLifeOS>>;
type AssessmentFeedback = NonNullable<AssessmentResult["feedback"]>[number];

function initialAssessmentAnswers(questions: StudyAssessmentQuestion[]): Record<string, AssessmentAnswer> {
  return Object.fromEntries(questions.filter((question) => question.questionType === "ordering").map((question) => [question.id, question.options.map((_, index) => index)]));
}

function AssessmentPanel({ itemId, itemKind, questions, onRefresh }: { itemId: string; itemKind: StudyItemKind; questions: StudyAssessmentQuestion[]; onRefresh: () => void }) {
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>(() => initialAssessmentAnswers(questions));
  const [result, setResult] = useState<Awaited<ReturnType<typeof enviarAvaliacaoEstudoLifeOS>> | null>(null);
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

  return <div className="mt-5 border-t border-gray-100 pt-4">
    <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-gray-900">{panelTitle}</p><p className="mt-1 text-xs text-gray-400">Responda tudo e envie para receber a correcao.</p></div>{result?.score != null && <span className={`rounded-md px-2 py-1 text-sm font-bold ${result.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{result.score}%</span>}</div>
    <div className="mt-4 space-y-5">{questions.map((question, questionIndex) => {
      const feedback = feedbackByQuestion.get(question.id);
      if (question.questionType === "ordering") {
        const order = Array.isArray(answers[question.id]) ? answers[question.id] as number[] : question.options.map((_, index) => index);
        return <OrderingQuestion key={question.id} question={question} questionIndex={questionIndex} order={order} feedback={feedback} disabled={Boolean(result)} onMove={(position, direction) => moveOption(question, position, direction)} />;
      }
      return <fieldset key={question.id}><legend className="text-sm font-medium text-gray-800">{questionIndex + 1}. {question.prompt}</legend><div className="mt-2 space-y-2">{question.options.map((option, optionIndex) => {
        const selected = answers[question.id] === optionIndex;
        const isCorrectAnswer = feedback?.correctOptionIndex === optionIndex;
        const isWrongSelection = Boolean(feedback && selected && !feedback.correct);
        return <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${isCorrectAnswer ? "border-emerald-300 bg-emerald-50 text-emerald-800" : isWrongSelection ? "border-red-300 bg-red-50 text-red-700" : selected ? "border-blue-400 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-600"}`}><input type="radio" name={`question-${question.id}`} checked={selected} disabled={Boolean(result)} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} className="mt-0.5 accent-blue-600" />{option}</label>;
      })}</div>{feedback && <p className={`mt-2 text-xs leading-5 ${feedback.correct ? "text-emerald-700" : "text-red-600"}`}>{feedback.correct ? "Resposta correta. " : "Resposta incorreta. "}{feedback.explanation}</p>}</fieldset>;
    })}</div>
    {result?.error && <p className="mt-3 text-sm text-red-600">{result.error}</p>}
    <div className="mt-5 flex justify-end">{result ? <button type="button" onClick={() => { setAnswers(initialAssessmentAnswers(questions)); setResult(null); }} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600">Tentar novamente</button> : <button type="button" disabled={pending || !complete} onClick={() => startTransition(async () => { const response = await enviarAvaliacaoEstudoLifeOS(itemId, answers); setResult(response); if (response.ok) onRefresh(); })} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Corrigindo..." : "Enviar respostas"}</button>}</div>
  </div>;
}

function OrderingQuestion({ question, questionIndex, order, feedback, disabled, onMove }: { question: StudyAssessmentQuestion; questionIndex: number; order: number[]; feedback?: AssessmentFeedback; disabled: boolean; onMove: (position: number, direction: -1 | 1) => void }) {
  const correctSequence = feedback?.correctOrder.map((optionIndex) => question.options[optionIndex]).filter(Boolean) ?? [];
  return <fieldset>
    <legend className="text-sm font-medium text-gray-800">{questionIndex + 1}. {question.prompt}</legend>
    <p className="mt-1 text-xs text-gray-400">Organize os itens na sequencia correta.</p>
    <ol className={`mt-2 divide-y overflow-hidden rounded-lg border ${feedback ? feedback.correct ? "border-emerald-300" : "border-red-300" : "border-gray-200"}`}>
      {order.map((optionIndex, position) => <li key={`${question.id}-${optionIndex}`} className="flex min-h-11 items-center gap-2 bg-white px-2.5 py-2 text-sm text-gray-700">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">{position + 1}</span>
        <span className="min-w-0 flex-1">{question.options[optionIndex]}</span>
        <button type="button" disabled={disabled || position === 0} onClick={() => onMove(position, -1)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-20" title="Mover para cima" aria-label={`Mover ${question.options[optionIndex]} para cima`}><ArrowUp className="size-3.5" /></button>
        <button type="button" disabled={disabled || position === order.length - 1} onClick={() => onMove(position, 1)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-20" title="Mover para baixo" aria-label={`Mover ${question.options[optionIndex]} para baixo`}><ArrowDown className="size-3.5" /></button>
      </li>)}
    </ol>
    {feedback && <div className={`mt-2 text-xs leading-5 ${feedback.correct ? "text-emerald-700" : "text-red-600"}`}><p>{feedback.correct ? "Ordem correta. " : "Ordem incorreta. "}{feedback.explanation}</p>{!feedback.correct && correctSequence.length > 0 && <p className="mt-1 font-medium">Sequencia correta: {correctSequence.join(" -> ")}</p>}</div>}
  </fieldset>;
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
