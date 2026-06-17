import Link from "next/link";
import { ChevronRight, Trophy, Star } from "lucide-react";
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

    // Busca dados de ranking do usuário logado
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
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {profile ? (
        <>
          {/* Saudação */}
          <div className="flex items-center gap-3">
            <Avatar
              nome={profile.nome}
              color="bg-blue-500"
              size="lg"
              fotoUrl={profile.foto_url}
            />
            <div>
              <p className="text-sm text-gray-500">Bem-vindo,</p>
              <h1 className="text-2xl font-semibold text-gray-900">
                {profile.nome.split(" ")[0]}
              </h1>
            </div>
          </div>

          {/* Card de ranking — só aparece se o usuário já tem resultados */}
          {rankStats ? (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-500">Meu desempenho</h2>
                <Link
                  href="/rank"
                  className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver ranking <ChevronRight className="size-4" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {rankStats.total_pontos.toLocaleString("pt-BR")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">pontos</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {rankStats.total_torneios}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {rankStats.total_torneios === 1 ? "torneio" : "torneios"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {COLOCACAO_EMOJI[rankStats.melhor] ?? `${rankStats.melhor}º`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">melhor resultado</p>
                </div>
              </div>
            </div>
          ) : (
            /* Banner de onboarding — só aparece para quem não tem histórico */
            <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
              <p className="font-semibold text-blue-900">Bem-vindo ao RankFTV!</p>
              <p className="mt-1 text-sm text-blue-700">
                Explore os campeonatos disponíveis e faça sua primeira inscrição. O ranking e
                o histórico aparecem aqui conforme você joga.
              </p>
              <Link
                href="/campeonatos"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
              >
                Ver campeonatos <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </>
      ) : (
        /* Visitante não logado */
        <div className="py-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Futevôlei organizado,
            <br />
            do zero ao pódio.
          </h1>
          <p className="mt-3 text-gray-500">
            Encontre campeonatos, inscreva sua dupla e acompanhe o ranking nacional.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/cadastro"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/campeonatos"
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Ver campeonatos
            </Link>
          </div>
        </div>
      )}

      {/* Campeonatos em destaque — visível pra todo mundo */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">Campeonatos em destaque</h2>
          <Link
            href="/campeonatos"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destaques.map((c) => (
            <ChampionshipCard key={c.id} championship={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
