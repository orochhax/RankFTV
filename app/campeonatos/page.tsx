import Link from "next/link";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import {
  CATEGORIAS_DISPONIVEIS,
  CHAMPIONSHIPS,
  ESTADOS_COM_CAMPEONATO,
  sortedChampionships,
} from "@/lib/mock/championships";

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

  const filtrados = sortedChampionships(CHAMPIONSHIPS).filter((c) => {
    if (estado && c.estado !== estado) return false;
    if (categoria && !c.categorias.some((cat) => cat.nome === categoria)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Campeonatos</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
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
            {ESTADOS_COM_CAMPEONATO.map((uf) => (
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
            {CATEGORIAS_DISPONIVEIS.map((nome) => (
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
    </div>
  );
}
