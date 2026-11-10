"use client";

import { useValoresOcultos } from "@/hooks/useValoresOcultos";

interface PainelSaldoCardProps {
  titulo: string;
  valorFormatado: string;
  subtitulo: string;
}

export function PainelSaldoCard({ titulo, valorFormatado, subtitulo }: PainelSaldoCardProps) {
  const { oculto } = useValoresOcultos(true);

  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-xs font-medium text-white/70">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white">
        {oculto ? "R$ ••••••" : valorFormatado}
      </p>
      <p className="mt-1 text-xs text-white/60">{subtitulo}</p>
    </div>
  );
}
