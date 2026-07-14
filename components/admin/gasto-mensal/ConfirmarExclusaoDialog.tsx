"use client";

import { AlertTriangle, X } from "lucide-react";

/**
 * Card de confirmação simples pra excluir um lançamento de um mês só
 * (repeatGroupId sem outros meses). Substitui o confirm() nativo do
 * navegador — aqui a escolha é só sim/não.
 */
export function ConfirmarExclusaoDialog({
  titulo,
  mensagem,
  onConfirm,
  onCancel,
}: {
  titulo: string;
  mensagem: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            <p className="text-lg font-semibold text-gray-900">{titulo}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">{mensagem}</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
