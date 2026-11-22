import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock3, Layers3, Target } from "lucide-react";
import { CareerProgressPanel } from "@/components/evolution/CareerProgressPanel";
import { RoadmapBoard } from "@/components/evolution/RoadmapBoard";
import { getEvolutionData } from "@/lib/evolution/queries";
import { studyProjects } from "@/lib/evolution/study-projects";
import { isEvolutionLocalPreview } from "@/lib/evolution/local-preview";
import { setRoadmapTask } from "../actions";

export const dynamic = "force-dynamic";

export default async function DataSciencePage() {
  const localPreview = isEvolutionLocalPreview();
  const data = await getEvolutionData();
  const currentDay = data.roadmap.days.find((day) => day.sections.some((section) => section.tasks.some((task) => !data.roadmapProgress.has(task.id))));
  const totalHours = Math.round((data.roadmap.totalPlannedMinutes ?? 0) / 60);
  return <main className="evo-page evo-ds-v2">
    <header className="evo-page-header"><div><p className="evo-eyebrow">FORMAÇÃO PROFISSIONAL · FDE & APPLIED AI</p><h1>Engenharia de IA & Forward Deployed (FDE)</h1><p>Da engenharia de software em produção (Python, FastAPI, Django, TypeScript/React) a sistemas RAG híbridos com RBAC, enxames multiagentes com MCP, esteiras de Evals em CI/CD e deploy na AWS.</p></div><BookOpen size={28} /></header>
    <section className="evo-ds-overview">
      <article><CalendarDays /><div><span>Duração calculada</span><strong>{data.roadmap.totalBusinessDays} dias úteis</strong><small>{data.roadmap.period.start} a {data.roadmap.period.end}</small></div></article>
      <article><Clock3 /><div><span>Carga planejada</span><strong>{totalHours} horas</strong><small>carga-alvo de 4h por dia (5 meses)</small></div></article>
      <article><Layers3 /><div><span>Formação</span><strong>{data.roadmap.phases?.length ?? 3} prioridades</strong><small>Backend/Dados, RAG/IDP e Agentes/AWS</small></div></article>
      <article><Target /><div><span>Próximo passo</span><strong>{currentDay ? `Dia ${String(currentDay.dayNumber).padStart(3, "0")}` : "Concluído"}</strong><small>{currentDay?.phaseTitle ?? "trilha finalizada"}</small></div></article>
    </section>
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">VISÃO DA TRILHA</p><h2>Três prioridades, uma progressão</h2></div><p>Rota intensiva de 150 dias baseada em 32 vagas reais (Brasil & Europa) de Forward Deployed Engineer e Applied AI Engineer: {data.roadmap.curation?.activeUdemyItems ?? "conteúdo selecionado"} aulas cirúrgicas + 6 grandes sistemas de produção.</p></div><div className="evo-phase-grid">{data.roadmap.phases?.map((phase) => <article key={phase.id}><span>{phase.priority}</span><h3>{phase.title}</h3><p>{phase.description}</p><footer><strong>{phase.days} dias</strong><small>{phase.start} a {phase.end}</small></footer></article>)}</div></section>
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">PROJETOS APROVADOS</p><h2>Seis provas de capacidade</h2></div><p>Seis sistemas corporativos completos de nível Júnior Avançado / FDE para portfólio, vagas globais/nacionais e Silex Solutions, com bases sintéticas para download.</p></div><div className="evo-project-grid">{studyProjects.map((project) => <Link className="evo-project-card" href={`/admin/evolucao/datascience/projetos/${project.slug}`} key={project.slug}><small>{project.code} · {project.date}</small><h3>{project.title}</h3><p>{project.summary}</p><div className="evo-skill-tags">{project.skills.slice(0, 3).map((skill) => <em key={skill}>{skill}</em>)}</div><span>Abrir projeto <ArrowRight size={15} /></span></Link>)}</div></section>
    <CareerProgressPanel milestones={data.roadmap.careerMilestones ?? []} skills={data.roadmap.linkedinSkillMilestones ?? []} storageKey={localPreview ? "rankftv-career-milestones-preview" : "rankftv-career-milestones"} />
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">CALENDÁRIO COMPLETO</p><h2>Roadmap por dia útil</h2></div><p>Finais de semana, viagens programadas e feriados sem escala de plantão foram retirados. Feriados na sua escala de plantão (Carlos) permanecem como dias ativos de estudo.</p></div><RoadmapBoard roadmap={data.roadmap} initialCompleted={[...data.roadmapProgress]} today={data.today} onToggle={localPreview ? undefined : setRoadmapTask} localStorageKey={localPreview ? "rankftv-datascience-roadmap-v2-preview" : undefined} /></section>
  </main>;
}
