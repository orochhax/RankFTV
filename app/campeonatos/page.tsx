import Link from "next/link";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { SeriesCard } from "@/components/campeonatos/SeriesCard";
import { CHAMPIONSHIPS, sortedChampionships } from "@/lib/mock/championships";
import { getPublishedChampionships } from "@/lib/supabase/championships";
import { SERIES } from "@/lib/mock/series";
import { createClient } from "@/lib/supabase/server";

// Lista de Campeonatos — ver ftv.md seção 8.4. Filtros por estado e categoria,
// e quem tem inscrições abertas vem sempre primeiro (sortedChampionships).
// Filtro implementado como <form GET> de propósito: funciona sem JavaScript
// nenhum no cliente, então a página inteira continua sendo Server Component
// (convenção do ftv.md seção 9 — Client Component só quando precisa).
export default async function CampeonatosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; categoria?: string }>;
}) {
  const { estado, categoria } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followedSeriesIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("series_followers")
      .select("series_id")
      .eq("user_id", user.id);
    followedSeriesIds = data?.map((f) => f.series_id) ?? [];
  }

  // Campeonatos reais criados na plataforma (publicados) + os de exemplo (mock).
  const publicados = await getPublishedChampionships();
  const todos = [...publicados, ...CHAMPIONSHIPS];

  // Opções dos filtros derivam de tudo que aparece na lista.
  const estadosDisponiveis = Array.from(new Set(todos.map((c) => c.estado))).sort();
  const categoriasDisponiveis = Array.from(
    new Set(todos.flatMap((c) => c.categorias.map((cat) => cat.nome))),
  ).sort();

  const filtrados = sortedChampionships(todos).filter((c) => {
    if (c.status !== "inscricoes_abertas") return false;
    if (estado && c.estado !== estado) return false;
    if (categoria && !c.categorias.some((cat) => cat.nome === categoria)) return false;
    return true;
  });

  const seriesVisiveis = SERIES.filter((s) => s.id !== "mikasa-open-nacional").slice(0, 2);
  const temMaisSeries = SERIES.length > 2;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">Campeonatos</h1>

          {/* Páginas de campeonato */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Páginas</h2>
                <p className="text-xs text-white/50">
                  Siga uma página e seja notificado quando abrir nova edição
                </p>
              </div>
              {temMaisSeries && (
                <Link
                  href="/campeonatos/paginas"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  Ver mais
                </Link>
              )}
            </div>
            <div className="space-y-3">
              {seriesVisiveis.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  initialFollowing={followedSeriesIds.includes(s.id)}
                  userId={user?.id ?? null}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── Seção branca com curva ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Campeonatos Abertos</h2>

            <form className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div>
                <label htmlFor="estado" className="block text-xs font-medium text-gray-500">
                  Estado
                </label>
                <select
                  id="estado"
                  name="estado"
                  defaultValue={estado ?? ""}
                  className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  {estadosDisponiveis.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="categoria" className="block text-xs font-medium text-gray-500">
                  Categoria
                </label>
                <select
                  id="categoria"
                  name="categoria"
                  defaultValue={categoria ?? ""}
                  className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Todas</option>
                  {categoriasDisponiveis.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Filtrar
              </button>
              {(estado || categoria) && (
                <Link href="/campeonatos" className="text-sm text-gray-500 hover:underline">
                  Limpar filtros
                </Link>
              )}
            </form>

            {filtrados.length === 0 ? (
              <p className="text-gray-500">Nenhum campeonato encontrado com esses filtros.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtrados.map((c) => (
                  <ChampionshipCard key={c.id} championship={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
