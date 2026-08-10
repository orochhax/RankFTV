"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  CalendarClock,
  Check,
  CircleCheckBig,
  ExternalLink,
  FileCheck2,
  Film,
  Gauge,
  Globe,
  Headphones,
  Languages,
  Loader2,
  MessageCircle,
  Mic,
  Music,
  PenLine,
  PlayCircle,
  Repeat2,
  Sparkles,
  Swords,
  TextCursorInput,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { confirmarRoadmapGeradoLifeOS, gerarRoadmapComIALifeOS } from "@/app/admin/performance/life-os-actions";
import { formatDateBR } from "@/lib/format";
import { roadmapLanguageFormats, roadmapSetupStatus, roadmapTimeFeasibility, studyClockToMinutes, studyMinutesToClock, type RoadmapAiAnswers, type RoadmapDraftDetail, type RoadmapGenerationPlan } from "@/lib/study-roadmap-ai";

const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";
const darkContentClass = "text-white [&_.border-gray-100]:!border-white/10 [&_.border-gray-200]:!border-white/10 [&_.border-gray-300]:!border-white/15 [&_.border-emerald-200]:!border-emerald-400/25 [&_.bg-white]:!bg-[#15191f] [&_.bg-gray-100]:!bg-white/10 [&_.bg-blue-50]:!bg-blue-400/10 [&_.bg-emerald-50]:!bg-emerald-400/10 [&_.bg-amber-50]:!bg-amber-400/10 [&_.bg-red-50]:!bg-red-400/10 [&_.text-gray-300]:!text-white/25 [&_.text-gray-400]:!text-white/35 [&_.text-gray-500]:!text-white/45 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70 [&_.text-gray-800]:!text-white/85 [&_.text-gray-900]:!text-white [&_.text-blue-700]:!text-blue-300 [&_.text-emerald-700]:!text-emerald-300 [&_.text-emerald-800]:!text-emerald-200 [&_.text-amber-700]:!text-amber-300 [&_.text-amber-800]:!text-amber-200 [&_.text-amber-900]:!text-amber-100 [&_.text-red-600]:!text-red-300";
const weekdays = [
  ["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sab"], ["0", "Dom"],
] as const;

const deviceOptions = [
  ["windows", "Computador Windows"],
  ["mac", "Mac"],
  ["linux", "Computador Linux"],
  ["chromebook", "Chromebook"],
  ["mobile", "Celular ou tablet"],
] as const;

const learningFormats = [
  { value: "reading", label: "Leituras", detail: "Textos com objetivo e anotacoes", icon: BookOpen },
  { value: "video", label: "Videoaulas", detail: "Links gratuitos e diretos do YouTube", icon: PlayCircle },
  { value: "practice", label: "Exercicios e atividades", detail: "Questoes, ordenacao e pratica guiada", icon: Wrench },
  { value: "challenge", label: "Desafios", detail: "Problemas guiados com requisitos e entrega", icon: Swords },
] as const;

const languageActivities = [
  { value: "guided_writing", label: "Escrita guiada", detail: "Textos, revisao e reescrita com objetivo real", icon: PenLine },
  { value: "conversation", label: "Conversacao", detail: "Dialogos, simulacoes e gravacoes", icon: MessageCircle },
  { value: "video", label: "Videos", detail: "Escuta ativa com conteudo gratuito", icon: PlayCircle },
  { value: "film_series", label: "Filmes e series", detail: "Cenas, contexto e linguagem natural", icon: Film },
  { value: "music", label: "Musicas", detail: "Escuta, pronuncia e expressoes", icon: Music },
  { value: "sentence_completion", label: "Completar frases", detail: "Lacunas contextualizadas e corrigidas", icon: TextCursorInput },
  { value: "shadowing", label: "Shadowing", detail: "Imitacao de ritmo, som e entonacao", icon: Mic },
  { value: "dictation", label: "Ditado", detail: "Transcricao e analise dos erros de escuta", icon: Headphones },
  { value: "graded_reading", label: "Leitura graduada", detail: "Textos adequados ao seu nivel", icon: BookOpen },
  { value: "spaced_repetition", label: "Revisao espacada", detail: "Recuperacao ativa sem decorar listas", icon: Repeat2 },
  { value: "real_life_tasks", label: "Tarefas reais", detail: "Entrevistas, viagens, reunioes e imersao", icon: Globe },
] as const;

const languageSkillOptions = [
  ["speaking", "Fala"], ["listening", "Compreensao auditiva"], ["reading", "Leitura"], ["writing", "Escrita"], ["pronunciation", "Pronuncia"], ["grammar", "Gramatica em contexto"], ["vocabulary", "Vocabulario ativo"],
] as const;

const languagePracticeOptions = [
  ["solo", "Consigo praticar sozinho e gravar minha voz"], ["ai", "Posso conversar com uma IA"], ["partner", "Tenho parceiro de conversa"], ["tutor", "Tenho professor ou tutor"], ["community", "Participo de grupo ou comunidade"],
] as const;

const languageContextOptions = [
  ["meetings", "Reunioes e videochamadas"],
  ["job_interviews", "Entrevistas de emprego"],
  ["presentations", "Apresentacoes"],
  ["messages", "E-mails e mensagens"],
  ["customer_service", "Atendimento, vendas ou negociacao"],
  ["travel_services", "Aeroportos, hoteis e restaurantes"],
  ["casual_conversation", "Conversas informais"],
  ["academic", "Aulas e ambiente academico"],
  ["proficiency_exam", "Provas de proficiencia"],
  ["media", "Filmes, videos, podcasts e musica"],
] as const;

const materialOptions = [
  ["official", "Fontes oficiais"],
  ["documentation", "Documentacao tecnica"],
  ["course", "Cursos completos"],
  ["book", "Livro ou apostila"],
  ["own_material", "Materiais que ja possuo"],
] as const;

