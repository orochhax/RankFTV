import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, CircleGauge, Clapperboard, Dumbbell, Trophy } from "lucide-react";
import { evolutionProjects } from "@/lib/evolution/projects";
import { formatDatePtBr } from "@/lib/evolution/date";
import { formatMinutes } from "@/lib/evolution/metrics";
import { getEvolutionData } from "@/lib/evolution/queries";
import { summarizeAiJobResult } from "@/lib/evolution/ai-job";
import { EvolutionAiRefresh } from "@/components/evolution/EvolutionAiRefresh";

export const dynamic = "force-dynamic";

function accountability(score: number, debt: number) {
  if (score >= 85 && debt === 0) return { tone: "good", title: "Você está entregando o que prometeu.", text: "Mantenha o ritmo. Consistência vale mais do que uma arrancada isolada." };
  if (score >= 60) return { tone: "warn", title: "O esforço ainda não virou uma semana forte.", text: debt ? `Há ${formatMinutes(debt)} de dívida de estudo. Pague sem fingir que o dia perdido deixou de existir.` : "Feche as entregas abertas antes de criar novas prioridades." };
  return { tone: "danger", title: "A semana está abaixo do padrão que muda sua realidade.", text: debt ? `Você deve ${formatMinutes(debt)} de estudo. Lazer flexível fica depois da recuperação e das entregas essenciais.` : "Intenção não conta como progresso. Registre estudo, treino e uma entrega real do canal." };
}

