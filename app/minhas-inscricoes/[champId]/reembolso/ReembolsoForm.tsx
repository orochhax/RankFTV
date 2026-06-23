"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { solicitarReembolso } from "./actions";
import { formatBRL } from "@/lib/format";

export function ReembolsoForm({
  regId,
  champId,
  valorExibido, // null = reembolso total (CDC 7 dias); número = apenas inscrição
}: {
  regId:        string;
  champId:      string;
  valorExibido: number | null;
}) {
  const router  = useRouter();
  const [erro,  setErro]  = useState<string | null>(null);
  const [pending, start]  = useTransition();

  function confirmar() {
    setErro(null);
    start(async () => {
      const res = await solicitarReembolso(regId);
      if (res && !res.ok) {
        setErro(res.error ?? "Erro ao processar reembolso.");
      }
    });
  }

  const labelBotao = valorExibido != null
    ? `Confirmar reembolso de ${formatBRL(valorExibido)}`
    : "Confirmar reembolso integral";

  return (
    <div className="space-y-4">
      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {erro}
        </p>
      )}

      <button
        onClick={confirmar}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
      >
        {pending
          ? <><Loader2 className="size-4 animate-spin" /> Processando…</>
          : <><RotateCcw className="size-4" /> {labelBotao}</>}
      </button>

      <button
        onClick={() => router.push(`/minhas-inscricoes/${champId}`)}
        disabled={pending}
        className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
