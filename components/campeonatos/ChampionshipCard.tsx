import Link from "next/link";
import Image from "next/image";
import { MapPin, Trophy } from "lucide-react";
import type { Championship } from "@/lib/mock/types";
import { formatDateRangeBR } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getBannerUrl } from "@/lib/mock/banners";

// Card usado na Home (destaques) e na lista de Campeonatos — ver ftv.md 8.3/8.4.
// A foto do banner vem do registro central (lib/mock/banners.ts). Quem não tem
// foto cai no gradiente colorido com o ícone de troféu.
export function ChampionshipCard({ championship }: { championship: Championship }) {
  const bannerUrl = getBannerUrl(championship.id);
  return (
    <Link
      href={`/campeonatos/${championship.id}`}
      className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      {bannerUrl ? (
        <div className="relative h-28">
          <Image
            src={bannerUrl}
            alt={championship.nome}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div
          className={`flex h-28 items-center justify-center bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`}
        >
          <Trophy className="size-10 text-white/90" strokeWidth={1.5} />
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
            {championship.nome}
          </h3>
          <StatusBadge status={championship.status} />
        </div>
        <p className="text-sm text-gray-500">{formatDateRangeBR(championship.dataInicio, championship.dataFim)}</p>
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="size-4" />
          {championship.cidade} - {championship.estado}
        </p>
      </div>
    </Link>
  );
}
