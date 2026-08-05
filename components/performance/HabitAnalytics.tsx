"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CalendarDays, Flame, TrendingUp } from "lucide-react";
import { addDays, type Habit, type HabitLog } from "@/lib/performance";
import { habitBestWeekday, habitChartData, habitCurrentStreak, isHabitDone, type HabitChartPeriod } from "@/lib/performance-analytics";

const COLORS = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5"];

function chartLabel(period: HabitChartPeriod): string {
  if (period === "week") return "Cada ponto representa um dia";
  if (period === "month") return "Cada ponto representa uma semana";
  return "Cada ponto representa um mes";
}

export function HabitAnalytics({ habits, logs, today }: { habits: Habit[]; logs: HabitLog[]; today: string }) {
  const active = habits.filter((habit) => habit.ativo);
  const [period, setPeriod] = useState<HabitChartPeriod>("week");
  const [visible, setVisible] = useState<Set<string>>(new Set(active.map((habit) => habit.id)));
  const data = useMemo(() => habitChartData(active, logs, today, period), [active, logs, period, today]);

  const toggle = (id: string) => setVisible((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <div className="mt-5 space-y-5">
    <section className="rounded-lg bg-white p-5 text-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Evolucao dos habitos</h2>
          <p className="mt-1 text-xs text-gray-400">{chartLabel(period)}. As linhas mostram conclusoes reais, nao tempo gasto no aplicativo.</p>
        </div>
        <div className="flex rounded-lg bg-gray-100 p-1">
          {(["week", "month", "year"] as HabitChartPeriod[]).map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${period === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{value === "week" ? "Semana" : value === "month" ? "Mes" : "Ano"}</button>)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrar linhas do grafico">
        {active.map((habit, index) => <button key={habit.id} type="button" onClick={() => toggle(habit.id)} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${visible.has(habit.id) ? "border-gray-200 bg-white text-gray-700" : "border-transparent bg-gray-100 text-gray-400"}`}>
          <span className="size-2 rounded-full" style={{ backgroundColor: visible.has(habit.id) ? COLORS[index % COLORS.length] : "#d1d5db" }} />{habit.label}
        </button>)}
      </div>

      <div className="mt-5 h-72 min-w-0">
        {data.length && active.length ? <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb", fontSize: 12 }} />
            <Legend content={() => null} />
            {active.map((habit, index) => visible.has(habit.id) && <Line key={habit.id} type="monotone" dataKey={habit.id} name={habit.label} stroke={COLORS[index % COLORS.length]} strokeWidth={1.75} dot={{ r: 2 }} activeDot={{ r: 4 }} />)}
          </LineChart>
        </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-gray-400">Registre seus habitos para formar o grafico.</div>}
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><h2 className="font-semibold text-white">Detalhes por habito</h2><p className="mt-1 text-xs text-white/40">Ultimos 30 dias</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {active.map((habit, index) => <HabitDetail key={habit.id} habit={habit} logs={logs} today={today} color={COLORS[index % COLORS.length]} />)}
      </div>
    </section>
  </div>;
}

function HabitDetail({ habit, logs, today, color }: { habit: Habit; logs: HabitLog[]; today: string; color: string }) {
  const values = new Map(logs.filter((log) => log.habit_id === habit.id).map((log) => [log.data, log.valor]));
  const data = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(today, index - 29);
    return { date, label: date.slice(8), done: isHabitDone(habit, values.get(date)) ? 1 : 0 };
  });
  const completed = data.filter((item) => item.done).length;
  const rate = Math.round((completed / 30) * 100);
  const bestDay = habitBestWeekday(habit, logs);
  const streak = habitCurrentStreak(habit, logs, today);

  return <article className="rounded-lg bg-white p-5 text-gray-900">
    <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: color }} /><h3 className="flex-1 font-semibold">{habit.label}</h3><span className="text-sm font-bold" style={{ color }}>{rate}%</span></div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
      <Metric icon={Flame} label="Sequencia" value={`${streak}d`} />
      <Metric icon={Activity} label="Concluidos" value={`${completed}/30`} />
      <Metric icon={CalendarDays} label="Melhor dia" value={bestDay?.slice(0, 3) ?? "-"} />
    </div>
    <div className="mt-4 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" hide /><YAxis domain={[0, 1]} hide />
          <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} formatter={(value) => [Number(value) ? "Feito" : "Pendente", habit.label]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Area type="stepAfter" dataKey="done" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </article>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return <div className="min-w-0"><Icon className="size-3.5 text-gray-400" /><p className="mt-1 truncate text-gray-400">{label}</p><p className="mt-0.5 truncate font-semibold text-gray-700">{value}</p></div>;
}
