"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BadgePlus, BriefcaseBusiness, Check, Clock3 } from "lucide-react";
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

export function RoadmapBoard({ roadmap, initialCompleted, today, onToggle, localStorageKey }: { roadmap: RoadmapSnapshot; initialCompleted: string[]; today: string; onToggle?: (taskId: string, completed: boolean) => Promise<void>; localStorageKey?: string }) {
  const [completed, setCompleted] = useState(() => new Set(initialCompleted));
  const [pending, startTransition] = useTransition();
  const taskCounts = countRoadmapTasks(roadmap, completed);
  const taskCount = taskCounts.total;
  const doneCount = taskCounts.done;
  const currentDay = findCurrentDay(roadmap, completed);

  useEffect(() => {
    if (!localStorageKey) return;
    let frame = 0;
    try {
      const stored = JSON.parse(window.localStorage.getItem(localStorageKey) ?? "[]");
      if (Array.isArray(stored)) {
        frame = window.requestAnimationFrame(() => {
          setCompleted(new Set(stored.filter((item): item is string => typeof item === "string")));
        });
      }
    } catch {
      // A prévia continua utilizável mesmo sem armazenamento local.
    }
    return () => window.cancelAnimationFrame(frame);
  }, [localStorageKey]);

  const toggle = (taskId: string, checked: boolean) => {
    setCompleted((previous) => {
      const next = new Set(previous);
      if (checked) next.add(taskId); else next.delete(taskId);
      if (localStorageKey) window.localStorage.setItem(localStorageKey, JSON.stringify([...next]));
      return next;
    });
    if (!onToggle) return;
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
          const linkedinSkills = roadmap.linkedinSkillMilestones?.filter((milestone) => milestone.afterDay === day.dayNumber) ?? [];
          return (
            <details key={day.id} open={isCurrent || day.date === today} className={`${isCurrent ? "is-current" : ""}${day.kind === "project" ? " is-project" : ""}`}>
              <summary>
                <span className="evo-day-number">{String(day.dayNumber).padStart(2, "0")}</span>
                <div><strong>{day.date} · {day.weekday}</strong><small><Clock3 size={13} /> {Math.floor(day.plannedMinutes / 60)}h{String(day.plannedMinutes % 60).padStart(2, "0")} planejadas · {day.phaseTitle}</small></div>
                <span className="evo-day-done">{done}/{tasks.length}</span>
              </summary>
              <div className="evo-day-content">
                {linkedinSkills.map((milestone) => <div className="evo-linkedin-skill-alert" key={milestone.id}>
                  <BadgePlus size={18} />
                  <div><small>NOVA COMPETÊNCIA PARA O LINKEDIN</small><strong>{milestone.skill}</strong><span>{milestone.evidence}</span></div>
                  <a href="https://www.linkedin.com/in/carlos-rocha-b7b09524b/details/skills/" target="_blank" rel="noreferrer">Adicionar competência</a>
                </div>)}
                {day.kind === "project" && day.projectSlug ? <div className="evo-roadmap-project-callout"><BriefcaseBusiness size={18} /><div><strong>{day.note}</strong><small>Este marco usa o conhecimento acumulado até aqui.</small></div><Link href={`/admin/evolucao/datascience/projetos/${day.projectSlug}`}>Abrir projeto</Link></div> : null}
                {day.courses?.length ? <div className="evo-day-courses">
                  {day.courses.map((course) => <article key={course.id} className="evo-course-card">
                    <div><span className="evo-course-kicker">{day.phaseTitle}</span><h3>{course.title}</h3></div>
                    <a href={course.url} target="_blank" rel="noreferrer">Abrir curso ↗</a>
                    <details open><summary>{course.durationSource === "estimativa" ? "Carga planejada estimada" : "Aulas planejadas"}</summary><ul>{course.lessons.map((lesson) => <li key={lesson.id}>{lesson.label}</li>)}</ul></details>
                  </article>)}
                </div> : null}
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
