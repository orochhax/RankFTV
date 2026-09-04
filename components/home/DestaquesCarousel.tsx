"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR } from "@/lib/format";
import type { Championship } from "@/lib/types";
import { useCarouselControls } from "@/components/home/useCarouselControls";

export function DestaquesCarousel({ camps }: { camps: Championship[] }) {
  const carousel = useCarouselControls(camps.length, 2500);
  if (camps.length === 0) return null;

  return (
    <section className="space-y-4" aria-label="Campeonatos em destaque">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Campeonatos em destaque</h2>
        <div className="flex items-center gap-2">
          {camps.length > 1 && (
            <div className="hidden items-center gap-1 md:flex">
              <button type="button" onClick={carousel.previous} aria-label="Campeonato anterior" className="flex size-8 items-center justify-center rounded-full bg-white text-gray-600 ring-1 ring-black/10 hover:text-blue-600"><ChevronLeft className="size-4" /></button>
              <button type="button" onClick={carousel.next} aria-label="Próximo campeonato" className="flex size-8 items-center justify-center rounded-full bg-white text-gray-600 ring-1 ring-black/10 hover:text-blue-600"><ChevronRight className="size-4" /></button>
            </div>
          )}
          <Link href="/campeonatos" className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700">Ver todos <ChevronRight className="size-4" /></Link>
        </div>
      </div>

      <div className="touch-pan-y overflow-hidden rounded-2xl" aria-roledescription="carrossel" onMouseEnter={carousel.pause} onMouseLeave={carousel.resume} onFocusCapture={carousel.pause} onBlurCapture={carousel.resume} onKeyDown={(event) => { if (event.key === "ArrowLeft") carousel.previous(); if (event.key === "ArrowRight") carousel.next(); }} {...carousel.pointerHandlers}>
        <div className={`flex ${carousel.reducedMotion ? "" : "transition-transform duration-500 ease-out"}`} style={{ transform: `translateX(-${carousel.current * 100}%)` }}>
          {camps.map((camp) => (
            <div key={camp.id} className="min-w-full p-px">
              <Link href={`/campeonatos/${camp.id}`} className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md md:flex">
                <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br md:h-48 md:w-1/2 md:shrink-0 ${camp.bannerFrom} ${camp.bannerTo}`}>
                  {camp.bannerUrl ? (
                    <Image src={camp.bannerUrl} alt={camp.nome} fill className="object-cover" style={{ objectPosition: `${camp.bannerPositionX ?? 50}% ${camp.bannerPositionY ?? 50}%` }} sizes="(max-width: 767px) 100vw, 40vw" />
                  ) : (
                    <Trophy className="size-12 text-white/90" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-2 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-lg font-bold leading-tight text-gray-900 group-hover:text-blue-700 md:text-xl">{camp.nome}</h3>
                    <div className="shrink-0"><StatusBadge status={camp.status} /></div>
                  </div>
                  <p className="text-sm text-gray-500">{formatDateRangeBR(camp.dataInicio, camp.dataFim)}</p>
                  <p className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="size-4" />{camp.local ? `${camp.local} · ` : ""}{camp.cidade} - {camp.estado}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {camps.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {camps.map((camp, index) => (
            <button key={camp.id} type="button" onClick={() => carousel.goTo(index)} aria-label={`Exibir campeonato ${index + 1} de ${camps.length}`} aria-current={index === carousel.current ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${index === carousel.current ? "w-5 bg-blue-600" : "w-1.5 bg-gray-300"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
