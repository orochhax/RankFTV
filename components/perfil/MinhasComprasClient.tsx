"use client";

import { useState } from "react";
import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import { IngressoCard, type Ingresso } from "@/components/ingressos/IngressoCard";

// Some da lista por padrão: ingresso cancelado (estornado) ou já usado
// (checked_in). O "olhinho" revela essa seção pra quem quiser conferir.
function estaOculto(ing: Ingresso) {
  return ing.status_pagamento === "estornado" || ing.checked_in;
}

export function MinhasComprasClient({ ingressos }: { ingressos: Ingresso[] }) {
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  const visiveis = ingressos.filter((i) => !estaOculto(i));
  const ocultos  = ingressos.filter(estaOculto);

  if (ingressos.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
        <ShoppingBag className="mx-auto mb-2 size-8 text-gray-200" />
        <p className="text-sm text-gray-400">Você ainda não comprou nenhum ingresso.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visiveis.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum ingresso ativo no momento.
        </p>
      ) : (
        visiveis.map((ing) => (
          <IngressoCard key={`${ing.tipo}-${ing.ticket_id}`} ingresso={ing} origem="minhas-compras" />
        ))
      )}

      {ocultos.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setMostrarOcultos((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            {mostrarOcultos ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {mostrarOcultos
              ? "Ocultar cancelados/usados"
              : `Mostrar ingressos cancelados ou já usados (${ocultos.length})`}
          </button>

          {mostrarOcultos && (
            <div className="mt-3 space-y-4 opacity-70">
              {ocultos.map((ing) => (
                <IngressoCard key={`${ing.tipo}-${ing.ticket_id}`} ingresso={ing} origem="minhas-compras" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
