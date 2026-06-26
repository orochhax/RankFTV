import Link from "next/link";
import Image from "next/image";
import { MapPin, Trophy } from "lucide-react";
import type { Championship } from "@/lib/types";

const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

export function ChampionshipCard({ championship: c }: { championship: Championship }) {
  const data = new Date(c.dataInicio + "T12:00:00");
  const mes = MESES[data.getMonth()];
  const dia = data.getDate();

  // Usa o nome da primeira categoria como badge de modalidade
  const badge = c.categorias[0]?.nome ?? null;

  return (
    <Link
      href={`/campeonatos/${c.id}`}
      className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      {/* Banner */}
      <div className={`relative h-44 bg-gradient-to-br ${c.bannerFrom} ${c.bannerTo}`}>
        {c.bannerUrl ? (
          <Image
            src={c.bannerUrl}
            alt={c.nome}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-10 text-white/60" strokeWidth={1.5} />
          </div>
        )}

        {/* Badge de data — canto superior esquerdo */}
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-gray-500">
            {mes}
          </span>
          <span className="text-[22px] font-black leading-tight text-gray-900">
            {dia}
          </span>
        </div>

        {/* Badge de categoria — canto inferior direito */}
        {badge && (
          <div className="absolute bottom-3 right-3">
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-blue-600">
          {c.nome}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{c.local} · {c.cidade}</span>
        </p>
      </div>
    </Link>
  );
}
