"use client";

import { useState } from "react";
import { DollarSign, Eye, EyeOff } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Props = {
  repasseLiquido: number;
};

export function FinanceiroHeaderClient({ repasseLiquido }: Props) {
  const [mostrar, setMostrar] = useState(true);

  return (
    <div className="rounded-2xl bg-accent/15 p-4 ring-1 ring-accent/25">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-accent">
          <DollarSign className="size-4" />
          <p className="text-xs font-semibold">Seu saldo líquido</p>
        </div>
        <button
          onClick={() => setMostrar((v) => !v)}
          className="text-accent/70 hover:text-accent transition-colors"
          aria-label={mostrar ? "Ocultar valor" : "Mostrar valor"}
        >
          {mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p className="mt-1 text-xl font-bold text-white">
        {mostrar ? formatBRL(repasseLiquido) : "R$ ••••••"}
      </p>
    </div>
  );
}
