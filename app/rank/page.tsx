import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ESTADOS_DISPONIVEIS, categoriaFromRating, rankAthletes } from "@/lib/mock/athletes";
import type { Genero } from "@/lib/mock/types";

const MEDALHA = ["🥇", "🥈", "🥉"];

// Rank — ver ftv.md seção 8.5: por atleta individual, filtros Brasil/estado x
// Geral/Masculina/Feminina, clicar abre o perfil público.
export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; genero?: Genero }>;
}) {
  const { estado, genero } = await searchParams;
  const ranking = rankAthletes({ estado, genero });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Rank</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div>
          <label htmlFor="estado" className="block text-xs font-medium text-gray-500">
            Região
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={estado ?? ""}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Brasil todo</option>
            {ESTADOS_DISPONIVEIS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="genero" className="block text-xs font-medium text-gray-500">
            Categoria
          </label>
          <select
            id="genero"
            name="genero"
            defaultValue={genero ?? ""}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Geral</option>
            <option value="masculino">Masculina</option>
            <option value="feminino">Feminina</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
        {(estado || genero) && (
          <Link href="/rank" className="text-sm text-gray-500 hover:underline">
            Limpar filtros
          </Link>
        )}
      </form>

      <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {ranking.map((atleta, i) => (
          <li key={atleta.id}>
            <Link
              href={`/atletas/${atleta.username}`}
              className="flex items-center gap-4 p-3.5 hover:bg-gray-50"
            >
              <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                {MEDALHA[i] ?? i + 1}
              </span>
              <Avatar nome={atleta.nome} color={atleta.avatarColor} size="sm" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{atleta.nome}</p>
                <p className="text-xs text-gray-500">
                  {atleta.cidade} - {atleta.estado} · Categoria {categoriaFromRating(atleta.rating)}
                </p>
              </div>
              <span className="font-semibold text-gray-900">{atleta.rating}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
