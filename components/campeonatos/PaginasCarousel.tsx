"use client";

import { useRef, useState } from "react";
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
  const touchStartX = useRef<number | null>(null);

  function goTo(index: number) {
    if (index === current || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 250);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return; // swipe mínimo de 40px
    if (diff > 0 && current < groups.length - 1) goTo(current + 1);
    if (diff < 0 && current > 0) goTo(current - 1);
    touchStartX.current = null;
  }

  if (pages.length === 0) return null;

  return (
    <div
      className="space-y-3"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="space-y-3 transition-opacity duration-250"
        style={{ opacity: animating ? 0 : 1 }}
      >
        {groups[current].map((p) => (
          <PageCard
            key={p.id}
            page={p}
            initialFollowing={followedPageIds.includes(p.id)}
            userId={userId}
          />
        ))}
      </div>

      {groups.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {groups.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
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
