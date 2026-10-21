import Link from "next/link";
import { Activity, ArrowUpRight, Info, Radar } from "lucide-react";
import { YoutubeScoreRing } from "@/components/admin/youtube/ScoreRing";
import { relativeYoutubeDate } from "@/lib/youtube/format";
import { getYoutubeTrends } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeTrendsPage() {
  const items = await getYoutubeTrends();
  return (
    <main className="yt-page-content">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> DETECÇÃO ANTECIPADA</p><h1>Radar de <em>tendências</em></h1><p>Assuntos recorrentes sintetizados a partir das notícias, vídeos e sinais sociais verificados em cada pesquisa.</p></header>
      <div className="yt-notice"><Info size={18} /><div><strong>Não é uma lista de notícias</strong><p>Cada linha representa um assunto sustentado por uma ou mais evidências. A nota indica força editorial; a confiança indica a qualidade e a quantidade das evidências. Sem série histórica de volume, o sinal permanece qualitativo.</p></div></div>
      {items.length ? (
        <div className="yt-trend-table">
          <div className="yt-trend-head"><span>Assunto</span><span>Estado</span><span>Última avaliação</span><span>Potencial</span></div>
          {items.map((item) => (
            <article className="yt-trend-row" key={item.id}>
              <div className="yt-trend-topic"><span className="yt-trend-icon"><Activity size={17} /></span><div><strong>{item.topic}</strong><small>Posição atual: {item.current_position ? `#${item.current_position}` : "em avaliação"} · melhor: {item.best_position ? `#${item.best_position}` : "—"}</small></div></div>
              <span className="yt-qualitative">{item.state.replaceAll("_", " ")}</span>
              <span>{relativeYoutubeDate(item.last_evaluated_at)}</span>
              <Link href={`/admin/youtube/tendencias/${item.id}`} className="yt-trend-score"><YoutubeScoreRing score={item.current_score} small /><ArrowUpRight size={14} /></Link>
            </article>
          ))}
        </div>
      ) : <div className="yt-empty-state"><div><Radar size={25} /></div><h3>Sem sinais analisados ainda</h3><p>Execute pesquisas em horários diferentes para construir histórico antes de inferir evolução.</p></div>}
    </main>
  );
}