const languageMaterialOptions = [
  ["official", "Dicionarios e fontes reconhecidas"],
  ["documentation", "Gramaticas e guias de referencia"],
  ["course", "Cursos completos"],
  ["book", "Livro ou leitura graduada"],
  ["own_material", "Filmes, musicas ou materiais que ja possuo"],
] as const;

const itemLabels: Record<string, string> = {
  reading: "Leitura",
  video: "Videoaula",
  audiovisual: "Atividade audiovisual",
  practice: "Atividade",
  quiz: "Prova",
  challenge: "Desafio",
  project: "Projeto",
  checkpoint: "Checagem",
};

type PreviewState = { generationId: string; plan: RoadmapGenerationPlan };
type ListField = "availableDevices" | "availableDays" | "learningFormats" | "requiredMaterials" | "languageSkills" | "languageActivities" | "languagePracticeAccess" | "languageContexts";

type FormState = {
  roadmapType: "skill" | "language";
  subject: string;
  goal: string;
  goalDetail: string;
  currentLevel: string;
  digitalLiteracy: string;
  availableDevices: string[];
  useContext: string;
  targetLevel: string;
  mainObstacle: string;
  startDate: string;
  timelineMode: "duration" | "deadline";
  deadline: string;
  durationMonths: number;
  availableDays: string[];
  minutesPerDay: number;
  learningFormats: string[];
  contentDepth: string;
  pace: string;
  requiredMaterials: string[];
  materialBudget: string;
  ownedMaterials: string;
  finalOutcomes: string[];
  assessmentPreference: string;
  projectMode: string;
  knownTopics: string;
  contextNotes: string;
  nativeLanguage: string;
  targetLanguage: string;
  languageVariant: string;
  languageCurrentLevel: string;
  languageTargetLevel: string;
  languagePurpose: string;
  languageSkills: string[];
  languageActivities: string[];
  languageExposure: string;
  languageObstacle: string;
  languagePracticeAccess: string[];
  languageContexts: string[];
  languageSituations: string;
  languageInterests: string;
};

function monthsFromWeeks(weeks: number): number {
  return Math.max(1, Math.min(12, Math.round(weeks / (52 / 12))));
}

function weeksFromMonths(months: number): number {
  return Math.max(1, Math.min(52, Math.round(months * (52 / 12))));
}

function initialFormState(today: string, answers?: RoadmapAiAnswers | null): FormState {
  if (answers) {
    const storedAnswers = answers as RoadmapAiAnswers & { availableDevices?: string[]; mainDevice?: string };
    const storedDevices = storedAnswers.availableDevices?.length
      ? storedAnswers.availableDevices
      : storedAnswers.mainDevice
        ? [storedAnswers.mainDevice]
        : [];
    const availableDevices = [...new Set(storedDevices.filter((device) => deviceOptions.some(([value]) => value === device)))];
    const preferredMaterials = answers.requiredMaterials.filter((material) => material !== "free");
    const visibleFormats = answers.learningFormats.filter((format) => !["quiz", "project"].includes(format));
    return {
      ...answers,
      availableDevices,
      durationMonths: answers.durationMonths ?? monthsFromWeeks(answers.durationWeeks),
      availableDays: [...answers.availableDays],
      learningFormats: visibleFormats.length ? visibleFormats : ["practice"],
      requiredMaterials: preferredMaterials.length ? preferredMaterials : ["official"],
      materialBudget: answers.requiredMaterials.includes("free") ? "free_only" : answers.materialBudget ?? "free_only",
      ownedMaterials: answers.ownedMaterials ?? "",
      finalOutcomes: [],
      languageSkills: [...answers.languageSkills],
      languageActivities: [...answers.languageActivities],
      languagePracticeAccess: [...answers.languagePracticeAccess],
      languageContexts: [...answers.languageContexts],
    };
  }
  return {
    roadmapType: "skill",
    subject: "",
    goal: "career",
    goalDetail: "",
    currentLevel: "unknown",
    digitalLiteracy: "needs_guidance",
    availableDevices: [],
    useContext: "new_career",
    targetLevel: "autonomous",
    mainObstacle: "direction",
    startDate: today,
    timelineMode: "duration",
    deadline: "",
    durationMonths: 3,
    availableDays: ["1", "2", "3", "4", "5"],
    minutesPerDay: 60,
    learningFormats: ["reading", "video", "practice"],
    contentDepth: "balanced",
    pace: "steady",
    requiredMaterials: ["official"],
    materialBudget: "free_only",
    ownedMaterials: "",
    finalOutcomes: [],
    assessmentPreference: "mixed",
    projectMode: "guided",
    knownTopics: "",
    contextNotes: "",
    nativeLanguage: "Portugues (Brasil)",
    targetLanguage: "",
    languageVariant: "",
    languageCurrentLevel: "unknown",
    languageTargetLevel: "b1",
    languagePurpose: "conversation",
    languageSkills: ["speaking", "listening", "vocabulary"],
    languageActivities: ["conversation", "video", "guided_writing", "sentence_completion", "spaced_repetition"],
    languageExposure: "none",
    languageObstacle: "consistency",
    languagePracticeAccess: ["solo", "ai"],
    languageContexts: [],
    languageSituations: "",
    languageInterests: "",
  };
}

