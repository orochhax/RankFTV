"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { InscricaoItem } from "@/components/inscricoes/InscricaoItem";

type Dupla = {
  id: string;
  a1: { nome: string; nivel: string | null };
  a2: { nome: string; nivel: string | null } | null;
  catNome: string;
};

export function InscricoesBuscaLista({ lista }: { lista: Dupla[] }) {
  const [q, setQ] = useState("");
  const termo = q.trim().toLowerCase();

  // Busca pelo nome do atleta (1 ou 2), nunca pelo @
  const filtrada = termo
    ? lista.filter(
        (d) =>
          d.a1.nome.toLowerCase().includes(termo) ||
          (d.a2?.nome.toLowerCase().includes(termo) ?? false),
      )
    : lista;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar dupla pelo nome..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filtrada.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-black/5">
          <p className="text-sm text-gray-400">
            Nenhuma dupla encontrada para “{q.trim()}”.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {filtrada.map((d) => (
            <InscricaoItem key={d.id} a1={d.a1} a2={d.a2} catNome={d.catNome} />
          ))}
        </ol>
      )}
    </div>
  );
}
