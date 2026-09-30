"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateBR } from "@/lib/format";
import { type Habit } from "@/lib/performance";
import { registrarHabito } from "@/app/admin/performance/actions";
import { registrarTarefaLifeOS, removerTarefaLifeOS } from "@/app/admin/performance/life-os-actions";
import { type TaskOccurrence, taskProgress } from "@/lib/performance-dashboard";
import { dayProgress, type LifeEvent } from "@/lib/performance-life-os";
import { DailyLifeAnalysisCard } from "@/components/performance/DailyLifeAnalysisCard";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { LifeOSProps } from "./types";
import { Field } from "./ui-primitives";
import { TaskPanel } from "./task-panel";
import { TaskForm } from "./event-and-task-forms";
import { TimelinePanel } from "./timeline-panel";
import { HabitConstancyModal, HabitManagerModal, HabitPanel } from "./habit-panels";
import { LifeOSWidgets, Modal } from "./modal-widgets";

export function DashboardViewLegacy({
  ...p
}: LifeOSProps & {
  progress: ReturnType<typeof dayProgress>;
  todayEvents: LifeEvent[];
  onQuick: (quick: "event" | "activity" | "goal" | "portfolio" | null) => void;
}) {
  const router = useRouter();
  const confirm = usePerformanceConfirm();
  const [taskForm, setTaskForm] = useState<TaskOccurrence | null>(null);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [manageHabits, setManageHabits] = useState(false);
  const [from, setFrom] = useState(p.range.from);
  const [to, setTo] = useState(p.range.to);
  const progress = taskProgress(p.taskOccurrences);
  const apply = (period: string) =>
    router.replace(`/admin/performance?view=today&period=${period}`, {
      scroll: false,
    });
  const applyCustom = () =>
    router.replace(
      `/admin/performance?view=today&period=custom&from=${from}&to=${to}`,
      { scroll: false },
    );
  const events = [...p.events].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );

  return (
    <div className="space-y-5">
      <DailyLifeAnalysisCard
        analysis={p.dailyAnalysis}
        consistency={p.consistency}
      />

      <section className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#15191f] p-3">
        <div className="flex flex-wrap gap-1">
          {[
            ["today", "Hoje"],
            ["week", "Semana"],
            ["month", "Mes"],
            ["custom", "Personalizado"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => apply(value)}
              className={`rounded-lg px-3 py-2 text-sm ${p.range.period === value ? "bg-white text-gray-900" : "text-white/60 hover:bg-white/10"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="w-full text-xs text-white/45 sm:ml-auto sm:w-auto">
          {formatDateBR(p.range.from)} - {formatDateBR(p.range.to)}
        </span>
        {p.range.period === "custom" && (
          <div className="grid w-full gap-2 border-t border-white/10 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <Field
              name="from"
              title="De"
              type="date"
              value={from}
              onChange={setFrom}
            />
            <Field
              name="to"
              title="Ate"
              type="date"
              value={to}
              onChange={setTo}
            />
            <button
              type="button"
              onClick={applyCustom}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold sm:w-auto"
            >
              Aplicar
            </button>
          </div>
        )}
      </section>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)]">
        <div className="min-w-0 space-y-5">
          <TaskPanel
            occurrences={p.taskOccurrences}
            progress={progress}
            onNew={() =>
              setTaskForm({
                id: "",
                title: "",
                startDate: p.today,
                recurrenceType: "none",
                recurrenceEndDate: null,
                active: true,
                occurrenceDate: p.today,
                completed: false,
                completedAt: null,
              })
            }
            onEdit={setTaskForm}
            onToggle={async (item) => {
              await registrarTarefaLifeOS(
                item.id,
                item.occurrenceDate,
                !item.completed,
              );
              router.refresh();
            }}
            onDelete={async (id) => {
              const approved = await confirm({
                title: "Excluir tarefa?",
                description:
                  "A tarefa e todas as ocorrencias dela serao removidas definitivamente.",
                confirmLabel: "Excluir tarefa",
              });
              if (!approved) return;
              await removerTarefaLifeOS(id);
              router.refresh();
            }}
          />
          <HabitPanel
            habits={p.habits}
            logs={p.logs}
            today={p.today}
            onManage={() => setManageHabits(true)}
            onOpen={setHabit}
            onToggle={async (item, done) => {
              await registrarHabito(
                item.id,
                done ? (item.alvo ?? 1) : 0,
                p.today,
              );
              router.refresh();
            }}
          />
          <LifeOSWidgets {...p} />
        </div>
        <TimelinePanel
          events={events}
          today={p.today}
          onNew={() => p.onQuick("event")}
          onCalendar={() => router.push("/admin/performance?view=agenda")}
        />
      </div>

      {taskForm && (
        <Modal
          title={taskForm.id ? "Editar tarefa" : "Nova tarefa"}
          onClose={() => setTaskForm(null)}
        >
          <TaskForm
            task={taskForm}
            onDone={() => {
              setTaskForm(null);
              router.refresh();
            }}
          />
        </Modal>
      )}
      {manageHabits && (
        <HabitManagerModal
          habits={p.allHabits}
          onClose={() => setManageHabits(false)}
        />
      )}
      {habit && (
        <HabitConstancyModal
          habit={habit}
          logs={p.logs}
          today={p.today}
          onClose={() => setHabit(null)}
        />
      )}
    </div>
  );
}
