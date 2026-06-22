"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { excluirNoticia } from "@/app/admin/noticias/actions";

export function AdminDeleteNoticia({
  id,
  titulo,
}: {
  id: string;
  titulo: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Excluir a notícia "${titulo}"?\n\nIsso não dá pra desfazer.`)) return;

    startTransition(async () => {
      const res = await excluirNoticia(id);
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
