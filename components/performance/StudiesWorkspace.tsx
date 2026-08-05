"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Download, Loader2, Pause, Play, Plus, RotateCcw, Settings2, Upload } from "lucide-react";
import { criarAtividadeLifeOS, criarItemEstudoLifeOS, criarRoadmapEstudosLifeOS, importarRoadmapEstudosLifeOS, atualizarStatusEstudoLifeOS } from "@/app/admin/performance/life-os-actions";
import { formatDateBR } from "@/lib/format";
import { ROADMAP_IMPORT_MAX_BYTES } from "@/lib/performance-analytics";
import { nextStudyItem, roadmapProgress, studyWeeklyStats, type StudyRoadmap, type StudyRoadmapItem } from "@/lib/performance-widgets";

type StudyActivity = { id: string; title: string; date: string; area: string; durationMinutes: number | null; status: string };
type PomodoroMode = "focus" | "short" | "long";
type PomodoroSettings = { focus: number; short: number; long: number; cycles: number };

const DEFAULT_SETTINGS: PomodoroSettings = { focus: 25, short: 5, long: 20, cycles: 4 };
const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";

export function StudiesWorkspace({ roadmap, items: allItems, activities, today, monday }: { roadmap: StudyRoadmap | null; items: StudyRoadmapItem[]; activities: StudyActivity[]; today: string; monday: string }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(today);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPending, startImport] = useTransition();
  const [newItem, setNewItem] = useState(false);
  const items = allItems.filter((item) => !roadmap || item.roadmapId === roadmap.id).sort((a, b) => a.orderIndex - b.orderIndex);
  const datedItems = items.filter((item) => item.scheduledDate === selectedDate || (!item.scheduledDate && selectedDate === today));
  const plannedDates = [...new Set(items.map((item) => item.scheduledDate).filter((value): value is string => Boolean(value)))].sort();
  const currentDateIndex = plannedDates.indexOf(selectedDate);
  const sections = useMemo(() => {
    const map = new Map<string, StudyRoadmapItem[]>();
    datedItems.forEach((item) => map.set(item.section ?? "Geral", [...(map.get(item.section ?? "Geral") ?? []), item]));
    return map;
  }, [datedItems]);
  const weekly = studyWeeklyStats(activities.filter((item) => item.area === "estudos"), monday, today);

  const exportRoadmap = () => {
    const payload = { version: 2, title: roadmap?.title ?? "Roadmap de estudos", description: roadmap?.description ?? null, sections: [...new Set(items.map((item) => item.section ?? "Geral"))].map((section) => ({ title: section, items: items.filter((item) => (item.section ?? "Geral") === section).map((item) => ({ title: item.title, scheduledDate: item.scheduledDate, itemKind: item.itemKind })) })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "roadmap-estudos.json"; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="space-y-5">
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="space-y-5">
        <section className="rounded-lg bg-white p-5 text-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Roadmap de estudos</h2><p className="mt-1 text-xs text-gray-400">Importe Markdown com dias, secoes e checkboxes. O sistema organiza as atividades automaticamente.</p></div>
            <div className="flex gap-2">
              <label className={`inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 ${importPending ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
                {importPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {importPending ? "Importando..." : "Importar"}
                <input
                  type="file"
                  accept=".md,.markdown,.txt,.json,text/markdown,application/json"
                  className="hidden"
                  disabled={importPending}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    input.value = "";
                    if (!file) return;
                    setImportError(null);
                    if (file.size > ROADMAP_IMPORT_MAX_BYTES) {
                      const sizeMb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
                      setImportError(`O arquivo tem ${sizeMb} MB. O limite para importacao e 5 MB.`);
                      return;
                    }
                    startImport(async () => {
                      const result = await importarRoadmapEstudosLifeOS(await file.text());
                      if (!result.ok) setImportError(result.error ?? "Falha ao importar.");
                      else router.refresh();
                    });
                  }}
                />
              </label>
              <button type="button" onClick={exportRoadmap} disabled={!items.length} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Download className="size-4" />Exportar</button>
            </div>
          </div>
          {importError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{importError}</p>}
          {roadmap ? <div className="mt-5"><div className="flex items-end justify-between gap-3"><div><p className="font-semibold">{roadmap.title}</p><p className="mt-1 text-xs text-gray-400">Proximo: {nextStudyItem(items)?.title ?? "Roadmap concluido"}</p></div><b>{roadmapProgress(items)}%</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-amber-500" style={{ width: `${roadmapProgress(items)}%` }} /></div></div> : <CreateRoadmap onDone={() => router.refresh()} />}
        </section>

        {roadmap && <section className="rounded-lg bg-white p-5 text-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">Plano do dia</h3><p className="mt-1 text-xs text-gray-400">Obrigatorios primeiro; reforco e desafio nao bloqueiam seu avanco.</p></div>
            <button type="button" onClick={() => setNewItem(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus className="size-4" />Atividade</button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-2">
            <button type="button" disabled={currentDateIndex <= 0} onClick={() => setSelectedDate(plannedDates[currentDateIndex - 1])} className="rounded-md p-1.5 text-gray-400 disabled:opacity-25"><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => setSelectedDate(today)} className="text-sm font-semibold">{formatDateBR(selectedDate)}{selectedDate === today && <span className="ml-2 text-xs font-normal text-blue-600">Hoje</span>}</button>
            <button type="button" disabled={currentDateIndex < 0 || currentDateIndex >= plannedDates.length - 1} onClick={() => setSelectedDate(plannedDates[currentDateIndex + 1])} className="rounded-md p-1.5 text-gray-400 disabled:opacity-25"><ChevronRight className="size-4" /></button>
          </div>
          <div className="mt-4 space-y-5">{[...sections].map(([section, sectionItems]) => <div key={section}><div className="mb-2 flex items-center gap-2"><p className="text-xs font-semibold uppercase text-gray-400">{section.split(" / ").at(-1)}</p><span className="text-[10px] text-gray-300">{sectionItems.filter((item) => item.status === "completed").length}/{sectionItems.length}</span></div><div className="space-y-1">{sectionItems.map((item) => <StudyItemRow key={item.id} item={item} onChange={async () => { await atualizarStatusEstudoLifeOS(item.id, item.status === "completed" ? "pending" : "completed"); router.refresh(); }} />)}</div></div>)}{!datedItems.length && <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">Nenhuma atividade planejada para este dia.</p>}</div>
        </section>}
      </div>

      <PomodoroTimer />
    </div>

    <section className="rounded-lg bg-white p-5 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Sessoes realizadas</h3><p className="mt-1 text-xs text-gray-400">{weekly.totalMinutes} minutos nesta semana · media de {weekly.averageMinutes} minutos por dia</p></div></div>
      <div className="mt-4"><StudySessionForm today={today} onDone={() => router.refresh()} /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{activities.filter((item) => item.area === "estudos").slice(0, 9).map((item) => <div key={item.id} className="rounded-lg border border-gray-100 p-3"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-gray-400">{formatDateBR(item.date)} · {item.durationMinutes ?? 0} min</p></div>)}</div>
    </section>

    {newItem && roadmap && <Modal title="Nova atividade" onClose={() => setNewItem(false)}><NewStudyItem roadmapId={roadmap.id} date={selectedDate} order={items.length} onDone={() => { setNewItem(false); router.refresh(); }} /></Modal>}
  </section>;
}

function StudyItemRow({ item, onChange }: { item: StudyRoadmapItem; onChange: () => void }) {
  const optional = item.itemKind === "challenge" || item.itemKind === "reinforcement";
  return <button type="button" onClick={onChange} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50"><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ${item.status === "completed" ? "bg-emerald-500 ring-emerald-500" : "bg-white ring-gray-300"}`}>{item.status === "completed" && <Check className="size-3 text-white" />}</span><span className="min-w-0 flex-1"><span className={`block text-sm ${item.status === "completed" ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.title}</span>{optional && <span className="mt-1 block text-[10px] font-semibold uppercase text-amber-600">{item.itemKind === "challenge" ? "Opcional" : "Reforco"}</span>}</span></button>;
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

function CreateRoadmap({ onDone }: { onDone: () => void }) { return <div className="mt-5"><AsyncForm action={criarRoadmapEstudosLifeOS} onDone={onDone}><Field name="title" label="Nome do roadmap" required /><Field name="start_date" label="Data inicial" type="date" /><p className="text-xs text-gray-400">Voce tambem pode importar diretamente um arquivo Markdown.</p></AsyncForm></div>; }
function NewStudyItem({ roadmapId, date, order, onDone }: { roadmapId: string; date: string; order: number; onDone: () => void }) { return <AsyncForm action={(data) => criarItemEstudoLifeOS(roadmapId, data)} onDone={onDone}><Field name="title" label="Atividade" required /><Field name="section" label="Secao" defaultValue="Geral" /><Field name="scheduled_date" label="Data" type="date" defaultValue={date} /><input type="hidden" name="order_index" value={order} /><input type="hidden" name="item_kind" value="general" /></AsyncForm>; }
function StudySessionForm({ today, onDone }: { today: string; onDone: () => void }) { return <AsyncForm action={criarAtividadeLifeOS} onDone={onDone}><input type="hidden" name="area" value="estudos" /><div className="grid gap-3 sm:grid-cols-3"><Field name="title" label="Assunto estudado" required /><Field name="date" label="Data" type="date" defaultValue={today} required /><Field name="duration_minutes" label="Tempo de foco (min)" type="number" required /></div></AsyncForm>; }

function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) { const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>; }
function Field({ name, label, type = "text", defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label className="block text-xs font-medium text-gray-500">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 1 : undefined} className={`${inputClass} mt-1`} /></label>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 text-gray-900"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-gray-500">Fechar</button></div>{children}</div></div>; }
