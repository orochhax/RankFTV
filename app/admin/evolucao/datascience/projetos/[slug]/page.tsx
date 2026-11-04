import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, Wrench } from "lucide-react";
import { getStudyProject, studyProjects } from "@/lib/evolution/study-projects";

export function generateStaticParams() {
  return studyProjects.map(({ slug }) => ({ slug }));
}

export default async function StudyProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getStudyProject(slug);
  if (!project) notFound();

  return <main className="evo-page evo-study-project-page">
    <Link className="evo-back-link" href="/admin/evolucao/datascience"><ArrowLeft size={15} /> Voltar ao plano</Link>
    <header className="evo-project-hero">
      <div><p className="evo-eyebrow">PROJETO DE PORTFÓLIO · {project.date}</p><h1>{project.title}</h1><p>{project.summary}</p></div>
      <span>Dados 100% fictícios</span>
    </header>

    <section className="evo-project-intro-grid">
      <article className="evo-panel"><h2>Cenário</h2><p>{project.scenario}</p></article>
      <article className="evo-panel"><h2>Objetivo</h2><p>{project.objective}</p></article>
    </section>

    <section className="evo-panel evo-project-downloads">
      <div className="evo-panel-heading"><div><p className="evo-eyebrow">COMECE AQUI</p><h2>Arquivos para baixar</h2></div><Download size={22} /></div>
      {project.downloads.map((download) => <a key={download.href} href={download.href} download><div><strong>{download.label}</strong><small>{download.description}</small></div><ExternalLink size={17} /></a>)}
      <p>Não corrija as abas <strong>raw</strong> diretamente. Elas contêm erros intencionais para você diagnosticar, tratar e justificar.</p>
    </section>

    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">EXECUÇÃO</p><h2>Passo a passo</h2></div><p>Siga a ordem, mas registre as decisões com suas próprias palavras.</p></div>
      <div className="evo-project-step-grid">{project.steps.map((step) => <article className="evo-panel" key={step.title}><h3>{step.title}</h3><ul>{step.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
    </section>

    <section className="evo-project-detail-grid">
      <article className="evo-panel"><h2>Entregáveis</h2><ul>{project.deliverables.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></article>
      <article className="evo-panel"><h2>Critérios de aceite</h2><ul>{project.acceptance.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></article>
      <article className="evo-panel"><h2>Ferramentas</h2><ul>{project.tools.map((item) => <li key={item}><Wrench size={15} />{item}</li>)}</ul></article>
      <article className="evo-panel"><h2>Publicação no LinkedIn</h2><ol>{project.linkedin.map((item) => <li key={item}>{item}</li>)}</ol></article>
    </section>
  </main>;
}
