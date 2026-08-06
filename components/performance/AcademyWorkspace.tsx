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

const inputClass = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-500";

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
      <button type="button" onClick={() => setEditingData(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white"><Database className="size-4" />Dados</button>
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
      <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
        <div><h3 className="font-semibold">Mapa muscular</h3><p className="mt-1 text-xs text-white/35">Grupos treinados nos ultimos 7 dias. Quanto mais azul, maior a frequencia.</p></div>
        <div className="mt-4"><MuscleBodyMap frequency={muscleFrequency} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{MUSCLES.filter(([id]) => muscleFrequency.has(id)).map(([id, label]) => <span key={id} className="rounded-md bg-blue-400/10 px-2 py-1 text-xs text-blue-300">{label} {muscleFrequency.get(id)}x</span>)}</div>
        {!muscleFrequency.size && <p className="mt-4 text-center text-sm text-white/35">O mapa ganha cor conforme os treinos forem registrados.</p>}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Historico de treinos</h3><p className="mt-1 text-xs text-white/35">{activities.length} registros</p></div><button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Novo treino</button></div>
        <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
          {activities.map((item) => <div key={item.id} className="flex items-start gap-3 border-b border-white/[0.06] py-3 last:border-0">
            <div className="min-w-0 flex-1"><p className="font-medium text-white/85">{item.title}</p><p className="mt-0.5 text-xs text-white/35">{formatDateBR(item.date)} · {item.durationMinutes ? minutesLabel(item.durationMinutes) : "Sem duracao"}</p><div className="mt-2 flex flex-wrap gap-1">{item.muscleGroups.map((id) => <span key={id} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/40">{MUSCLES.find(([value]) => value === id)?.[1] ?? id}</span>)}</div></div>
            <button type="button" onClick={() => setEditing(item)} className="rounded-md p-1.5 text-white/35 hover:bg-white/[0.06] hover:text-blue-400" title="Editar treino"><Pencil className="size-4" /></button>
            <button type="button" onClick={async () => { if (window.confirm("Excluir este treino?")) { await removerTreinoAcademiaLifeOS(item.id); router.refresh(); } }} className="rounded-md p-1.5 text-white/25 hover:bg-red-400/10 hover:text-red-300" title="Excluir treino"><Trash2 className="size-4" /></button>
          </div>)}
          {!activities.length && <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-white/35">Nenhum treino registrado.</p>}
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
    <div><p className="mb-2 text-xs font-medium text-white/45">Musculos treinados</p><MuscleBodyMap selected={selected} onToggle={(id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} /></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{MUSCLES.map(([id, label]) => <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${selected.has(id) ? "border-blue-500 bg-blue-400/10 text-blue-300" : "border-white/10 text-white/45"}`}><input type="checkbox" name="muscle_groups" value={id} checked={selected.has(id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} className="sr-only" /><span className={`flex size-4 items-center justify-center rounded ${selected.has(id) ? "bg-blue-600" : "ring-1 ring-white/20"}`}>{selected.has(id) && <Check className="size-3 text-white" />}</span>{label}</label>)}</div>
    <Field name="notes" label="Observacao" defaultValue={activity?.notes ?? undefined} />
  </AsyncForm>;
}

function AcademyDataForm({ today, heightCm, currentWeight, targetWeight, onDone }: { today: string; heightCm: number | null; currentWeight: number | null; targetWeight: number | null; onDone: () => void }) {
  return <AsyncForm action={salvarDadosAcademiaLifeOS} onDone={onDone}>
    <div className="grid gap-3 sm:grid-cols-2"><Field name="height_cm" label="Altura (cm)" type="number" defaultValue={heightCm?.toString()} required /><Field name="current_weight" label="Peso atual (kg)" type="number" step="0.1" defaultValue={currentWeight?.toString()} required /></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field name="target_weight" label="Meta de peso (kg)" type="number" step="0.1" defaultValue={targetWeight?.toString()} required /><Field name="weight_date" label="Data da pesagem" type="date" defaultValue={today} required /></div>
    <p className="text-xs text-white/35">Registrar o peso uma vez por semana costuma mostrar tendencia sem transformar a balanca em tarefa diaria.</p>
  </AsyncForm>;
}

function WeightEvolution({ weights, targetWeight }: { weights: { data: string; peso_kg: number }[]; targetWeight: number | null }) {
  const data = weights.slice(-52).map((item) => ({ ...item, label: `${item.data.slice(8)}/${item.data.slice(5, 7)}` }));
  return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white"><div><h3 className="font-semibold">Evolucao do peso</h3><p className="mt-1 text-xs text-white/35">Recomendacao: uma pesagem por semana, nas mesmas condicoes.</p></div><div className="mt-5 h-64">{data.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}><CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} /><YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${Number(value).toFixed(1)} kg`, "Peso"]} contentStyle={{ borderRadius: 8, borderColor: "rgba(255,255,255,0.1)", background: "#0b0d10", color: "white" }} /><Line type="monotone" dataKey="peso_kg" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />{targetWeight != null && <Line type="monotone" data={data.map((item) => ({ ...item, target: targetWeight }))} dataKey="target" stroke="#10b981" strokeDasharray="5 5" dot={false} />}</LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-white/35">Registre seu peso para acompanhar a evolucao.</div>}</div></section>;
}

function MuscleBodyMap({ frequency, selected, onToggle }: { frequency?: Map<string, number>; selected?: Set<string>; onToggle?: (id: string) => void }) {
  const fill = (id: string) => selected?.has(id) ? "#2563eb" : frequency?.has(id) ? `rgba(59,130,246,${Math.min(0.38 + (frequency.get(id) ?? 0) * 0.16, 1)})` : "#333a44";
  const region = (id: string, shape: React.ReactNode) => <g key={id} onClick={() => onToggle?.(id)} className={onToggle ? "cursor-pointer transition-opacity hover:opacity-80" : ""} role={onToggle ? "button" : undefined} aria-label={MUSCLES.find(([value]) => value === id)?.[1]}><title>{MUSCLES.find(([value]) => value === id)?.[1]}</title>{shape}</g>;
  const muscleStroke = "#15191f";

  return <svg viewBox="0 0 520 430" className="mx-auto h-auto w-full max-w-xl" aria-label="Mapa anatomico dos grupos musculares frontal e traseiro">
    <text x="145" y="20" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.38)">Frente</text>
    <text x="375" y="20" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.38)">Costas</text>

    <g fill="#252b33" stroke="#69727e" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M130 42 C132 26 158 26 160 42 L157 63 C154 75 136 75 133 63Z" />
      <path d="M360 42 C362 26 388 26 390 42 L387 63 C384 75 366 75 363 63Z" />
      <path d="M136 70 L131 82 C105 87 91 101 88 126 L78 205 C77 214 86 217 91 208 L111 143 L116 184 C119 207 124 222 128 232 L115 318 L120 403 L143 403 L145 326 L147 260 L149 326 L151 403 L174 403 L179 318 L166 232 C170 222 175 207 178 184 L183 143 L203 208 C208 217 217 214 216 205 L206 126 C203 101 189 87 163 82 L158 70Z" />
      <path d="M366 70 L361 82 C335 87 321 101 318 126 L308 205 C307 214 316 217 321 208 L341 143 L346 184 C349 207 354 222 358 232 L345 318 L350 403 L373 403 L375 326 L377 260 L379 326 L381 403 L404 403 L409 318 L396 232 C400 222 405 207 408 184 L413 143 L433 208 C438 217 447 214 446 205 L436 126 C433 101 419 87 393 82 L388 70Z" />
    </g>

    {region("peito", <><path d="M112 93 C121 83 141 83 145 91 L145 132 C128 133 115 124 108 108Z" fill={fill("peito")} stroke={muscleStroke} /><path d="M178 93 C169 83 149 83 145 91 L145 132 C162 133 175 124 182 108Z" fill={fill("peito")} stroke={muscleStroke} /></>)}
    {region("ombros", <><path d="M108 91 C93 93 87 106 90 122 C96 128 104 126 112 117 L119 98Z" fill={fill("ombros")} stroke={muscleStroke} /><path d="M182 91 C197 93 203 106 200 122 C194 128 186 126 178 117 L171 98Z" fill={fill("ombros")} stroke={muscleStroke} /><path d="M338 92 C326 95 319 106 320 121 C328 127 337 124 345 115 L349 98Z" fill={fill("ombros")} stroke={muscleStroke} /><path d="M412 92 C424 95 431 106 430 121 C422 127 413 124 405 115 L401 98Z" fill={fill("ombros")} stroke={muscleStroke} /></>)}
    {region("biceps", <><path d="M96 125 C88 141 87 164 92 177 C101 178 108 165 111 145 L112 119Z" fill={fill("biceps")} stroke={muscleStroke} /><path d="M194 125 C202 141 203 164 198 177 C189 178 182 165 179 145 L178 119Z" fill={fill("biceps")} stroke={muscleStroke} /></>)}
    {region("triceps", <><path d="M326 122 C317 141 316 163 322 178 C331 177 338 163 341 143 L342 117Z" fill={fill("triceps")} stroke={muscleStroke} /><path d="M424 122 C433 141 434 163 428 178 C419 177 412 163 409 143 L408 117Z" fill={fill("triceps")} stroke={muscleStroke} /></>)}
    {region("antebracos", <><path d="M91 176 L79 207 C77 214 86 217 91 208 L105 176Z" fill={fill("antebracos")} stroke={muscleStroke} /><path d="M199 176 L211 207 C213 214 204 217 199 208 L185 176Z" fill={fill("antebracos")} stroke={muscleStroke} /><path d="M321 177 L309 207 C307 214 316 217 321 208 L335 176Z" fill={fill("antebracos")} stroke={muscleStroke} /><path d="M429 177 L441 207 C443 214 434 217 429 208 L415 176Z" fill={fill("antebracos")} stroke={muscleStroke} /></>)}
    {region("abdomen", <><path d="M119 132 C126 127 136 130 143 135 L142 210 C133 218 124 212 118 198Z" fill={fill("abdomen")} stroke={muscleStroke} /><path d="M171 132 C164 127 154 130 147 135 L148 210 C157 218 166 212 172 198Z" fill={fill("abdomen")} stroke={muscleStroke} /><path d="M145 137 L145 208 M122 154 L168 154 M120 177 L170 177" fill="none" stroke="#15191f" strokeWidth="2" pointerEvents="none" /></>)}
    {region("costas", <><path d="M346 91 C357 82 369 85 374 95 L373 169 C357 165 345 151 339 129Z" fill={fill("costas")} stroke={muscleStroke} /><path d="M404 91 C393 82 381 85 376 95 L377 169 C393 165 405 151 411 129Z" fill={fill("costas")} stroke={muscleStroke} /><path d="M352 165 C362 171 369 180 374 211 L360 224 C351 207 347 188 346 170Z" fill={fill("costas")} stroke={muscleStroke} /><path d="M398 165 C388 171 381 180 376 211 L390 224 C399 207 403 188 404 170Z" fill={fill("costas")} stroke={muscleStroke} /></>)}
    {region("gluteos", <><path d="M349 218 C357 207 370 208 374 224 L373 251 C359 257 348 247 346 233Z" fill={fill("gluteos")} stroke={muscleStroke} /><path d="M401 218 C393 207 380 208 376 224 L377 251 C391 257 402 247 404 233Z" fill={fill("gluteos")} stroke={muscleStroke} /></>)}
    {region("quadriceps", <><path d="M119 226 C127 216 139 220 143 240 L141 317 C132 326 119 315 117 299Z" fill={fill("quadriceps")} stroke={muscleStroke} /><path d="M171 226 C163 216 151 220 147 240 L149 317 C158 326 171 315 173 299Z" fill={fill("quadriceps")} stroke={muscleStroke} /><path d="M128 233 L132 309 M162 233 L158 309" fill="none" stroke="#15191f" strokeWidth="1.5" pointerEvents="none" /></>)}
    {region("posteriores", <><path d="M349 251 C359 246 370 252 373 271 L371 318 C362 327 349 316 347 301Z" fill={fill("posteriores")} stroke={muscleStroke} /><path d="M401 251 C391 246 380 252 377 271 L379 318 C388 327 401 316 403 301Z" fill={fill("posteriores")} stroke={muscleStroke} /></>)}
    {region("panturrilhas", <><path d="M117 319 C127 312 138 323 140 344 L139 389 C133 401 122 398 119 383Z" fill={fill("panturrilhas")} stroke={muscleStroke} /><path d="M173 319 C163 312 152 323 150 344 L151 389 C157 401 168 398 171 383Z" fill={fill("panturrilhas")} stroke={muscleStroke} /><path d="M347 319 C357 312 368 323 370 344 L369 389 C363 401 352 398 349 383Z" fill={fill("panturrilhas")} stroke={muscleStroke} /><path d="M403 319 C393 312 382 323 380 344 L381 389 C387 401 398 398 401 383Z" fill={fill("panturrilhas")} stroke={muscleStroke} /></>)}

    <g fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="1" pointerEvents="none">
      <path d="M145 76 L145 215 M375 76 L375 251" /><path d="M133 48 C137 54 153 54 157 48 M363 48 C367 54 383 54 387 48" />
      <path d="M124 235 C132 244 139 250 142 263 M166 235 C158 244 151 250 148 263 M354 266 C362 272 368 282 371 294 M396 266 C388 272 382 282 379 294" />
    </g>
  </svg>;
}

function AsyncForm({ action, onDone, children }: { action: (data: FormData) => Promise<{ ok: boolean; error?: string }>; onDone: () => void; children: React.ReactNode }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setError(null); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); }); }} className="space-y-3">{children}{error && <p className="text-xs text-red-300">{error}</p>}<button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button></form>;
}

function Field({ name, label, type = "text", defaultValue, required, step }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; step?: string }) {
  return <label className="block text-xs font-medium text-white/45">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} step={step} className={`${inputClass} mt-1`} /></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-5 text-white"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="text-sm text-white/45">Fechar</button></div>{children}</div></div>;
}
