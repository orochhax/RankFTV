"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newspaper, ChevronLeft, ChevronRight } from "lucide-react";
import { type News, formatDataNoticia } from "@/lib/news-utils";

// Carrossel de notícias na home: uma por vez, imagem grande na vertical
// (estilo story). No celular arrasta pro lado; no desktop tem setas. Alterna
// sozinho entre as notícias a cada 4s; as bolinhas embaixo acompanham e navegam.
const AUTO_MS = 4000;

export function NoticiasCarousel({ noticias }: { noticias: News[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  // Mantém a posição atual acessível dentro do interval sem recriá-lo.
  const currentRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const count = noticias.length;

  function scrollToIndex(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (count <= 1) return;
    timerRef.current = setInterval(() => {
      scrollToIndex((currentRef.current + 1) % count);
    }, AUTO_MS);
  }

  // Liga a rotação automática; reinicia se a quantidade de notícias mudar.
  useEffect(() => {
    startTimer();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }

  // Navegação manual (setas/bolinhas): vai pro índice e reinicia os 4s, pra
  // não pular logo depois que o usuário interagiu.
  function go(i: number) {
    if (count === 0) return;
    const target = ((i % count) + count) % count;
    scrollToIndex(target);
    startTimer();
  }

  if (count === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative mx-auto max-w-sm">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {noticias.map((n) => (
            <div key={n.id} className="flex min-w-full snap-center justify-center px-1">
              <Link
                href={`/noticias/${n.id}`}
                className="relative block w-full overflow-hidden rounded-2xl bg-gray-900 ring-1 ring-black/5"
              >
                <div className="relative aspect-[3/4] w-full">
                  {n.imagem_url ? (
                    <Image
                      src={n.imagem_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 384px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400">
                      <Newspaper className="size-12 text-white/90" strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Gradiente + texto sobreposto na base */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                    <p className="text-xs font-medium text-white/70">
                      {formatDataNoticia(n.created_at)}
                    </p>
                    <h3 className="mt-0.5 line-clamp-2 text-lg font-bold leading-tight text-white">
                      {n.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-white/80">{n.resumo}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Setas — só no desktop (no celular arrasta) */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Notícia anterior"
              className="absolute left-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md ring-1 ring-black/5 transition-colors hover:bg-white sm:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Próxima notícia"
              className="absolute right-2 top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md ring-1 ring-black/5 transition-colors hover:bg-white sm:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Bolinhas */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {noticias.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Notícia ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-blue-600" : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
