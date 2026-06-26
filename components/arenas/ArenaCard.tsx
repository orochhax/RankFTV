import Link from "next/link";
import { Building2 } from "lucide-react";

export type ProximaData = { dia: number; label: string };

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
  proximasDatas: ProximaData[];
};

export function ArenaCard({ arena }: { arena: ArenaCardData }) {
  const temDatas = arena.proximasDatas.length > 0;

  return (
    <Link
      href={`/arenas/${arena.handle}`}
      className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      {/* Banner */}
      <div className="relative h-44 bg-gradient-to-br from-blue-700 to-blue-900">
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

        {/* Ícones de esporte — canto inferior direito do banner */}
        <div className="absolute bottom-3 right-3 flex items-center">
          {[
            { emoji: "⚽", bg: "bg-green-500" },
            { emoji: "🏐", bg: "bg-emerald-500" },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex size-9 items-center justify-center rounded-full text-base ring-2 ring-white ${item.bg} ${i > 0 ? "-ml-2" : ""}`}
              style={{ zIndex: 10 - i }}
            >
              {item.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* Nome + alunos */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 group-hover:text-blue-600 truncate">
              {arena.nome}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {arena.alunos > 0
                ? `${arena.alunos} ${arena.alunos === 1 ? "aluno ativo" : "alunos ativos"}`
                : `${arena.cidade}/${arena.estado}`}
            </p>
          </div>
        </div>

        {/* Próximas aulas */}
        {temDatas && (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Próximas aulas
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {arena.proximasDatas.map((d, i) => (
                <div
                  key={i}
                  className="flex shrink-0 flex-col items-center rounded-xl border border-gray-200 px-2.5 py-1.5 text-center"
                >
                  <span className="text-sm font-bold leading-none text-gray-900">
                    {String(d.dia).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 text-[10px] text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
