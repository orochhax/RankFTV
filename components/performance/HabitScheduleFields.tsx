"use client";

import { useState } from "react";
import type { Habit, HabitFrequency } from "@/lib/performance";

const FREQUENCIES: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Todos os dias" },
  { value: "weekdays", label: "Segunda a sexta" },
  { value: "weekends", label: "Sábado e domingo" },
  { value: "custom_weekdays", label: "Personalizar dias" },
];
const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function HabitScheduleFields({ habit, tone = "dark" }: { habit?: Habit; tone?: "dark" | "light" }) {
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequencyType ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? []);
  const [endMode, setEndMode] = useState<"never" | "count" | "date">(habit?.endDate ? "date" : "never");
  const [durationCount, setDurationCount] = useState(20);
  const input = tone === "dark"
    ? "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-[#15191f]"
    : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <fieldset className="space-y-2">
      <legend className={`mb-1 text-xs font-semibold ${tone === "dark" ? "text-white/55" : "text-gray-500"}`}>Repetição do hábito</legend>
      <select name="frequency_type" value={frequency} onChange={(event) => setFrequency(event.target.value as HabitFrequency)} className={input}>
        {FREQUENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {frequency === "custom_weekdays" && (
        <div className="flex gap-1.5" aria-label="Dias em que o hábito está planejado">
          {DAYS.map((label, day) => {
            const selected = weekdays.includes(day);
            return (
              <label key={day} title={["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][day]} className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-xs font-bold ring-1 ${selected ? "bg-blue-600 text-white ring-blue-600" : tone === "dark" ? "text-white/50 ring-white/15" : "text-gray-500 ring-gray-200"}`}>
                <input type="checkbox" name="weekdays" value={day} checked={selected} onChange={() => setWeekdays((current) => selected ? current.filter((value) => value !== day) : [...current, day])} className="sr-only" />
                {label}
              </label>
            );
          })}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`block text-xs ${tone === "dark" ? "text-white/55" : "text-gray-500"}`}>Encerramento
          <select name="end_mode" value={endMode} onChange={(event) => setEndMode(event.target.value as "never" | "count" | "date")} className={`${input} mt-1`}>
            <option value="never">Não para automaticamente</option>
            <option value="count">Após uma quantidade de dias planejados</option>
            <option value="date">Em uma data específica</option>
          </select>
        </label>
        {endMode === "count" && <label className={`block text-xs ${tone === "dark" ? "text-white/55" : "text-gray-500"}`}>Quantidade de execuções
          <input name="duration_count" type="number" min={1} max={3650} value={durationCount} onChange={(event) => setDurationCount(Number(event.target.value))} className={`${input} mt-1`} />
        </label>}
        {endMode === "date" && <label className={`block text-xs ${tone === "dark" ? "text-white/55" : "text-gray-500"}`}>Último dia planejado
          <input name="end_date" type="date" defaultValue={habit?.endDate ?? undefined} className={`${input} mt-1`} required />
        </label>}
      </div>
      {endMode === "count" && <p className={`text-xs leading-5 ${tone === "dark" ? "text-white/40" : "text-gray-400"}`}>O hábito para automaticamente após a {durationCount}ª execução. Somente os dias escolhidos acima entram nessa contagem.</p>}
    </fieldset>
  );
}
