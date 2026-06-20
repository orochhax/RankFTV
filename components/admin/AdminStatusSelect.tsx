"use client";

import { useState, useTransition } from "react";
import { updateChampionshipStatus } from "@/app/admin/campeonatos/actions";

const STATUS_LABELS: Record<string, string> = {
  rascunho:           "Rascunho",
  inscricoes_abertas: "Inscrições abertas",
  em_andamento:       "Em andamento",
  encerrado:          "Encerrado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho:           "bg-gray-100 text-gray-700",
  inscricoes_abertas: "bg-green-100 text-green-800",
  em_andamento:       "bg-blue-100 text-blue-800",
  encerrado:          "bg-zinc-200 text-zinc-700",
};

export function AdminStatusSelect({
  champId,
  currentStatus,
}: {
  champId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(novo: string) {
    if (novo === status) { setOpen(false); return; }
    if (!confirm(`Mudar status para "${STATUS_LABELS[novo]}"?`)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await updateChampionshipStatus(champId, novo);
      if (res.ok) setStatus(novo);
      else alert(res.error ?? "Erro ao mudar status.");
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity disabled:opacity-50 ${STATUS_COLORS[status] ?? STATUS_COLORS.rascunho}`}
      >
        {isPending ? "..." : STATUS_LABELS[status] ?? status}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === status ? "font-semibold text-gray-900" : "text-gray-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
