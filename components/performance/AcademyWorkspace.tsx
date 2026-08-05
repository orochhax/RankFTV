"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Database, Dumbbell, Flame, Loader2, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { criarTreinoAcademiaLifeOS, editarTreinoAcademiaLifeOS, removerTreinoAcademiaLifeOS, salvarDadosAcademiaLifeOS } from "@/app/admin/performance/life-os-actions";
import { formatDateBR } from "@/lib/format";
import { addDays } from "@/lib/performance";
import { academyStreak, averageDuration } from "@/lib/performance-widgets";

export type AcademyActivity = {
  id: string;
  title: string;
  date: string;
  area: string;
  type: string | null;
  durationMinutes: number | null;
  status: string;
  notes: string | null;
  muscleGroups: string[];
};

const MUSCLES = [
  ["peito", "Peito"], ["ombros", "Ombros"], ["biceps", "Biceps"], ["triceps", "Triceps"],
  ["antebracos", "Antebracos"], ["abdomen", "Abdomen"], ["costas", "Costas"], ["gluteos", "Gluteos"],
  ["quadriceps", "Quadriceps"], ["posteriores", "Posteriores"], ["panturrilhas", "Panturrilhas"],
] as const;

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";

function minutesLabel(value: number): string {
  if (value < 60) return `${value} min`;
  return `${Math.floor(value / 60)}h${value % 60 ? ` ${value % 60}min` : ""}`;
}

