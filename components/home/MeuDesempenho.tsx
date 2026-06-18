import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EvolucaoSparkline } from "@/components/perfil/EvolucaoSparkline";
import type { ConquistaDestaque, RankPosicao } from "@/lib/supabase/desempenho";

type Props = {
  conquistas: ConquistaDestaque[];
  rank: RankPosicao | null;
  nivel: string | null;
  evolucao: number[]; // ordens dos níveis, em ordem cronológica
};

// Bloco "Meu desempenho" da Home (ver imagem de referência): card escuro com
// uma coluna alta de Conquistas à esquerda, Rank + Nível no topo direito e o
// gráfico de Evolução ocupando a base direita (clicável -> histórico completo).
export function MeuDesempenho({ conquistas, rank, nivel, evolucao }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-800/50 p-4 md:p-5">
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

      <div className="grid grid-cols-3 grid-rows-[auto_auto] gap-3">
        {/* Conquistas — coluna alta à esquerda (3 itens) */}
        <div className="row-span-2 rounded-xl bg-white/5 p-3">
          <p className="mb-2 text-center text-[11px] font-semibold text-gray-300">
            Conquistas
          </p>
          {conquistas.length === 0 ? (
            <div className="flex h-full min-h-[80px] items-center justify-center">
              <p className="text-center text-[11px] leading-relaxed text-gray-500">
                Aqui aparecerão seus troféus
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {conquistas.map((c) => (
                <li key={c.id} className="text-center">
                  <div className="text-xl leading-none">{c.icone ?? "🏆"}</div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight text-white">
                    {c.titulo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rank + Categoria — linha horizontal, col-span-2 */}
        <div className="col-span-2 rounded-xl bg-white/5 p-3">
          <div className="flex items-center">
            <div className="flex-1 text-center">
              <p className="text-[11px] font-semibold text-gray-300">Rank</p>
              <p className="mt-0.5 text-base font-bold leading-tight text-white">
                {rank ? `#${rank.posicao} - Geral` : "# — - Geral"}
              </p>
              <p className="text-xs font-semibold text-gray-300">
                {rank ? rank.pontos.toLocaleString("pt-BR") : "0"} pts
              </p>
            </div>
            <div className="mx-3 h-10 w-px bg-white/10" />
            <div className="flex-1 text-center">
              <p className="text-[11px] font-semibold text-gray-300">
                Categoria mais jogada
              </p>
              <p className="mt-0.5 text-base font-bold leading-tight text-white">
                {nivel ?? "Sem categoria"}
              </p>
            </div>
          </div>
        </div>

        {/* Evolução — base direita, clicável */}
        <Link
          href="/perfil/evolucao"
          className="col-span-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
        >
          <p className="mb-1 text-center text-[11px] font-semibold text-gray-300">
            Evolução
          </p>
          <EvolucaoSparkline valores={evolucao} />
        </Link>
      </div>
    </div>
  );
}
