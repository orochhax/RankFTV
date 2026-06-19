"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { excluirPagina } from "@/app/painel/paginas/[id]/editar/actions";

const FRASE = "Eu quero excluir essa pagina";

export function ExcluirPaginaButton({
  pageId,
  nomePagina,
}: {
  pageId: string;
  nomePagina: string;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await excluirPagina(pageId);
      if (res.ok) {
        router.push("/painel/paginas");
        router.refresh();
      } else {
        setError(res.error ?? "Erro ao excluir.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTexto(""); setError(""); }}
        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
      >
        <Trash2 className="size-4" /> Excluir página
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Excluir "{nomePagina}"?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Essa ação é permanente e não tem volta. Seguidores, links e vínculos com campeonatos serão apagados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-sm text-gray-600">
                Para confirmar, digite exatamente:{" "}
                <span className="font-mono font-semibold text-red-600">{FRASE}</span>
              </p>
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={FRASE}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={texto !== FRASE || pending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
