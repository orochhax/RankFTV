import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { MeuDesempenho } from "@/components/home/MeuDesempenho";
import { sortedChampionships } from "@/lib/mock/championships";
import { createClient } from "@/lib/supabase/server";
import {
  getConquistasDestaque,
  getHistorico,
  getRankPosicao,
  type ConquistaDestaque,
  type RankPosicao,
} from "@/lib/supabase/desempenho";
import { nivelLabel, nivelOrdem } from "@/lib/niveis";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { nome: string; username: string; foto_url: string | null } | null = null;
  let conquistas: ConquistaDestaque[] = [];
  let rank: RankPosicao | null = null;
  let nivel: string | null = null;
  let evolucao: number[] = [];
  let temDesempenho = false;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, username, foto_url")
      .eq("id", user.id)
      .single();
    profile = data;

    if (profile) {
      const [historico, rankPos, conquistasDestaque] = await Promise.all([
        getHistorico(user.id),
        getRankPosicao(profile.username),
        getConquistasDestaque(user.id),
      ]);

      conquistas = conquistasDestaque;
      rank = rankPos;

      // Categoria mais jogada = a que aparece mais vezes no histórico.
      const catCount: Record<string, number> = {};
      for (const h of historico) {
        if (h.categoria) catCount[h.categoria] = (catCount[h.categoria] ?? 0) + 1;
      }
      const catMaisJogada = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0];
      nivel = catMaisJogada ? (nivelLabel(catMaisJogada) ?? null) : null;

      // Evolução = a ordem do nível de cada campeonato, em ordem cronológica.
      evolucao = historico
        .map((h) => nivelOrdem(h.categoria))
        .filter((o): o is number => o != null);

      temDesempenho =
        historico.length > 0 || rank != null || conquistas.length > 0;
    }
  }

  const destaques = sortedChampionships().slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* ── Seção escura ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-5xl">
          {profile ? (
            <div className="space-y-6">
              {/* Saudação */}
              <div className="flex items-center gap-4">
                <Avatar
                  nome={profile.nome}
                  color="bg-blue-500"
                  size="lg"
                  fotoUrl={profile.foto_url}
                />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                    Bem-vindo
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {profile.nome.split(" ")[0]}
                  </h1>
                  <p className="text-sm text-gray-400">@{profile.username}</p>
                </div>
                <Link
                  href="/perfil"
                  aria-label="Perfil e configurações"
                  className="md:hidden rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Settings className="size-6" />
                </Link>
              </div>

              {/* Card de desempenho — Conquistas / Rank / Nível / Evolução */}
              {temDesempenho ? (
                <MeuDesempenho
                  conquistas={conquistas}
                  rank={rank}
                  nivel={nivel}
                  evolucao={evolucao}
                />
              ) : (
                /* Banner onboarding para quem ainda não jogou */
                <div className="rounded-2xl border border-blue-500/30 bg-blue-600/15 p-5">
                  <p className="font-semibold text-white">Bem-vindo ao RankFTV!</p>
                  <p className="mt-1 text-sm text-blue-200/80">
                    Explore os campeonatos e faça sua primeira inscrição.
                  </p>
                  <Link
                    href="/campeonatos"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    Ver campeonatos <ChevronRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Visitante não logado */
            <div className="space-y-5 py-8 text-center">
              <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">
                RankFTV
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
                Futevôlei organizado,
                <br />
                do zero ao pódio.
              </h1>
              <p className="text-gray-400">
                Encontre campeonatos, inscreva sua dupla e acompanhe o ranking nacional.
              </p>
              <div className="flex justify-center gap-3 pt-1">
                <Link
                  href="/cadastro"
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Criar conta grátis
                </Link>
                <Link
                  href="/login"
                  className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Entrar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção branca — card sobreposto com cantos arredondados ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Campeonatos em destaque
            </h2>
            <Link
              href="/campeonatos"
              className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todos <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((c) => (
              <ChampionshipCard key={c.id} championship={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
