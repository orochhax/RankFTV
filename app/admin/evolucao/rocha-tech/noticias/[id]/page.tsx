import Link from "next/link";
import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import { notFound } from "next/navigation";
import { ArticleSummaryPanel } from "@/components/admin/youtube/ArticleSummaryPanel";
import { getYoutubeArticleSummary } from "@/lib/youtube/article-summary";
import { getYoutubeNewsDetail } from "@/lib/youtube/queries";
import { formatYoutubeDate } from "@/lib/youtube/format";

export const dynamic = "force-dynamic";

const originLabel = {
  primary: "Fonte primária cadastrada",
  market: "Pesquisa de mercado",
  mixed: "Fontes combinadas",
} as const;

export default async function YoutubeNewsDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const data = await getYoutubeNewsDetail(id);
  if (!data.item) notFound();
  const item = data.item;
  const initialSummary = await getYoutubeArticleSummary(item.id);
  return <main className="yt-page-content">
    <Link href="/admin/evolucao/rocha-tech" className="yt-back-link"><ArrowLeft size={15} /> Voltar para o radar</Link>
    <header className="yt-detail-heading yt-news-detail-heading">
      <span className="yt-detail-icon"><Newspaper size={20} /></span>
      <div>
        <p className="yt-eyebrow">NOTÍCIA · {formatYoutubeDate(item.published_at ?? item.collected_at)}</p>
        <div className="yt-detail-origin"><span className={`yt-origin-pill is-${item.source_origin}`}>{originLabel[item.source_origin]}</span><span className="yt-source-pill">{item.source_name}</span></div>
        <h1>{item.title}</h1>
        <p>{item.summary_pt_br ?? item.summary ?? "Esta notícia ainda não recebeu um resumo editorial."}</p>
      </div>
      {item.opportunity_score !== null ? <strong className="yt-detail-score">{item.opportunity_score}<small>/100</small></strong> : null}
    </header>
    <ArticleSummaryPanel itemId={item.id} initialSummary={initialSummary} />
    <section className="yt-panel yt-detail-sources">
      <div className="yt-panel-heading"><div><h2>Fonte original</h2><p>Abra a publicação para conferir o contexto completo.</p></div></div>
      <a className="yt-detail-source-link" href={item.url} target="_blank" rel="noreferrer"><span>{item.url}</span><ExternalLink size={14} /></a>
    </section>
  </main>;
}
