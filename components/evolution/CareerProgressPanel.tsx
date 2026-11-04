"use client";

import { useEffect, useState } from "react";
import { BadgePlus, Check, ChevronDown, Copy } from "lucide-react";

type Milestone = { id: string; afterDay: number; title: string; rationale: string; linkedinTitle: string };
type SkillMilestone = { id: string; afterDay: number; skill: string; evidence: string };

function useConfirmed(storageKey: string) {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  useEffect(() => {
    let stored: string[] = [];
    try { stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]"); } catch { stored = []; }
    const frame = window.requestAnimationFrame(() => setConfirmed(stored));
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);
  const toggle = (id: string) => {
    setConfirmed((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  return { confirmed, toggle };
}

export function CareerProgressPanel({ milestones, skills, storageKey }: { milestones: Milestone[]; skills: SkillMilestone[]; storageKey: string }) {
  const titles = useConfirmed(storageKey);
  const competencies = useConfirmed(`${storageKey}-skills`);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return <>
    <section className="evo-section">
      <details className="evo-collapsible-section">
        <summary className="evo-collapsible-summary">
          <span className="evo-collapsible-title"><span className="evo-eyebrow">LINKEDIN SEM EXAGERO</span><strong>Evolução honesta do título</strong></span>
          <span className="evo-collapsible-action">{milestones.length} etapas <ChevronDown size={18} /></span>
        </summary>
        <p className="evo-collapsible-help">Confirme a mudança somente depois de concluir a evidência indicada.</p>
        <div className="evo-career-grid">{milestones.map((milestone) => <article key={milestone.id} className={titles.confirmed.includes(milestone.id) ? "is-confirmed" : ""}>
          <header><span>Após o dia {milestone.afterDay}</span><button type="button" onClick={() => titles.toggle(milestone.id)}><Check size={14} />{titles.confirmed.includes(milestone.id) ? "Confirmado" : "Confirmar"}</button></header>
          <h3>{milestone.title}</h3><p>{milestone.rationale}</p>
          <div><strong>{milestone.linkedinTitle}</strong><button type="button" onClick={() => copy(milestone.id, milestone.linkedinTitle)}><Copy size={14} />{copied === milestone.id ? "Copiado" : "Copiar"}</button></div>
        </article>)}</div>
      </details>
    </section>
    <section className="evo-section">
      <details className="evo-collapsible-section">
        <summary className="evo-collapsible-summary">
          <span className="evo-collapsible-title"><span className="evo-eyebrow">COMPETÊNCIAS NO LINKEDIN</span><strong>O que adicionar conforme você aprende</strong></span>
          <span className="evo-collapsible-action">{skills.length} competências <ChevronDown size={18} /></span>
        </summary>
        <p className="evo-collapsible-help">Adicione a competência somente após concluir as aulas indicadas no dia e conseguir explicar ou demonstrar o conteúdo.</p>
        <div className="evo-career-grid evo-skill-milestones">{skills.map((milestone) => <article key={milestone.id} className={competencies.confirmed.includes(milestone.id) ? "is-confirmed" : ""}>
          <header><span>Após concluir o dia {milestone.afterDay}</span><button type="button" onClick={() => competencies.toggle(milestone.id)}><Check size={14} />{competencies.confirmed.includes(milestone.id) ? "Adicionada" : "Confirmar"}</button></header>
          <h3><BadgePlus size={17} /> {milestone.skill}</h3><p>{milestone.evidence}</p>
          <div><strong>Competência sugerida: {milestone.skill}</strong><button type="button" onClick={() => copy(milestone.id, milestone.skill)}><Copy size={14} />{copied === milestone.id ? "Copiado" : "Copiar"}</button></div>
        </article>)}</div>
      </details>
    </section>
  </>;
}
