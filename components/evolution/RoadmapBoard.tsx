"use client";

import { useState, useTransition } from "react";
import { Check, Clock3 } from "lucide-react";
import type { RoadmapSnapshot } from "@/lib/evolution/types";

function findCurrentDay(roadmap: RoadmapSnapshot, completed: Set<string>) {
  for (const day of roadmap.days) {
    for (const section of day.sections) {
      for (const task of section.tasks) if (!completed.has(task.id)) return day;
    }
  }
  return roadmap.days.at(-1);
}

function countRoadmapTasks(roadmap: RoadmapSnapshot, completed: Set<string>) {
  let total = 0;
  let done = 0;
  for (const day of roadmap.days) for (const section of day.sections) for (const task of section.tasks) {
    total += 1;
    if (completed.has(task.id)) done += 1;
  }
  return { total, done };
}

export function RoadmapBoard({ roadmap, initialCompleted, today, onToggle }: { roadmap: RoadmapSnapshot; initialCompleted: string[]; today: string; onToggle: (taskId: string, completed: boolean) => Promise<void> }) {
  const [completed, setCompleted] = useState(() => new Set(initialCompleted));
  const [pending, startTransition] = useTransition();
  const taskCounts = countRoadmapTasks(roadmap, completed);
  const taskCount = taskCounts.total;
  const doneCount = taskCounts.done;
  const currentDay = findCurrentDay(roadmap, completed);

  const toggle = (taskId: string, checked: boolean) => {
    setCompleted((previous) => {
      const next = new Set(previous);
      if (checked) next.add(taskId); else next.delete(taskId);
      return next;
    });
    startTransition(async () => {
      try {
        await onToggle(taskId, checked);
      } catch {
        setCompleted((previous) => {
          const next = new Set(previous);
          if (checked) next.delete(taskId); else next.add(taskId);
          return next;
        });
      }
    });
  };

  return (
    <div className={`evo-roadmap${pending ? " is-saving" : ""}`}>
      <div className="evo-roadmap-summary">
        <div><span>Progresso das atividades</span><strong>{doneCount} / {taskCount}</strong></div>
        <div className="evo-progress"><span style={{ width: `${taskCount ? (doneCount / taskCount) * 100 : 0}%` }} /></div>
        <small>Dia atual do plano: {currentDay ? `Dia ${String(currentDay.dayNumber).padStart(2, "0")} · ${currentDay.date}` : "concluído"}</small>
      </div>
      <div className="evo-roadmap-days">
        {roadmap.days.map((day) => {
          const tasks = day.sections.flatMap((section) => section.tasks);
          const done = tasks.filter((task) => completed.has(task.id)).length;
          const isCurrent = currentDay?.id === day.id;
          return (
            <details key={day.id} open={isCurrent || day.date === today} className={isCurrent ? "is-current" : ""}>
              <summary>
                <span className="evo-day-number">{String(day.dayNumber).padStart(2, "0")}</span>
                <div><strong>{day.date} · {day.weekday}</strong><small><Clock3 size={13} /> {Math.floor(day.plannedMinutes / 60)}h{String(day.plannedMinutes % 60).padStart(2, "0")} planejadas</small></div>
                <span className="evo-day-done">{done}/{tasks.length}</span>
              </summary>
              <div className="evo-day-content">
                {day.sections.map((section) => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    {section.tasks.map((task) => (
                      <label key={task.id} className={completed.has(task.id) ? "is-done" : ""}>
                        <input type="checkbox" checked={completed.has(task.id)} onChange={(event) => toggle(task.id, event.target.checked)} />
                        <span className="evo-check"><Check size={13} /></span>
                        <span>{task.label}</span>
                      </label>
                    ))}
                  </section>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
