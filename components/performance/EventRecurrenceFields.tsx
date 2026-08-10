"use client";

import { useState } from "react";
import {
  PERFORMANCE_TIMEZONE,
  quickRecurrenceRule,
  recurrencePresetForRule,
  recurrencePresetOptions,
  type EventRecurrenceRule,
  type EventRecurrencePreset,
} from "@/lib/event-recurrence";

export function EventRecurrenceFields({ startDate, initialRule, initialAllDay = false, tone = "dark" }: {
  startDate: string;
  initialRule?: EventRecurrenceRule | null;
  initialAllDay?: boolean;
  tone?: "dark" | "light";
}) {
  const initialPreset = recurrencePresetForRule(initialRule ?? null, startDate);
  const [preset, setPreset] = useState<EventRecurrencePreset>(initialPreset);
  const [custom, setCustom] = useState<EventRecurrenceRule>(initialRule ?? { version: 1, frequency: "weekly", interval: 1, byWeekdays: [new Date(`${startDate}T12:00:00Z`).getUTCDay()], end: { type: "never" }, timezone: PERFORMANCE_TIMEZONE });
  const options = recurrencePresetOptions(startDate);
  const rule = preset === "custom" ? custom : quickRecurrenceRule(preset, startDate);
  const input = tone === "dark"
    ? "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-[#15191f]"
    : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500";
  const muted = tone === "dark" ? "text-white/55" : "text-gray-500";

  return (
    <div className="space-y-3">
      <label className={`flex items-center gap-2 text-sm ${muted}`}>
        <input name="all_day" type="checkbox" defaultChecked={initialAllDay} className="size-4 rounded" />
        Dia inteiro
      </label>
      <label className={`block text-xs font-medium ${muted}`}>Repetição
        <select value={preset} onChange={(event) => setPreset(event.target.value as EventRecurrencePreset)} className={`${input} mt-1`}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <input type="hidden" name="recurrence_rule" value={rule ? JSON.stringify(rule) : ""} />
      {preset === "custom" && (
        <fieldset className={`space-y-3 rounded-lg border p-3 ${tone === "dark" ? "border-white/10 bg-black/10" : "border-gray-100 bg-gray-50"}`}>
          <legend className={`px-1 text-xs font-semibold ${muted}`}>Repetição personalizada</legend>
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <select value={custom.frequency} onChange={(event) => {
              const frequency = event.target.value as EventRecurrenceRule["frequency"];
              const start = new Date(`${startDate}T12:00:00Z`);
              setCustom({ version: 1, frequency, interval: 1, end: custom.end, timezone: PERFORMANCE_TIMEZONE, ...(frequency === "weekly" ? { byWeekdays: [start.getUTCDay()] } : {}), ...(frequency === "monthly" ? { monthlyMode: "day_of_month", monthDay: start.getUTCDate() } : {}) });
            }} className={input}>
              <option value="daily">Dias</option><option value="weekly">Semanas</option><option value="monthly">Meses</option><option value="yearly">Anos</option>
            </select>
            <input type="number" min={1} max={365} value={custom.interval} onChange={(event) => setCustom({ ...custom, interval: Math.max(1, Number(event.target.value)) })} className={input} aria-label="Intervalo" />
          </div>
          {custom.frequency === "weekly" && (
            <div className="flex gap-1" aria-label="Dias da semana">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((label, day) => {
                const selected = custom.byWeekdays?.includes(day) ?? false;
                return <button key={day} type="button" onClick={() => setCustom({ ...custom, byWeekdays: selected ? custom.byWeekdays?.filter((value) => value !== day) : [...(custom.byWeekdays ?? []), day] })} className={`size-8 rounded-full text-xs font-bold ring-1 ${selected ? "bg-blue-600 text-white ring-blue-600" : muted + " ring-current/20"}`}>{label}</button>;
              })}
            </div>
          )}
          {custom.frequency === "monthly" && <div className="grid gap-2 sm:grid-cols-2">
            <select value={custom.monthlyMode ?? "day_of_month"} onChange={(event) => {
              const mode = event.target.value as "day_of_month" | "nth_weekday";
              const start = new Date(`${startDate}T12:00:00Z`);
              const ordinal = Math.ceil(start.getUTCDate() / 7) as 1 | 2 | 3 | 4 | 5;
              setCustom({ ...custom, monthlyMode: mode, ...(mode === "day_of_month" ? { monthDay: start.getUTCDate(), byWeekdays: undefined, weekdayOrdinal: undefined } : { byWeekdays: [start.getUTCDay()], weekdayOrdinal: start.getUTCDate() + 7 > new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate() ? -1 : ordinal, monthDay: undefined }) });
            }} className={input}><option value="day_of_month">No mesmo dia do mês</option><option value="nth_weekday">No mesmo dia da semana</option></select>
            {custom.monthlyMode === "day_of_month" && <input type="number" min={1} max={31} value={custom.monthDay ?? Number(startDate.slice(8))} onChange={(event) => setCustom({ ...custom, monthDay: Number(event.target.value) })} className={input} aria-label="Dia do mês" />}
          </div>}
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={custom.end.type} onChange={(event) => setCustom({ ...custom, end: event.target.value === "never" ? { type: "never" } : event.target.value === "until" ? { type: "until", date: startDate } : { type: "count", count: 10 } })} className={input}>
              <option value="never">Nunca termina</option><option value="until">Termina em uma data</option><option value="count">Após um número de vezes</option>
            </select>
            {custom.end.type === "until" && <input type="date" min={startDate} value={custom.end.date} onChange={(event) => setCustom({ ...custom, end: { type: "until", date: event.target.value } })} className={input} />}
            {custom.end.type === "count" && <input type="number" min={1} max={10000} value={custom.end.count} onChange={(event) => setCustom({ ...custom, end: { type: "count", count: Number(event.target.value) } })} className={input} />}
          </div>
        </fieldset>
      )}
    </div>
  );
}
