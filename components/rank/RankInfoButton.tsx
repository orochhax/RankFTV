"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";

// Botãozinho de informação (i) no topo do Ranking. Ao clicar, abre um balão
// flutuante com a data da última atualização — sem sair/recarregar a página.
export function RankInfoButton({
  atualizadoEm,
  detalhe,
}: {
  atualizadoEm: string;
  detalhe: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Informações sobre o ranking"
        aria-expanded={open}
        className={`flex size-8 items-center justify-center rounded-full ring-1 transition-colors ${
          open
            ? "bg-blue-600 text-white ring-blue-600"
            : "bg-white text-gray-400 ring-gray-200 hover:text-gray-600 hover:ring-gray-300"
        }`}
      >
        <Info className="size-4.5" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              Atualização da tabela
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="-mr-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            Tabela atualizada em{" "}
            <span className="font-medium text-gray-900">{atualizadoEm}</span>,
            após a finalização da {detalhe}.
          </p>
        </div>
      )}
    </div>
  );
}
