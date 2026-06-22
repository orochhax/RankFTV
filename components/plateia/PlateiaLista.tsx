"use client";

import { useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/format";

export type PlateiaItem = {
  id: string;
  comprador_nome: string;
  comprador_email: string;
  tipo_nome: string | null;
  valor: number;
  quantidade: number | null;
  status_pagamento: string;
  checked_in: boolean;
  code: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pago:      { label: "Pago",      cls: "bg-emerald-100 text-emerald-700" },
  pendente:  { label: "Pendente",  cls: "bg-amber-100 text-amber-700" },
  estornado: { label: "Estornado", cls: "bg-red-100 text-red-600" },
};

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PlateiaLista({ itens }: { itens: PlateiaItem[] }) {
  const [busca, setBusca] = useState("");
  const q = norm(busca.trim());
  const filtrados = q
    ? itens.filter((i) => norm(i.comprador_nome).includes(q) || norm(i.comprador_email).includes(q))
    : itens;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          {itens.length === 0 ? "Ninguém comprou ingresso ainda." : "Nenhum resultado pra essa busca."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {filtrados.map((i) => {
            const st = STATUS[i.status_pagamento] ?? { label: i.status_pagamento, cls: "bg-gray-100 text-gray-500" };
            return (
              <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                    {i.comprador_nome}
                    {i.checked_in && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {i.comprador_email}
                    {i.tipo_nome && ` · ${i.tipo_nome}`}
                    {Number(i.quantidade) > 1 && ` · ${i.quantidade} ingressos`}
                    {i.code && ` · ${i.code}`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-700">{formatBRL(Number(i.valor))}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
