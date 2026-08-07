"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { criarEventoLifeOS, editarEventoLifeOS, removerEventoLifeOS } from "@/app/admin/performance/life-os-actions";
import { formatDateBR } from "@/lib/format";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";

export type CalendarEvent = { id: string; title: string; description: string | null; startAt: string; endAt: string; allDay: boolean; status: string; location: string | null };
type CalendarMode = "day" | "week" | "month" | "year";

const inputClass = "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";
function parseDate(value: string): Date { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function isoDate(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function shift(date: string, days: number): string { const value = parseDate(date); value.setDate(value.getDate() + days); return isoDate(value); }
function monday(date: string): string { const value = parseDate(date); const day = value.getDay(); value.setDate(value.getDate() + (day === 0 ? -6 : 1 - day)); return isoDate(value); }
function eventTime(value: string): string { return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Bahia" }); }
function eventDate(value: string): string { return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Bahia" }).format(new Date(value)); }

export function CalendarClient({ events, embedded = false, initialDate }: { events: CalendarEvent[]; embedded?: boolean; initialDate: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>("month");
  const [date, setDate] = useState(initialDate);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const visible = useMemo(() => {
    if (mode === "year") return events.filter((event) => eventDate(event.startAt).slice(0, 4) === date.slice(0, 4));
    if (mode === "month") return events.filter((event) => eventDate(event.startAt).slice(0, 7) === date.slice(0, 7));
    if (mode === "week") { const start = monday(date); const end = shift(start, 6); return events.filter((event) => eventDate(event.startAt) >= start && eventDate(event.startAt) <= end); }
    return events.filter((event) => eventDate(event.startAt) === date);
  }, [date, events, mode]);

  const title = mode === "year" ? date.slice(0, 4) : mode === "day" ? formatDateBR(date) : mode === "week" ? `${formatDateBR(monday(date))} - ${formatDateBR(shift(monday(date), 6))}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));
  const move = (amount: number) => {
    if (mode === "day") return setDate(shift(date, amount));
    if (mode === "week") return setDate(shift(date, amount * 7));
    const value = parseDate(date); value.setDate(1); if (mode === "year") value.setFullYear(value.getFullYear() + amount); else value.setMonth(value.getMonth() + amount); setDate(isoDate(value));
  };

  const content = <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!embedded ? <button type="button" onClick={() => router.push("/admin/performance?view=agenda")} className="inline-flex items-center gap-2 text-sm text-white/60"><ArrowLeft className="size-4" />Dashboard</button> : <div />}
      <button type="button" onClick={() => setDraftDate(date)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="size-4" />Novo evento</button>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Calendario pessoal</p><h1 className="mt-1 text-2xl font-bold capitalize">{title}</h1></div>
      <div className="flex items-center gap-1"><button type="button" onClick={() => move(-1)} className="rounded-lg p-2 text-white/60 hover:bg-white/10" title="Periodo anterior"><ChevronLeft className="size-5" /></button><button type="button" onClick={() => setDate(initialDate)} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10">Hoje</button><button type="button" onClick={() => move(1)} className="rounded-lg p-2 text-white/60 hover:bg-white/10" title="Proximo periodo"><ChevronRight className="size-5" /></button></div>
    </div>
    <div className="mt-3 flex gap-1 overflow-x-auto pb-1">{(["day", "week", "month", "year"] as CalendarMode[]).map((value) => <button type="button" key={value} onClick={() => setMode(value)} className={`shrink-0 rounded-lg px-3 py-2 text-sm ${mode === value ? "bg-white text-gray-900" : "text-white/55 hover:bg-white/10"}`}>{value === "day" ? "Dia" : value === "week" ? "Semana" : value === "month" ? "Mes" : "Ano"}</button>)}</div>
    <CalendarBody mode={mode} date={date} today={initialDate} events={visible} onDay={(value) => setDraftDate(value)} onEvent={setEditing} onOpenMonth={(month) => { setDate(`${month}-01`); setMode("month"); }} />
  </>;

  return <>{embedded ? <section className="min-w-0 text-white">{content}</section> : <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#0b0d10] px-3 py-5 text-white sm:px-4 lg:px-6 2xl:px-8"><div className="w-full min-w-0">{content}</div></main>}{draftDate && <EventModal date={draftDate} onClose={() => setDraftDate(null)} onDone={() => { setDraftDate(null); router.refresh(); }} />}{editing && <EventModal event={editing} date={eventDate(editing.startAt)} onClose={() => setEditing(null)} onDone={() => { setEditing(null); router.refresh(); }} />}</>;
}

function CalendarBody({ mode, date, today, events, onDay, onEvent, onOpenMonth }: { mode: CalendarMode; date: string; today: string; events: CalendarEvent[]; onDay: (date: string) => void; onEvent: (event: CalendarEvent) => void; onOpenMonth: (month: string) => void }) {
  if (mode === "day") return <section className="mt-5 rounded-lg border border-white/10 bg-[#15191f] p-5 text-white"><button type="button" onClick={() => onDay(date)} className="flex w-full items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-left"><span className="font-semibold">{formatDateBR(date)}</span><span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300"><Plus className="size-3.5" />Evento</span></button><div className="mt-3 space-y-2">{events.map((event) => <EventCard key={event.id} event={event} onClick={() => onEvent(event)} />)}{!events.length && <EmptyDay onClick={() => onDay(date)} />}</div></section>;
  if (mode === "week") { const start = monday(date); return <section className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-[#15191f] p-3 text-white"><div className="grid min-w-[840px] grid-cols-7 divide-x divide-white/10">{Array.from({ length: 7 }, (_, index) => { const current = shift(start, index); const dayEvents = events.filter((event) => eventDate(event.startAt) === current); return <div key={current} className="min-h-[420px] px-2"><button type="button" onClick={() => onDay(current)} className={`mb-3 w-full rounded-lg px-2 py-3 text-center hover:bg-white/[0.06] ${current === today ? "bg-blue-600 text-white" : "bg-white/[0.03] text-white/60"}`}><span className="block text-[10px] uppercase">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${current}T12:00:00Z`))}</span><b className="mt-1 block text-lg">{Number(current.slice(8))}</b></button><div className="space-y-2">{dayEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEvent(event)} compact />)}</div></div>; })}</div></section>; }
  if (mode === "year") return <section className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 12 }, (_, index) => { const month = `${date.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`; const count = events.filter((event) => eventDate(event.startAt).slice(0, 7) === month).length; return <button type="button" key={month} onClick={() => onOpenMonth(month)} className="rounded-lg border border-white/10 bg-[#15191f] p-4 text-left text-white hover:border-blue-400/50"><p className="font-semibold capitalize">{new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</p><p className="mt-3 text-xs text-white/35">{count} evento{count === 1 ? "" : "s"}</p></button>; })}</section>;

  const first = `${date.slice(0, 7)}-01`;
  const offset = parseDate(first).getDay() === 0 ? 6 : parseDate(first).getDay() - 1;
  const gridStart = shift(first, -offset);

  return <section className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-[#15191f] text-white">
    <div className="min-w-[700px]">
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.025] text-center text-xs font-semibold text-white/35">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => <span key={label} className="py-3">{label}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, index) => {
          const current = shift(gridStart, index);
          const inMonth = current.slice(0, 7) === date.slice(0, 7);
          const dayEvents = events.filter((event) => eventDate(event.startAt) === current);
          return <div key={current} className={`min-h-28 border-b border-r border-white/10 p-2 ${inMonth ? "bg-[#15191f] text-white/75" : "bg-black/10 text-white/20"}`}>
            <button type="button" onClick={() => onDay(current)} className="rounded-full hover:bg-white/[0.08]" title="Adicionar evento">
              <span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${current === today ? "bg-blue-600 text-white" : ""}`}>{Number(current.slice(8))}</span>
            </button>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => onEvent(event)} className="block w-full truncate rounded bg-blue-400/10 px-1.5 py-1 text-left text-[10px] font-medium text-blue-200"><span className="mr-1 text-blue-400">{eventTime(event.startAt)}</span>{event.title}</button>)}
              {dayEvents.length > 3 && <span className="block px-1 text-[10px] text-white/35">+{dayEvents.length - 3} eventos</span>}
            </div>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function EventCard({ event, onClick, compact = false }: { event: CalendarEvent; onClick: () => void; compact?: boolean }) { return <button type="button" onClick={onClick} className={`w-full rounded-lg border border-blue-400/20 bg-blue-400/10 text-left text-blue-100 hover:border-blue-400/50 ${compact ? "p-2" : "p-3"}`}><div className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0 text-blue-400" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{event.title}</span><span className="mt-0.5 block text-[10px] text-blue-300/70">{eventTime(event.startAt)} - {eventTime(event.endAt)}</span></span><Pencil className="size-3.5 shrink-0 text-blue-300/40" /></div>{event.location && !compact && <span className="mt-2 flex items-center gap-1 text-[10px] text-blue-300/70"><MapPin className="size-3" />{event.location}</span>}</button>; }
function EmptyDay({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-sm text-white/35 hover:border-blue-400/40 hover:text-blue-300"><CalendarDays className="size-4" />Clique para adicionar um evento</button>; }

function EventModal({ date, event, onClose, onDone }: { date: string; event?: CalendarEvent; onClose: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  const confirm = usePerformanceConfirm();
  const startDate = event ? eventDate(event.startAt) : date; const endDate = event ? eventDate(event.endAt) : date;
  const submit = (formData: FormData) => {
    const starts = `${String(formData.get("start_date"))}T${String(formData.get("start_time"))}:00-03:00`;
    const ends = `${String(formData.get("end_date"))}T${String(formData.get("end_time"))}:00-03:00`;
    if (new Date(ends).getTime() <= new Date(starts).getTime()) return setError("O termino precisa ser depois do inicio.");
    formData.set("start_at", starts); formData.set("end_at", ends);
    setError(null); startTransition(async () => { const result = event ? await editarEventoLifeOS(event.id, formData) : await criarEventoLifeOS(formData); if (!result.ok) setError(result.error ?? "Nao foi possivel salvar."); else onDone(); });
  };
  const remove = async () => {
    if (!event) return;
    const approved = await confirm({ title: "Excluir evento?", description: `O evento “${event.title}” sera removido da agenda definitivamente.`, confirmLabel: "Excluir evento" });
    if (!approved) return;
    startTransition(async () => { const result = await removerEventoLifeOS(event.id); if (!result.ok) setError(result.error ?? "Nao foi possivel excluir."); else onDone(); });
  };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-4 text-white sm:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{event ? "Editar evento" : "Novo evento"}</h2><button type="button" onClick={onClose} className="text-sm text-white/45">Fechar</button></div><form action={submit} className="space-y-3"><Field name="title" label="Nome" defaultValue={event?.title} required /><div className="grid gap-3 sm:grid-cols-2"><Field name="start_date" label="Data de inicio" type="date" defaultValue={startDate} required /><Field name="start_time" label="Hora de inicio" type="time" defaultValue={event ? eventTime(event.startAt) : "09:00"} required /><Field name="end_date" label="Data de termino" type="date" defaultValue={endDate} required /><Field name="end_time" label="Hora de termino" type="time" defaultValue={event ? eventTime(event.endAt) : "10:00"} required /></div><Field name="location" label="Local" defaultValue={event?.location ?? undefined} /><label className="block text-xs font-medium text-white/45">Descricao<textarea name="description" defaultValue={event?.description ?? undefined} rows={3} className={`${inputClass} mt-1 resize-none`} /></label>{error && <p className="text-xs text-red-300">{error}</p>}<div className="flex flex-wrap items-center justify-between gap-3"><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar</button>{event && <button type="button" onClick={remove} disabled={pending} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10"><Trash2 className="size-4" />Excluir</button>}</div></form></div></div>;
}

function Field({ name, label, type = "text", defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) { return <label className="block text-xs font-medium text-white/45">{label}<input name={name} type={type} defaultValue={defaultValue} required={required} className={`${inputClass} mt-1`} /></label>; }
