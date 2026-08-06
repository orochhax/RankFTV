"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  Check,
  CircleHelp,
  ExternalLink,
  FileCheck2,
  FolderKanban,
  Gauge,
  Loader2,
  PlayCircle,
  Sparkles,
  Swords,
  Wrench,
} from "lucide-react";
import { confirmarRoadmapGeradoLifeOS, gerarRoadmapComIALifeOS } from "@/app/admin/performance/life-os-actions";
import { formatDateBR } from "@/lib/format";
import { roadmapSetupStatus, type RoadmapAiAnswers, type RoadmapDraftDetail, type RoadmapGenerationPlan } from "@/lib/study-roadmap-ai";

const inputClass = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";
const weekdays = [
  ["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sab"], ["0", "Dom"],
] as const;

const learningFormats = [
  { value: "reading", label: "Leituras", detail: "Textos com objetivo e anotacoes", icon: BookOpen },
  { value: "video", label: "Videoaulas", detail: "Links gratuitos e diretos do YouTube", icon: PlayCircle },
  { value: "practice", label: "Atividades", detail: "Questoes de marcar e ordenar etapas", icon: Wrench },
  { value: "quiz", label: "Provas", detail: "Perguntas corrigidas pelo sistema", icon: CircleHelp },
  { value: "challenge", label: "Desafios", detail: "Problemas guiados com requisitos e entrega", icon: Swords },
  { value: "project", label: "Projetos", detail: "Entregas completas que integram habilidades", icon: FolderKanban },
] as const;

const materialOptions = [
  ["free", "Somente materiais gratuitos"],
  ["official", "Fontes oficiais"],
  ["documentation", "Documentacao tecnica"],
  ["course", "Curso estruturado"],
  ["book", "Livro ou apostila"],
  ["own_material", "Material que ja possuo"],
] as const;

const outcomeOptions = [
  ["knowledge", "Dominar os conceitos"],
  ["portfolio", "Criar item de portfolio"],
  ["real_project", "Concluir um projeto real"],
  ["exam_ready", "Ficar pronto para uma prova"],
  ["job_ready", "Ficar pronto para atuar"],
  ["teach", "Conseguir ensinar o assunto"],
] as const;

const itemLabels: Record<string, string> = {
  reading: "Leitura",
  video: "Videoaula",
  practice: "Atividade",
  quiz: "Prova",
  challenge: "Desafio",
  project: "Projeto",
  checkpoint: "Checagem",
};

type PreviewState = { generationId: string; plan: RoadmapGenerationPlan };
type ListField = "availableDays" | "learningFormats" | "requiredMaterials" | "finalOutcomes";

type FormState = {
  subject: string;
  goal: string;
  goalDetail: string;
  currentLevel: string;
  useContext: string;
  targetLevel: string;
  mainObstacle: string;
  startDate: string;
  timelineMode: "duration" | "deadline";
  deadline: string;
  durationWeeks: number;
  availableDays: string[];
  minutesPerDay: number;
  learningFormats: string[];
  contentDepth: string;
  pace: string;
  requiredMaterials: string[];
  finalOutcomes: string[];
  assessmentPreference: string;
  projectMode: string;
  knownTopics: string;
  contextNotes: string;
};

function initialFormState(today: string, answers?: RoadmapAiAnswers | null): FormState {
  if (answers) return {
    ...answers,
    availableDays: [...answers.availableDays],
    learningFormats: [...answers.learningFormats],
    requiredMaterials: [...answers.requiredMaterials],
    finalOutcomes: [...answers.finalOutcomes],
  };
  return {
    subject: "",
    goal: "career",
    goalDetail: "",
    currentLevel: "unknown",
    useContext: "new_career",
    targetLevel: "autonomous",
    mainObstacle: "direction",
    startDate: today,
    timelineMode: "duration",
    deadline: "",
    durationWeeks: 12,
    availableDays: ["1", "2", "3", "4", "5"],
    minutesPerDay: 60,
    learningFormats: ["reading", "video", "practice", "quiz"],
    contentDepth: "balanced",
    pace: "steady",
    requiredMaterials: ["free", "official"],
    finalOutcomes: ["real_project"],
    assessmentPreference: "mixed",
    projectMode: "guided",
    knownTopics: "",
    contextNotes: "",
  };
}

