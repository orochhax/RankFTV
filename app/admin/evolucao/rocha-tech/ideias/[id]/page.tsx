import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Eye, Lightbulb, Video } from "lucide-react";
import { notFound } from "next/navigation";
import { getYoutubeIdeaDetail } from "@/lib/youtube/queries";
import { formatYoutubeDate } from "@/lib/youtube/format";
import { getRecordingRequirements } from "@/lib/youtube/recording-requirements";
import { getIdeaNovelty } from "@/lib/youtube/novelty-date";
import { IDEA_APPROACH_LABELS, type YoutubeIdeaApproachKey } from "@/lib/youtube/idea-approaches";

export const dynamic = "force-dynamic";

const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const publicationDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });
const originLabel = {
  primary: "Fonte primária cadastrada",
  market: "Pesquisa de mercado",
  mixed: "Fontes combinadas",
} as const;

export default async function YoutubeIdeaDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await getYoutubeIdeaDetail(id);
  if (!data.idea) notFound();
  const idea = data.idea;
  const sourceOrigin = (idea.source_origin === "primary" ? "primary" : idea.source_origin === "mixed" ? "mixed" : "market") as keyof typeof originLabel;
  const requirements = getRecordingRequirements(idea);
  const novelty = getIdeaNovelty(idea, data.sources.map((row) => Array.isArray(row.item) ? row.item[0] : row.item).filter(Boolean).map((item) => ({ title: String(item.title), published_at: item.published_at })));
  const noveltyDate = novelty.date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(novelty.date)) : null;
  return <main className="yt-page-content">
    <Link href="/admin/evolucao/rocha-tech/ideias" className="yt-back-link"><ArrowLeft size={15} /> Voltar para ideias</Link>
    <header className="yt-detail-heading"><span className="yt-detail-icon"><Lightbulb size={20} /></span><div><p className="yt-eyebrow">IDEIA RANQUEADA #{idea.current_rank ?? "—"}</p><div className="yt-detail-origin"><span className={`yt-origin-pill is-${sourceOrigin}`}>{originLabel[sourceOrigin]}</span></div><h1>{idea.title}</h1><p>{idea.summary}</p></div><strong className="yt-detail-score">{idea.score}<small>/100</small></strong></header>
    <section className="yt-panel yt-approaches-panel">
      <div className="yt-panel-heading"><div><h2>Quatro formas de transformar esta pauta em vídeo</h2><p>Compare a promessa, a demonstração e a vida útil de cada abordagem antes de escolher.</p></div><span>{data.approaches.length}/4 analisadas</span></div>
      {data.approaches.length ? <div className="yt-approaches-grid">{data.approaches.map((approach) => <article className="yt-approach-card" key={approach.id}>
        <div className="yt-approach-card-heading"><span>{approach.position}. {IDEA_APPROACH_LABELS[approach.approach_key as YoutubeIdeaApproachKey]}</span><strong>{approach.score}<small>/100</small></strong></div>
        <h3>{approach.title}</h3>
        <p>{approach.explanation}</p>
        <dl>
          <div><dt>Promessa</dt><dd>{approach.promise}</dd></div>
          <div><dt>O que mostrar</dt><dd>{approach.demonstration}</dd></div>
          <div><dt>Por que pode funcionar</dt><dd>{approach.why_it_works}</dd></div>
          <div><dt>Momento e duração</dt><dd>{approach.timeliness} {approach.longevity}</dd></div>
          <div><dt>Ferramentas</dt><dd>{approach.requirements_summary}</dd></div>
        </dl>
      </article>)}</div> : <p className="yt-detail-copy">Esta ideia é anterior ao modelo de quatro abordagens. Ela será completada na próxima atualização editorial geral.</p>}
    </section>
    <div className="yt-detail-grid">
      <section className="yt-panel"><div className="yt-panel-heading"><h2>Por que gravar</h2><span>{idea.editorial_state.replaceAll("_", " ")}</span></div><p className="yt-detail-copy">{idea.rationale}</p><h3>Gancho sugerido</h3><blockquote>{idea.hook}</blockquote><h3>Estrutura</h3><ol className="yt-outline">{(idea.outline as string[]).map((step) => <li key={step}>{step}</li>)}</ol></section>
      <section className="yt-panel"><div className="yt-panel-heading"><h2>Histórico real</h2><span>melhor posição #{idea.best_rank ?? "—"}</span></div>{data.history.length ? <div className="yt-history-list">{data.history.map((entry) => <article key={`${entry.created_at}-${entry.rank_position}`}><strong>{formatYoutubeDate(entry.created_at)}</strong><span>{entry.score}/100 · #{entry.rank_position ?? "—"}</span><small>{entry.change_kind} {entry.rank_delta ? `(${entry.rank_delta > 0 ? "+" : ""}${entry.rank_delta})` : ""}</small><p>{entry.rationale}</p></article>)}</div> : <p className="yt-detail-copy">Ainda não há reavaliações registradas.</p>}</section>
    </div>
    <section className="yt-panel yt-novelty-date">
      <div className="yt-panel-heading"><h2>Data da novidade</h2><span>{novelty.isSpecificLaunch ? "lançamento ou atualização" : "pauta evergreen"}</span></div>
      <p className="yt-detail-copy">{novelty.isSpecificLaunch && noveltyDate ? <><strong>{noveltyDate}</strong> · {novelty.label}.{novelty.sourceTitle ? ` Fonte: ${novelty.sourceTitle}.` : ""}</> : novelty.label}</p>
      {novelty.isSpecificLaunch && !noveltyDate ? <p className="yt-detail-note">A fonte relacionada não trouxe uma data verificável para o lançamento.</p> : null}
    </section>
    <section className="yt-panel yt-recording-requirements">
      <div className="yt-panel-heading"><div><h2>Requisitos para gravar</h2><p>Ferramentas necessárias para produzir esta pauta — sem incluir computador ou celular.</p></div><strong>{requirements.totalLabel}</strong></div>
      <p className="yt-detail-copy">{requirements.analysis}</p>
      <div className="yt-requirements-grid">{requirements.tools.map((tool) => <article className={`yt-requirement-card${tool.required ? " is-required" : " is-optional"}`} key={tool.name}>
        <div className="yt-requirement-card-heading"><div><strong>{tool.name}</strong><span>{tool.required ? "necessário" : "opcional"}</span></div><b>{tool.monthlyCostLabel}</b></div>
        <p>{tool.purpose}</p><small>{tool.note}</small>
      </article>)}</div>
      <p className="yt-requirements-total"><strong>Total estimado:</strong> {requirements.totalLabel}. {requirements.priceNote}</p>
    </section>
    <section className="yt-panel yt-detail-sources"><div className="yt-panel-heading"><h2>Fontes relacionadas</h2></div>{data.sources.map((source, index) => { const item = Array.isArray(source.item) ? source.item[0] : source.item; return item ? <a key={index} href={item.canonical_url} target="_blank" rel="noreferrer"><span>{item.title}</span><ExternalLink size={14} /></a> : null; })}</section>
    <section className="yt-panel yt-youtube-references">
      <div className="yt-panel-heading"><div><h2><Video size={17} /> Vídeos semelhantes no YouTube</h2><p>Referências recentes e relevantes para comparar ângulo, título e abordagem.</p></div><span>{data.youtubeReferences.length}/5 selecionados</span></div>
      {data.youtubeReferences.length ? <div className="yt-youtube-reference-grid">{data.youtubeReferences.map((video) => <a key={video.id} className="yt-youtube-reference" href={video.video_url} target="_blank" rel="noreferrer">
        <div className="yt-youtube-reference-title"><Video size={17} /><span>{video.title}</span><ExternalLink size={14} /></div>
        <p>{video.channel_name}</p>
        <div className="yt-youtube-reference-meta"><span><Eye size={13} /> {compactNumber.format(video.view_count)} visualizações</span><span><CalendarDays size={13} /> {publicationDate.format(new Date(`${video.published_on}T00:00:00.000Z`))}</span></div>
        <small>{video.selection_reason}</small>
      </a>)}</div> : <p className="yt-detail-copy">A pesquisa de vídeos semelhantes ainda não foi registrada para esta ideia. Nas próximas ideias, ela é obrigatória antes da importação.</p>}
    </section>
  </main>;
}
