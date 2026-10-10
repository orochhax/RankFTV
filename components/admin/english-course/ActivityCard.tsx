"use client";

import { useState } from "react";
import { Check, CirclePlay, Clock3, ExternalLink, Headphones, MessageCircleMore, Mic2, PencilLine, Send } from "lucide-react";
import { PRACTICE_SETS, practiceIsReady, practiceResponseKey, practiceScore, type PracticeSet } from "./practice";
import type { LessonResource, RoadmapActivity } from "./roadmap";

export type PracticeInteractionProps = {
  practiceResponses: Record<string, string>;
  practiceSubmissions: Record<string, boolean>;
  onPracticeResponse: (activityId: string, itemId: string, value: string) => void;
  onPracticeSubmit: (activityId: string) => void;
};

type ActivityCardProps = PracticeInteractionProps & {
  activity: RoadmapActivity;
  checked: boolean;
  onToggle: () => void;
  compact?: boolean;
};

const ACTIVITY_ICONS = { lesson: CirclePlay, listening: Headphones, practice: PencilLine, speaking: Mic2, review: MessageCircleMore };
const ACTIVITY_THEMES = {
  lesson: {
    card: "border-sky-200 bg-sky-50/80 shadow-[inset_4px_0_0_#0284c7]",
    icon: "bg-sky-600 text-white",
    action: "border-sky-200 bg-white/90 text-sky-950 hover:border-sky-300 hover:bg-sky-100",
  },
  listening: {
    card: "border-cyan-200 bg-cyan-50/80 shadow-[inset_4px_0_0_#0891b2]",
    icon: "bg-cyan-600 text-white",
    action: "border-cyan-200 bg-white/90 text-cyan-950 hover:border-cyan-300 hover:bg-cyan-100",
  },
  practice: {
    card: "border-violet-200 bg-violet-50/75 shadow-[inset_4px_0_0_#7c3aed]",
    icon: "bg-violet-600 text-white",
    action: "border-violet-200 bg-white/90 text-violet-950 hover:border-violet-300 hover:bg-violet-100",
  },
  speaking: {
    card: "border-rose-200 bg-rose-50/75 shadow-[inset_4px_0_0_#e11d48]",
    icon: "bg-rose-600 text-white",
    action: "border-rose-200 bg-white/90 text-rose-950 hover:border-rose-300 hover:bg-rose-100",
  },
  review: {
    card: "border-amber-200 bg-amber-50/80 shadow-[inset_4px_0_0_#d97706]",
    icon: "bg-amber-600 text-white",
    action: "border-amber-200 bg-white/90 text-amber-950 hover:border-amber-300 hover:bg-amber-100",
  },
} satisfies Record<RoadmapActivity["kind"], { card: string; icon: string; action: string }>;

function ActivityStatus({ activity, checked, interactive, onToggle }: { activity: RoadmapActivity; checked: boolean; interactive: boolean; onToggle: () => void }) {
  const Icon = ACTIVITY_ICONS[activity.kind];
  const colors = checked ? "bg-emerald-600 text-white" : ACTIVITY_THEMES[activity.kind].icon;
  const content = checked ? <Check aria-hidden="true" className="size-5" /> : <Icon aria-hidden="true" className="size-5" />;
  if (interactive) return <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${colors}`}>{content}</span>;
  const label = checked ? `Reabrir: ${activity.title}` : `Concluir: ${activity.title}`;
  return <button type="button" onClick={onToggle} aria-pressed={checked} aria-label={label} className={`grid size-10 shrink-0 place-items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${colors}`}>{content}</button>;
}

function LessonResources({ activity }: { activity: RoadmapActivity }) {
  const resources = activity.resources ?? [];
  if (resources.length === 0) return null;
  return <div className="mt-3 space-y-3 border-t border-slate-300/60 pt-3">{resources.map((resource) => <VideoResource key={`${resource.url}-${resource.startSeconds ?? 0}`} resource={resource} />)}</div>;
}

function youtubeId(url: string) {
  return url.match(/[?&]v=([^&]+)/)?.[1] ?? null;
}

function embedUrl(resource: LessonResource) {
  const id = youtubeId(resource.url);
  if (!id) return null;
  const params = new URLSearchParams({ rel: "0" });
  if (resource.startSeconds) params.set("start", String(resource.startSeconds));
  if (resource.endSeconds) params.set("end", String(resource.endSeconds));
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function VideoResource({ resource }: { resource: LessonResource }) {
  const [playing, setPlaying] = useState(false);
  const embed = embedUrl(resource);
  return <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white/90 shadow-sm"><div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600"><CirclePlay aria-hidden="true" className="size-4" /></span><span className="min-w-0 flex-1"><span className="block font-medium text-slate-800">{resource.label}</span><span className="text-xs text-slate-500">{resource.source} · {resource.duration}{resource.views ? ` · ${resource.views} visualizações` : ""}</span></span><div className="flex shrink-0 gap-2">{embed ? <button type="button" onClick={() => setPlaying((current) => !current)} className="min-h-10 rounded-lg bg-[#102963] px-3 text-xs font-semibold text-white hover:bg-[#16387d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">{playing ? "Fechar vídeo" : "Assistir aqui"}</button> : null}<a href={resource.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${resource.label} no YouTube`} className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><ExternalLink aria-hidden="true" className="size-4" /></a></div></div>{playing && embed ? <div className="aspect-video w-full border-t border-slate-200 bg-black"><iframe src={embed} title={resource.label} className="size-full" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div> : null}</div>;
}

