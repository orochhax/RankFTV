"use client";

import { useEffect, useRef, useState } from "react";
import { PageCard } from "@/components/campeonatos/PageCard";
import type { PageWithStats } from "@/lib/supabase/pages";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function PaginasCarousel({
  pages,
  followedPageIds,
  userId,
}: {
  pages: PageWithStats[];
  followedPageIds: string[];
  userId: string | null;
}) {
  const groups = chunk(pages, 3);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function advance() {
    if (groups.length <= 1) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent((c) => (c + 1) % groups.length);
      setAnimating(false);
    }, 300);
  }

  useEffect(() => {
    if (groups.length <= 1) return;
    timerRef.current = setInterval(advance, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);

  if (pages.length === 0) return null;

  const group = groups[current];

  return (
    <div className="space-y-3">
      <div
        className="space-y-3 transition-opacity duration-300"
        style={{ opacity: animating ? 0 : 1 }}
      >
        {group.map((p) => (
          <PageCard
            key={p.id}
            page={p}
            initialFollowing={followedPageIds.includes(p.id)}
            userId={userId}
          />
        ))}
      </div>

      {/* Indicadores de grupo */}
      {groups.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {groups.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setCurrent(i);
                timerRef.current = setInterval(advance, 4500);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-blue-400" : "w-1.5 bg-white/30"
              }`}
              aria-label={`Grupo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