export function RoadmapAiWizard({
  today,
  onDone,
  onClose,
  initialDraft,
  onGenerationStarted,
}: {
  today: string;
  onDone: () => void;
  onClose: () => void;
  initialDraft?: RoadmapDraftDetail | null;
  onGenerationStarted?: (generation: { generationId: string; title: string }) => void;
}) {
  const [draft, setDraft] = useState<FormState>(() => initialFormState(today, initialDraft?.answers));
  const [preview, setPreview] = useState<PreviewState | null>(() => initialDraft ? { generationId: initialDraft.generationId, plan: initialDraft.plan } : null);
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<"generate" | "confirm" | null>(null);
  const [pending, startTransition] = useTransition();
  const setup = useMemo(() => roadmapSetupStatus(draft), [draft]);
  const timeFeasibility = useMemo(() => roadmapTimeFeasibility(draft), [draft]);
  const commonRequirementsReady = draft.goalDetail.trim().length >= 10
    && Boolean(timeFeasibility?.plannedMinutes)
    && draft.availableDevices.length > 0
    && draft.availableDays.length > 0
    && draft.minutesPerDay >= 30
    && draft.minutesPerDay <= 480
    && draft.requiredMaterials.length > 0
    && (!draft.requiredMaterials.includes("own_material") || draft.ownedMaterials.trim().length >= 3)
    && (draft.timelineMode === "duration" ? draft.durationMonths >= 1 : Boolean(draft.deadline));
  const canGenerate = commonRequirementsReady && (draft.roadmapType === "language"
    ? draft.targetLanguage.trim().length >= 2
      && draft.nativeLanguage.trim().length >= 2
      && draft.languageSkills.length > 0
      && draft.languageActivities.length >= 2
      && draft.languagePracticeAccess.length > 0
      && (draft.languageContexts.length > 0 || draft.languageSituations.trim().length >= 3)
      && draft.languageInterests.trim().length >= 3
    : draft.subject.trim().length >= 3 && draft.learningFormats.length > 0);
  const canAdjust = !initialDraft || initialDraft.origin === "ai" && Boolean(initialDraft.answers);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleList = (field: ListField, value: string) => setDraft((current) => {
    const values = current[field];
    const updated = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
    return field === "languageActivities"
      ? { ...current, [field]: updated, learningFormats: roadmapLanguageFormats(updated) }
      : { ...current, [field]: updated };
  });
  const selectRoadmapType = (roadmapType: FormState["roadmapType"]) => setDraft((current) => ({
    ...current,
    roadmapType,
    learningFormats: roadmapType === "language"
      ? roadmapLanguageFormats(current.languageActivities)
      : current.learningFormats.length ? current.learningFormats : ["reading", "video", "practice"],
  }));

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
    if (!draft.availableDevices.length) {
      setError("Escolha ao menos um aparelho que voce pode usar para estudar.");
      return;
    }
    const data = new FormData(event.currentTarget);
    setError(null);
    setOperation("generate");
    startTransition(async () => {
      const result = await gerarRoadmapComIALifeOS(data);
      if (!result.ok || !result.generationId) setError(result.error ?? "Nao foi possivel iniciar a geracao do roadmap.");
      else if (result.queued) {
        setOperation(null);
        onGenerationStarted?.({ generationId: result.generationId, title: result.title ?? "Novo roadmap" });
        onClose();
        return;
      } else if (result.preview) {
        setPreview({ generationId: result.generationId, plan: result.preview });
        setEditingAnswers(false);
      } else setError("A geracao foi iniciada, mas o status nao pode ser identificado.");
      setOperation(null);
    });
  }} className={`space-y-6 ${darkContentClass}`}>
    <input type="hidden" name="roadmap_type" value={draft.roadmapType} />
    {draft.roadmapType === "language" && <>
      <input type="hidden" name="goal" value="personal" />
      <input type="hidden" name="use_context" value="personal_project" />
      <input type="hidden" name="current_level" value="unknown" />
      <input type="hidden" name="target_level" value="autonomous" />
      <input type="hidden" name="main_obstacle" value="practice" />
    </>}
    {preview && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"><div className="flex items-center gap-2"><FileCheck2 className="size-4" /><div><p className="text-sm font-semibold">A versao anterior esta salva</p><p className="text-xs text-emerald-700/70">Gerar novamente criara outro rascunho sem apagar este.</p></div></div><button type="button" onClick={() => setEditingAnswers(false)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Ver versao salva</button></section>}
    <fieldset>
      <legend className="text-xs font-semibold uppercase text-white/35">Tipo de trilha</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => selectRoadmapType("skill")} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${draft.roadmapType === "skill" ? "border-blue-400/50 bg-blue-400/10" : "border-white/10 hover:border-white/20"}`}><span className={`flex size-9 items-center justify-center rounded-md ${draft.roadmapType === "skill" ? "bg-blue-600 text-white" : "bg-white/10 text-white/40"}`}><Wrench className="size-4" /></span><span><b className="block text-sm text-white/85">Habilidade ou profissao</b><span className="mt-0.5 block text-xs text-white/35">Tecnologia, carreira, prova ou projeto</span></span></button>
        <button type="button" onClick={() => selectRoadmapType("language")} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${draft.roadmapType === "language" ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}><span className={`flex size-9 items-center justify-center rounded-md ${draft.roadmapType === "language" ? "bg-emerald-600 text-white" : "bg-white/10 text-white/40"}`}><Languages className="size-4" /></span><span><b className="block text-sm text-white/85">Idioma</b><span className="mt-0.5 block text-xs text-white/35">Comunicacao, imersao e pratica real</span></span></button>
      </div>
    </fieldset>
    <RoadmapStatus status={setup} selectionCount={draft.roadmapType === "language" ? draft.languageActivities.length : draft.learningFormats.length} selectionLabel={draft.roadmapType === "language" ? "metodos selecionados" : "formatos selecionados"} languageMode={draft.roadmapType === "language"} />

    {draft.roadmapType === "skill" ? <>
    <fieldset className="space-y-4">
      <legend className="font-semibold text-gray-900">1. Objetivo real</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">O que voce quer aprender?
          <input name="subject" required maxLength={300} value={draft.subject} onChange={(event) => setField("subject", event.target.value)} placeholder="Ex.: Power BI para analise comercial" className={inputClass} />
        </label>
        <SelectField name="use_context" label="Para que voce quer aprender isso?" value={draft.useContext} onChange={(value) => setField("useContext", value)} className="sm:col-span-2" options={[
          ["current_job", "Aplicar no trabalho atual"], ["new_career", "Entrar ou mudar de carreira"], ["freelance", "Trabalhar como freelancer"], ["exam", "Fazer uma prova ou certificacao"], ["academic", "Usar na faculdade"], ["personal_project", "Construir um projeto pessoal"], ["personal_learning", "Aprender por interesse pessoal"],
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
        <SelectField name="digital_literacy" label="Autonomia com tecnologia" value={draft.digitalLiteracy} onChange={(value) => setField("digitalLiteracy", value)} options={[
          ["needs_guidance", "Preciso do passo a passo"], ["basic", "Uso o computador, mas preciso de ajuda"], ["comfortable", "Instalo e configuro ferramentas"], ["advanced", "Domino terminal e ambientes"],
        ]} />
        <SelectField name="main_obstacle" label="Maior dificuldade" value={draft.mainObstacle} onChange={(value) => setField("mainObstacle", value)} options={[
          ["direction", "Nao sei por onde seguir"], ["time", "Tenho pouco tempo"], ["consistency", "Perco a constancia"], ["theory", "Fico preso na teoria"], ["practice", "Falta pratica"], ["none", "Nenhuma especifica"],
        ]} />
        <SelectField name="content_depth" label="Profundidade" value={draft.contentDepth} onChange={(value) => setField("contentDepth", value)} options={[
          ["essential", "Somente o essencial"], ["balanced", "Equilibrada"], ["deep", "Aprofundada"],
        ]} />
        <AvailableDevicesField values={draft.availableDevices} onToggle={(value) => toggleList("availableDevices", value)} />
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">O que voce ja conhece? <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="known_topics" rows={2} maxLength={2000} value={draft.knownTopics} onChange={(event) => setField("knownTopics", event.target.value)} placeholder="Ex.: Excel, tabelas dinamicas e conceitos basicos de banco de dados" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Contexto que a IA precisa respeitar <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="context_notes" rows={2} maxLength={2000} value={draft.contextNotes} onChange={(event) => setField("contextNotes", event.target.value)} placeholder="Ex.: trabalho com uma planilha de vendas de uma loja de roupas" className={inputClass} />
        </label>
      </div>
    </fieldset>
    </> : <>
    <fieldset className="space-y-4">
      <legend className="font-semibold text-gray-900">1. Idioma e objetivo real</legend>
      <datalist id="roadmap-language-options">
        <option value="Ingles" /><option value="Espanhol" /><option value="Frances" /><option value="Alemao" /><option value="Italiano" /><option value="Japones" /><option value="Mandarim" /><option value="Coreano" /><option value="Portugues" /><option value="Libras" />
      </datalist>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-500">Qual idioma voce quer aprender?
          <input name="target_language" list="roadmap-language-options" required maxLength={100} value={draft.targetLanguage} onChange={(event) => setField("targetLanguage", event.target.value)} placeholder="Ex.: Ingles" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500">Seu idioma principal
          <input name="native_language" list="roadmap-language-options" required maxLength={100} value={draft.nativeLanguage} onChange={(event) => setField("nativeLanguage", event.target.value)} placeholder="Ex.: Portugues (Brasil)" className={inputClass} />
        </label>
        <SelectField name="language_purpose" label="Objetivo principal" value={draft.languagePurpose} onChange={(value) => setField("languagePurpose", value)} options={[
          ["conversation", "Conversar com naturalidade"], ["travel", "Viajar"], ["work", "Usar no trabalho"], ["exam", "Prova de proficiencia"], ["relocation", "Morar em outro pais"], ["academic", "Estudo academico"], ["culture", "Filmes, musica e cultura"], ["relationships", "Amigos, familia ou parceiro"],
        ]} />
        <label className="text-xs font-medium text-gray-500">Variante ou sotaque <span className="font-normal text-gray-400">Opcional</span>
          <input name="language_variant" maxLength={100} value={draft.languageVariant} onChange={(event) => setField("languageVariant", event.target.value)} placeholder="Ex.: ingles americano ou espanhol da Argentina" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Qual resultado concreto voce quer alcancar?
          <textarea name="goal_detail" required rows={3} minLength={10} maxLength={1500} value={draft.goalDetail} onChange={(event) => setField("goalDetail", event.target.value)} placeholder="Ex.: conduzir uma reuniao de 30 minutos em ingles, explicar meu trabalho e responder perguntas sem usar um roteiro" className={inputClass} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium text-gray-500">Onde voce usara o idioma?</legend>
          <p className="mt-1 text-[11px] text-white/30">Escolha todos os cenarios que precisam aparecer nas atividades.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{languageContextOptions.map(([value, label]) => {
            const selected = draft.languageContexts.includes(value);
            return <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${selected ? "border-blue-400/45 bg-blue-400/10 text-blue-200" : "border-white/10 text-white/55 hover:border-white/20"}`}>
              <input type="checkbox" name="language_contexts" value={value} checked={selected} onChange={() => toggleList("languageContexts", value)} className="sr-only" />
              <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${selected ? "border-blue-400 bg-blue-500 text-white" : "border-white/20"}`}>{selected && <Check className="size-3.5" />}</span>
              <span>{label}</span>
            </label>;
          })}</div>
        </fieldset>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Alguma situacao especifica? <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="language_situations" rows={2} maxLength={2000} value={draft.languageSituations} onChange={(event) => setField("languageSituations", event.target.value)} placeholder="Ex.: apresentar resultados de dados para clientes dos Estados Unidos" className={inputClass} />
        </label>
      </div>
    </fieldset>

    <fieldset className="space-y-5 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">2. Seu ponto de partida</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField name="language_current_level" label="Nivel atual" value={draft.languageCurrentLevel} onChange={(value) => setField("languageCurrentLevel", value)} options={[
          ["unknown", "Nao sei meu nivel"], ["zero", "Zero: nunca estudei"], ["a1", "A1: iniciante"], ["a2", "A2: basico"], ["b1", "B1: intermediario"], ["b2", "B2: intermediario avancado"], ["c1", "C1: avancado"], ["c2", "C2: proficiente"],
        ]} />
        <SelectField name="language_target_level" label="Nivel que quer atingir" value={draft.languageTargetLevel} onChange={(value) => setField("languageTargetLevel", value)} options={[
          ["a1", "A1: sobrevivencia"], ["a2", "A2: comunicacao basica"], ["b1", "B1: autonomia cotidiana"], ["b2", "B2: fluidez funcional"], ["c1", "C1: dominio avancado"], ["c2", "C2: proficiencia plena"],
        ]} />
        <SelectField name="language_exposure" label="Contato atual com o idioma" value={draft.languageExposure} onChange={(value) => setField("languageExposure", value)} options={[
          ["none", "Quase nenhum"], ["occasional", "Ocasional"], ["weekly", "Algumas vezes por semana"], ["daily", "Todos os dias"],
        ]} />
        <SelectField name="language_obstacle" label="Maior dificuldade" value={draft.languageObstacle} onChange={(value) => setField("languageObstacle", value)} options={[
          ["speaking_anxiety", "Travo para falar"], ["listening_speed", "Nao entendo fala natural"], ["vocabulary", "Falta vocabulario"], ["grammar", "Nao consigo montar frases"], ["pronunciation", "Tenho inseguranca na pronuncia"], ["consistency", "Perco a constancia"], ["none", "Nenhuma especifica"],
        ]} />
        <SelectField name="digital_literacy" label="Autonomia com tecnologia" value={draft.digitalLiteracy} onChange={(value) => setField("digitalLiteracy", value)} options={[
          ["needs_guidance", "Preciso do passo a passo"], ["basic", "Uso o computador, mas preciso de ajuda"], ["comfortable", "Instalo e configuro ferramentas"], ["advanced", "Domino terminal e ambientes"],
        ]} />
        <SelectField name="content_depth" label="Profundidade" value={draft.contentDepth} onChange={(value) => setField("contentDepth", value)} options={[
          ["essential", "Comunicacao essencial"], ["balanced", "Equilibrada"], ["deep", "Aprofundada"],
        ]} />
        <AvailableDevicesField values={draft.availableDevices} onToggle={(value) => toggleList("availableDevices", value)} />
        <label className="text-xs font-medium text-gray-500 sm:col-span-2 lg:col-span-3">O que voce ja consegue fazer hoje? <span className="font-normal text-gray-400">Opcional se nao souber</span>
          <textarea name="known_topics" rows={2} maxLength={2000} value={draft.knownTopics} onChange={(event) => setField("knownTopics", event.target.value)} placeholder="Ex.: entendo videos lentos com legenda, consigo me apresentar, mas travo para responder perguntas" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Temas e interesses que devem aparecer nas aulas
          <textarea name="language_interests" required rows={2} minLength={3} maxLength={2000} value={draft.languageInterests} onChange={(event) => setField("languageInterests", event.target.value)} placeholder="Ex.: futevolei, tecnologia, viagens, negocios e filmes de ficcao" className={inputClass} />
        </label>
        <label className="text-xs font-medium text-gray-500 sm:col-span-2">Contexto que a IA precisa respeitar <span className="font-normal text-gray-400">Opcional</span>
          <textarea name="context_notes" rows={2} maxLength={2000} value={draft.contextNotes} onChange={(event) => setField("contextNotes", event.target.value)} placeholder="Ex.: tenho vergonha de gravar voz no inicio e estudo quase sempre pelo celular" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <MultiChoiceGroup title="Habilidades que precisam de prioridade" name="language_skills" values={draft.languageSkills} options={languageSkillOptions} onToggle={(value) => toggleList("languageSkills", value)} />
        <MultiChoiceGroup title="Como voce consegue praticar fala" name="language_practice_access" values={draft.languagePracticeAccess} options={languagePracticeOptions} onToggle={(value) => toggleList("languagePracticeAccess", value)} />
      </div>
    </fieldset>
    </>}

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">3. {draft.roadmapType === "language" ? "Como voce quer aprender" : "O que deve existir no roadmap"}</legend>
      {draft.roadmapType === "language" ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{languageActivities.map(({ value, label, detail, icon: Icon }) => {
        const selected = draft.languageActivities.includes(value);
        return <label key={value} className={`cursor-pointer rounded-lg border p-3 ${selected ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}><input type="checkbox" name="language_activities" value={value} checked={selected} onChange={() => toggleList("languageActivities", value)} className="sr-only" /><span className="flex items-start gap-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${selected ? "bg-emerald-600 text-white" : "bg-white/10 text-white/45"}`}><Icon className="size-4" /></span><span><b className="block text-sm text-white/85">{label}</b><span className="mt-1 block text-xs leading-5 text-white/35">{detail}</span></span></span></label>;
      })}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{learningFormats.map(({ value, label, detail, icon: Icon }) => {
        const selected = draft.learningFormats.includes(value);
        return <label key={value} className={`cursor-pointer rounded-lg border p-3 ${selected ? "border-blue-400/50 bg-blue-400/10" : "border-white/10 hover:border-white/20"}`}><input type="checkbox" name="learning_formats" value={value} checked={selected} onChange={() => toggleList("learningFormats", value)} className="sr-only" /><span className="flex items-start gap-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${selected ? "bg-blue-600 text-white" : "bg-white/10 text-white/45"}`}><Icon className="size-4" /></span><span><b className="block text-sm text-white/85">{label}</b><span className="mt-1 block text-xs leading-5 text-white/35">{detail}</span></span></span></label>;
      })}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="pace" label="Ritmo" value={draft.pace} onChange={(value) => setField("pace", value)} options={[
          ["light", "Leve e sustentavel"], ["steady", "Constante"], ["intensive", "Intensivo"],
        ]} />
        <SelectField name="assessment_preference" label="Como quer ser avaliado?" value={draft.assessmentPreference} onChange={(value) => setField("assessmentPreference", value)} options={[
          ["none", "Sem avaliacoes"], ["quick_quizzes", "Questoes rapidas nos modulos"], ["module_exams", "Avaliacao ao final de cada modulo"], ["practical", "Avaliacao pratica"], ["mixed", "Questoes e pratica"],
        ]} />
        <SelectField name="project_mode" label={draft.roadmapType === "language" ? "Projeto de imersao" : "Projetos"} value={draft.projectMode} onChange={(value) => setField("projectMode", value)} options={draft.roadmapType === "language" ? [
          ["none", "Sem projeto de imersao"], ["guided", "Um projeto guiado"], ["per_module", "Uma entrega por modulo"], ["capstone", "Imersao final completa"],
        ] : [
          ["none", "Sem projeto"], ["guided", "Um projeto guiado"], ["per_module", "Uma entrega por modulo"], ["capstone", "Projeto final completo"],
        ]} />
      </div>
    </fieldset>

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">4. Materiais e fontes</legend>
      <div className="grid gap-5 lg:grid-cols-2">
        <SelectField name="material_budget" label="Orcamento para materiais" value={draft.materialBudget} onChange={(value) => setField("materialBudget", value)} options={[
          ["free_only", "Somente materiais gratuitos"], ["paid_allowed", "Aceito recomendacoes de materiais ou cursos pagos"],
        ]} />
        <MultiChoiceGroup title="Fontes preferidas" name="required_materials" values={draft.requiredMaterials} options={draft.roadmapType === "language" ? languageMaterialOptions : materialOptions} onToggle={(value) => toggleList("requiredMaterials", value)} />
      </div>
      {draft.requiredMaterials.includes("own_material") && <label className="block text-xs font-medium text-gray-500">Quais materiais voce ja possui?
        <textarea name="owned_materials" required rows={3} minLength={3} maxLength={3000} value={draft.ownedMaterials} onChange={(event) => setField("ownedMaterials", event.target.value)} placeholder={draft.roadmapType === "language" ? "Ex.: Netflix, livro English Grammar in Use e curso de ingles da plataforma X" : "Ex.: curso Data Science Academy, livro Python para Analise de Dados e apostila da faculdade"} className={inputClass} />
      </label>}
      {!draft.requiredMaterials.includes("own_material") && <input type="hidden" name="owned_materials" value="" />}
      <p className="text-[11px] leading-5 text-gray-400">Cursos completos podem ser gratuitos ou pagos. A IA respeitara o orcamento escolhido e priorizara as fontes marcadas.</p>
    </fieldset>

    <fieldset className="space-y-4 border-t border-gray-100 pt-5">
      <legend className="font-semibold text-gray-900">5. Tempo disponivel</legend>
      <p className="text-xs leading-5 text-white/40">Agora que objetivo, profundidade e ritmo estao definidos, confira se o prazo comporta o escopo desejado.</p>
      <input type="hidden" name="timeline_mode" value={draft.timelineMode} />
      <input type="hidden" name="duration_weeks" value={weeksFromMonths(draft.durationMonths)} />
      {draft.timelineMode === "deadline" && <input type="hidden" name="duration_months" value={draft.durationMonths} />}
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        <button type="button" onClick={() => setField("timelineMode", "duration")} className={`rounded-md px-3 py-2 text-xs font-semibold ${draft.timelineMode === "duration" ? "bg-blue-600 text-white" : "text-white/40"}`}>Por duracao</button>
        <button type="button" onClick={() => setField("timelineMode", "deadline")} className={`rounded-md px-3 py-2 text-xs font-semibold ${draft.timelineMode === "deadline" ? "bg-blue-600 text-white" : "text-white/40"}`}>Ate uma data</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-gray-500">Inicio
          <input name="start_date" type="date" required value={draft.startDate} onChange={(event) => setField("startDate", event.target.value)} className={inputClass} />
        </label>
        {draft.timelineMode === "duration" ? <label className="text-xs font-medium text-gray-500">Duracao em meses
          <input name="duration_months" type="number" required min={1} max={12} step={1} value={draft.durationMonths} onChange={(event) => setField("durationMonths", Number(event.target.value))} className={inputClass} />
        </label> : <label className="text-xs font-medium text-gray-500">Data final
          <input name="deadline" type="date" required min={draft.startDate || today} value={draft.deadline} onChange={(event) => setField("deadline", event.target.value)} className={inputClass} />
        </label>}
        <label className="text-xs font-medium text-gray-500">Tempo por dia de estudo (HH:MM)
          <input name="study_time_per_day" type="time" required min="00:30" max="08:00" step={300} value={studyMinutesToClock(draft.minutesPerDay)} onChange={(event) => setField("minutesPerDay", studyClockToMinutes(event.target.value) ?? 0)} className={inputClass} />
          <input name="minutes_per_day" type="hidden" value={draft.minutesPerDay} />
        </label>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">Dias que normalmente consegue estudar</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{weekdays.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${draft.availableDays.includes(value) ? "border-blue-400/50 bg-blue-400/10 text-blue-300" : "border-white/10 text-white/40"}`}><input type="checkbox" name="available_days" value={value} checked={draft.availableDays.includes(value)} onChange={() => toggleList("availableDays", value)} className="sr-only" />{label}</label>)}</div>
        <p className="mt-2 text-[11px] text-gray-400">Esses dias calculam a carga do plano. Os modulos nao ficarao presos a datas.</p>
      </div>
      {timeFeasibility && <TimeFeasibilityStatus status={timeFeasibility} depth={draft.contentDepth} pace={draft.pace} />}
    </fieldset>

    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
      <p className="text-[11px] text-gray-400">A geracao usa a API da OpenAI. A busca de videos, cursos e livros pode ter custo adicional.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">Cancelar</button>
        <button disabled={pending || !canGenerate} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending && operation === "generate" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{pending && operation === "generate" ? "Iniciando geracao..." : "Gerar e acompanhar"}</button>
      </div>
    </div>
  </form>;
}

