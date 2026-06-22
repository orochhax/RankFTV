"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { type News, formatDataNoticia } from "@/lib/news-utils";

// Carrossel de notícias na home: uma por vez, imagem grande na vertical
// (estilo story). Arrasta pro lado pra ver as outras; as bolinhas embaixo
// acompanham a posição e também navegam ao clicar.
export function NoticiasCarousel({ noticias }: { noticias: News[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  if (noticias.length === 0) return null;

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {noticias.map((n) => (
          <div key={n.id} className="flex min-w-full snap-center justify-center px-1">
            <Link
              href={`/noticias/${n.id}`}
              className="relative block w-full max-w-sm overflow-hidden rounded-2xl bg-gray-900 ring-1 ring-black/5"
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

      {/* Bolinhas */}
      {noticias.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {noticias.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
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
