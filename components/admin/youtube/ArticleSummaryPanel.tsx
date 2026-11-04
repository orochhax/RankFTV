"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";

type YoutubeArticleSummary = {
  itemId: string;
  sourceUrl: string;
  summaryPtBr: string;
  keyFacts: string[];
  importantDetails: string[];
  fetchedAt: string | null;
  status: "completed" | "unavailable" | "not_configured" | "failed";
  message?: string;
};

export function ArticleSummaryPanel({ itemId, initialSummary }: { itemId: string; initialSummary: YoutubeArticleSummary | null }) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/youtube/noticias/${itemId}/summary`, { method: "POST" });
      const payload = await response.json() as { summary?: YoutubeArticleSummary; error?: string };
      if (!response.ok || !payload.summary) throw new Error(payload.error ?? "Não foi possível gerar o resumo.");
      setSummary(payload.summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o resumo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialSummary) return;
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
    // A entrada no detalhe dispara somente uma tentativa; novas tentativas são manuais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  return (
    <section className="yt-panel yt-article-summary-panel">
      <div className="yt-panel-heading"><div><CheckCircle2 size={16} /><h2>Resumo completo da fonte</h2></div><span>{summary?.fetchedAt ? `Atualizado ${new Date(summary.fetchedAt).toLocaleDateString("pt-BR")}` : "Sob demanda"}</span></div>
      {loading ? <div className="yt-summary-loading"><LoaderCircle className="yt-spin" size={18} /><p>Lendo a página original e organizando os pontos importantes…</p></div> : null}
      {error ? <div className="yt-summary-error"><AlertTriangle size={16} /><p>{error}</p></div> : null}
      {!loading && summary ? <>
        <p className="yt-article-summary-copy">{summary.summaryPtBr}</p>
        {summary.keyFacts.length ? <><h3>Fatos principais</h3><ul className="yt-outline">{summary.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></> : null}
        {summary.importantDetails.length ? <><h3>Detalhes que não devem ser omitidos</h3><ul className="yt-outline">{summary.importantDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul></> : null}
        {summary.status !== "completed" && summary.message ? <p className="yt-summary-notice">{summary.message}</p> : null}
      </> : null}
      {!loading ? <button type="button" className="yt-source-button is-secondary yt-summary-refresh" onClick={() => void loadSummary()}><RefreshCw size={13} /> {summary ? "Atualizar resumo" : "Tentar novamente"}</button> : null}
    </section>
  );
}
