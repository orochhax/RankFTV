"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
// Kept at the existing client-to-Server-Action boundary after extracting the forms.
// eslint-disable-next-line import-x/no-restricted-paths
import { criarEventoLifeOS, criarTarefaLifeOS, editarEventoLifeOS, editarTarefaLifeOS, removerEventoLifeOS } from "@/app/admin/performance/life-os-actions";
import { type TaskOccurrence } from "@/lib/performance-dashboard";
import { type LifeEvent } from "@/lib/performance-life-os";
import { EventRecurrenceFields } from "@/components/performance/EventRecurrenceFields";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { ActionForm, Field } from "./ui-primitives";

function eventLocalFields(value: string): { date: string; time: string } {
  const instant = new Date(value);
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bahia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    time: instant.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Bahia",
    }),
  };
}

export function EventForm({
  onDone,
  initialDate,
  event,
}: {
  onDone: () => void;
  initialDate?: string;
  event?: LifeEvent;
}) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
  const initialStart = event
    ? eventLocalFields(event.baseStartAt ?? event.startAt)
    : { date: initialDate ?? "", time: "09:00" };
  const initialEnd = event
    ? eventLocalFields(event.baseEndAt ?? event.endAt)
    : { date: initialDate ?? "", time: "10:00" };
  const [date, setDate] = useState(initialStart.date);
  const [start, setStart] = useState(initialStart.time);
  const [end, setEnd] = useState(initialEnd.time);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const action = async (data: FormData) => {
    const eventDate = String(data.get("event_date") ?? "");
    const eventStart = String(data.get("event_start") ?? "");
    const eventEnd = String(data.get("event_end") ?? "");
    if (!eventDate || !eventStart || !eventEnd)
      return { ok: false, error: "Informe data e horarios." };
    if (data.get("all_day") !== "on" && eventEnd <= eventStart)
      return {
        ok: false,
        error: "O horario de termino deve ser depois do inicio.",
      };
    data.set("start_at", `${eventDate}T${eventStart}:00-03:00`);
    data.set("end_at", `${eventDate}T${eventEnd}:00-03:00`);
    return event ? editarEventoLifeOS(event.id, data) : criarEventoLifeOS(data);
  };
  return (
    <div>
      <ActionForm action={action} onDone={onDone}>
        <Field name="title" title="Nome" value={event?.title} required />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            name="event_date"
            title="Data"
            type="date"
            value={date}
            onChange={setDate}
            required
          />
          <Field
            name="event_start"
            title="Inicio"
            type="time"
            value={start}
            onChange={(value) => {
              setStart(value);
              if (value && end <= value) setEnd(value);
            }}
            required
          />
          <Field
            name="event_end"
            title="Termino"
            type="time"
            value={end}
            min={start}
            onChange={setEnd}
            required
          />
        </div>
        <EventRecurrenceFields startDate={date} initialRule={event?.recurrenceRule} initialAllDay={event?.allDay} tone="light" />
        <Field
          name="description"
          title="Descricao"
          value={event?.description ?? undefined}
        />
      </ActionForm>
      {event && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          {deleteError && (
            <p className="mb-2 text-xs text-red-600">{deleteError}</p>
          )}
          <button
            type="button"
            disabled={deletePending}
            onClick={async () => {
              const approved = await confirm({
                title: event.recurrenceRule ? "Excluir série recorrente?" : "Excluir evento?",
                description: event.recurrenceRule ? `Todas as ocorrências de “${event.title}” serão removidas.` : `O evento “${event.title}” será removido da agenda definitivamente.`,
                confirmLabel: event.recurrenceRule ? "Excluir série" : "Excluir evento",
              });
              if (!approved) return;
              setDeleteError(null);
              startDelete(async () => {
                const result = await removerEventoLifeOS(event.id);
                if (!result.ok)
                  setDeleteError(
                    result.error ?? "Nao foi possivel excluir o evento.",
                  );
                else {
                  onDone();
                  router.refresh();
                }
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deletePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {event.recurrenceRule ? "Excluir série" : "Excluir evento"}
          </button>
        </div>
      )}
    </div>
  );
}

export function TaskForm({
  task,
  onDone,
}: {
  task: TaskOccurrence;
  onDone: () => void;
}) {
  const [repeat, setRepeat] = useState(task.recurrenceType === "daily");
  const action = task.id
    ? (data: FormData) => editarTarefaLifeOS(task.id, data)
    : criarTarefaLifeOS;
  return (
    <ActionForm action={action} onDone={onDone}>
      <Field name="title" title="Nome" value={task.title} required />
      <Field
        name="start_date"
        title="Data"
        type="date"
        value={task.startDate}
        required
      />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="recurrence_type"
          value="daily"
          checked={repeat}
          onChange={(event) => setRepeat(event.target.checked)}
        />
        Repetir diariamente
      </label>
      {repeat && (
        <Field
          name="recurrence_end_date"
          title="Repetir ate"
          type="date"
          value={task.recurrenceEndDate ?? task.startDate}
          required
        />
      )}
    </ActionForm>
  );
}