// A home compõe estados independentes em uma única leitura visual; as regras numéricas ficam em lib/evolution.
// eslint-disable-next-line complexity
export default async function EvolutionHomePage() {
  const data = await getEvolutionData();
  const latestFollowers = Number(data.followers[0]?.followers ?? 26);
  const followerTarget = Number(data.settings.follower_target ?? 500);
  const followerPercent = Math.min(100, Math.round((latestFollowers / Math.max(1, followerTarget)) * 100));
  const verdict = accountability(data.score.total, data.study.outstandingDebtMinutes);
  const todayStudy = data.study.days.find((day) => day.date === data.today)?.minutes ?? 0;
  const trainedToday = data.training.some((entry) => String(entry.training_date) === data.today);
  const videoStatus = data.video?.published_at ? "Publicado" : data.video?.title_snapshot ? "Em andamento" : "Ainda não escolhido";
  const aiJob = data.aiJob ? {
    id: String(data.aiJob.id),
    status: String(data.aiJob.status) as import("@/lib/evolution/ai-job").EvolutionAiJobStatus,
    stage: String(data.aiJob.stage),
    progressMessage: String(data.aiJob.progress_message),
    errorMessage: data.aiJob.error_message ? String(data.aiJob.error_message) : null,
    requestedAt: String(data.aiJob.requested_at),
    completedAt: data.aiJob.completed_at ? String(data.aiJob.completed_at) : null,
    preview: summarizeAiJobResult(data.aiJob.result),
  } : null;
  const workerLastSeenAt = data.aiWorker?.last_seen_at ? new Date(String(data.aiWorker.last_seen_at)) : null;
  const workerOnline = Boolean(workerLastSeenAt && new Date(data.fetchedAt).getTime() - workerLastSeenAt.getTime() < 45_000);
  const workerLastSeen = workerLastSeenAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(workerLastSeenAt) : null;

  return (
    <main className="evo-page">
      <header className="evo-hero">
        <div><p className="evo-eyebrow">CENTRAL DE EVOLUÇÃO · {formatDatePtBr(data.today)}</p><h1>Seu plano só vale quando vira <em>evidência.</em></h1><p>Uma visão única de estudo, autoridade, saúde e execução — com cobrança baseada no que você realmente fez.</p></div>
        <div className="evo-score-ring" style={{ "--score": `${data.score.total * 3.6}deg` } as React.CSSProperties}><strong>{data.score.total}</strong><small>/100 esta semana</small></div>
      </header>

      {!data.databaseReady ? <div className="evo-setup-banner"><AlertTriangle size={18} /><div><strong>Modo de demonstração local</strong><p>As telas estão prontas, mas os registros serão liberados somente depois de você aprovar a aplicação da migração no Supabase.</p></div></div> : null}

      <EvolutionAiRefresh job={aiJob} workerOnline={workerOnline} workerLastSeen={workerLastSeen} />

      <section className="evo-score-grid" aria-label="Composição do score semanal">
        <article><span className="is-blue"><BookOpen size={18} /></span><div><p>DataScience</p><strong>{data.score.dataScience}<small>/50</small></strong><em>{formatMinutes(data.study.totalMinutes)} de 10h</em></div></article>
        <article><span className="is-red"><Clapperboard size={18} /></span><div><p>Rocha Tech</p><strong>{data.score.rochaTech}<small>/30</small></strong><em>{videoStatus}</em></div></article>
        <article><span className="is-purple"><Dumbbell size={18} /></span><div><p>Insta / Shape</p><strong>{data.score.instaShape}<small>/20</small></strong><em>{data.training.length} treinos registrados</em></div></article>
        <article className="is-view-only"><span><Trophy size={18} /></span><div><p>RankFTV</p><strong>{data.rank.progress.percent}%</strong><em>Visão, sem peso no score</em></div></article>
      </section>

      <section className="evo-dashboard-grid">
        <article className="evo-panel evo-focus-panel">
          <div className="evo-panel-heading"><div><p className="evo-eyebrow">HOJE</p><h2>O mínimo que precisa sair</h2></div><CircleGauge size={21} /></div>
          <div className="evo-focus-list">
            <Link href="/admin/evolucao/datascience"><span className={todayStudy >= 120 ? "is-complete" : ""}>{todayStudy >= 120 ? <CheckCircle2 /> : <BookOpen />}</span><div><strong>Estudar por pelo menos 2 horas</strong><small>{formatMinutes(todayStudy)} registradas hoje</small></div><ArrowRight /></Link>
            <Link href="/admin/evolucao/insta-shape"><span className={trainedToday ? "is-complete" : ""}>{trainedToday ? <CheckCircle2 /> : <Dumbbell />}</span><div><strong>Confirmar treino no Hevy</strong><small>{trainedToday ? "Treino registrado" : "Informe apenas a parte do corpo"}</small></div><ArrowRight /></Link>
            <Link href="/admin/evolucao/rocha-tech"><span className={data.video?.published_at ? "is-complete" : ""}>{data.video?.published_at ? <CheckCircle2 /> : <Clapperboard />}</span><div><strong>Avançar o vídeo da semana</strong><small>{data.video?.title_snapshot ?? "Escolha uma ideia no ranking do Pulso.AI"}</small></div><ArrowRight /></Link>
          </div>
        </article>

        <article className={`evo-panel evo-verdict is-${verdict.tone}`}>
          <p className="evo-eyebrow">COBRANÇA DIRETA</p><h2>{verdict.title}</h2><p>{verdict.text}</p>
          <div><AlertTriangle size={17} /><span>Dias abaixo de 2h continuam marcados, mesmo depois de a dívida ser paga.</span></div>
        </article>

        {data.latestReview ? <article className="evo-panel evo-ai-review"><p className="evo-eyebrow">ÚLTIMA ANÁLISE DA IA</p><h2>{data.latestReview.verdict}</h2><div>{Array.isArray(data.latestReview.actions) ? data.latestReview.actions.map((action, index) => <p key={`${index}-${String(action)}`}><span>{index + 1}</span>{String(action)}</p>) : null}</div><small>Análise registrada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(data.latestReview.created_at))}.</small></article> : null}

        <article className="evo-panel evo-week-panel">
          <div className="evo-panel-heading"><div><p className="evo-eyebrow">SEMANA · SEG A DOM</p><h2>Estudo sem maquiagem</h2></div><strong>{Math.round((data.study.totalMinutes / data.study.targetMinutes) * 100)}%</strong></div>
          <div className="evo-progress is-large"><span style={{ width: `${Math.min(100, (data.study.totalMinutes / data.study.targetMinutes) * 100)}%` }} /></div>
          <div className="evo-week-days">{data.study.days.map((day, index) => <div key={day.date} className={day.minutes >= day.targetMinutes && index < 5 ? "is-met" : day.originalDeficitMinutes > 0 && day.date <= data.today ? "is-failed" : ""}><span>{["S", "T", "Q", "Q", "S", "S", "D"][index]}</span><strong>{day.minutes}</strong><small>min</small></div>)}</div>
          <footer><span>Total: <strong>{formatMinutes(data.study.totalMinutes)}</strong></span><span>Dívida: <strong>{formatMinutes(data.study.outstandingDebtMinutes)}</strong></span></footer>
        </article>

        <article className="evo-panel evo-social-panel">
          <div className="evo-panel-heading"><div><p className="evo-eyebrow">INSTAGRAM</p><h2>@rochhaexp</h2></div><strong>{latestFollowers}</strong></div>
          <div className="evo-progress"><span style={{ width: `${followerPercent}%` }} /></div>
          <p><strong>{followerPercent}%</strong> da meta de {followerTarget} seguidores até 30/06/2027.</p>
          <Link href="/admin/evolucao/insta-shape">Atualizar métrica <ArrowRight size={15} /></Link>
        </article>
      </section>

      <section className="evo-section">
        <div className="evo-section-heading"><div><p className="evo-eyebrow">PORTFÓLIO</p><h2>Quatro projetos, quatro prazos</h2></div><p>As candidaturas entram depois do primeiro projeto — antes disso, o foco é construir prova de capacidade.</p></div>
        <div className="evo-project-grid">{evolutionProjects.map((project) => {
          const stored = data.projectProgress.find((item) => item.project_id === project.id);
          const progress = Number(stored?.progress ?? 0);
          return <article key={project.id}><div><span>0{project.number}</span><small>{project.track}</small></div><h3>{project.title}</h3><p>{project.outcome}</p><div className="evo-progress"><span style={{ width: `${progress}%` }} /></div><footer><strong>{progress}%</strong><time>{formatDatePtBr(project.dueDate)}</time></footer></article>;
        })}</div>
      </section>

      <section className="evo-panel evo-rank-strip"><div><p className="evo-eyebrow">RANKFTV · ACOMPANHAMENTO</p><h2>{data.rank.progress.remaining} marcos P0 ainda faltam</h2><p>O projeto está em {data.rank.progress.percent}%. Esta área informa; não compete com sua prioridade de entrada em Dados.</p></div><Link href="/admin/evolucao/rankftv">Ver pendências claras <ArrowRight size={16} /></Link></section>
    </main>
  );
}