type TimeFeasibility = NonNullable<ReturnType<typeof roadmapTimeFeasibility>>;

function formatRoadmapDuration(weeks: number, months?: number): string {
  if (weeks < 9) return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const totalMonths = months ?? Math.max(1, Math.round(weeks / (52 / 12)));
  return `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`;
}

function formatStudyHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

function TimeFeasibilityStatus({ status, depth, pace }: { status: TimeFeasibility; depth: string; pace: string }) {
  const presentation = {
    very_short: {
      title: "Tempo muito curto",
      frame: "border-red-400/30 bg-red-400/10",
      icon: "bg-red-400/15 text-red-300",
      accent: "text-red-200",
    },
    tight: {
      title: "Prazo apertado",
      frame: "border-amber-400/30 bg-amber-400/10",
      icon: "bg-amber-400/15 text-amber-300",
      accent: "text-amber-200",
    },
    balanced: {
      title: "Prazo equilibrado",
      frame: "border-blue-400/30 bg-blue-400/10",
      icon: "bg-blue-400/15 text-blue-300",
      accent: "text-blue-200",
    },
    comfortable: {
      title: "Prazo confortavel",
      frame: "border-emerald-400/30 bg-emerald-400/10",
      icon: "bg-emerald-400/15 text-emerald-300",
      accent: "text-emerald-200",
    },
  }[status.level];
  const depthLabel = { essential: "essencial", balanced: "equilibrada", deep: "aprofundada" }[depth] ?? depth;
  const paceLabel = { light: "leve", steady: "constante", intensive: "intensivo" }[pace] ?? pace;
  const requestedDuration = formatRoadmapDuration(status.requestedWeeks);
  const needsMoreTime = status.recommendedWeeks > status.requestedWeeks;
  const recommendedDuration = needsMoreTime
    ? formatRoadmapDuration(status.recommendedWeeks, status.recommendedMonths)
    : formatRoadmapDuration(status.recommendedWeeks);
  const hasNoSessions = status.plannedMinutes === 0;
  const visibleCoverage = Math.min(100, status.coveragePercent);
  const coverageLabel = status.coveragePercent > 200 ? "mais de 200%" : `${status.coveragePercent}%`;
  const scopeImpact = hasNoSessions
    ? "Nenhum dos dias selecionados ocorre dentro do prazo informado. Ajuste as datas ou escolha um dia de estudo que exista nesse intervalo."
    : status.level === "very_short"
      ? `A capacidade estimada cobre cerca de ${visibleCoverage}% do escopo. A IA precisara priorizar os fundamentos, e muitos assuntos complementares e praticas podem ficar de fora.`
      : status.level === "tight"
        ? `A capacidade estimada cobre cerca de ${visibleCoverage}% do escopo. Alguns aprofundamentos, revisoes ou praticas provavelmente precisarao ser reduzidos.`
        : status.level === "balanced"
          ? "A carga disponivel esta alinhada ao escopo e preserva espaco para pratica, revisao e imprevistos."
          : status.coveragePercent > 200
            ? "Ha ampla margem sobre a carga estimada, o que permite estudar com mais folga ou aprofundar pontos importantes."
            : `Ha cerca de ${Math.max(1, status.coveragePercent - 100)}% de margem sobre a carga estimada, o que permite estudar com mais folga ou aprofundar pontos importantes.`;
  const recommendation = hasNoSessions
    ? "Inclua ao menos uma sessao de estudo no intervalo para gerar o roadmap."
    : status.exceedsMaximumWindow
      ? `Prazo ideal estimado: ${recommendedDuration}. Como ele ultrapassa o limite de 12 meses, aumente os dias ou minutos de estudo, reduza a profundidade ou divida a meta em etapas.`
      : status.level === "very_short" || status.level === "tight" || needsMoreTime
        ? `Recomendacao: reserve ${recommendedDuration} para manter esse ritmo e essa profundidade.`
        : `Seu prazo ja atende a faixa recomendada, estimada em ${recommendedDuration}.`;

  return <section role="status" aria-live="polite" className={`rounded-xl border p-4 ${presentation.frame}`}>
    <div className="flex items-start gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${presentation.icon}`}>
        {status.level === "very_short" || status.level === "tight" ? <TriangleAlert className="size-4" /> : status.level === "comfortable" ? <CircleCheckBig className="size-4" /> : <CalendarClock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><p className={`text-sm font-semibold ${presentation.accent}`}>{hasNoSessions ? "Nenhuma sessao no prazo" : presentation.title}</p><p className="mt-0.5 text-[11px] text-white/40">Estimativa para profundidade {depthLabel} e ritmo {paceLabel}</p></div>
          <p className={`text-sm font-bold ${presentation.accent}`}>{coverageLabel} do escopo</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-white/65">{scopeImpact}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <TimeMetric label="Prazo informado" value={requestedDuration} />
          <TimeMetric label="Carga util / estimada" value={`${formatStudyHours(status.plannedMinutes)} / ${formatStudyHours(status.estimatedMinutes)}`} />
          <TimeMetric label="Prazo recomendado" value={recommendedDuration} />
        </div>
        <p className="mt-3 text-[11px] font-medium leading-5 text-white/60">{recommendation}</p>
        <p className="mt-1 text-[10px] leading-4 text-white/30">Estimativa inicial baseada nas suas escolhas; nao e uma promessa de dominio total do assunto.</p>
      </div>
    </div>
  </section>;
}

function TimeMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-black/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-white/35">{label}</p><p className="mt-1 text-xs font-semibold text-white/80">{value}</p></div>;
}

