import Link from "next/link";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { PaginasCarousel } from "@/components/campeonatos/PaginasCarousel";
import { getPublishedChampionships } from "@/lib/supabase/championships";
import type { Championship } from "@/lib/types";
import { getPages, getFollowedPageIds } from "@/lib/supabase/pages";
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

  let followedPageIds: string[] = [];
  if (user) {
    followedPageIds = await getFollowedPageIds(user.id);
  }

  const todasPages = await getPages();

  // Campeonatos encerrados saem da lista pública — ficam só no painel do
  // organizador (getMyChampionships). Aqui mostramos apenas os "ativos".
  const todos = (await getPublishedChampionships()).filter(
    (c) => c.status !== "encerrado",
  );

  const estadosDisponiveis = Array.from(new Set(todos.map((c) => c.estado))).sort();
  const categoriasDisponiveis = Array.from(
    new Set(todos.flatMap((c) => c.categorias.map((cat) => cat.nome))),
  ).sort();

  const STATUS_PRIORIDADE: Record<string, number> = {
    inscricoes_abertas: 0, em_andamento: 1, rascunho: 2, encerrado: 3,
  };
  const filtrados = [...todos]
    .sort((a, b) => {
      const p = (STATUS_PRIORIDADE[a.status] ?? 9) - (STATUS_PRIORIDADE[b.status] ?? 9);
      return p !== 0 ? p : a.dataInicio.localeCompare(b.dataInicio);
    })
    .filter((c: Championship) => {
      if (estado && c.estado !== estado) return false;
      if (categoria && !c.categorias.some((cat) => cat.nome === categoria)) return false;
      return true;
    });

  const temMaisPaginas = todasPages.length > 3;

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
              {temMaisPaginas && (
                <Link
                  href="/campeonatos/paginas"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  Ver mais
                </Link>
              )}
            </div>
            {todasPages.length === 0 ? (
              <p className="text-sm text-white/40">
                Ainda não há páginas. Organizadores podem criar uma no painel.
              </p>
            ) : (
              <PaginasCarousel
                pages={todasPages}
                followedPageIds={followedPageIds}
                userId={user?.id ?? null}
              />
            )}
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
