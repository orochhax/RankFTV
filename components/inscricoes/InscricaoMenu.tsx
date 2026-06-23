"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, RotateCcw, X } from "lucide-react";
import { cancelarInscricao } from "@/app/minhas-inscricoes/actions";

export function InscricaoMenu({
  teamId,
  champId,
  regId,
  teamStatus,
  pagStatus,
}: {
  teamId:     string;
  champId:    string;
  regId?:     string;
  teamStatus: string;
  pagStatus?: string;
}) {
  const router = useRouter();
  const [open,       setOpen]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [erro,       setErro]       = useState<string | null>(null);
  const [pending,    start]         = useTransition();

  if (teamStatus === "cancelado") return null;

  const jaPago   = pagStatus === "pago";
  const estornado = pagStatus === "estornado";

  function abrirMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
    setErro(null);
  }

  function pedirConfirmacao(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setConfirming(true);
  }

  function irParaReembolso(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    router.push(`/minhas-inscricoes/${champId}/reembolso?reg=${regId}`);
  }

  function confirmar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const res = await cancelarInscricao(teamId);
      if (!res.ok) {
        setErro(res.error ?? "Erro ao cancelar.");
        setConfirming(false);
      }
    });
  }

  function recusar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div
        className="flex shrink-0 items-center gap-1.5"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <span className="text-xs text-gray-500">Cancelar?</span>
        <button
          onClick={confirmar}
          disabled={pending}
          className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : "Sim"}
        </button>
        <button
          onClick={recusar}
          disabled={pending}
          className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={abrirMenu}
        aria-label="Opções"
        className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
            {/* Reembolso — só aparece se já pagou e não está estornado */}
            {jaPago && !estornado && regId && (
              <button
                onClick={irParaReembolso}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <RotateCcw className="size-4" /> Solicitar reembolso
              </button>
            )}

            {/* Cancelar — só aparece se ainda não pagou */}
            {!jaPago && !estornado && (
              <button
                onClick={pedirConfirmacao}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="size-4" /> Cancelar inscrição
              </button>
            )}

            {estornado && (
              <p className="px-4 py-3 text-xs text-gray-400">
                Esta inscrição já foi estornada.
              </p>
            )}
          </div>
        </>
      )}

      {erro && (
        <p className="absolute right-0 top-10 whitespace-nowrap rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-600 ring-1 ring-red-200">
          {erro}
        </p>
      )}
    </div>
  );
}
