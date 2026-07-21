"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { reconciliarInscricao } from "@/app/painel/campeonatos/[id]/financeiro/actions";

export function ReconciliarInscricaoButton({
  champId,
  registrationId,
}: {
  champId: string;
  registrationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function reconciliar() {
    setFeedback(null);
    startTransition(async () => {
      const resultado = await reconciliarInscricao(champId, registrationId);
      setFeedback(resultado);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={reconciliar}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Verificando…" : "Verificar no Asaas"}
      </button>
      {feedback && (
        <p className={`max-w-64 text-right text-xs ${feedback.ok ? "text-green-700" : "text-ink-muted"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
