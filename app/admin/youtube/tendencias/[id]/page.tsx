import Link from "next/link";
import { Activity, ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { formatYoutubeDate } from "@/lib/youtube/format";
import { getYoutubeTrendDetail } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeTrendDetailPage(props: PageProps<"/admin/youtube/tendencias/[id]">) {
  const { id } = await props.params;
  const data = await getYoutubeTrendDetail(id);
  if (!data.trend) notFound();
  const trend = data.trend;
  return <main className="yt-page-content">
    <Link href="/admin/youtube/tendencias" className="yt-back-link"><ArrowLeft size={15} /> Voltar para tendências</Link>
    <header className="yt-detail-heading"><span className="yt-detail-icon"><Activity size={20} /></span><div><p className="yt-eyebrow">TENDÊNCIA · {trend.state.replaceAll("_", " ")}</p><h1>{trend.topic}</h1><p>Identificada em {formatYoutubeDate(trend.first_identified_at)} · última avaliação em {formatYoutubeDate(trend.last_evaluated_at)}.</p></div><strong className="yt-detail-score">{trend.current_score}<small>/100</small></strong></header>
    <div className="yt-detail-grid"><section className="yt-panel"><div className="yt-panel-heading"><h2>Evidências atuais</h2><span>confiança {trend.confidence_score}/100</span></div><div className="yt-evidence-list">{(trend.latest_evidence as Array<{ label?: string; url?: string; note?: string }>).map((entry, index) => <a key={index} href={entry.url} target="_blank" rel="noreferrer"><div><strong>{entry.label}</strong><p>{entry.note}</p></div><ExternalLink size={14} /></a>)}</div></section><section className="yt-panel"><div className="yt-panel-heading"><h2>Evolução</h2><span>melhor posição #{trend.best_position ?? "—"}</span></div>{data.history.length ? <div className="yt-history-list">{data.history.map((entry) => <article key={entry.created_at}><strong>{formatYoutubeDate(entry.created_at)}</strong><span>{entry.score}/100 · #{entry.position ?? "—"}</span><small>{entry.state.replaceAll("_", " ")}</small><p>{entry.rationale}</p></article>)}</div> : <p className="yt-detail-copy">Ainda não há reavaliações registradas.</p>}</section></div>
  </main>;
}
