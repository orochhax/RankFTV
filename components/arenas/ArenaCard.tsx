import Link from "next/link";
import { Building2, MapPin, Users } from "lucide-react";

export type ArenaCardData = {
  id: string;
  nome: string;
  handle: string;
  cidade: string;
  estado: string;
  descricao: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  alunos: number;
};

export function ArenaCard({ arena }: { arena: ArenaCardData }) {
  return (
    <Link
      href={`/arenas/${arena.handle}`}
      className="block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      {/* Banner */}
      <div className="relative h-36 bg-gradient-to-br from-blue-700 to-blue-900">
        {arena.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={arena.banner_url}
            alt={arena.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="size-10 text-white/20" />
          </div>
        )}
        {/* Avatar flutuante */}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ring-white">
            {arena.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={arena.avatar_url}
                alt={arena.nome}
                className="size-12 object-cover"
              />
            ) : (
              <Building2 className="size-6 text-blue-400" />
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4 pt-8">
        <p className="font-semibold text-gray-900">{arena.nome}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="size-3" />
          {arena.cidade}/{arena.estado}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
          <Users className="size-3" />
          {arena.alunos} {arena.alunos === 1 ? "aluno" : "alunos"}
        </p>
        {arena.descricao && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
            {arena.descricao}
          </p>
        )}
      </div>
    </Link>
  );
}
