import { AlertCircle, Database, History } from "lucide-react";
import { YoutubeSourceList } from "@/components/admin/youtube/SourceList";
import { formatYoutubeDate } from "@/lib/youtube/format";
import { getYoutubeSourcesAndRuns } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";

export default async function YoutubeSourcesPage() {
  const data = await getYoutubeSourcesAndRuns();
  return (
    <main className="yt-page-content">
      <header className="yt-page-heading"><p className="yt-eyebrow"><span /> CURADORIA</p><h1>Fontes de <em>pesquisa</em></h1><p>Cadastre sites, blogs e perfis confiáveis. Somente as fontes ativas entram na próxima atualização manual do radar.</p></header>
      <div className="yt-two-column">
        <section className="yt-panel">
          <div className="yt-panel-heading"><div><Database size={18} /><h2>Fontes confiáveis</h2></div><span>controle editorial</span></div>
          <YoutubeSourceList initialSources={data.sources} />
        </section>
        <section className="yt-panel">
          <div className="yt-panel-heading"><div><History size={18} /><h2>Últimas execuções</h2></div></div>
          <div className="yt-run-list">
            {data.runs.map((run) => (
              <article key={run.id}>
                <span className={`yt-run-dot is-${run.status}`} />
                <div><strong>{formatYoutubeDate(run.started_at)}</strong><small>{run.trigger} · {run.inserted_count}/{run.found_count} novos · {run.analysed_count} analisados</small>{run.error_message ? <em>{run.error_message}</em> : null}</div>
                <b>{run.status}</b>
              </article>
            ))}
            {!data.runs.length ? <div className="yt-compact-empty">Nenhuma execução registrada.</div> : null}
          </div>
        </section>
      </div>
      {data.failures.length ? (
        <section className="yt-panel yt-failure-panel">
          <div className="yt-panel-heading"><div><AlertCircle size={18} /><h2>Falhas recentes por fonte</h2></div></div>
          {data.failures.map((failure, index) => <p key={`${failure.source_name}-${index}`}><strong>{failure.source_name}</strong><span>{failure.message}</span><small>{formatYoutubeDate(failure.created_at)}</small></p>)}
        </section>
      ) : null}
    </main>
  );
}
