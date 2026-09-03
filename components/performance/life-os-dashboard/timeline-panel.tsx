"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Pencil, Plus } from "lucide-react";
import { type LifeEvent, durationLabel, durationMinutes } from "@/lib/performance-life-os";
import { AllDayEventRows, BAHIA_TIME_LABEL_FORMATTER, CurrentDayTimeline, dateKeyInBahia } from "@/components/performance/PerformanceTimeline";
import { EventForm } from "./event-and-task-forms";
import { Modal } from "./modal-widgets";

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compareDatesAroundCurrent(
  left: string,
  right: string,
  current: string,
): number {
  if (left === right) return 0;
  if (left === current) return -1;
  if (right === current) return 1;
  const leftIsFuture = left > current;
  const rightIsFuture = right > current;
  if (leftIsFuture !== rightIsFuture) return leftIsFuture ? -1 : 1;
  return leftIsFuture ? left.localeCompare(right) : right.localeCompare(left);
}

function useCurrentBahiaDate(initialDate: string) {
  const [dateKey, setDateKey] = useState(initialDate);

  useEffect(() => {
    const update = () => setDateKey(dateKeyInBahia(new Date()));
    update();
    const interval = window.setInterval(update, 1_000);
    const synchronize = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);

  return dateKey;
}

export function CompactDayTimeline({
  events,
  onEvent,
}: {
  events: LifeEvent[];
  onEvent: (event: LifeEvent) => void;
}) {
  const allDayEvents = events.filter((event) => event.allDay);
  const timedEvents = events.filter((event) => !event.allDay);

  return (
    <>
      <AllDayEventRows events={allDayEvents} onEvent={onEvent} />
      {timedEvents.length > 0 && (
        <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[52px] before:top-3 before:w-px before:bg-white/20">
          {timedEvents.map((event) => (
            <div key={event.id} className="relative flex items-center gap-3">
              <div className="z-10 flex w-12 shrink-0 flex-col items-center">
                <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-blue-600">
                  <Clock3 className="size-3.5" />
                </span>
                <span className="mt-1 w-full text-center text-[10px] tabular-nums text-white/45">
                  {BAHIA_TIME_LABEL_FORMATTER.format(new Date(event.startAt))}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {durationLabel(durationMinutes(event.startAt, event.endAt))}{" "}
                    · {event.status === "completed" ? "Concluido" : "Planejado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEvent(event)}
                  className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                  title="Editar evento"
                  aria-label={`Editar ${event.title}`}
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function TimelinePanel({
  events,
  today,
  onNew,
  onCalendar,
}: {
  events: LifeEvent[];
  today: string;
  onNew: () => void;
  onCalendar: () => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState<LifeEvent | null>(null);
  const currentDateKey = useCurrentBahiaDate(today);
  const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    month: "long",
    year: "numeric",
  });
  const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const monthGroups = new Map<
    string,
    { label: string; days: Map<string, { label: string; events: LifeEvent[] }> }
  >();

  events.forEach((event) => {
    const eventDate = new Date(event.startAt);
    const dateKey = dateKeyInBahia(eventDate);
    const monthKey = dateKey.slice(0, 7);
    const month = monthGroups.get(monthKey) ?? {
      label: monthLabelFormatter.format(eventDate),
      days: new Map(),
    };
    const day = month.days.get(dateKey) ?? {
      label: dayLabelFormatter.format(eventDate),
      events: [],
    };
    day.events.push(event);
    month.days.set(dateKey, day);
    monthGroups.set(monthKey, month);
  });

  const currentDate = new Date(`${currentDateKey}T12:00:00-03:00`);
  const currentMonthKey = currentDateKey.slice(0, 7);
  const currentMonth = monthGroups.get(currentMonthKey) ?? {
    label: monthLabelFormatter.format(currentDate),
    days: new Map(),
  };
  if (!currentMonth.days.has(currentDateKey)) {
    currentMonth.days.set(currentDateKey, {
      label: dayLabelFormatter.format(currentDate),
      events: [],
    });
  }
  const currentDay = currentMonth.days.get(currentDateKey)!;
  const currentDayStart = new Date(
    `${currentDateKey}T00:00:00-03:00`,
  ).getTime();
  const nextDayStart = new Date(
    `${shiftDateKey(currentDateKey, 1)}T00:00:00-03:00`,
  ).getTime();
  const currentDayEventIds = new Set(
    currentDay.events.map((event: LifeEvent) => event.id),
  );
  events.forEach((event) => {
    const eventStart = new Date(event.startAt).getTime();
    const eventEnd = new Date(event.endAt).getTime();
    if (
      eventStart < nextDayStart &&
      eventEnd > currentDayStart &&
      !currentDayEventIds.has(event.id)
    ) {
      currentDay.events.push(event);
      currentDayEventIds.add(event.id);
    }
  });
  monthGroups.set(currentMonthKey, currentMonth);

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-[#15191f] p-4 text-white sm:p-5 xl:min-h-[620px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Eventos</h2>
          <p className="text-xs text-white/40">Linha do tempo completa</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg bg-blue-600 p-2"
            title="Novo evento"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCalendar}
            className="rounded-lg bg-white/10 p-2"
            title="Abrir agenda"
            aria-label="Abrir agenda"
          >
            <CalendarDays className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 space-y-7">
        {[...monthGroups]
          .sort(([left], [right]) =>
            compareDatesAroundCurrent(left, right, currentMonthKey),
          )
          .map(([monthKey, month]) => (
            <section key={monthKey}>
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                <CalendarDays className="size-4 text-blue-400" />
                <h3 className="text-sm font-semibold capitalize text-white">
                  {month.label}
                </h3>
              </div>
              <div className="space-y-6">
                {[...month.days]
                  .sort(([left], [right]) =>
                    compareDatesAroundCurrent(left, right, currentDateKey),
                  )
                  .map(([dateKey, day]) => {
                    const orderedEvents = [...day.events].sort(
                      (left, right) =>
                        new Date(left.startAt).getTime() -
                        new Date(right.startAt).getTime(),
                    );

                    return (
                      <div key={dateKey}>
                        <p className="mb-3 flex items-center gap-2 text-xs font-semibold capitalize text-white/55">
                          {day.label}
                          {dateKey === currentDateKey && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case text-red-400">
                              <span className="size-1.5 rounded-full bg-red-500 motion-safe:animate-pulse" />
                              Agora
                            </span>
                          )}
                        </p>
                        {dateKey === currentDateKey ? (
                          <CurrentDayTimeline
                            dateKey={dateKey}
                            events={orderedEvents}
                            onEvent={setSelectedEvent}
                          />
                        ) : (
                          <CompactDayTimeline
                            events={orderedEvents}
                            onEvent={setSelectedEvent}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
      </div>
      {selectedEvent && (
        <Modal title="Editar evento" onClose={() => setSelectedEvent(null)}>
          <EventForm
            event={selectedEvent}
            onDone={() => setSelectedEvent(null)}
          />
        </Modal>
      )}
    </section>
  );
}
