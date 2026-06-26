"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import type { Championship } from "@/lib/types";

const PAGE_SIZE = 5;

export function CampeonatosSection({
  allCamps,
  estados,
  categorias,
}: {
  allCamps: Championship[];
  estados: string[];
  categorias: string[];
}) {
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtrados = useMemo(() => {
    let list = allCamps;
    if (estadoFiltro) list = list.filter((c) => c.estado === estadoFiltro);
    if (categoriaFiltro) list = list.filter((c) =>
      c.categorias.some((cat) => cat.nome === categoriaFiltro)
    );
    return list;
  }, [allCamps, estadoFiltro, categoriaFiltro]);

  function handleEstado(v: string) {
    setEstadoFiltro(v);
    setVisible(PAGE_SIZE);
  }
  function handleCategoria(v: string) {
    setCategoriaFiltro(v);
    setVisible(PAGE_SIZE);
  }

  const exibidos = filtrados.slice(0, visible);
  const temMais = visible < filtrados.length;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">Campeonatos</h2>

      {/* Filtros */}
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

        <select
          value={categoriaFiltro}
          onChange={(e) => handleCategoria(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>

        {(estadoFiltro || categoriaFiltro) && (
          <button
            onClick={() => { handleEstado(""); handleCategoria(""); }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Limpar
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum campeonato com esses filtros.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exibidos.map((c) => (
              <ChampionshipCard key={c.id} championship={c} />
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

          {!temMais && filtrados.length > PAGE_SIZE && (
            <p className="mt-3 text-center text-xs text-gray-400">
              Você viu todos os {filtrados.length} campeonatos.{" "}
              <Link href="/campeonatos" className="underline hover:text-gray-700">
                Ver lista completa
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