function RoadmapStatus({ status, selectionCount, selectionLabel, languageMode }: { status: ReturnType<typeof roadmapSetupStatus>; selectionCount: number; selectionLabel: string; languageMode: boolean }) {
  return <section className="rounded-lg bg-gray-900 p-4 text-white">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2"><Gauge className="size-5 text-blue-400" /><div><p className="text-sm font-semibold">Status do planejamento</p><p className="text-xs text-white/45">{selectionCount} {selectionLabel}</p></div></div>
      <div className="text-right"><p className="text-sm font-semibold text-blue-300">{status.qualityLabel}</p><p className="text-xs text-white/45">Carga {status.workloadLabel.toLowerCase()}</p></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <StatusBar label="Definicao do plano" value={status.completeness} color="bg-blue-500" />
      <StatusBar label="Nivel de exigencia" value={status.workload} color="bg-amber-400" />
    </div>
    <p className="mt-3 text-[11px] leading-5 text-white/40">{languageMode ? "Situacoes reais, interesses, habilidades e formas de pratica tornam a trilha mais pessoal. Escolha apenas metodos que voce realmente consegue manter." : "Mais formatos, avaliacoes e projetos aumentam a carga. A qualidade cresce principalmente quando o resultado pratico fica especifico."}</p>
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

  return <div className={`space-y-5 ${darkContentClass}`}>
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
    <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">{preview.modules.map((module, moduleIndex) => <RoadmapPreviewModule key={`${module.title}-${moduleIndex}`} module={module} moduleIndex={moduleIndex} />)}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onBack} disabled={pending} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-50">{backLabel}</button><button type="button" onClick={onConfirm} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Salvando..." : "Salvar roadmap"}</button></div>
  </div>;
}

