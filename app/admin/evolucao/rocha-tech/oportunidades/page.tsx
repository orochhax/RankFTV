import { Info, Sparkles } from "lucide-react";
import { YoutubeOpportunityFeed } from "@/components/admin/youtube/OpportunityFeed";
import { getYoutubeOpportunities } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeOpportunitiesPage() {
  const items = await getYoutubeOpportunities();
  return (
    <main className="yt-page-content">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> DECISÃO EDITORIAL</p><h1>Radar de <em>oportunidades</em></h1><p>Nota viva com filtro “Vira Vídeo?” e decaimento por idade — priorizando lançamentos e mudanças testáveis na sua stack.</p></header>
      <div className="yt-notice"><Info size={18} /><div><strong>Como a nota de notícias funciona agora</strong><p>Comunicados corporativos ou industriais sem demonstração prática recebem teto de 64 pontos. O topo (≥ 75) fica reservado para ferramentas, modelos e movimentos que viram vídeo aplicável, com desconto automático por idade.</p></div></div>
      {items.length
        ? <YoutubeOpportunityFeed items={items} />
        : <div className="yt-empty-state"><div><Sparkles size={25} /></div><h3>Nenhuma oportunidade analisada</h3><p>Uma oportunidade aparece depois que uma coleta real é analisada pela IA.</p></div>}
    </main>
  );
}
