"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeBanner } from "@/lib/home-banners";
import { useCarouselControls } from "@/components/home/useCarouselControls";

function BannerContent({ banner, eager }: { banner: HomeBanner; eager: boolean }) {
  return <Image src={banner.imageUrl} alt={banner.alt} fill preload={eager} sizes="(max-width: 767px) 100vw, (max-width: 1279px) 66vw, 900px" className="object-cover" />;
}

function BannerLink({ banner, eager }: { banner: HomeBanner; eager: boolean }) {
  if (!banner.linkUrl) return <BannerContent banner={banner} eager={eager} />;
  const content = <BannerContent banner={banner} eager={eager} />;
  if (banner.linkUrl.startsWith("/")) return <Link href={banner.linkUrl} aria-label={banner.alt}>{content}</Link>;
  return <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.alt}>{content}</a>;
}

export function HomeBannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const active = banners.filter((banner) => banner.active);
  const carousel = useCarouselControls(active.length, 2000);
  if (active.length === 0) return null;

  return (
    <section aria-roledescription="carrossel" aria-label="Banners da home" className="group relative touch-pan-y overflow-hidden rounded-3xl bg-gray-100 shadow-sm ring-1 ring-black/5" onMouseEnter={carousel.pause} onMouseLeave={carousel.resume} onKeyDown={(event) => { if (event.key === "ArrowLeft") carousel.previous(); if (event.key === "ArrowRight") carousel.next(); }} {...carousel.pointerHandlers} {...carousel.focusHandlers}>
      <div className={`flex ${carousel.reducedMotion ? "" : "transition-transform duration-500 ease-out"}`} style={{ transform: `translateX(-${carousel.current * 100}%)` }}>
        {active.map((banner, index) => (
          <div key={banner.id} className="relative aspect-[16/7] min-w-full md:aspect-[16/5]">
            <BannerLink banner={banner} eager={index === 0} />
          </div>
        ))}
      </div>
      {active.length > 1 && (
        <>
          <button type="button" onClick={carousel.previous} aria-label="Banner anterior" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white focus:flex group-hover:flex md:flex md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={carousel.next} aria-label="Próximo banner" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white focus:flex group-hover:flex md:flex md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><ChevronRight className="size-5" /></button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {active.map((banner, index) => (
              <button key={banner.id} type="button" onClick={() => carousel.goTo(index)} aria-label={`Exibir banner ${index + 1} de ${active.length}`} aria-current={index === carousel.current ? "true" : undefined} className={`h-2 rounded-full shadow-sm transition-all ${index === carousel.current ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
