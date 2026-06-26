"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, MapPin, Users } from "lucide-react";

export type ArenaDestaque = {
  id: string;
  nome: string;
  handle: string;
  cidade: string;
  estado: string;
  banner_url: string | null;
  avatar_url: string | null;
  alunos: number;
};

export function DestaquesArenasCarousel({ arenas }: { arenas: ArenaDestaque[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (arenas.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % arenas.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [arenas.length]);

  if (arenas.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Arenas em destaque</h2>
        <Link
          href="/arenas"
          className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todas <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* ── Desktop: cards horizontais empilhados ── */}
      <div className="hidden gap-4 md:flex md:flex-col">
        {arenas.map((arena) => (
          <Link
            key={arena.id}
            href={`/arenas/${arena.handle}`}
            className="group flex overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-44 w-1/2 shrink-0 bg-gradient-to-br from-blue-700 to-blue-900">
              {arena.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={arena.banner_url}
                  alt={arena.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Building2 className="size-12 text-white/30" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 p-6">
              <h3 className="text-xl font-bold leading-tight text-gray-900 group-hover:text-blue-700">
                {arena.nome}
              </h3>
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="size-4" />
                {arena.cidade} - {arena.estado}
              </p>
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="size-4" />
                {arena.alunos} {arena.alunos === 1 ? "aluno" : "alunos"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Mobile: carrossel com profundidade ── */}
      <div className="relative md:hidden" style={{ height: "260px" }}>
        {arenas.map((arena, i) => {
          const raw = (i - current + arenas.length) % arenas.length;
          const dist = raw > arenas.length / 2 ? raw - arenas.length : raw;
          const absDist = Math.abs(dist);
          const isFront = dist === 0;

          const scale      = isFront ? 1 : absDist === 1 ? 0.91 : 0.82;
          const opacity    = isFront ? 1 : absDist === 1 ? 0.55 : 0.25;
          const zIndex     = isFront ? 30 : absDist === 1 ? 20 : 10;
          const translateY = isFront ? "0px" : `${absDist * 14}px`;
          const translateX = isFront ? "0px" : `${dist > 0 ? absDist * 4 : absDist * -4}px`;

          return (
            <div
              key={arena.id}
              onClick={() => !isFront && setCurrent(i)}
              className="absolute inset-x-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-md"
              style={{
                zIndex,
                transform: `translateY(${translateY}) translateX(${translateX}) scale(${scale})`,
                opacity,
                transition: "transform 500ms cubic-bezier(0.4,0,0.2,1), opacity 500ms cubic-bezier(0.4,0,0.2,1)",
                transformOrigin: "top center",
                cursor: isFront ? "default" : "pointer",
              }}
            >
              <Link
                href={`/arenas/${arena.handle}`}
                onClick={(e) => !isFront && e.preventDefault()}
                className="block"
              >
                <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900">
                  {arena.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={arena.banner_url}
                      alt={arena.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="size-10 text-white/30" strokeWidth={1.5} />
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <h3 className="font-semibold text-gray-900">{arena.nome}</h3>
                  <p className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="size-4" />
                    {arena.cidade} - {arena.estado}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="size-4" />
                    {arena.alunos} {arena.alunos === 1 ? "aluno" : "alunos"}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {arenas.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1 md:hidden">
          {arenas.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-blue-600" : "w-1.5 bg-gray-200"
              }`}
              aria-label={`Arena ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
