"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { ArenaCard, type ArenaCardData } from "./ArenaCard";

const PAGE_SIZE = 5;

export function ArenaSection({
  allArenas,
  estados,
}: {
  allArenas: ArenaCardData[];
  estados: string[];
}) {
  const [busca, setBusca] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtrados = useMemo(() => {
    let list = allArenas;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((a) => a.nome.toLowerCase().includes(q));
    }
    if (estadoFiltro) list = list.filter((a) => a.estado === estadoFiltro);
    return list;
  }, [allArenas, busca, estadoFiltro]);

  function handleEstado(v: string) { setEstadoFiltro(v); setVisible(PAGE_SIZE); }
  function handleBusca(v: string) { setBusca(v); setVisible(PAGE_SIZE); }
  function limpar() { setBusca(""); setEstadoFiltro(""); setVisible(PAGE_SIZE); }

  const temFiltro = busca || estadoFiltro;
  const exibidos = filtrados.slice(0, visible);
  const temMais = visible < filtrados.length;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">Arenas</h2>

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          placeholder="Buscar arena pelo nome…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {busca && (
          <button
            onClick={() => handleBusca("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:text-gray-700"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Filtro por estado */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={estadoFiltro}
          onChange={(e) => handleEstado(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os estados</option>
          {estados.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>

        {temFiltro && (
          <button
            onClick={limpar}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Limpar
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhuma arena encontrada.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exibidos.map((a) => (
              <ArenaCard key={a.id} arena={a} />
            ))}
          </div>

          {temMais && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronDown className="size-4" />
                Ver mais ({filtrados.length - visible} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
