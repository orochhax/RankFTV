import Link from "next/link";
import Image from "next/image";
import { MapPin, Trophy } from "lucide-react";
import type { Championship } from "@/lib/types";
import { formatDateRangeBR } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ChampionshipCard({ championship }: { championship: Championship }) {
  return (
    <Link
      href={`/campeonatos/${championship.id}`}
      className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <div
        className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`}
      >
        {championship.bannerUrl ? (
          <Image src={championship.bannerUrl} alt={championship.nome} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
        ) : (
          <Trophy className="size-10 text-white/90" strokeWidth={1.5} />
        )}
      </div>
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
