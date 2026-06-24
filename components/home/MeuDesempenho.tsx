import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { EvolucaoSparkline } from "@/components/perfil/EvolucaoSparkline";
import type { ConquistaDestaque, RankPosicao } from "@/lib/supabase/desempenho";

type Props = {
  conquistas: ConquistaDestaque[];
  rank: RankPosicao | null;
  nivel: string | null;
  evolucao: number[];
};

export function MeuDesempenho({ conquistas, rank, nivel, evolucao }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 md:p-5">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
          Meu desempenho
        </p>
        <Link
          href="/minhas-inscricoes"
          className="flex items-center gap-0.5 text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          Minhas inscrições <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_1.6fr] gap-3">

        {/* ── Conquistas ──────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase text-center">
            Conquistas
          </p>

          {conquistas.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-white/5 py-6">
              <p className="text-center text-[11px] leading-relaxed text-gray-500 px-3">
                Aqui aparecerão seus troféus
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {conquistas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/8"
                >
                  <span className="text-2xl leading-none shrink-0">
                    {c.icone ?? "🏆"}
                  </span>
                  <p className="text-[11px] font-semibold leading-snug text-white line-clamp-2">
                    {/* Remove o emoji duplicado do título se o icone já está separado */}
                    {c.titulo.replace(/^[\p{Emoji}\s]+/u, "").trim()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Coluna direita: Rank + Evolução ─────────── */}
        <div className="flex flex-col gap-2">

          {/* Rank + Nível */}
          <div className="grid grid-cols-2 gap-2">
            {/* Rank */}
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/8 text-center">
              <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-1">
                Rank
              </p>
              {rank ? (
                <>
                  <p className="text-xl font-black text-white leading-none">
                    #{rank.posicao}
                  </p>
                  <p className="text-[10px] font-semibold text-blue-400 mt-0.5">
                    {rank.pontos.toLocaleString("pt-BR")} pts
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-gray-500 leading-none mt-1">—</p>
              )}
            </div>

            {/* Nível */}
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/8 text-center">
              <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-1">
                Nível
              </p>
              {nivel ? (
                <p className="text-sm font-black text-white leading-snug mt-0.5">
                  {nivel}
                </p>
              ) : (
                <p className="text-sm font-bold text-gray-500 leading-none mt-1">—</p>
              )}
            </div>
          </div>

          {/* Evolução */}
          <Link
            href="/perfil/evolucao"
            className="flex-1 rounded-xl bg-white/5 p-3 ring-1 ring-white/8 transition-colors hover:bg-white/10 block"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
                Evolução
              </p>
              <TrendingUp className="size-3.5 text-blue-400" />
            </div>
            <EvolucaoSparkline valores={evolucao} />
          </Link>

        </div>
      </div>
    </div>
  );
}
