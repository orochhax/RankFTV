"use client";

import { DollarSign, Eye, EyeOff } from "lucide-react";
import { Surface } from "@/components/shell/Surface";
import { formatBRL } from "@/lib/format";
import { useValoresOcultos } from "@/hooks/useValoresOcultos";

type ReceitaConfirmadaCardProps = {
  totalGeralConfirmado: number;
  totalArrecadado: number;
  totalPlateia: number;
};

export function ReceitaConfirmadaCard({
  totalGeralConfirmado,
  totalArrecadado,
  totalPlateia,
}: ReceitaConfirmadaCardProps) {
  const { oculto, toggle } = useValoresOcultos(false);

  const valorPrincipal = oculto ? "R$ ••••••" : formatBRL(totalGeralConfirmado);
  const subtitulo =
    totalPlateia > 0
      ? oculto
        ? "R$ •••••• atletas · R$ •••••• plateia"
        : `${formatBRL(totalArrecadado)} atletas · ${formatBRL(totalPlateia)} plateia`
      : undefined;

  return (
    <Surface padding="md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-ink-muted">Receita confirmada</p>
          <button
            type="button"
            onClick={toggle}
            aria-label={oculto ? "Mostrar receita confirmada" : "Ocultar receita confirmada"}
            title={oculto ? "Mostrar valores" : "Ocultar valores"}
            className="inline-flex size-6 items-center justify-center rounded-md text-ink-muted/70 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {oculto ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-bg text-success">
          <DollarSign className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-success">{valorPrincipal}</p>
      {subtitulo && <p className="mt-0.5 text-xs text-ink-muted">{subtitulo}</p>}
    </Surface>
  );
}
