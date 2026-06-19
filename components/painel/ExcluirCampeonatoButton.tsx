"use client";

import { useState, useTransition } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { excluirCampeonato } from "@/app/painel/campeonatos/[id]/editar/actions";

const FRASE = "eu quero excluir esse camp";

export function ExcluirCampeonatoButton({ champId, champNome }: { champId: string; champNome: string }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function abrir() { setOpen(true); setTexto(""); setError(""); }
  function fechar() { if (!pending) { setOpen(false); setTexto(""); setError(""); } }

  function confirmar() {
    if (texto.trim().toLowerCase() !== FRASE) {
      setError("Texto incorreto. Digite exatamente como indicado.");
      return;
    }
    startTransition(async () => {
      const res = await excluirCampeonato(champId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="size-4" />
        Excluir campeonato
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Excluir campeonato</h2>
              </div>
              <button type="button" onClick={fechar} className="text-gray-400 hover:text-gray-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>
                Você está prestes a excluir <strong className="text-gray-900">{champNome}</strong>.
                Essa ação é <strong>irreversível</strong>.
              </p>
              <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-red-700">
                <li>· Todos os atletas inscritos perdem o acesso</li>
                <li>· O chaveamento e resultados são apagados para sempre</li>
                <li>· O campeonato some da lista pública</li>
              </ul>
              <p>
                Para confirmar, digite exatamente:
              </p>
              <p className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700 select-all">
                {FRASE}
              </p>
              <input
                type="text"
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setError(""); }}
                placeholder="Digite a frase acima..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                disabled={pending}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fechar}
                disabled={pending}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={pending || texto.trim().toLowerCase() !== FRASE}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {pending ? "Excluindo…" : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
