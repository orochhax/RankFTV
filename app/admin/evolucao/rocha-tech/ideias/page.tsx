import { Library } from "lucide-react";
import { YoutubeIdeaBoard } from "@/components/admin/youtube/IdeaBoard";
import { getYoutubeIdeas } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeIdeasPage() {
  const ideas = await getYoutubeIdeas();
  return (
    <main className="yt-page-content is-wide">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> PIPELINE DE CONTEÚDO</p><h1>Biblioteca de <em>ideias</em></h1><p>Da oportunidade identificada ao vídeo publicado, sem perder a fonte original.</p></header>
      <div className="yt-board-summary"><Library size={18} /><span>{ideas.length} ideias no fluxo · Nota máxima 98 (30 pts Prova nos Concorrentes · 25 pts Transformação/Negócios · 20 pts Stack até R$ 200 · 15 pts Timing · 10 pts Ponte Gringa → Brasil)</span><small>Segure e arraste o espaço vazio do quadro para navegar; arraste um cartão para mudar de etapa.</small></div>
      <YoutubeIdeaBoard initialIdeas={ideas} />
    </main>
  );
}
