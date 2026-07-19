"use client";

import { AlertTriangle, X } from "lucide-react";
import type { EscopoEdicao } from "@/lib/monthly-budget";

const OPCOES: { v: EscopoEdicao; label: string; desc: string }[] = [
  { v: "esta", label: "Apagar somente este mês", desc: "Só remove esta ocorrência." },
  { v: "esta_e_proximas", label: "Apagar este mês e os futuros", desc: "Remove daqui em diante, mantém os anteriores." },
  { v: "todas", label: "Apagar todos os meses", desc: "Remove o lançamento inteiro, em todos os meses." },
];

/**
 * Card de confirmação pra excluir um lançamento que abrange mais de um mês
 * (repeatGroupId != null). Substitui o confirm() simples nesse caso, porque
 * a escolha aqui tem 3 opções, não 2.
 */
export function ExcluirEscopoDialog({
  nome,
  contagens,
  onConfirm,
  onCancel,
}: {
  nome: string;
  /** Opcional: quantos registros cada escopo afeta (ex.: { esta: 1, esta_e_proximas: 3, todas: 5 }).
   *  Quando informado, aparece como "(N lançamentos)" ao lado de cada opção. */
  contagens?: Partial<Record<EscopoEdicao, number>>;
  onConfirm: (escopo: EscopoEdicao) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            <p className="text-lg font-semibold text-gray-900">Excluir lançamento?</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          &ldquo;{nome}&rdquo; abrange mais de um mês. O que você quer apagar?
        </p>

        <div className="space-y-2">
          {OPCOES.map((o) => {
            const n = contagens?.[o.v];
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => onConfirm(o.v)}
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-left transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {o.label}
                  {n != null && (
                    <span className="ml-1.5 font-normal text-gray-400">
                      ({n} {n === 1 ? "lançamento" : "lançamentos"})
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{o.desc}</p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
