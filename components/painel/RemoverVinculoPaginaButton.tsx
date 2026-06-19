"use client";

import { useTransition, useState } from "react";
import { Unlink } from "lucide-react";
import { removerVinculoPagina } from "@/app/painel/paginas/[id]/editar/actions";

export function RemoverVinculoPaginaButton({ champId, pageId }: { champId: string; pageId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handle() {
    if (!confirm("Remover o vínculo deste campeonato com a página?")) return;
    startTransition(async () => {
      await removerVinculoPagina(champId, pageId);
      setDone(true);
    });
  }

  if (done) return <span className="text-xs text-gray-400">Removido</span>;

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
    >
      <Unlink className="size-3.5" /> Remover
    </button>
  );
}