function RoadmapPreviewModule({ module, moduleIndex }: { module: RoadmapGenerationPlan["modules"][number]; moduleIndex: number }) {
  return <details open={moduleIndex === 0} className="rounded-lg border border-gray-200">
    <summary className="cursor-pointer px-3 py-3"><span className="font-semibold">Modulo {moduleIndex + 1}: {module.title}</span><span className="ml-2 text-xs text-gray-400">{module.steps.length} passos</span><p className="mt-1 text-xs font-normal leading-5 text-gray-500">{module.objective}</p></summary>
    <div className="border-t border-gray-100 px-3">{module.steps.map((step, stepIndex) => {
      const guidedCount = step.preparationSteps.length + step.practiceExercises.length + step.completionChecklist.length;
      return <div key={`${step.title}-${stepIndex}`} className="flex gap-3 border-b border-gray-100 py-3 last:border-0">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">{stepIndex + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-gray-800">{step.title}</p><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{itemLabels[step.type] ?? step.type}</span></div>
          <p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p>
          <p className="mt-1 text-[11px] text-gray-400">{step.estimatedMinutes} min{guidedCount ? ` - ${guidedCount} itens guiados` : ""}{step.questions.length ? ` - ${step.questions.length} perguntas interativas` : ""}</p>
          <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-gray-500">Ver roteiro completo</summary><div className="mt-2 space-y-3 border-l-2 border-gray-200 pl-3 text-gray-600">
            {step.requirements && <p><b>Precisa:</b> {step.requirements}</p>}
            {step.workspace && <p><b>Onde:</b> {step.workspace}</p>}
            <PreviewList title="Preparacao" items={step.preparationSteps} />
            {step.instructions && <div><b>Passo a passo:</b><p className="mt-1 whitespace-pre-line leading-5">{step.instructions}</p></div>}
            <PreviewList title="Pratica sem consulta" items={step.practiceExercises} />
            <PreviewList title="Criterios objetivos" items={step.completionChecklist} />
            <p><b>Resultado:</b> {step.completionCriteria}</p>
            {step.evidence && <p><b>Evidencia:</b> {step.evidence}</p>}
          </div></details>
          {step.resourceUrl && <a href={step.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">{step.resourceTitle}<ExternalLink className="size-3" /></a>}
        </div>
      </div>;
    })}</div>
  </details>;
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><b>{title}:</b><ol className="mt-1 list-decimal space-y-1 pl-4 leading-5">{items.map((item, index) => <li key={`${title}-${index}-${item}`}>{item}</li>)}</ol></div>;
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div className="p-3 text-center"><b>{value}</b><p className="text-[11px] text-gray-400">{label}</p></div>;
}

function MultiChoiceGroup({ title, name, values, options, onToggle }: { title: string; name: string; values: string[]; options: ReadonlyArray<readonly [string, string]>; onToggle: (value: string) => void }) {
  return <fieldset><legend className="font-semibold text-gray-900">{title}</legend><div className="mt-3 space-y-2">{options.map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600"><input type="checkbox" name={name} value={value} checked={values.includes(value)} onChange={() => onToggle(value)} className="size-4 rounded accent-blue-600" />{label}</label>)}</div></fieldset>;
}

function AvailableDevicesField({ values, onToggle }: { values: string[]; onToggle: (value: string) => void }) {
  const helperId = "roadmap-available-devices-help";
  return <fieldset className="sm:col-span-2 lg:col-span-4" aria-describedby={helperId}>
    <legend className="text-xs font-medium text-gray-500">Quais aparelhos voce pode usar para estudar?</legend>
    <p id={helperId} className="mt-1 text-[11px] leading-5 text-white/35">Marque todos os que estarao disponiveis. A IA escolhera o mais adequado para cada atividade.</p>
    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {deviceOptions.map(([value, label]) => {
        const selected = values.includes(value);
        return <label key={value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-blue-400 ${selected ? "border-blue-400/50 bg-blue-400/10 text-blue-200" : "border-white/10 text-white/50 hover:border-white/20"}`}>
          <input type="checkbox" name="available_devices" value={value} checked={selected} onChange={() => onToggle(value)} className="size-4 shrink-0 rounded accent-blue-600" />
          <span>{label}</span>
        </label>;
      })}
    </div>
    {!values.length && <p className="mt-2 text-[11px] text-amber-300">Escolha ao menos um aparelho para gerar um plano executavel.</p>}
  </fieldset>;
}

function SelectField({ name, label, value, options, onChange, className = "" }: { name: string; label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (value: string) => void; className?: string }) {
  return <label className={`text-xs font-medium text-gray-500 ${className}`}>{label}<select name={name} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