export function RoadmapAiWizard({
  today,
  onDone,
  onClose,
  initialDraft,
  onDraftSaved,
}: {
  today: string;
  onDone: () => void;
  onClose: () => void;
  initialDraft?: RoadmapDraftDetail | null;
  onDraftSaved?: () => void;
}) {
  const [draft, setDraft] = useState<FormState>(() => initialFormState(today, initialDraft?.answers));
  const [preview, setPreview] = useState<PreviewState | null>(() => initialDraft ? { generationId: initialDraft.generationId, plan: initialDraft.plan } : null);
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<"generate" | "confirm" | null>(null);
  const [pending, startTransition] = useTransition();
  const setup = useMemo(() => roadmapSetupStatus(draft), [draft]);
  const canGenerate = draft.subject.trim().length >= 3
    && draft.goalDetail.trim().length >= 10
    && draft.availableDays.length > 0
    && draft.learningFormats.length > 0
    && draft.requiredMaterials.length > 0
    && draft.finalOutcomes.length > 0
    && (draft.timelineMode === "duration" || Boolean(draft.deadline));
  const canAdjust = !initialDraft || initialDraft.origin === "ai" && Boolean(initialDraft.answers);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleList = (field: ListField, value: string) => setDraft((current) => {
    const values = current[field];
    return { ...current, [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
  });

  if (preview && !editingAnswers) {
    return <RoadmapPreview
      preview={preview.plan}
      pending={pending && operation === "confirm"}
      error={error}
      backLabel={canAdjust ? "Ajustar respostas" : "Fechar"}
      onBack={() => {
        setError(null);
        if (canAdjust) setEditingAnswers(true);
        else onClose();
      }}
      onConfirm={() => {
        setError(null);
        setOperation("confirm");
        startTransition(async () => {
          const result = await confirmarRoadmapGeradoLifeOS(preview.generationId);
          if (!result.ok) setError(result.error ?? "Nao foi possivel ativar o roadmap.");
          else onDone();
          setOperation(null);
        });
      }}
    />;
  }

  return <form onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setOperation("generate");
    startTransition(async () => {
      const result = await gerarRoadmapComIALifeOS(data);
      if (!result.ok || !result.generationId || !result.preview) setError(result.error ?? "Nao foi possivel gerar o roadmap.");
      else {
        setPreview({ generationId: result.generationId, plan: result.preview });
        setEditingAnswers(false);
        onDraftSaved?.();
      }
      setOperation(null);
    });
  }} className="space-y-6">
    {preview && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"><div className="flex items-center gap-2"><FileCheck2 className="size-4" /><div><p className="text-sm font-semibold">A versao anterior esta salva</p><p className="text-xs text-emerald-700/70">Gerar novamente criara outro rascunho sem apagar este.</p></div></div><button type="button" onClick={() => setEditingAnswers(false)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Ver versao salva</button></section>}
    <RoadmapStatus status={setup} formatCount={draft.learningFormats.length} />

    <fieldset className="space-y-4">
      <legend className="font-semibold text-gray-900">1. Objetivo real</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">O que voce quer aprender?
          <input name="subject" required maxLength={300} value={draft.subject} onChange={(event) => setField("subject", event.target.value)} placeholder="Ex.: Power BI para analise comercial" className={inputClass} />
        </label>
        <SelectField name="goal" label="Objetivo principal" value={draft.goal} onChange={(value) => setField("goal", value)} options={[
          ["career", "Carreira ou emprego"], ["exam", "Prova ou certificacao"], ["project", "Construir um projeto"], ["academic", "Formacao academica"], ["personal", "Conhecimento pessoal"],
        ]} />
        <SelectField name="use_context" label="Onde vai usar" value={draft.useContext} onChange={(value) => setField("useContext", value)} options={[
          ["current_job", "No trabalho atual"], ["new_career", "Em uma nova carreira"], ["freelance", "Em trabalhos freelance"], ["exam", "Em prova ou certificacao"], ["academic", "Na faculdade ou escola"], ["personal_project", "Em projeto pessoal"],
        ]} />
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">O que voce precisa conseguir fazer no final?
          <textarea name="goal_detail" required rows={3} minLength={10} maxLength={1500} value={draft.goalDetail} onChange={(event) => setField("goalDetail", event.target.value)} placeholder="Ex.: conectar dados de vendas, criar medidas DAX e publicar um dashboard que ajude a decidir quais produtos priorizar" className={inputClass} />
        </label>
      </div>
    </fieldset>

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">2. Ponto de partida</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField name="current_level" label="Nivel atual" value={draft.currentLevel} onChange={(value) => setField("currentLevel", value)} options={[
          ["unknown", "Nao sei meu nivel"], ["beginner", "Nunca estudei"], ["basic", "Conheco o basico"], ["intermediate", "Ja pratico"], ["advanced", "Tenho experiencia"],
        ]} />
        <SelectField name="target_level" label="Nivel desejado" value={draft.targetLevel} onChange={(value) => setField("targetLevel", value)} options={[
          ["foundation", "Entender fundamentos"], ["functional", "Usar com orientacao"], ["autonomous", "Trabalhar com autonomia"], ["professional", "Atuar profissionalmente"],
        ]} />
        <SelectField name="main_obstacle" label="Maior dificuldade" value={draft.mainObstacle} onChange={(value) => setField("mainObstacle", value)} options={[
          ["direction", "Nao sei por onde seguir"], ["time", "Tenho pouco tempo"], ["consistency", "Perco a constancia"], ["theory", "Fico preso na teoria"], ["practice", "Falta pratica"], ["none", "Nenhuma especifica"],
        ]} />
        <SelectField name="content_depth" label="Profundidade" value={draft.contentDepth} onChange={(value) => setField("contentDepth", value)} options={[
          ["essential", "Somente o essencial"], ["balanced", "Equilibrada"], ["deep", "Aprofundada"],
        ]} />
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">O que voce ja conhece? <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="known_topics" rows={2} maxLength={2000} value={draft.knownTopics} onChange={(event) => setField("knownTopics", event.target.value)} placeholder="Ex.: Excel, tabelas dinamicas e conceitos basicos de banco de dados" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Contexto que a IA precisa respeitar <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="context_notes" rows={2} maxLength={2000} value={draft.contextNotes} onChange={(event) => setField("contextNotes", event.target.value)} placeholder="Ex.: trabalho com uma planilha de vendas de uma loja de roupas" className={inputClass} />
        </label>
      </div>
    </fieldset>

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">3. Tempo disponivel</legend>
      <input type="hidden" name="timeline_mode" value={draft.timelineMode} />
      {draft.timelineMode === "deadline" && <input type="hidden" name="duration_weeks" value={draft.durationWeeks} />}
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        <button type="button" onClick={() => setField("timelineMode", "duration")} className={`rounded-md px-3 py-2 text-xs font-semibold ${draft.timelineMode === "duration" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Por duracao</button>
        <button type="button" onClick={() => setField("timelineMode", "deadline")} className={`rounded-md px-3 py-2 text-xs font-semibold ${draft.timelineMode === "deadline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>Ate uma data</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-gray-500">Inicio
          <input name="start_date" type="date" required value={draft.startDate} onChange={(event) => setField("startDate", event.target.value)} className={inputClass} />
        </label>
        {draft.timelineMode === "duration" ? <label className="text-xs font-medium text-gray-500">Duracao estimada
          <select name="duration_weeks" value={draft.durationWeeks} onChange={(event) => setField("durationWeeks", Number(event.target.value))} className={inputClass}>
            <option value="4">4 semanas</option><option value="8">8 semanas</option><option value="12">12 semanas</option><option value="16">16 semanas</option><option value="24">24 semanas</option><option value="36">36 semanas</option><option value="52">52 semanas</option>
          </select>
        </label> : <label className="text-xs font-medium text-gray-500">Data final
          <input name="deadline" type="date" required min={draft.startDate || today} value={draft.deadline} onChange={(event) => setField("deadline", event.target.value)} className={inputClass} />
        </label>}
        <label className="text-xs font-medium text-gray-500">Tempo por sessao
          <select name="minutes_per_day" value={draft.minutesPerDay} onChange={(event) => setField("minutesPerDay", Number(event.target.value))} className={inputClass}>
            <option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option><option value="180">3 horas</option>
          </select>
        </label>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">Dias que normalmente consegue estudar</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${draft.availableDays.includes(value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}><input type="checkbox" name="available_days" value={value} checked={draft.availableDays.includes(value)} onChange={() => toggleList("availableDays", value)} className="sr-only" />{label}</label>)}</div>
        <p className="mt-2 text-[11px] text-gray-400">Esses dias calculam a carga do plano. Os modulos nao ficarao presos a datas.</p>
      </div>
    </fieldset>

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">4. O que deve existir no roadmap</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{learningFormats.map(({ value, label, detail, icon: Icon }) => {
        const selected = draft.learningFormats.includes(value);
        return <label key={value} className={`cursor-pointer rounded-lg border p-3 ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}><input type="checkbox" name="learning_formats" value={value} checked={selected} onChange={() => toggleList("learningFormats", value)} className="sr-only" /><span className="flex items-start gap-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}><Icon className="size-4" /></span><span><b className="block text-sm text-gray-800">{label}</b><span className="mt-1 block text-xs leading-5 text-gray-400">{detail}</span></span></span></label>;
      })}</div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="pace" label="Ritmo" value={draft.pace} onChange={(value) => setField("pace", value)} options={[
          ["light", "Leve e sustentavel"], ["steady", "Constante"], ["intensive", "Intensivo"],
        ]} />
        <SelectField name="assessment_preference" label="Como avaliar" value={draft.assessmentPreference} onChange={(value) => setField("assessmentPreference", value)} options={[
          ["none", "Sem provas"], ["quick_quizzes", "Quizzes rapidos"], ["module_exams", "Prova por modulo"], ["practical", "Somente avaliacao pratica"], ["mixed", "Provas e pratica"],
        ]} />
        <SelectField name="project_mode" label="Projetos" value={draft.projectMode} onChange={(value) => setField("projectMode", value)} options={[
          ["none", "Sem projeto"], ["guided", "Um projeto guiado"], ["per_module", "Projeto por modulo"], ["capstone", "Projeto final completo"],
        ]} />
      </div>
    </fieldset>

    <fieldset className="grid gap-5 border-t border-gray-100 pt-5 lg:grid-cols-2">
      <MultiChoiceGroup title="5. Fontes permitidas" name="required_materials" values={draft.requiredMaterials} options={materialOptions} onToggle={(value) => toggleList("requiredMaterials", value)} />
      <MultiChoiceGroup title="6. Resultado final" name="final_outcomes" values={draft.finalOutcomes} options={outcomeOptions} onToggle={(value) => toggleList("finalOutcomes", value)} />
    </fieldset>

    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
      <p className="text-[11px] text-gray-400">A geracao usa a API da OpenAI. A busca de videos pode ter custo adicional.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">Cancelar</button>
        <button disabled={pending || !canGenerate} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending && operation === "generate" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{pending && operation === "generate" ? "Montando curriculo..." : "Gerar e salvar rascunho"}</button>
      </div>
    </div>
  </form>;
}

function RoadmapStatus({ status, formatCount }: { status: ReturnType<typeof roadmapSetupStatus>; formatCount: number }) {
  return <section className="rounded-lg bg-gray-900 p-4 text-white">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Gauge className="size-5 text-blue-400" /><div><p className="text-sm font-semibold">Status do planejamento</p><p className="text-xs text-white/45">{formatCount} formatos selecionados</p></div></div>
      <div className="text-right"><p className="text-sm font-semibold text-blue-300">{status.qualityLabel}</p><p className="text-xs text-white/45">Carga {status.workloadLabel.toLowerCase()}</p></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <StatusBar label="Definicao do plano" value={status.completeness} color="bg-blue-500" />
      <StatusBar label="Nivel de exigencia" value={status.workload} color="bg-amber-400" />
    </div>
    <p className="mt-3 text-[11px] leading-5 text-white/40">Mais formatos, provas e projetos aumentam a carga. A qualidade cresce principalmente quando o objetivo final fica especifico.</p>
  </section>;
}

function StatusBar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className="flex justify-between text-xs"><span className="text-white/55">{label}</span><b>{value}%</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} /></div></div>;
}

function RoadmapPreview({ preview, pending, error, backLabel, onBack, onConfirm }: { preview: RoadmapGenerationPlan; pending: boolean; error: string | null; backLabel: string; onBack: () => void; onConfirm: () => void }) {
  const totals = useMemo(() => {
    const steps = preview.modules.flatMap((module) => module.steps);
    return { steps: steps.length, hours: Math.round((preview.totalEstimatedMinutes / 60) * 10) / 10 };
  }, [preview]);

  return <div className="space-y-5">
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><FileCheck2 className="size-4" />Este resultado ja esta salvo em Rascunhos.</div>
    <div><h3 className="text-xl font-bold">{preview.title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{preview.description}</p></div>
    <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 rounded-lg border border-gray-200 sm:grid-cols-4 sm:divide-y-0">
      <Metric value={preview.modules.length} label="modulos" />
      <Metric value={totals.steps} label="passos" />
      <Metric value={`${totals.hours}h`} label="estimadas" />
      <Metric value={`${preview.workloadScore}%`} label="exigencia" />
    </div>
    <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs font-semibold uppercase text-amber-700">Diagnostico e cadencia</p><p className="mt-1 text-sm leading-6 text-amber-900">{preview.diagnosis}</p><p className="mt-2 text-xs leading-5 text-amber-800">{preview.recommendedCadence}</p></div>
    <div className="flex items-center justify-between text-xs text-gray-400"><span>{formatDateBR(preview.startDate)}</span><span>janela estimada</span><span>{formatDateBR(preview.targetDate)}</span></div>
    <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">{preview.modules.map((module, moduleIndex) => <details key={`${module.title}-${moduleIndex}`} open={moduleIndex === 0} className="rounded-lg border border-gray-200"><summary className="cursor-pointer px-3 py-3"><span className="font-semibold">Modulo {moduleIndex + 1}: {module.title}</span><span className="ml-2 text-xs text-gray-400">{module.steps.length} passos</span><p className="mt-1 text-xs font-normal leading-5 text-gray-500">{module.objective}</p></summary><div className="border-t border-gray-100 px-3">{module.steps.map((step, stepIndex) => <div key={`${step.title}-${stepIndex}`} className="flex gap-3 border-b border-gray-100 py-3 last:border-0"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">{stepIndex + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-gray-800">{step.title}</p><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{itemLabels[step.type] ?? step.type}</span></div><p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p><p className="mt-1 text-[11px] text-gray-400">{step.estimatedMinutes} min{step.questions.length ? ` - ${step.questions.length} perguntas` : ""}{step.questions.some((question) => question.questionType === "ordering") ? " - inclui ordenacao" : ""}</p>{(step.requirements || step.workspace) && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-gray-500">Ver preparacao e entrega</summary><div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 text-gray-600">{step.requirements && <p><b>Precisa:</b> {step.requirements}</p>}{step.workspace && <p><b>Onde:</b> {step.workspace}</p>}<p><b>Resultado:</b> {step.completionCriteria}</p></div></details>}{step.resourceUrl && <a href={step.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">{step.resourceTitle}<ExternalLink className="size-3" /></a>}</div></div>)}</div></details>)}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onBack} disabled={pending} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">{backLabel}</button><button type="button" onClick={onConfirm} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Salvando..." : "Salvar roadmap"}</button></div>
  </div>;
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div className="p-3 text-center"><b>{value}</b><p className="text-[11px] text-gray-400">{label}</p></div>;
}

function MultiChoiceGroup({ title, name, values, options, onToggle }: { title: string; name: string; values: string[]; options: ReadonlyArray<readonly [string, string]>; onToggle: (value: string) => void }) {
  return <fieldset><legend className="font-semibold text-gray-900">{title}</legend><div className="mt-3 space-y-2">{options.map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"><input type="checkbox" name={name} value={value} checked={values.includes(value)} onChange={() => onToggle(value)} className="size-4 rounded accent-blue-600" />{label}</label>)}</div></fieldset>;
}

function SelectField({ name, label, value, options, onChange }: { name: string; label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void }) {
  return <label className="text-xs font-medium text-gray-500">{label}<select name={name} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
