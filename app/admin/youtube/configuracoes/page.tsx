import { ExternalLink, Settings } from "lucide-react";
import { YoutubeSettingsForm } from "@/components/admin/youtube/SettingsForm";
import { getYoutubeSettings } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeSettingsPage() {
  const data = await getYoutubeSettings();
  return (
    <main className="yt-page-content">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> ADMINISTRAÇÃO</p><h1>Configurações</h1><p>Controle fontes, automação, custos e o contexto editorial do canal.</p></header>
      {data.settings
        ? <YoutubeSettingsForm settings={data.settings} />
        : <div className="yt-empty-state"><div><Settings size={25} /></div><h3>Configurações indisponíveis</h3><p>A estrutura do banco ainda não está disponível.</p></div>}
      <section className="yt-panel yt-references-panel">
        <div className="yt-panel-heading"><div><h2>Referências do canal</h2></div><span>{data.references.length} cadastradas</span></div>
        {data.references.map((reference) => (
          <article key={reference.id}>
            <div><strong>{reference.name}</strong><p>{reference.notes}</p></div>
            <a href={reference.url} target="_blank" rel="noreferrer">Abrir canal <ExternalLink size={14} /></a>
          </article>
        ))}
      </section>
    </main>
  );
}
