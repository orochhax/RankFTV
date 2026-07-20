"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { exportarMeusDados, solicitarExclusaoConta } from "@/app/perfil/conta/actions";

export function PrivacyActions() {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  function exportar() {
    setErro(null);
    startTransition(async () => {
      const res = await exportarMeusDados();
      if (!res.ok) { setErro(res.error); return; }
      const blob = new Blob([JSON.stringify(res.dados, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rankftv-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const res = await solicitarExclusaoConta();
      if (!res.ok) { setErro(res.error ?? "Erro ao enviar o pedido."); return; }
      setPedidoEnviado(true);
      setConfirmando(false);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={exportar}
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        <Download className="size-5 shrink-0 text-gray-400" />
        <span className="flex-1 text-left text-sm font-medium text-gray-700">Exportar meus dados</span>
      </button>

      {pedidoEnviado ? (
        <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700 ring-1 ring-blue-100">
          Pedido de exclusão registrado. Nossa equipe vai analisar e retornar pelo seu e-mail —
          registros financeiros que a lei exige manter continuam guardados de forma restrita.
        </p>
      ) : confirmando ? (
        <div className="space-y-2 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
          <p className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Tem certeza? Isso abre um pedido de exclusão da sua conta.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={excluir}
              disabled={pending}
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Sim, quero excluir
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-600 ring-1 ring-black/5 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
        >
          <Trash2 className="size-5 shrink-0 text-red-400" />
          <span className="flex-1 text-left text-sm font-medium text-red-600">Solicitar exclusão da conta</span>
        </button>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
