"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  durationLabel,
  durationMinutes,
  minutesSinceMidnightInBahia,
  type LifeEvent,
} from "@/lib/performance-life-os";

const TIMELINE_HOUR_HEIGHT = 80;
const TIMELINE_TOP_PADDING = 28;
const TIMELINE_BOTTOM_PADDING = 40;
const TIMELINE_MIN_EVENT_HEIGHT = 20;
const BAHIA_DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bahia",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const BAHIA_TIME_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Bahia",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function dateKeyInBahia(value: Date): string {
  const parts = Object.fromEntries(BAHIA_DATE_KEY_FORMATTER.formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function useLiveNow() {
  const [clock, setClock] = useState<{ now: Date | null; animate: boolean }>({ now: null, animate: false });

  useEffect(() => {
    let interval: number | null = null;
    const tick = () => setClock({ now: new Date(), animate: true });
    const stop = () => {
      if (interval !== null) window.clearInterval(interval);
      interval = null;
    };
    const synchronize = () => {
      stop();
      if (document.hidden) return;
      setClock({ now: new Date(), animate: false });
      interval = window.setInterval(tick, 1_000);
    };
    synchronize();
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", synchronize);
    };
  }, []);

  return clock;
}

type PositionedTimelineEvent = {
  event: LifeEvent;
  startMinutes: number;
  endMinutes: number;
  visualEndMinutes: number;
  lane: number;
  lanesCount: number;
};

function layoutTimelineEvents(events: LifeEvent[], dateKey: string): PositionedTimelineEvent[] {
  const minimumVisualMinutes = 15;
  const positioned = events
    .filter((event) => !event.allDay)
    .map((event) => {
      const startDate = new Date(event.startAt);
      const endDate = new Date(event.endAt);
      const startMinutes = dateKeyInBahia(startDate) === dateKey
        ? Math.max(0, Math.min(1_440, minutesSinceMidnightInBahia(startDate)))
        : 0;
      const rawEndMinutes = dateKeyInBahia(endDate) === dateKey ? minutesSinceMidnightInBahia(endDate) : 1_440;
      const endMinutes = Math.min(1_440, Math.max(startMinutes + 15, rawEndMinutes));
      return {
        event,
        startMinutes,
        endMinutes,
        visualEndMinutes: Math.min(1_440, Math.max(endMinutes, startMinutes + minimumVisualMinutes)),
        lane: 0,
        lanesCount: 1,
      };
    })
    .sort((left, right) => (left.startMinutes - right.startMinutes) || (left.endMinutes - right.endMinutes));

  const lanesEnd: number[] = [];
  let clusterStart = 0;
  let clusterEnd = -1;
  const closeCluster = (end: number) => {
    if (end <= clusterStart) return;
    const lanesCount = Math.max(...positioned.slice(clusterStart, end).map((item) => item.lane)) + 1;
    for (let index = clusterStart; index < end; index += 1) positioned[index].lanesCount = lanesCount;
  };

  positioned.forEach((item, index) => {
    if (index > clusterStart && item.startMinutes >= clusterEnd) {
      closeCluster(index);
      lanesEnd.length = 0;
      clusterStart = index;
    }
    let lane = lanesEnd.findIndex((end) => item.startMinutes >= end);
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(item.visualEndMinutes);
    } else {
      lanesEnd[lane] = item.visualEndMinutes;
    }
    item.lane = lane;
    clusterEnd = Math.max(clusterEnd, item.visualEndMinutes);
  });
  closeCluster(positioned.length);
  return positioned;
}

function CurrentTimeIndicator({ dateKey }: { dateKey: string }) {
  const { now, animate } = useLiveNow();
  if (!now || dateKeyInBahia(now) !== dateKey) return null;

  const label = BAHIA_TIME_LABEL_FORMATTER.format(now);
  const offset = TIMELINE_TOP_PADDING + minutesSinceMidnightInBahia(now) * (TIMELINE_HOUR_HEIGHT / 60);
  return <div style={{ transform: `translate3d(0, ${offset}px, 0)` }} className={`pointer-events-none absolute inset-x-0 top-0 z-30 h-px motion-reduce:transition-none [will-change:transform] ${animate ? "transition-transform duration-[1000ms] ease-linear" : ""}`}>
    <time dateTime={now.toISOString()} aria-label={`Horário atual: ${label}`} className="absolute left-0 top-1/2 w-12 -translate-y-1/2 bg-[#15191f] text-center text-[10px] font-semibold tabular-nums text-red-400">
      {label}
    </time>
    <span aria-hidden="true" className="absolute left-[52px] right-0 top-1/2 h-px -translate-y-1/2 bg-red-500/90">
      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_2px_#15191f] motion-safe:animate-pulse" />
    </span>
  </div>;
}

