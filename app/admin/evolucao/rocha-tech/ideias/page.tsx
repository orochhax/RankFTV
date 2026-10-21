import { Library } from "lucide-react";
import { YoutubeIdeaBoard } from "@/components/admin/youtube/IdeaBoard";
import { getYoutubeIdeas } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeIdeasPage() {
  const ideas = await getYoutubeIdeas();
  return (
    <main className="yt-page-content is-wide">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> PIPELINE DE CONTEÚDO</p><h1>Biblioteca de <em>ideias</em></h1><p>Da oportunidade identificada ao vídeo publicado, sem perder a fonte original.</p></header>
      <div className="yt-board-summary"><Library size={18} /><span>{ideas.length} ideias no fluxo</span><small>Segure e arraste o espaço vazio do quadro para navegar; arraste um cartão para mudar de etapa. O seletor continua disponível.</small></div>
      <YoutubeIdeaBoard initialIdeas={ideas} />
    </main>
  );
}
