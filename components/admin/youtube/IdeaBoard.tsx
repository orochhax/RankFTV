"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Clapperboard, GripVertical, Minus } from "lucide-react";

type Idea = {
  id: string;
  title: string;
  summary: string;
  angle: string;
  format: string;
  priority: string;
  score: number;
  confidence_score: number;
  status: string;
  editorial_state: string;
  current_rank: number | null;
  best_rank: number | null;
  last_evaluated_at: string | null;
  updated_at: string;
  source_origin: "primary" | "market" | "mixed";
};

const originLabel = {
  primary: "Fonte primária cadastrada",
  market: "Pesquisa de mercado",
  mixed: "Fontes combinadas",
} as const;

const columns = [
  ["identified", "Identificadas"],
  ["saved", "Salvas"],
  ["researching", "Pesquisando"],
  ["scripting", "Roteirizando"],
  ["ready", "Prontas para gravar"],
  ["recording", "Gravando"],
  ["editing", "Editando"],
  ["published", "Publicadas"],
] as const;

export function YoutubeIdeaBoard({ initialIdeas }: { initialIdeas: Idea[] }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0 });

  const move = useCallback(async (id: string, status: string) => {
    const previous = ideas;
    if (previous.find((idea) => idea.id === id)?.status === status) return;
    setIdeas((current) => current.map((idea) => idea.id === id ? { ...idea, status } : idea));
    const response = await fetch(`/api/admin/youtube/ideas/${id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) setIdeas(previous);
  }, [ideas]);

  function autoScroll(event: React.DragEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (!board) return;
    const bounds = board.getBoundingClientRect();
    const edge = 100;
    if (event.clientX < bounds.left + edge) board.scrollBy({ left: -22, behavior: "auto" });
    if (event.clientX > bounds.right - edge) board.scrollBy({ left: 22, behavior: "auto" });
  }

  function dragStart(event: React.DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  }

  function drop(event: React.DragEvent<HTMLElement>, status: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggedId;
    if (id) void move(id, status);
    setDraggedId(null);
    setDropStatus(null);
  }

  function panStart(event: React.PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    const target = event.target;
    if (!board || event.button !== 0 || event.pointerType !== "mouse" || board.scrollWidth <= board.clientWidth) return;
    if (target instanceof Element && target.closest(".yt-idea-card, a, button, input, select, textarea")) return;
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: board.scrollLeft };
    board.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }

  function panMove(event: React.PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (!board || panRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    board.scrollLeft = panRef.current.startScrollLeft - (event.clientX - panRef.current.startX);
  }

  function panEnd(event: React.PointerEvent<HTMLDivElement>) {
    const board = boardRef.current;
    if (panRef.current.pointerId !== event.pointerId) return;
    if (board?.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
    panRef.current.pointerId = -1;
    setIsPanning(false);
  }

  if (!ideas.length) {
    return (
      <div className="yt-empty-state">
        <div><BookOpen size={25} /></div>
        <h3>Sua biblioteca está vazia</h3>
        <p>Ideias fundamentadas surgem automaticamente depois da análise de notícias reais.</p>
      </div>
    );
  }

  return (
    <div
      className={isPanning ? "yt-kanban is-panning" : "yt-kanban"}
      ref={boardRef}
      onDragOver={autoScroll}
      onPointerDown={panStart}
      onPointerMove={panMove}
      onPointerUp={panEnd}
      onPointerCancel={panEnd}
      tabIndex={0}
      aria-label="Quadro de ideias. Arraste o espaço vazio para navegar na horizontal ou arraste um cartão para mudar sua etapa."
    >
      {columns.map(([key, label]) => {
        const grouped = ideas.filter((idea) => idea.status === key);
        return (
          <section
            className={dropStatus === key ? "yt-kanban-column is-drop-target" : "yt-kanban-column"}
            key={key}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropStatus(key); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropStatus(null); }}
            onDrop={(event) => drop(event, key)}
          >
            <header><span>{label}</span><b>{grouped.length}</b></header>
            <div className="yt-kanban-items">
              {grouped.map((idea) => (
                <article
                  className={draggedId === idea.id ? "yt-idea-card is-dragging" : "yt-idea-card"}
                  key={idea.id}
                  draggable
                  onDragStart={(event) => dragStart(event, idea.id)}
                  onDragEnd={() => { setDraggedId(null); setDropStatus(null); }}
                >
                  <div className="yt-idea-score"><Clapperboard size={15} /><span>{idea.format}</span><b>{idea.score}</b></div>
                  <span className="yt-drag-handle" aria-hidden="true"><GripVertical size={15} /></span>
                  <Link href={`/admin/evolucao/rocha-tech/ideias/${idea.id}`} className="yt-idea-title"><h3>{idea.title}</h3></Link>
                  <p>{idea.summary}</p>
                  <div className="yt-tag-row"><span className={`yt-origin-tag is-${idea.source_origin}`}>{originLabel[idea.source_origin]}</span><span>{idea.angle}</span><span>{idea.priority.replace("_", " ")}</span><span>{idea.editorial_state.replaceAll("_", " ")}</span></div>
                  <div className="yt-rank-row"><span>#{idea.current_rank ?? "—"} agora</span><span>melhor #{idea.best_rank ?? "—"}</span><span>{idea.current_rank === idea.best_rank ? <Minus size={12} /> : idea.current_rank && idea.best_rank && idea.current_rank < idea.best_rank ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span></div>
                  <label className="yt-move-label">
                    Mover para
                    <select value={idea.status} onChange={(event) => move(idea.id, event.target.value)}>
                      {columns.map(([value, text]) => <option value={value} key={value}>{text}</option>)}
                    </select>
                    <ChevronRight size={14} />
                  </label>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
