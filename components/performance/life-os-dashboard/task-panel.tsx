"use client";

import { useState } from "react";
import { Check, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { formatDateBR } from "@/lib/format";
import { type TaskOccurrence, taskProgress } from "@/lib/performance-dashboard";

export function TaskPanel({
  occurrences,
  progress,
  onNew,
  onEdit,
  onToggle,
  onDelete,
}: {
  occurrences: TaskOccurrence[];
  progress: ReturnType<typeof taskProgress>;
  onNew: () => void;
  onEdit: (item: TaskOccurrence) => void;
  onToggle: (item: TaskOccurrence) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const byTask = new Map<string, TaskOccurrence[]>();
  occurrences.forEach((item) =>
    byTask.set(item.id, [...(byTask.get(item.id) ?? []), item]),
  );
  const recurringGroups = [...byTask.values()].filter(
    (items) => items[0]?.recurrenceType === "daily" && items.length > 1,
  );
  const groupedTaskIds = new Set(recurringGroups.map((items) => items[0].id));
  const singleOccurrences = occurrences.filter(
    (item) => !groupedTaskIds.has(item.id),
  );
  const dateGroups = new Map<string, TaskOccurrence[]>();
  singleOccurrences.forEach((item) =>
    dateGroups.set(item.occurrenceDate, [
      ...(dateGroups.get(item.occurrenceDate) ?? []),
      item,
    ]),
  );

  return (
    <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white [&_.border-gray-100]:!border-white/10 [&_.border-gray-200]:!border-white/10 [&_.bg-gray-50]:!bg-[#11151a] [&_.bg-gray-100]:!bg-white/10 [&_.bg-white]:!bg-transparent [&_.ring-gray-300]:!ring-white/20 [&_.text-gray-300]:!text-white/25 [&_.text-gray-400]:!text-white/35 [&_.text-gray-500]:!text-white/45 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Tarefas</h2>
          <p className="text-xs text-gray-400">
            {progress.completed} de {progress.total} ocorrencias concluidas
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Nova tarefa
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <b className="w-12 text-right text-sm">{progress.percent}%</b>
      </div>

      {recurringGroups.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase text-gray-400">
            Tarefas recorrentes
          </p>
          {recurringGroups.map((items) => {
            const task = items[0];
            const completed = items.filter((item) => item.completed).length;
            const percent = Math.round((completed / items.length) * 100);
            const isExpanded = Boolean(expanded[task.id]);
            return (
              <div
                key={task.id}
                className="overflow-hidden rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [task.id]: !isExpanded,
                      }))
                    }
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
                    title={isExpanded ? "Recolher dias" : "Ver dias"}
                  >
                    <ChevronRight
                      className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => ({
                        ...current,
                        [task.id]: !isExpanded,
                      }))
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-700">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Diaria · {completed} de {items.length} dias
                    </p>
                  </button>
                  <div className="hidden w-20 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-9 text-right text-xs font-semibold text-gray-500">
                    {percent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-blue-600"
                    title="Editar tarefa"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    title="Excluir tarefa"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div
                      className="max-h-[540px] overflow-y-auto overscroll-contain px-3"
                      aria-label={`Dias de ${task.title}`}
                    >
                      {items.map((item) => (
                        <div
                          key={`${item.id}-${item.occurrenceDate}`}
                          className="flex h-9 items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <button
                            type="button"
                            onClick={() => onToggle(item)}
                            className={`flex size-5 items-center justify-center rounded-md ring-1 ${item.completed ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}
                          >
                            {item.completed && (
                              <Check className="size-3 text-white" />
                            )}
                          </button>
                          <span
                            className={`flex-1 text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-600"}`}
                          >
                            {formatDateBR(item.occurrenceDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {[...dateGroups].map(([date, items]) => (
          <div key={date}>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
              {formatDateBR(date)}
            </p>
            {items.map((item) => (
              <div
                key={`${item.id}-${date}`}
                className="flex items-center gap-3 border-b border-gray-100 py-2"
              >
                <button
                  type="button"
                  onClick={() => onToggle(item)}
                  className={`flex size-5 items-center justify-center rounded-md ring-1 ${item.completed ? "bg-blue-600 ring-blue-600" : "bg-white ring-gray-300"}`}
                >
                  {item.completed && <Check className="size-3 text-white" />}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className={`flex-1 text-left text-sm ${item.completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                >
                  {item.title}
                  {item.recurrenceType === "daily" && (
                    <span className="ml-2 text-[10px] text-blue-500">
                      diaria
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="text-gray-300 hover:text-red-500"
                  title="Excluir"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {!occurrences.length && (
          <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-400">
            Nenhuma tarefa neste periodo.
          </p>
        )}
      </div>
    </section>
  );
}