export function ActivityCard({ activity, checked, onToggle, practiceResponses, practiceSubmissions, onPracticeResponse, onPracticeSubmit, compact = false }: ActivityCardProps) {
  const practiceSet = PRACTICE_SETS[activity.id];
  const theme = ACTIVITY_THEMES[activity.kind];
  const padding = compact ? "p-3.5" : "p-4 sm:p-5";
  const cardColors = checked ? "border-emerald-300 bg-emerald-50/80 shadow-[inset_4px_0_0_#059669]" : theme.card;
  const titleColor = checked ? "text-emerald-950" : "text-slate-900";
  const descriptionColor = checked ? "text-emerald-800/70" : "text-slate-500";
  return <div className={`rounded-2xl border transition-shadow ${practiceSet ? "md:col-span-2" : ""} ${padding} ${cardColors}`}><div className="flex items-start gap-3"><ActivityStatus activity={activity} checked={checked} interactive={Boolean(practiceSet)} onToggle={onToggle} /><div className="min-w-0 flex-1"><p className={`font-semibold ${titleColor}`}>{activity.title}</p><p className={`mt-1 text-sm leading-5 ${descriptionColor}`}>{activity.description}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock3 aria-hidden="true" className="size-3.5" />{activity.duration}</span></div></div><LessonResources activity={activity} />{practiceSet ? <PracticePanel kind={activity.kind === "speaking" ? "speaking" : "practice"} set={practiceSet} responses={practiceResponses} submitted={Boolean(practiceSubmissions[activity.id])} onResponse={onPracticeResponse} onSubmit={onPracticeSubmit} /> : <button type="button" onClick={onToggle} className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${checked ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" : theme.action}`}><Check aria-hidden="true" className="size-4" />{checked ? "Atividade concluída" : "Marcar como concluída"}</button>}</div>;
}

const PRACTICE_PANEL_THEMES = {
  practice: {
    icon: PencilLine,
    label: "Responder no site",
    eyebrow: "text-violet-800",
    border: "border-violet-200/80",
    field: "border-violet-200 bg-white/90",
    focus: "focus:border-violet-500 focus:ring-violet-100",
    submit: "bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500",
  },
  speaking: {
    icon: Mic2,
    label: "Falar em dupla",
    eyebrow: "text-rose-800",
    border: "border-rose-200/80",
    field: "border-rose-200 bg-white/90",
    focus: "focus:border-rose-500 focus:ring-rose-100",
    submit: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
  },
} as const;

function PracticePanel({ kind, set, responses, submitted, onResponse, onSubmit }: { kind: keyof typeof PRACTICE_PANEL_THEMES; set: PracticeSet; responses: Record<string, string>; submitted: boolean; onResponse: PracticeInteractionProps["onPracticeResponse"]; onSubmit: PracticeInteractionProps["onPracticeSubmit"] }) {
  const theme = PRACTICE_PANEL_THEMES[kind];
  const PanelIcon = theme.icon;
  const ready = practiceIsReady(set, responses);
  const score = practiceScore(set, responses);
  const hasQuestions = set.questions.length > 0;
  const productionKey = practiceResponseKey(set.activityId, "production");
  const statusText = hasQuestions ? `${score.correct}/${score.total} objetivas corretas` : "Prática registrada";
  const readyText = hasQuestions ? "Tudo respondido. Você já pode corrigir." : "Registro preenchido. Você já pode concluir.";
  const pendingText = hasQuestions ? "Responda todas as alternativas e a produção final para concluir." : "Faça a prática e registre o resultado para concluir.";
  const buttonText = submitted ? hasQuestions ? "Corrigir novamente" : "Salvar novamente" : hasQuestions ? "Corrigir e concluir" : "Salvar e concluir";
  return <section className={`mt-4 border-t pt-4 ${theme.border}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] ${theme.eyebrow}`}><PanelIcon aria-hidden="true" className="size-4" />{theme.label}</div><h3 className="mt-1 text-lg font-semibold text-slate-950">{set.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{set.instructions}</p></div>{submitted ? <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{statusText}</span> : null}</div><div className="mt-4 space-y-4">{set.questions.map((item, index) => { const key = practiceResponseKey(set.activityId, item.id); const selected = responses[key]; const correct = selected === item.correct; return <fieldset key={item.id} className={`rounded-2xl border p-4 ${theme.field}`}><legend className="px-1 text-sm font-semibold text-slate-900">{index + 1}. {item.prompt}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{item.choices.map((choice) => <PracticeChoiceButton key={choice.id} tone={kind} choiceId={choice.id} label={choice.label} selected={selected === choice.id} submitted={submitted} correct={choice.id === item.correct} onClick={() => onResponse(set.activityId, item.id, choice.id)} />)}</div>{submitted ? <p className={`mt-3 rounded-xl px-3 py-2 text-xs leading-5 ${correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><strong>{correct ? "Correto." : `Resposta correta: ${item.correct}.`}</strong> {item.explanation}</p> : null}</fieldset>; })}<div className={`rounded-2xl border p-4 ${theme.field}`}><label htmlFor={`${set.activityId}-production`} className="text-sm font-semibold text-slate-900">{hasQuestions ? "Produção final" : "Registro da prática"}</label><p className="mt-1 text-sm leading-6 text-slate-600">{set.production.prompt}</p><textarea id={`${set.activityId}-production`} name={`${set.activityId}-production`} autoComplete="off" value={responses[productionKey] ?? ""} onChange={(event) => onResponse(set.activityId, "production", event.target.value)} rows={4} placeholder={set.production.placeholder} className={`mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${theme.focus}`} />{submitted ? <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900"><strong>Exemplo para comparar:</strong> {set.production.example}</div> : null}</div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-600">{ready ? readyText : pendingText}</p><button type="button" disabled={!ready} onClick={() => onSubmit(set.activityId)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 ${theme.submit}`}><Send aria-hidden="true" className="size-4" />{buttonText}</button></div></section>;
}

function PracticeChoiceButton({ tone, choiceId, label, selected, submitted, correct, onClick }: { tone: keyof typeof PRACTICE_PANEL_THEMES; choiceId: string; label: string; selected: boolean; submitted: boolean; correct: boolean; onClick: () => void }) {
  const openClasses = tone === "speaking" ? "border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50" : "border-slate-300 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50";
  const selectedClasses = tone === "speaking" ? "border-rose-500 bg-rose-50 text-rose-950" : "border-violet-500 bg-violet-50 text-violet-950";
  const focusClasses = tone === "speaking" ? "focus-visible:ring-rose-500" : "focus-visible:ring-violet-500";
  let classes = openClasses;
  if (selected) classes = selectedClasses;
  if (submitted && selected) classes = correct ? "border-emerald-500 bg-emerald-50 text-emerald-950" : "border-red-400 bg-red-50 text-red-950";
  if (submitted && correct && !selected) classes = "border-emerald-300 bg-emerald-50/60 text-emerald-900";
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 ${focusClasses} ${classes}`}><span className="mr-2 font-bold">{choiceId})</span>{label}</button>;
}