export function AllDayEventRows({ events, onEvent }: { events: LifeEvent[]; onEvent: (event: LifeEvent) => void }) {
  if (!events.length) return null;

  return <div className="mb-3 flex items-start gap-3">
    <span className="w-12 shrink-0 pt-2 text-center text-[10px] font-semibold text-white/35">Dia todo</span>
    <div className="min-w-0 flex-1 space-y-1.5">{events.map((event) => <button key={event.id} type="button" onClick={() => onEvent(event)} className="flex w-full items-center justify-between gap-2 rounded-md border border-blue-400/20 bg-blue-400/10 px-2.5 py-2 text-left text-xs text-blue-100 hover:border-blue-400/45"><span className="truncate font-semibold">{event.title}</span><Pencil className="size-3.5 shrink-0 text-blue-300/45" /></button>)}</div>
  </div>;
}

export function CurrentDayTimeline({ dateKey, events, onEvent }: { dateKey: string; events: LifeEvent[]; onEvent: (event: LifeEvent) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const centeredDateRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const allDayEvents = useMemo(() => events.filter((event) => event.allDay), [events]);
  const positionedEvents = useMemo(() => layoutTimelineEvents(events, dateKey), [dateKey, events]);
  const totalHeight = TIMELINE_TOP_PADDING + 24 * TIMELINE_HOUR_HEIGHT + TIMELINE_BOTTOM_PADDING;

  useEffect(() => {
    if (centeredDateRef.current === dateKey) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        const now = new Date();
        if (dateKeyInBahia(now) === dateKey) {
          const nowTop = TIMELINE_TOP_PADDING + minutesSinceMidnightInBahia(now) * (TIMELINE_HOUR_HEIGHT / 60);
          const target = Math.max(0, Math.min(totalHeight - viewport.clientHeight, nowTop - viewport.clientHeight * 0.42));
          viewport.scrollTo({ top: target, behavior: "auto" });
        }
      }
      centeredDateRef.current = dateKey;
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dateKey, totalHeight]);

  return <div>
    <AllDayEventRows events={allDayEvents} onEvent={onEvent} />
    <div ref={viewportRef} role="region" tabIndex={0} aria-label={`Agenda horária de ${dateKey}`} className={`relative h-[360px] overflow-y-auto rounded-lg border border-white/[0.08] bg-black/10 outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-blue-500/70 motion-reduce:transition-none [scrollbar-width:thin] sm:h-[420px] ${ready ? "opacity-100" : "opacity-0"}`}>
      <div className="relative min-w-0" style={{ height: totalHeight }}>
        {Array.from({ length: 25 }, (_, hour) => {
          const top = TIMELINE_TOP_PADDING + hour * TIMELINE_HOUR_HEIGHT;
          return <div key={hour}>
            {hour < 24 && <span style={{ top }} className="absolute left-0 w-12 -translate-y-1/2 text-center text-[10px] tabular-nums text-white/30">{String(hour).padStart(2, "0")}:00</span>}
            <span aria-hidden="true" style={{ top }} className="absolute left-[52px] right-0 border-t border-white/[0.07]" />
          </div>;
        })}
        <div className="absolute bottom-0 left-[60px] right-1 top-0">
          {positionedEvents.map(({ event, startMinutes, endMinutes, lane, lanesCount }) => {
            const top = TIMELINE_TOP_PADDING + startMinutes * (TIMELINE_HOUR_HEIGHT / 60);
            const height = Math.max(TIMELINE_MIN_EVENT_HEIGHT, (endMinutes - startMinutes) * (TIMELINE_HOUR_HEIGHT / 60));
            const width = 100 / lanesCount;
            const compact = height < 52 || lanesCount > 2;
            const startsBeforeToday = dateKeyInBahia(new Date(event.startAt)) !== dateKey;
            const endsAfterToday = dateKeyInBahia(new Date(event.endAt)) !== dateKey;
            const eventMeta = startsBeforeToday
              ? `Continuação · até ${BAHIA_TIME_LABEL_FORMATTER.format(new Date(event.endAt))}`
              : endsAfterToday
                ? `${BAHIA_TIME_LABEL_FORMATTER.format(new Date(event.startAt))} · continua amanhã`
                : `${BAHIA_TIME_LABEL_FORMATTER.format(new Date(event.startAt))} · ${durationLabel(durationMinutes(event.startAt, event.endAt))} · ${event.status === "completed" ? "Concluido" : "Planejado"}`;
            return <button
              key={event.id}
              type="button"
              onClick={() => onEvent(event)}
              title={`Editar ${event.title}`}
              style={{ top, height, left: `${lane * width}%`, width: `calc(${width}% - 4px)` }}
              className={`absolute z-10 overflow-hidden rounded-md border border-white/10 bg-[#1b2027] text-left text-white shadow-sm transition-colors hover:border-blue-400/45 hover:bg-[#202731] ${compact ? "px-1.5 py-1" : "p-2"}`}
            >
              <span className="flex items-start gap-1.5"><span className="min-w-0 flex-1"><span className={`block truncate font-semibold ${compact ? "text-[10px] leading-3" : "text-xs"}`}>{event.title}</span>{!compact && <span className="mt-1 block truncate text-[10px] tabular-nums text-white/45">{eventMeta}</span>}</span>{!compact && lanesCount === 1 && <Pencil className="size-3.5 shrink-0 text-white/35" />}</span>
            </button>;
          })}
        </div>
        <CurrentTimeIndicator dateKey={dateKey} />
      </div>
    </div>
  </div>;
}
