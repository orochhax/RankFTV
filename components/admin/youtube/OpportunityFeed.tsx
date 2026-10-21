"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { YoutubeNewsCard } from "@/components/admin/youtube/NewsCard";
import type { YoutubeNewsItem } from "@/lib/youtube/queries";

type OpportunityFilter = "all" | "urgent" | "confidence" | "qualitative";

const filters: Array<{ key: OpportunityFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "urgent", label: "Publicar agora" },
  { key: "confidence", label: "Alta confiança" },
  { key: "qualitative", label: "Sinal qualitativo" },
];

function matchesFilter(item: YoutubeNewsItem, filter: OpportunityFilter) {
  if (filter === "urgent") return (item.opportunity_score ?? 0) >= 85;
  if (filter === "confidence") return (item.confidence_score ?? 0) >= 85;
  if (filter === "qualitative") return item.evidence_type === "qualitative";
  return true;
}

export function YoutubeOpportunityFeed({ items }: { items: YoutubeNewsItem[] }) {
  const [activeFilter, setActiveFilter] = useState<OpportunityFilter>("all");
  const visibleItems = items.filter((item) => matchesFilter(item, activeFilter));

  return (
    <>
      <div className="yt-filter-row" aria-label="Filtrar oportunidades">
        {filters.map((filter) => {
          const count = items.filter((item) => matchesFilter(item, filter.key)).length;
          return (
            <button
              type="button"
              className={activeFilter === filter.key ? "yt-filter is-active" : "yt-filter"}
              aria-pressed={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
              key={filter.key}
            >
              {filter.label} <span>{count}</span>
            </button>
          );
        })}
      </div>
      {visibleItems.length ? (
        <div className="yt-opportunity-list">
          {visibleItems.map((item) => <YoutubeNewsCard key={item.id} item={item} featured />)}
        </div>
      ) : (
        <div className="yt-empty-state is-compact">
          <div><Sparkles size={25} /></div>
          <h3>Nenhuma oportunidade neste filtro</h3>
          <p>Escolha outro filtro para ver o restante do radar editorial.</p>
        </div>
      )}
    </>
  );
}
