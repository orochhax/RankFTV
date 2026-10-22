import { ArrowUpRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import type { YoutubeNewsItem } from "@/lib/youtube/queries";
import { relativeYoutubeDate } from "@/lib/youtube/format";
import { YoutubeScoreRing } from "@/components/admin/youtube/ScoreRing";

const reliabilityLabel: Record<string, string> = {
  confirmed: "Confirmado",
  rumor: "Rumor",
  interpretation: "Interpretação",
  insufficient: "Dados insuficientes",
};
const originLabel = {
  primary: "Fonte primária cadastrada",
  market: "Pesquisa de mercado",
  mixed: "Fontes combinadas",
} as const;

export function YoutubeNewsCard({ item, featured = false }: { item: YoutubeNewsItem; featured?: boolean }) {
  const analysed = item.opportunity_score !== null;
  return (
    <article className={featured ? "yt-news-card is-featured" : "yt-news-card"}>
      <div className="yt-card-meta">
        <span className="yt-source-pill">{item.source_name}</span>
        {item.is_new ? <span className="yt-new-tag">NEW</span> : null}
        <span className={`yt-origin-pill is-${item.source_origin}`}>{originLabel[item.source_origin]}</span>
        <span><Clock3 size={13} /> {relativeYoutubeDate(item.published_at ?? item.collected_at)}</span>
        {item.reliability ? <span><ShieldCheck size={13} /> {reliabilityLabel[item.reliability]}</span> : null}
      </div>
      <div className="yt-news-card-body">
        <div>
          <h3>{item.title}</h3>
          <p>{item.summary_pt_br ?? item.summary ?? "O item foi coletado, mas ainda não recebeu resumo por IA."}</p>
        </div>
        {analysed
          ? <YoutubeScoreRing score={item.opportunity_score ?? 0} small={!featured} />
          : <span className="yt-pending-badge">Análise pendente</span>}
      </div>
      {item.why_it_matters ? (
        <div className="yt-why-box">
          <Sparkles size={15} />
          <p><strong>Por que importa:</strong> {item.why_it_matters}</p>
        </div>
      ) : null}
      <div className="yt-card-footer">
        <span>
          {item.category} · {item.evidence_type === "qualitative"
            ? "Sinal qualitativo"
            : item.evidence_type === "quantitative"
              ? "Dados quantitativos"
              : item.evidence_type === "mixed" ? "Evidência mista" : "Sem classificação"}
        </span>
        <a href={item.url} target="_blank" rel="noreferrer">Fonte original <ArrowUpRight size={14} /></a>
      </div>
    </article>
  );
}
