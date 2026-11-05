"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ReceitaConsolidadaCardProps {
  valorFormatado: string;
}

export function ReceitaConsolidadaCard({ valorFormatado }: ReceitaConsolidadaCardProps) {
  // O olhinho já vem ativo com o valor oculto por padrão
  const [oculto, setOculto] = useState(true);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-sm ring-1 ring-blue-500/20">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
          Receita total consolidada
        </p>
        <button
          type="button"
          onClick={() => setOculto((v) => !v)}
          aria-label={oculto ? "Mostrar valor da receita" : "Ocultar valor da receita"}
          title={oculto ? "Mostrar valor" : "Ocultar valor"}
          className="inline-flex size-8 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          {oculto ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>

      <p className="mt-2 text-3xl font-bold tracking-tight text-white">
        {oculto ? "R$ ••••••" : valorFormatado}
      </p>

      <p className="mt-1.5 text-xs font-medium text-white/95">
        atletas + plateia + mensalidades + aluguéis + diárias (tudo recebido)
      </p>
    </section>
  );
}
