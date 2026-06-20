"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Trophy, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR } from "@/lib/format";
import type { Championship } from "@/lib/types";

export function DestaquesCarousel({ camps }: { camps: Championship[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (camps.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % camps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [camps.length]);

  if (camps.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Campeonatos em destaque</h2>
        <Link
          href="/campeonatos"
          className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todos <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Stack de cards com profundidade */}
      <div className="relative" style={{ height: "260px" }}>
        {camps.map((camp, i) => {
            // distância em relação ao atual (com wrap circular)
          const raw  = (i - current + camps.length) % camps.length;
          const dist = raw > camps.length / 2 ? raw - camps.length : raw;
          // dist: 0 = frente, ±1 = adjacente, ±2 = mais atrás

          const absDist = Math.abs(dist);
          const isFront = dist === 0;

          const scale      = isFront ? 1 : absDist === 1 ? 0.91 : 0.82;
          const opacity    = isFront ? 1 : absDist === 1 ? 0.55 : 0.25;
          const zIndex     = isFront ? 30 : absDist === 1 ? 20 : 10;
          // cards atrás ficam ligeiramente para baixo e centralizados
          const translateY = isFront ? "0px" : `${absDist * 14}px`;
          const translateX = isFront
            ? "0px"
            : `${dist > 0 ? absDist * 4 : absDist * -4}px`;

          return (
            <div
              key={camp.id}
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
                href={`/campeonatos/${camp.id}`}
                onClick={(e) => !isFront && e.preventDefault()}
                className="block"
              >
                <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${camp.bannerFrom} ${camp.bannerTo}`}>
                  {camp.bannerUrl ? (
                    <Image src={camp.bannerUrl} alt={camp.nome} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
                  ) : (
                    <Trophy className="size-10 text-white/90" strokeWidth={1.5} />
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{camp.nome}</h3>
                    <StatusBadge status={camp.status} />
                  </div>
                  <p className="text-sm text-gray-500">{formatDateRangeBR(camp.dataInicio, camp.dataFim)}</p>
                  <p className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="size-4" />
                    {camp.cidade} - {camp.estado}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Indicadores de posição */}
      {camps.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {camps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-blue-600" : "w-1.5 bg-gray-200"
              }`}
              aria-label={`Campeonato ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