export function AcademyWorkspace({ activities: allActivities, weights, today, heightCm, currentWeight, targetWeight }: { activities: AcademyActivity[]; weights: { data: string; peso_kg: number }[]; today: string; heightCm: number | null; currentWeight: number | null; targetWeight: number | null }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AcademyActivity | null>(null);
  const [editingData, setEditingData] = useState(false);
  const activities = allActivities.filter((item) => item.area === "academia").sort((a, b) => b.date.localeCompare(a.date));
  const completed = activities.filter((item) => item.status === "completed");
  const recentStart = addDays(today, -6);
  const muscleFrequency = new Map<string, number>();
  completed.filter((item) => item.date >= recentStart && item.date <= today).forEach((item) => item.muscleGroups.forEach((muscle) => muscleFrequency.set(muscle, (muscleFrequency.get(muscle) ?? 0) + 1)));

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Academia</h2><p className="mt-1 text-sm text-white/45">Treino, recuperacao muscular e evolucao corporal.</p></div>
      <button type="button" onClick={() => setEditingData(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900"><Database className="size-4" />Dados</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <DarkMetric icon={Flame} title="Sequencia" value={`${academyStreak(completed.map((item) => item.date), today)} dias`} />
      <DarkMetric icon={Dumbbell} title="Tempo medio de treino" value={minutesLabel(averageDuration(completed))} />
      <div className="rounded-lg border border-white/10 bg-[#15191f] p-4 text-white">
        <div className="flex items-center gap-2 text-xs text-white/45"><Scale className="size-4" />Peso</div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-white/10">
          <div><p className="text-xs text-white/40">Atual</p><p className="mt-1 font-bold">{currentWeight ? `${currentWeight} kg` : "-"}</p></div>
          <div className="pl-4"><p className="text-xs text-white/40">Meta</p><p className="mt-1 font-bold">{targetWeight ? `${targetWeight} kg` : "-"}</p></div>
        </div>
      </div>
    </div>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-lg bg-white p-5 text-gray-900">
        <div><h3 className="font-semibold">Mapa muscular</h3><p className="mt-1 text-xs text-gray-400">Grupos treinados nos ultimos 7 dias. Quanto mais azul, maior a frequencia.</p></div>
        <div className="mt-4"><MuscleBodyMap frequency={muscleFrequency} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{MUSCLES.filter(([id]) => muscleFrequency.has(id)).map(([id, label]) => <span key={id} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{label} {muscleFrequency.get(id)}x</span>)}</div>
        {!muscleFrequency.size && <p className="mt-4 text-center text-sm text-gray-400">O mapa ganha cor conforme os treinos forem registrados.</p>}
      </section>

      <section className="rounded-lg bg-white p-5 text-gray-900">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Historico de treinos</h3><p className="mt-1 text-xs text-gray-400">{activities.length} registros</p></div><button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Novo treino</button></div>
        <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
          {activities.map((item) => <div key={item.id} className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
            <div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-0.5 text-xs text-gray-400">{formatDateBR(item.date)} · {item.durationMinutes ? minutesLabel(item.durationMinutes) : "Sem duracao"}</p><div className="mt-2 flex flex-wrap gap-1">{item.muscleGroups.map((id) => <span key={id} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{MUSCLES.find(([value]) => value === id)?.[1] ?? id}</span>)}</div></div>
            <button type="button" onClick={() => setEditing(item)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Editar treino"><Pencil className="size-4" /></button>
            <button type="button" onClick={async () => { if (window.confirm("Excluir este treino?")) { await removerTreinoAcademiaLifeOS(item.id); router.refresh(); } }} className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500" title="Excluir treino"><Trash2 className="size-4" /></button>
          </div>)}
          {!activities.length && <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">Nenhum treino registrado.</p>}
        </div>
      </section>
    </div>

    <WeightEvolution weights={weights} targetWeight={targetWeight} />

    {creating && <Modal title="Novo treino" onClose={() => setCreating(false)}><WorkoutForm today={today} onDone={() => { setCreating(false); router.refresh(); }} /></Modal>}
    {editing && <Modal title="Editar treino" onClose={() => setEditing(null)}><WorkoutForm today={today} activity={editing} onDone={() => { setEditing(null); router.refresh(); }} /></Modal>}
    {editingData && <Modal title="Dados da academia" onClose={() => setEditingData(false)}><AcademyDataForm today={today} heightCm={heightCm} currentWeight={currentWeight} targetWeight={targetWeight} onDone={() => { setEditingData(false); router.refresh(); }} /></Modal>}
  </section>;
}

function DarkMetric({ icon: Icon, title, value }: { icon: typeof Flame; title: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-[#15191f] p-4 text-white"><Icon className="size-4 text-blue-500" /><p className="mt-3 text-xs text-white/45">{title}</p><p className="mt-2 font-bold">{value}</p></div>;
}

function WorkoutForm({ today, activity, onDone }: { today: string; activity?: AcademyActivity; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activity?.muscleGroups ?? []));
  const action = activity ? (data: FormData) => editarTreinoAcademiaLifeOS(activity.id, data) : criarTreinoAcademiaLifeOS;
  return <AsyncForm action={action} onDone={onDone}>
    <Field name="title" label="Nome do treino" defaultValue={activity?.title} required />
    <div className="grid gap-3 sm:grid-cols-2"><Field name="date" label="Data" type="date" defaultValue={activity?.date ?? today} required /><Field name="duration_minutes" label="Duracao (min)" type="number" defaultValue={activity?.durationMinutes?.toString()} required /></div>
    <div><p className="mb-2 text-xs font-medium text-gray-500">Musculos treinados</p><MuscleBodyMap selected={selected} onToggle={(id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} /></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{MUSCLES.map(([id, label]) => <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${selected.has(id) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}><input type="checkbox" name="muscle_groups" value={id} checked={selected.has(id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} className="sr-only" /><span className={`flex size-4 items-center justify-center rounded ${selected.has(id) ? "bg-blue-600" : "ring-1 ring-gray-300"}`}>{selected.has(id) && <Check className="size-3 text-white" />}</span>{label}</label>)}</div>
    <Field name="notes" label="Observacao" defaultValue={activity?.notes ?? undefined} />
  </AsyncForm>;
}

function AcademyDataForm({ today, heightCm, currentWeight, targetWeight, onDone }: { today: string; heightCm: number | null; currentWeight: number | null; targetWeight: number | null; onDone: () => void }) {
  return <AsyncForm action={salvarDadosAcademiaLifeOS} onDone={onDone}>
    <div className="grid gap-3 sm:grid-cols-2"><Field name="height_cm" label="Altura (cm)" type="number" defaultValue={heightCm?.toString()} required /><Field name="current_weight" label="Peso atual (kg)" type="number" step="0.1" defaultValue={currentWeight?.toString()} required /></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field name="target_weight" label="Meta de peso (kg)" type="number" step="0.1" defaultValue={targetWeight?.toString()} required /><Field name="weight_date" label="Data da pesagem" type="date" defaultValue={today} required /></div>
    <p className="text-xs text-gray-400">Registrar o peso uma vez por semana costuma mostrar tendencia sem transformar a balanca em tarefa diaria.</p>
  </AsyncForm>;
}

function WeightEvolution({ weights, targetWeight }: { weights: { data: string; peso_kg: number }[]; targetWeight: number | null }) {
  const data = weights.slice(-52).map((item) => ({ ...item, label: `${item.data.slice(8)}/${item.data.slice(5, 7)}` }));
  return <section className="rounded-lg bg-white p-5 text-gray-900"><div><h3 className="font-semibold">Evolucao do peso</h3><p className="mt-1 text-xs text-gray-400">Recomendacao: uma pesagem por semana, nas mesmas condicoes.</p></div><div className="mt-5 h-64">{data.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eef0f3" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${Number(value).toFixed(1)} kg`, "Peso"]} contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }} /><Line type="monotone" dataKey="peso_kg" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />{targetWeight != null && <Line type="monotone" data={data.map((item) => ({ ...item, target: targetWeight }))} dataKey="target" stroke="#10b981" strokeDasharray="5 5" dot={false} />}</LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-gray-400">Registre seu peso para acompanhar a evolucao.</div>}</div></section>;
}

function MuscleBodyMap({ frequency, selected, onToggle }: { frequency?: Map<string, number>; selected?: Set<string>; onToggle?: (id: string) => void }) {
  const fill = (id: string) => selected?.has(id) ? "#2563eb" : frequency?.has(id) ? `rgba(37,99,235,${Math.min(0.3 + (frequency.get(id) ?? 0) * 0.2, 1)})` : "#e5e7eb";
  const region = (id: string, shape: React.ReactNode) => <g key={id} onClick={() => onToggle?.(id)} className={onToggle ? "cursor-pointer" : ""} role={onToggle ? "button" : undefined} aria-label={MUSCLES.find(([value]) => value === id)?.[1]}><title>{MUSCLES.find(([value]) => value === id)?.[1]}</title>{shape}</g>;
  return <svg viewBox="0 0 420 360" className="mx-auto h-auto w-full max-w-md" aria-label="Mapa dos grupos musculares frontal e traseiro">
    <text x="104" y="18" textAnchor="middle" fontSize="11" fill="#9ca3af">Frente</text><text x="316" y="18" textAnchor="middle" fontSize="11" fill="#9ca3af">Costas</text>
    {[104, 316].map((x) => <g key={x} fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.2"><circle cx={x} cy="47" r="18" /><path d={`M${x - 24} 70 Q${x} 60 ${x + 24} 70 L${x + 34} 160 Q${x} 180 ${x - 34} 160 Z`} /><path d={`M${x - 25} 76 L${x - 54} 158 L${x - 42} 163 L${x - 12} 100 Z`} /><path d={`M${x + 25} 76 L${x + 54} 158 L${x + 42} 163 L${x + 12} 100 Z`} /><path d={`M${x - 27} 165 L${x - 37} 320 L${x - 16} 320 L${x} 184 Z`} /><path d={`M${x + 27} 165 L${x + 37} 320 L${x + 16} 320 L${x} 184 Z`} /></g>)}
    {region("peito", <><path d="M73 81 Q104 67 104 105 Q78 107 73 81Z" fill={fill("peito")} stroke="#fff" /><path d="M135 81 Q104 67 104 105 Q130 107 135 81Z" fill={fill("peito")} stroke="#fff" /></>)}
    {region("ombros", <><ellipse cx="70" cy="82" rx="13" ry="17" fill={fill("ombros")} /><ellipse cx="138" cy="82" rx="13" ry="17" fill={fill("ombros")} /><ellipse cx="282" cy="82" rx="13" ry="17" fill={fill("ombros")} /><ellipse cx="350" cy="82" rx="13" ry="17" fill={fill("ombros")} /></>)}
    {region("biceps", <><path d="M61 98 L49 130 L61 134 L75 102Z" fill={fill("biceps")} /><path d="M147 98 L159 130 L147 134 L133 102Z" fill={fill("biceps")} /></>)}
    {region("triceps", <><path d="M273 98 L261 132 L274 136 L287 102Z" fill={fill("triceps")} /><path d="M359 98 L371 132 L358 136 L345 102Z" fill={fill("triceps")} /></>)}
    {region("antebracos", <><path d="M48 132 L37 159 L49 162 L61 136Z" fill={fill("antebracos")} /><path d="M160 132 L171 159 L159 162 L147 136Z" fill={fill("antebracos")} /><path d="M260 134 L249 159 L261 162 L273 137Z" fill={fill("antebracos")} /><path d="M372 134 L383 159 L371 162 L359 137Z" fill={fill("antebracos")} /></>)}
    {region("abdomen", <path d="M85 108 Q104 102 123 108 L120 158 Q104 170 88 158Z" fill={fill("abdomen")} stroke="#fff" />)}
    {region("costas", <path d="M287 76 Q316 67 345 76 L337 143 Q316 158 295 143Z" fill={fill("costas")} stroke="#fff" />)}
    {region("gluteos", <><ellipse cx="301" cy="170" rx="17" ry="15" fill={fill("gluteos")} /><ellipse cx="331" cy="170" rx="17" ry="15" fill={fill("gluteos")} /></>)}
    {region("quadriceps", <><path d="M78 173 L68 240 L92 240 L103 184Z" fill={fill("quadriceps")} /><path d="M130 173 L140 240 L116 240 L105 184Z" fill={fill("quadriceps")} /></>)}
    {region("posteriores", <><path d="M290 184 L280 240 L304 240 L315 187Z" fill={fill("posteriores")} /><path d="M342 184 L352 240 L328 240 L317 187Z" fill={fill("posteriores")} /></>)}
    {region("panturrilhas", <><path d="M68 244 L67 304 Q80 315 90 304 L91 244Z" fill={fill("panturrilhas")} /><path d="M117 244 L118 304 Q130 315 141 304 L140 244Z" fill={fill("panturrilhas")} /><path d="M280 244 L279 304 Q292 315 302 304 L303 244Z" fill={fill("panturrilhas")} /><path d="M329 244 L330 304 Q342 315 353 304 L352 244Z" fill={fill("panturrilhas")} /></>)}
  </svg>;
}

function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-600">{error}</p>}<button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>;
}

function Field({ name, label, type = "text", defaultValue, required, step }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; step?: string }) {
  return <label className="block text-xs font-medium text-gray-500">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} step={step} className={`${inputClass} mt-1`} /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 text-gray-900"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-gray-500">Fechar</button></div>{children}</div></div>;
}
