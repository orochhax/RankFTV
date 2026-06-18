"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Trophy, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR } from "@/lib/format";
import { getBannerUrl } from "@/lib/mock/banners";
import type { Championship } from "@/lib/mock/types";

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

  const camp = camps[current];
  const bannerUrl = getBannerUrl(camp.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Campeonatos em destaque</h2>
        <Link
          href="/campeonatos"
          className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todos <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Card único animado */}
      <Link
        key={camp.id}
        href={`/campeonatos/${camp.id}`}
        className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
      >
        {bannerUrl ? (
          <div className="relative h-36">
            <Image
              src={bannerUrl}
              alt={camp.nome}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div
            className={`flex h-36 items-center justify-center bg-gradient-to-br ${camp.bannerFrom} ${camp.bannerTo}`}
          >
            <Trophy className="size-10 text-white/90" strokeWidth={1.5} />
          </div>
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">{camp.nome}</h3>
            <StatusBadge status={camp.status} />
          </div>
          <p className="text-sm text-gray-500">{formatDateRangeBR(camp.dataInicio, camp.dataFim)}</p>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="size-4" />
            {camp.cidade} - {camp.estado}
          </p>
        </div>
      </Link>

      {/* Indicadores de posição */}
      {camps.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {camps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
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
