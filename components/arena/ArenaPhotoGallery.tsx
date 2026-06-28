"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Photo = { id: string; url: string };

export function ArenaPhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);

  const prev = useCallback(() =>
    setOpen((i) => (i !== null && i > 0 ? i - 1 : i)), []);

  const next = useCallback(() =>
    setOpen((i) => (i !== null && i < photos.length - 1 ? i + 1 : i)), [photos.length]);

  useEffect(() => {
    if (open === null) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     close();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, prev, next]);

  if (photos.length === 0) return null;

  return (
    <>
      {/* ── Galeria horizontal (scroll) ── */}
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.url}
            alt={`foto ${i + 1}`}
            onClick={() => setOpen(i)}
            className="h-44 w-64 shrink-0 cursor-pointer rounded-2xl object-cover transition-opacity hover:opacity-90 active:opacity-75"
          />
        ))}
      </div>

      {/* ── Lightbox ── */}
      {open !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          {/* Imagem — para o clique para não fechar ao clicar na foto */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open].url}
            alt={`foto ${open + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] max-w-full rounded-2xl object-contain shadow-2xl"
          />

          {/* Fechar */}
          <button
            onClick={close}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {/* Anterior */}
          {open > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Próximo */}
          {open < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          {/* Contador */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            {open + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
