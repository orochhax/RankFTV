import { Info, Sparkles } from "lucide-react";
import { YoutubeOpportunityFeed } from "@/components/admin/youtube/OpportunityFeed";
import { getYoutubeOpportunities } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeOpportunitiesPage() {
  const items = await getYoutubeOpportunities();
  return (
    <main className="yt-page-content">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> DECISÃO EDITORIAL</p><h1>Radar de <em>oportunidades</em></h1><p>A nota de 0 a 100 é uma estimativa editorial ponderada — nunca uma promessa de viralização.</p></header>
      <div className="yt-notice"><Info size={18} /><div><strong>Como esta página se relaciona com a Visão Geral</strong><p>Aqui fica a lista ampla de notícias analisadas. O Briefing Editorial é somente um recorte de até 6 itens confirmados, recentes, com nota mínima 75 e confiança mínima 70.</p></div></div>
      {items.length
        ? <YoutubeOpportunityFeed items={items} />
        : <div className="yt-empty-state"><div><Sparkles size={25} /></div><h3>Nenhuma oportunidade analisada</h3><p>Uma oportunidade aparece depois que uma coleta real é analisada pela IA.</p></div>}
    </main>
  );
}
