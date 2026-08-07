import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { ArenaCard, type ArenaCardData } from "./ArenaCard";
import { EmptyState } from "@/components/shell/EmptyState";
import { SectionHeader } from "@/components/shell/SectionHeader";

function pageHref(page: number, query: string, state: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (state) params.set("estado", state);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/arenas?${suffix}` : "/arenas";
}

export function ArenaSection({
  arenas,
  estados,
  query,
  estado,
  page,
  pageSize,
  total,
}: {
  arenas: ArenaCardData[];
  estados: string[];
  query: string;
  estado: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilter = Boolean(query || estado);

  return (
    <section>
      <SectionHeader title="Arenas" className="mb-3" />

      <form action="/arenas" method="get" className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row">
        <label className="relative min-w-0 flex-1 sm:min-w-64">
          <span className="sr-only">Buscar arena pelo nome</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar arena pelo nome..."
            maxLength={80}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label>
          <span className="sr-only">Filtrar por estado</span>
          <select
            name="estado"
            defaultValue={estado}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          >
            <option value="">Todos os estados</option>
            {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>

        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Search className="size-4" /> Buscar
        </button>
        {hasFilter && (
          <Link
            href="/arenas"
            title="Limpar filtros"
            className="inline-flex size-10 items-center justify-center self-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <X className="size-4" />
            <span className="sr-only">Limpar filtros</span>
          </Link>
        )}
      </form>

      {arenas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma arena encontrada"
          description={hasFilter ? "Tente outro nome ou remova o filtro de estado." : "Ainda nao ha arenas cadastradas na plataforma."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {arenas.map((arena) => <ArenaCard key={arena.id} arena={arena} />)}
        </div>
      )}

      {total > 0 && (
        <nav aria-label="Paginacao de arenas" className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Pagina {Math.min(page, totalPages)} de {totalPages} - {total} {total === 1 ? "arena" : "arenas"}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1, query, estado)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-300"><ChevronLeft className="size-4" /> Anterior</span>
            )}
            {page < totalPages ? (
              <Link href={pageHref(page + 1, query, estado)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Proxima <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-300">Proxima <ChevronRight className="size-4" /></span>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
