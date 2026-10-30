"use client";

import { useMemo, useRef } from "react";
import { X } from "lucide-react";
import { formatYoutubeDate } from "@/lib/youtube/format";

export type IdeaHistoryEntry = {
  score: number;
  rank_position: number | null;
  rank_delta: number | null;
  change_kind: string;
  rationale: string;
  created_at: string;
};

type IdeaHistoryPanelProps = {
  entries: IdeaHistoryEntry[];
  bestRank: number | null;
};

function HistoryEntries({ entries }: { entries: IdeaHistoryEntry[] }) {
  return <div className="yt-history-list">{entries.map((entry, index) => (
    <article key={`${entry.created_at}-${entry.rank_position}-${index}`}>
      <strong>{formatYoutubeDate(entry.created_at)}</strong>
      <span>{entry.score}/100 · #{entry.rank_position ?? "—"}</span>
      <small>{entry.change_kind} {entry.rank_delta ? `(${entry.rank_delta > 0 ? "+" : ""}${entry.rank_delta})` : ""}</small>
      <p>{entry.rationale}</p>
    </article>
  ))}</div>;
}

export function IdeaHistoryPanel({ entries, bestRank }: IdeaHistoryPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newestFirst = useMemo(
    () => [...entries].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [entries],
  );
  const preview = newestFirst.slice(0, 3);

  return <section className="yt-panel yt-history-panel">
    <div className="yt-panel-heading"><h2>Histórico real</h2><span>melhor posição #{bestRank ?? "—"}</span></div>
    {preview.length ? <>
      <HistoryEntries entries={preview} />
      {newestFirst.length > 3 ? <button className="yt-history-open" type="button" onClick={() => dialogRef.current?.showModal()}>
        Ver todos os históricos <span>({newestFirst.length})</span>
      </button> : null}
    </> : <p className="yt-detail-copy">Ainda não há reavaliações registradas.</p>}

    <dialog
      ref={dialogRef}
      className="yt-history-dialog"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      <div className="yt-history-dialog-card">
        <div className="yt-history-dialog-heading">
          <div><p>HISTÓRICO COMPLETO</p><h2>Evolução real da ideia</h2><span>{newestFirst.length} atualizações · mais recentes primeiro</span></div>
          <button type="button" aria-label="Fechar histórico completo" onClick={() => dialogRef.current?.close()}><X size={18} /></button>
        </div>
        <div className="yt-history-dialog-scroll"><HistoryEntries entries={newestFirst} /></div>
      </div>
    </dialog>
  </section>;
}
