import { BookOpen, CalendarDays, Clock3, Target } from "lucide-react";
import { RoadmapBoard } from "@/components/evolution/RoadmapBoard";
import { StudyLogger } from "@/components/evolution/StudyLogger";
import { formatMinutes } from "@/lib/evolution/metrics";
import { getEvolutionData } from "@/lib/evolution/queries";
import { addStudySession, setRoadmapTask } from "../actions";

export const dynamic = "force-dynamic";

const closingProjects = [
  { date: "30/11/2026", title: "Painel de vendas e diagnóstico", detail: "Excel/Power BI, reconciliação, atualização e README para publicar no LinkedIn." },
  { date: "31/12/2026", title: "Pipeline reproduzível de análise", detail: "Python/Pandas, testes com casos conhecidos, saída exportada e instruções de execução." },
  { date: "25/01/2027", title: "Projeto integrado dos 60 dias", detail: "Diagnóstico, SQL, painel, análise Python, relatório, proposta e limites documentados." },
];

export default async function DataSciencePage() {
  const data = await getEvolutionData();
  const currentDay = data.roadmap.days.find((day) => day.sections.some((section) => section.tasks.some((task) => !data.roadmapProgress.has(task.id))));
  return <main className="evo-page">
    <header className="evo-page-header"><div><p className="evo-eyebrow">PRIORIDADE Nº 1</p><h1>DataScience</h1><p>O plano intensivo organiza 4h por dia útil entre formação, prática e preparação para serviços e vagas. Inglês fica fora deste ciclo.</p></div><BookOpen size={28} /></header>
    <section className="evo-stat-row">
      <article><Clock3 /><div><span>Esta semana</span><strong>{formatMinutes(data.study.totalMinutes)} <small>/ 10h</small></strong></div></article>
      <article><Target /><div><span>Dívida pendente</span><strong>{formatMinutes(data.study.outstandingDebtMinutes)}</strong></div></article>
      <article><CalendarDays /><div><span>Roadmap atual</span><strong>{currentDay ? `Dia ${String(currentDay.dayNumber).padStart(2, "0")}` : "Concluído"}</strong></div></article>
    </section>
    <section className="evo-panel"><div className="evo-panel-heading"><div><p className="evo-eyebrow">REGISTRO DE FOCO</p><h2>Estudo de hoje</h2></div><span className="evo-pill">mínimo 120 min</span></div><StudyLogger today={data.today} onSave={addStudySession} /></section>
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">PROJETOS PARA O LINKEDIN</p><h2>Fechamentos do ciclo</h2></div><p>Uma entrega publicável ao final de cada mês e um projeto integrado no encerramento.</p></div><div className="evo-project-grid">{closingProjects.map((project) => <article className="evo-project-card" key={project.date}><small>{project.date}</small><h3>{project.title}</h3><p>{project.detail}</p></article>)}</div></section>
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">FORMAÇÃO PRÁTICA</p><h2>Roadmap completo</h2></div><p>{data.roadmap.totalBusinessDays} dias úteis · {data.roadmap.period.start} a {data.roadmap.period.end}. Cada bloco liga estudo, prática e uma entrega demonstrável.</p></div><RoadmapBoard roadmap={data.roadmap} initialCompleted={[...data.roadmapProgress]} today={data.today} onToggle={setRoadmapTask} /></section>
  </main>;
}
