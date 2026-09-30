"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Pencil, Settings2, Trash2 } from "lucide-react";
import { formatDateBR } from "@/lib/format";
import { habitEndSummary, habitScheduleSummary, isHabitScheduled, scheduledHabits, type Habit, type HabitLog } from "@/lib/performance";
import { HabitScheduleFields } from "@/components/performance/HabitScheduleFields";
// Kept at the existing client-to-Server-Action boundary after extracting habit UI.
// eslint-disable-next-line import-x/no-restricted-paths
import { criarHabito, editarHabito, excluirHabito, reativarHabito, removerHabito } from "@/app/admin/performance/actions";
import { habitMonthStats, monthGrid, nextMonth, previousMonth } from "@/lib/performance-dashboard";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { ActionForm, Field } from "./ui-primitives";
import { Modal } from "./modal-widgets";

export function HabitPanel({
  habits,
  logs,
  today,
  onManage,
  onOpen,
  onToggle,
}: {
  habits: Habit[];
  logs: HabitLog[];
  today: string;
  onManage: () => void;
  onOpen: (habit: Habit) => void;
  onToggle: (habit: Habit, done: boolean) => void;
}) {
  habits = scheduledHabits(habits, today);
  const todayLogs = new Map(
    logs
      .filter((log) => log.data === today)
      .map((log) => [log.habit_id, log.valor]),
  );
  const completed = habits.filter(
    (habit) => (todayLogs.get(habit.id) ?? 0) >= (habit.alvo ?? 1),
  ).length;
  const percent = habits.length
    ? Math.round((completed / habits.length) * 100)
    : 0;
  return (
    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white [&_.bg-gray-50]:!bg-[#11151a] [&_.bg-gray-100]:!bg-white/10 [&_.bg-white]:!bg-transparent [&_.ring-gray-300]:!ring-white/20 [&_.text-gray-400]:!text-white/35 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Habitos</h2>
          <p className="text-xs text-gray-400">
            {completed} de {habits.length} concluidos hoje
          </p>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600"
        >
          <Settings2 className="size-4" />
          Editar
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <b className="w-10 text-right text-xs">{percent}%</b>
      </div>
      <div className="mt-4 space-y-1">
        {habits.map((habit) => {
          const done = (todayLogs.get(habit.id) ?? 0) >= (habit.alvo ?? 1);
          return (
            <div key={habit.id} className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => onToggle(habit, !done)}
                className={`flex size-5 items-center justify-center rounded-md ring-1 ${done ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}
              >
                {done && <Check className="size-3 text-white" />}
              </button>
              <button
                type="button"
                onClick={() => onOpen(habit)}
                className="flex-1 text-left text-sm text-gray-700"
              >
                {habit.label}
              </button>
            </div>
          );
        })}
        {!habits.length && (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-400">
            Nenhum habito ativo.
          </p>
        )}
      </div>
    </section>
  );
}

export function HabitManagerModal({
  habits,
  onClose,
}: {
  habits: Habit[];
  onClose: () => void;
}) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
  const [editing, setEditing] = useState<Habit | null>(null);

  return (
    <Modal title="Editar habitos" onClose={onClose}>
      <ActionForm action={criarHabito} onDone={() => router.refresh()}>
        <Field name="label" title="Novo habito" required />
        <input type="hidden" name="tipo" value="binario" />
        <HabitScheduleFields tone="light" />
      </ActionForm>
      <div className="mt-5 space-y-2">
        {habits.map((habit) => (
          <div key={habit.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm">{habit.label}<small className="mt-0.5 block text-gray-400">{habitScheduleSummary(habit)}{habitEndSummary(habit.endDate) ? ` · ${habitEndSummary(habit.endDate)}` : ""}</small></span>
              {habit.ativo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(habit)}
                    title="Editar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await removerHabito(habit.id);
                      router.refresh();
                    }}
                    className="text-xs text-amber-600"
                  >
                    Arquivar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await reativarHabito(habit.id);
                      router.refresh();
                    }}
                    className="text-xs text-blue-600"
                  >
                    Reativar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const approved = await confirm({
                        title: "Excluir historico do habito?",
                        description: `Todos os registros de “${habit.label}” serao apagados definitivamente.`,
                        confirmLabel: "Excluir historico",
                      });
                      if (!approved) return;
                      await excluirHabito(habit.id);
                      router.refresh();
                    }}
                    title="Excluir historico"
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title="Editar habito" onClose={() => setEditing(null)}>
          <ActionForm action={editarHabito} onDone={() => setEditing(null)}>
            <input type="hidden" name="id" value={editing.id} />
            <input type="hidden" name="tipo" value={editing.tipo} />
            <Field name="label" title="Nome" value={editing.label} required />
            <HabitScheduleFields habit={editing} tone="light" />
          </ActionForm>
        </Modal>
      )}
    </Modal>
  );
}

export function HabitConstancyModal({
  habit,
  logs,
  today,
  onClose,
}: {
  habit: Habit;
  logs: HabitLog[];
  today: string;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const stats = habitMonthStats(habit, logs, month, today);
  const current = today.slice(0, 7);
  const weeks = monthGrid(month);
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month + "-01T12:00:00Z"));
  return (
    <Modal title={habit.label} onClose={onClose}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth(previousMonth(month))}>
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold capitalize">{title}</p>
          <p
            className={
              stats.status === "good"
                ? "text-sm text-emerald-600"
                : stats.status === "bad"
                  ? "text-sm text-red-600"
                  : "text-sm text-gray-400"
            }
          >
            {stats.status === "good"
              ? "Bom"
              : stats.status === "bad"
                ? "Ruim"
                : "Sem dados"}{" "}
            · {stats.percent}%
          </p>
        </div>
        <button
          type="button"
          disabled={month >= current}
          onClick={() => setMonth(nextMonth(month))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="mt-1 space-y-1">
        {weeks.map((week, index) => (
          <div key={index} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => {
              if (!date)
                return <span key={dayIndex} className="aspect-square" />;
              const value = logs.find(
                (log) => log.habit_id === habit.id && log.data === date,
              )?.valor;
              const done =
                value != null &&
                (habit.tipo === "binario"
                  ? value >= 1
                  : habit.alvo
                    ? value >= habit.alvo
                    : value > 0);
              const planned = isHabitScheduled(habit, date) && date <= today;
              return (
                <span
                  key={date}
                  title={formatDateBR(date)}
                  className={`aspect-square rounded-sm ${!planned ? "bg-transparent ring-1 ring-white/10" : done ? "bg-emerald-500" : "bg-gray-100"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-gray-500">
        {stats.completed} de {stats.eligible} dias concluidos
      </p>
    </Modal>
  );
}
