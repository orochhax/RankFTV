import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Lightbulb, Newspaper, Radar, Sparkles, Trophy } from "lucide-react";
import { YoutubeNewsCard } from "@/components/admin/youtube/NewsCard";
import { YoutubeResearchButton } from "@/components/admin/youtube/ResearchButton";
import { formatYoutubeDate } from "@/lib/youtube/format";
import { getYoutubeDashboardData } from "@/lib/youtube/queries";
import { getEvolutionData } from "@/lib/evolution/queries";
import { markWeeklyVideoPublished, selectWeeklyVideo } from "../actions";
import { EditorialIntelligence } from "@/components/evolution/EditorialIntelligence";

export const dynamic = "force-dynamic";

// eslint-disable-next-line complexity
export default async function YoutubeDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  if (params.view === "inteligencia") return <EditorialIntelligence />;
  const [data, evolution] = await Promise.all([getYoutubeDashboardData(), getEvolutionData()]);
  const cards = [
    { label: "Notícias em 24h", value: data.stats.news24h, icon: Newspaper, tone: "is-blue", helper: "Coletadas de fontes reais" },
    { label: "Tendências em foco", value: data.stats.signals, icon: Radar, tone: "is-cyan", helper: "Em alta ou emergentes" },
    { label: "Ideias ranqueadas", value: data.stats.opportunities, icon: Lightbulb, tone: "is-violet", helper: "Com posição editorial atual" },
    { label: "Para gravar agora", value: data.stats.urgent, icon: AlertTriangle, tone: "is-orange", helper: "Score ≥ 85 e prioridade agora" },
  ];

  return (
    <main className="yt-page-content">
      <header className="yt-page-heading is-split">
        <div>
          <p className="yt-eyebrow"><span /> CENTRAL DE INTELIGÊNCIA</p>
          <h1>Bom dia. <em>O mercado não parou.</em></h1>
          <p>Veja o que merece sua atenção e transforme sinais em vídeos relevantes.</p>
        </div>
        <YoutubeResearchButton />
      </header>

      {data.aiProvider === "none" ? (
        <div className="yt-notice">
          <Sparkles size={18} />
          <div><strong>Radar atualizado manualmente pelo Codex</strong><p>Não há pesquisa automática nem uso de API paga. Peça uma atualização no VS Code quando quiser renovar o radar.</p></div>
          <Link href="/admin/evolucao/rocha-tech/fontes">Ver execução <ArrowRight size={14} /></Link>
        </div>
      ) : null}

      <section className="evo-panel evo-video-week">
        <div className="evo-panel-heading"><div><p className="evo-eyebrow">VÍDEO DA SEMANA</p><h2>{evolution.video?.title_snapshot ?? "Escolha uma ideia para executar"}</h2></div><span className="evo-pill">1 publicação / semana</span></div>
        {evolution.video?.title_snapshot ? (
          <div className="evo-video-selected"><p>{evolution.video.published_at ? "Publicado. Meta semanal concluída." : "A ideia está assumida. Avance no quadro e marque somente quando o vídeo estiver publicado."}</p>{!evolution.video.published_at ? <form action={markWeeklyVideoPublished}><button type="submit" className="yt-primary-button">Marcar como publicado</button></form> : null}</div>
        ) : evolution.ideas.length ? (
          <div className="evo-video-options">{evolution.ideas.slice(0, 3).map((idea) => <form action={selectWeeklyVideo} key={idea.id}><input type="hidden" name="ideaId" value={idea.id} /><input type="hidden" name="title" value={idea.title} /><div><strong>#{idea.current_rank} · {idea.title}</strong><small>Score editorial {idea.score}/100</small></div><button type="submit">Escolher</button></form>)}</div>
        ) : <p className="evo-empty-copy">O radar ainda não tem opções. Peça ao Codex uma nova pesquisa; se rejeitar todas, ele deve procurar outras seguindo a lógica do Pulso.AI.</p>}
      </section>

      <section className="yt-metric-grid" aria-label="Indicadores das últimas 24 horas">
        {cards.map(({ label, value, icon: Icon, tone, helper }) => (
          <article className="yt-metric-card" key={label}>
            <div className={`yt-metric-icon ${tone}`}><Icon size={19} /></div>
            <p>{label}</p><strong>{value}</strong><small>{helper}</small>
          </article>
        ))}
      </section>

      <section className="yt-status-strip">
        <div><Clock3 size={17} /><span>Última atualização</span><strong>{data.latestRun ? formatYoutubeDate(data.latestRun.started_at) : "Nenhuma execução"}</strong></div>
        <div><Radar size={17} /><span>Método</span><strong>Pesquisa manual pelo Codex <small>sem agenda</small></strong></div>
        <div className={data.latestRun?.status === "partial" ? "is-partial" : "is-ok"}><span className="yt-live-dot" /><span>Estado</span><strong>{data.latestRun ? data.latestRun.status : "Aguardando primeira pesquisa"}</strong></div>
      </section>

      {data.topIdea ? (
        <section className="yt-top-idea">
          <div className="yt-top-idea-icon"><Trophy size={19} /></div>
          <div><p className="yt-eyebrow">MELHOR VÍDEO PARA GRAVAR AGORA</p><h2>#{data.topIdea.current_rank} · {data.topIdea.title}</h2><p>{data.topIdea.rationale}</p></div>
          <div className="yt-top-idea-score"><strong>{data.topIdea.score}</strong><small>/100 editorial</small><Link href="/admin/evolucao/rocha-tech/ideias">Ver ranking <ArrowRight size={14} /></Link></div>
        </section>
      ) : null}

      <section className="yt-section-block">
        <div className="yt-section-heading">
          <div><p className="yt-eyebrow">BRIEFING EDITORIAL</p><h2>O que você precisa saber hoje</h2><p>Até 6 notícias em português, confirmadas, recentes e com maior valor para virar conteúdo. O radar completo continua em Oportunidades.</p></div>
          <Link href="/admin/evolucao/rocha-tech/oportunidades" className="yt-text-link">Ver radar completo <ArrowRight size={15} /></Link>
        </div>
        {data.news.length ? (
          <div className="yt-news-grid">{data.news.map((item, index) => <YoutubeNewsCard key={item.id} item={item} featured={index === 0} />)}</div>
        ) : (
          <div className="yt-empty-state"><div><Newspaper size={25} /></div><h3>Aguardando a primeira coleta</h3><p>Use “Pesquisar agora”. Os resultados sempre apontarão para fontes reais.</p></div>
        )}
      </section>
    </main>
  );
}
