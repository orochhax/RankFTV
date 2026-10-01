"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle, Inbox, Loader2, RotateCw } from "lucide-react";
import { tentarCobrancaNovamente } from "@/app/arena/actions";
import {
  CATEGORIA_LABEL,
  STATUS_COBRANCA_LABEL,
  type CobrancaHistorico,
  type StatusCobranca,
} from "@/lib/arena-cobranca";
import { formatBRL } from "@/lib/format";

const STATUS_BADGE_CLS: Record<StatusCobranca, string> = {
  pendente: "bg-orange-50 text-orange-600",
  processando: "bg-amber-50 text-amber-600",
  pago: "bg-emerald-50 text-emerald-600",
  falhou: "bg-red-50 text-red-600",
  estornado: "bg-gray-100 text-gray-500",
  cancelado: "bg-gray-100 text-gray-400",
};

export function FinanceiroAlunoClient({
  historico,
  cobrancasComRetry,
}: {
  historico: CobrancaHistorico[];
  cobrancasComRetry: string[];
}) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [pendingRetry, startRetry] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const retrySet = new Set(cobrancasComRetry);

  function retry(attendanceId: string) {
    setRetrying(attendanceId);
    setMessage(null);
    startRetry(async () => {
      const result = await tentarCobrancaNovamente(attendanceId);
      setMessage(
        result.error
          ? { type: "error", text: result.error }
          : { type: "ok", text: "Pagamento confirmado." },
      );
      setRetrying(null);
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
        <h2 className="text-sm font-semibold text-amber-900">Cobranças automáticas pausadas</h2>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          A Arena ainda não aceita cartão salvo. Quando houver pagamento por cartão,
          você será direcionado ao checkout seguro do processador de pagamentos.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Histórico de cobranças</h2>
        {historico.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
            <Inbox className="size-8 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhuma cobrança ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {historico.map((item) => (
              <li key={`${item.categoria}-${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.descricao}</p>
                  <p className="text-xs text-gray-400">{CATEGORIA_LABEL[item.categoria]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatBRL(item.valor)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLS[item.status]}`}>
                    {STATUS_COBRANCA_LABEL[item.status]}
                  </span>
                  {retrySet.has(item.id) ? (
                    <button type="button" onClick={() => retry(item.id)} disabled={pendingRetry && retrying === item.id} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                      {pendingRetry && retrying === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                      Tentar novamente
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {message ? (
          <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {message.type === "ok" ? <CheckCircle className="size-3.5" /> : <AlertCircle className="size-3.5" />} {message.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}
