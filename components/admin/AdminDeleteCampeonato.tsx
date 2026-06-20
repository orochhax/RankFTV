"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteChampionship } from "@/app/admin/campeonatos/actions";

export function AdminDeleteCampeonato({
  champId,
  champNome,
}: {
  champId: string;
  champNome: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  function handleDelete() {
    if (
      !confirm(
        `Excluir o campeonato "${champNome}"?\n\nIsso apaga em definitivo as inscrições, duplas, chaveamento e credenciais ligados a ele. Não dá pra desfazer.`,
      )
    )
      return;

    startTransition(async () => {
      const res = await deleteChampionship(champId);
      if (res.ok) {
        setDone(true);
        router.refresh();
      } else {
        alert(res.error ?? "Erro ao excluir.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending || done}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
      {isPending ? "Excluindo..." : done ? "Excluído" : "Excluir"}
    </button>
  );
}
