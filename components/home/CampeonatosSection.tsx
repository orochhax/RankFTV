"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, MapPin, Search, SlidersHorizontal, Trophy, X } from "lucide-react";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { EmptyState } from "@/components/shell/EmptyState";
import {
  discoveryFiltersToQuery,
  EMPTY_DISCOVERY_FILTERS,
  filterChampionships,
  type ChampionshipDiscoveryFilters,
} from "@/lib/championship-discovery";
import type { Championship } from "@/lib/types";
import { trackPublicFunnel } from "@/lib/public-funnel-client";

const PAGE_SIZE = 12;
const fieldClass =
  "min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function CampeonatosSection({
  allCamps,
  estados,
  categorias,
  initialFilters,
  children,
}: {
  allCamps: Championship[];
  estados: string[];
  categorias: string[];
  initialFilters: ChampionshipDiscoveryFilters;
  children?: ReactNode;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const filtrados = useMemo(() => filterChampionships(allCamps, filters), [allCamps, filters]);
  const exibidos = filtrados.slice(0, visible);
  const temMais = visible < filtrados.length;
  const temFiltro = Object.entries(filters).some(([, value]) => value !== "" && value !== false);
  const intervaloInvalido = !!filters.dateFrom && !!filters.dateTo && filters.dateFrom > filters.dateTo;

  useEffect(() => {
    const query = discoveryFiltersToQuery(filters);
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [filters]);

  useEffect(() => {
    if (!temFiltro) return;
    const timer = window.setTimeout(() => trackPublicFunnel({ event: "search_used" }), 700);
    return () => window.clearTimeout(timer);
  }, [filters, temFiltro]);

  function update(patch: Partial<ChampionshipDiscoveryFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setVisible(PAGE_SIZE);
  }

  function clear() {
    setFilters(EMPTY_DISCOVERY_FILTERS);
    setVisible(PAGE_SIZE);
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="discovery-title" className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><SlidersHorizontal className="size-4" /></span>
          <div>
            <h2 id="discovery-title" className="font-semibold text-gray-900">Encontre seu próximo campeonato</h2>
            <p className="text-xs text-gray-500">Pesquise sem cadastro e combine os filtros.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2 xl:col-span-2">
            <span className="sr-only">Nome do campeonato</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={filters.query} onChange={(event) => update({ query: event.target.value })} placeholder="Nome do campeonato" className={`${fieldClass} w-full pl-9 pr-9`} />
            {filters.query && <button type="button" onClick={() => update({ query: "" })} aria-label="Limpar nome" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-700"><X className="size-4" /></button>}
          </label>
          <label className="relative">
            <span className="sr-only">Cidade ou local</span>
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={filters.location} onChange={(event) => update({ location: event.target.value })} placeholder="Cidade ou local" className={`${fieldClass} w-full pl-9`} />
          </label>
          <label>
            <span className="sr-only">Estado</span>
            <select value={filters.state} onChange={(event) => update({ state: event.target.value })} className={`${fieldClass} w-full`}>
              <option value="">Todos os estados</option>
              {estados.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <label className="relative">
            <span className="mb-1 block text-[11px] font-medium text-gray-500">De</span>
            <CalendarDays className="pointer-events-none absolute bottom-3 left-3 size-4 text-gray-400" />
            <input type="date" value={filters.dateFrom} onChange={(event) => update({ dateFrom: event.target.value })} className={`${fieldClass} w-full pl-9`} />
          </label>
          <label className="relative">
            <span className="mb-1 block text-[11px] font-medium text-gray-500">Até</span>
            <CalendarDays className="pointer-events-none absolute bottom-3 left-3 size-4 text-gray-400" />
            <input type="date" value={filters.dateTo} onChange={(event) => update({ dateTo: event.target.value })} className={`${fieldClass} w-full pl-9`} />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-gray-500">Categoria</span>
            <select value={filters.category} onChange={(event) => update({ category: event.target.value })} className={`${fieldClass} w-full`}>
              <option value="">Todas as categorias</option>
              {categorias.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-medium text-gray-500">Preço máximo</span>
            <select value={filters.maxPrice} onChange={(event) => update({ maxPrice: event.target.value })} className={`${fieldClass} w-full`}>
              <option value="">Qualquer preço</option>
              <option value="0">Grátis</option>
              <option value="100">Até R$ 100</option>
              <option value="200">Até R$ 200</option>
              <option value="300">Até R$ 300</option>
              <option value="500">Até R$ 500</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={filters.openOnly} onChange={(event) => update({ openOnly: event.target.checked })} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Somente inscrições abertas
          </label>
          {temFiltro && <button type="button" onClick={clear} className="text-sm font-medium text-blue-600 hover:text-blue-700">Limpar filtros</button>}
        </div>
        {intervaloInvalido && <p className="mt-3 text-sm font-medium text-red-600">A data final precisa ser igual ou posterior à inicial.</p>}
      </section>

      {children}

      <section id="campeonatos" className="scroll-mt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Campeonatos</h2>
            <p className="text-xs text-gray-500">{filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}</p>
          </div>
          {temFiltro && <a href="#campeonatos" className="text-xs font-medium text-blue-600">Ver resultados</a>}
        </div>

        {intervaloInvalido || filtrados.length === 0 ? (
          <EmptyState icon={Trophy} title="Nenhum campeonato encontrado" description="Tente outro período, local, preço ou remova alguns filtros." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {exibidos.map((championship) => <ChampionshipCard key={championship.id} championship={championship} />)}
            </div>
            {temMais && <div className="mt-4 text-center"><button type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><ChevronDown className="size-4" />Ver mais ({filtrados.length - visible} restantes)</button></div>}
          </>
        )}
      </section>
    </div>
  );
}
