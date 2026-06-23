import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DestaquesCarousel } from "@/components/home/DestaquesCarousel";
import { MeuDesempenho } from "@/components/home/MeuDesempenho";
import { HamburgerMenu } from "@/components/home/HamburgerMenu";
import { NoticiasCarousel } from "@/components/home/NoticiasCarousel";
import { getLivChampionships, getPublishedChampionships } from "@/lib/supabase/championships";
import { getRecentNews, getDestaqueNews } from "@/lib/supabase/news";
import { createClient } from "@/lib/supabase/server";
import {
  getConquistasDestaque,
  getHistorico,
  getRankPosicao,
  type ConquistaDestaque,
  type RankPosicao,
} from "@/lib/supabase/desempenho";
import { nivelLabel, nivelOrdem } from "@/lib/niveis";
import { formatDateRangeBR } from "@/lib/format";
import { MapPin } from "lucide-react";

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

      temDesempenho = true; // card sempre visível; empty states guiam o novo atleta
    }
  }

  // Contagem de notificações não lidas (para o badge do menu)
  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    unreadCount = count ?? 0;
  }

  const [publicados, configRow] = await Promise.all([
    getPublishedChampionships(),
    supabase
      .from("platform_config")
      .select("destaques_ids, noticias_destaques_ids")
      .eq("id", 1)
      .single(),
  ]);

  const destaquesIds: string[] = (configRow.data?.destaques_ids as string[] | null) ?? [];
  const destaques = destaquesIds.length > 0
    ? destaquesIds.map((id) => publicados.find((c) => c.id === id)).filter(Boolean) as typeof publicados
    : publicados.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento").slice(0, 3);

  // Notícias da home: destaques escolhidos pelo admin; senão, as 3 mais recentes.
  const noticiasDestaquesIds: string[] =
    (configRow.data?.noticias_destaques_ids as string[] | null) ?? [];

  const [aoVivo, noticias] = await Promise.all([
    getLivChampionships(),
    noticiasDestaquesIds.length > 0
      ? getDestaqueNews(noticiasDestaquesIds)
      : getRecentNews(3),
  ]);

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
                <div className="md:hidden">
                  <HamburgerMenu unreadCount={unreadCount} />
                </div>
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
              <div className="mx-auto flex w-full max-w-xs flex-col gap-3 pt-1">
                <Link
                  href="/cadastro"
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Criar conta como atleta
                </Link>
                <Link
                  href="/painel"
                  className="rounded-2xl bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Criar meu evento gratuito
                </Link>
                <Link
                  href="/login"
                  className="py-2 text-center text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                  Já tenho conta · Fazer login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção branca — card sobreposto com cantos arredondados ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Carrossel de destaques */}
          <DestaquesCarousel camps={destaques} />

          {/* Campeonatos ao vivo */}
          {aoVivo.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Radio className="size-4 text-red-500 animate-pulse" />
                <h2 className="text-base font-semibold text-gray-900">Ao vivo agora</h2>
              </div>
              <div className="space-y-3">
                {aoVivo.map((c) => (
                  <Link
                    key={c.id}
                    href={`/campeonatos/${c.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-red-100 hover:bg-red-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <p className="truncate font-semibold text-gray-900">{c.nome}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDateRangeBR(c.dataInicio, c.dataFim)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="size-3" />
                        {c.local}, {c.cidade} - {c.estado}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-300" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Notícias — sempre abaixo do "ao vivo"; 3 mais recentes */}
          {noticias.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">Notícias</h2>
                <Link href="/noticias" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Ver todas
                </Link>
              </div>
              <NoticiasCarousel noticias={noticias} />
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
