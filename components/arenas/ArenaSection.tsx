"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { ArenaCard, type ArenaCardData } from "./ArenaCard";

const PAGE_SIZE = 5;

export function ArenaSection({
  allArenas,
  estados,
}: {
  allArenas: ArenaCardData[];
  estados: string[];
}) {
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtrados = useMemo(() => {
    if (!estadoFiltro) return allArenas;
    return allArenas.filter((a) => a.estado === estadoFiltro);
  }, [allArenas, estadoFiltro]);

  function handleEstado(v: string) {
    setEstadoFiltro(v);
    setVisible(PAGE_SIZE);
  }

  const exibidos = filtrados.slice(0, visible);
  const temMais = visible < filtrados.length;

  return (
    <section>
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

        {estadoFiltro && (
          <button
            onClick={() => handleEstado("")}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Limpar
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhuma arena nesse estado.
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
