import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { sortedChampionships } from "@/lib/mock/championships";
import { createClient } from "@/lib/supabase/server";

const COLOCACAO_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { nome: string; username: string; foto_url: string | null } | null = null;
  let rankStats: { total_pontos: number; total_torneios: number; melhor: number } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, username, foto_url")
      .eq("id", user.id)
      .single();
    profile = data;

    const { data: entries } = await supabase
      .from("ranking_entries")
      .select("pontos, colocacao")
      .eq("user_id", user.id);

    if (entries && entries.length > 0) {
      rankStats = {
        total_pontos: entries.reduce((s, r) => s + r.pontos, 0),
        total_torneios: entries.length,
        melhor: Math.min(...entries.map((r) => r.colocacao)),
      };
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
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                    Bem-vindo
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {profile.nome.split(" ")[0]}
                  </h1>
                </div>
              </div>

              {/* Card de desempenho */}
              {rankStats ? (
                <div className="rounded-2xl border border-white/10 bg-gray-800/50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                      Meu desempenho
                    </p>
                    <Link
                      href="/rank"
                      className="flex items-center gap-0.5 text-xs font-medium text-blue-400 hover:text-blue-300"
                    >
                      Ver ranking <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-xl font-bold text-white">
                        {rankStats.total_pontos.toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">pontos</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-xl font-bold text-white">
                        {rankStats.total_torneios}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {rankStats.total_torneios === 1 ? "torneio" : "torneios"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-xl font-bold text-white">
                        {COLOCACAO_EMOJI[rankStats.melhor] ?? `${rankStats.melhor}º`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">melhor</p>
                    </div>
                  </div>
                </div>
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
                  href="/campeonatos"
                  className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Ver campeonatos
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
