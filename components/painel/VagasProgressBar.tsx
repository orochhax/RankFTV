"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Props = {
  duplasPagas: number;
  vagasTotais: number;
  totalArrecadado: number;
  totalPotencial: number;
};

export function VagasProgressBar({ duplasPagas, vagasTotais, totalArrecadado, totalPotencial }: Props) {
  const [mostrar, setMostrar] = useState(true);

  const labelEsquerda = vagasTotais > 0
    ? `${duplasPagas} / ${vagasTotais} vagas · ${Math.round((duplasPagas / vagasTotais) * 100)}%`
    : `${duplasPagas} dupla${duplasPagas !== 1 ? "s" : ""} inscrita${duplasPagas !== 1 ? "s" : ""}`;

  const labelDireita = mostrar
    ? totalPotencial > 0
      ? `${formatBRL(totalArrecadado)} / ${formatBRL(totalPotencial)}`
      : formatBRL(totalArrecadado)
    : "R$ ••••••";

  const barWidth = vagasTotais > 0
    ? `${Math.min(100, (duplasPagas / vagasTotais) * 100)}%`
    : duplasPagas > 0 ? "100%" : "0%";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>{labelEsquerda}</span>
        {totalArrecadado > 0 && (
          <div className="flex items-center gap-1.5">
            <span>{labelDireita}</span>
            <button
              onClick={() => setMostrar((v) => !v)}
              className="text-ink-muted/60 hover:text-ink transition-colors"
              aria-label={mostrar ? "Ocultar valor" : "Mostrar valor"}
            >
              {mostrar ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </button>
          </div>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
}
