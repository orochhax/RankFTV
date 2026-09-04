"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { ChampionshipDiscoveryBar } from "@/components/home/ChampionshipDiscoveryBar";
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
export function CampeonatosSection({
  allCamps,
  estados,
  initialFilters,
  banner,
  featured,
  sidebar,
  live,
}: {
  allCamps: Championship[];
  estados: string[];
  initialFilters: ChampionshipDiscoveryFilters;
  banner?: ReactNode;
  featured?: ReactNode;
  sidebar?: ReactNode;
  live?: ReactNode;
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

  function showResults() {
    trackPublicFunnel({ event: "search_used" });
    document.getElementById("campeonatos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-8">
      <div>
        <section aria-label="Pesquisar campeonatos">
          <ChampionshipDiscoveryBar filters={filters} estados={estados} update={update} clear={clear} onSearch={showResults} />
          {intervaloInvalido && <p className="mt-3 text-sm font-medium text-red-600">A data final precisa ser igual ou posterior à inicial.</p>}
        </section>
      </div>

      {banner && <div className="grid gap-8 md:grid-cols-3"><div className="md:col-span-2">{banner}</div></div>}

      <div className="grid min-w-0 items-start gap-8 md:grid-cols-3">
        <div className="min-w-0 max-w-full md:col-span-2">{featured}</div>
        {sidebar && <aside className="hidden pt-12 md:block">{sidebar}</aside>}
      </div>

      {live && <div className="grid gap-8 md:grid-cols-3"><div className="md:col-span-2">{live}</div></div>}

      <div className="grid gap-8 md:grid-cols-3">
      <section id="campeonatos" className="scroll-mt-4 md:col-span-2">
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
    </div>
  );
}
