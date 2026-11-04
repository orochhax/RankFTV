"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { assessServiceUnlocks, serviceConfirmationId } from "@/lib/evolution/service-unlocks";
import type { RoadmapSnapshot } from "@/lib/evolution/types";

const statusLabels = {
  preparando: "Em preparação",
  revisao: "Aguardando validação",
  bloqueado: "Pré-requisito pendente",
  desbloqueado: "Serviço desbloqueado",
};

export function ServiceUnlocksBoard({ roadmap, initialCompleted, onToggle }: {
  roadmap: RoadmapSnapshot;
  initialCompleted: string[];
  onToggle: (taskId: string, completed: boolean) => Promise<void>;
}) {
  const [completed, setCompleted] = useState(() => new Set(initialCompleted));
  const [pending, startTransition] = useTransition();
  const stages = assessServiceUnlocks(roadmap, completed);
  const unlockedCount = stages.filter((stage) => stage.status === "desbloqueado").length;

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

  return <div className={`evo-service-unlocks${pending ? " is-saving" : ""}`}>
    <section className="evo-unlock-summary">
      <div><span>Serviços liberados</span><strong>{unlockedCount} <small>/ {stages.length}</small></strong></div>
      <p>Um serviço só é liberado depois das aulas do marco e das três evidências confirmadas. Os projetos finais são a demonstração da capacidade aplicada.</p>
    </section>
    <div className="evo-unlock-grid">
      {stages.map((stage) => <article className={`evo-unlock-card is-${stage.status}`} key={stage.id}>
        <header>
          <div><span className="evo-unlock-code">{stage.title}</span><h2>{stage.service}</h2></div>
          <span className="evo-unlock-status">{stage.status === "desbloqueado" ? <ShieldCheck size={14} /> : <LockKeyhole size={14} />}{statusLabels[stage.status]}</span>
        </header>
        <p>{stage.description}</p>
        <div className="evo-unlock-progress"><span style={{ width: `${stage.progress}%` }} /></div>
        <div className="evo-unlock-counts"><span>{stage.completedTasks}/{stage.requiredTaskIds.length} aulas</span><strong>{stage.progress}%</strong><span>{stage.completedConfirmations}/3 evidências</span></div>
        <div className="evo-unlock-columns">
          <div><h3>O que você poderá oferecer</h3><ul>{stage.deliverables.map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul></div>
          <div><h3>Validação do marco</h3>{stage.confirmations.map((confirmation, index) => {
            const id = serviceConfirmationId(stage.id, index);
            return <label key={id} className={completed.has(id) ? "is-done" : ""}>
              <input type="checkbox" checked={completed.has(id)} onChange={(event) => toggle(id, event.target.checked)} />
              <span className="evo-check"><Check size={12} /></span><span>{confirmation}</span>
            </label>;
          })}</div>
        </div>
        {stage.prerequisites.length ? <small className="evo-unlock-prerequisite">Pré-requisito: {stage.prerequisites.map((item) => item.toUpperCase()).join(", ")}</small> : null}
        <Link href="/admin/evolucao/datascience">Abrir atividades até o dia {stage.unlockDay}<ArrowRight size={15} /></Link>
      </article>)}
    </div>
  </div>;
}
