"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { respondPageChampionshipInvite } from "@/app/campeonatos/paginas/actions";

export function InviteRespondButtons({
  inviteId,
  campId,
}: {
  inviteId: string;
  campId: string;
}) {
  const [done, setDone] = useState<"aceito" | "rejeitado" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond(accept: boolean) {
    startTransition(async () => {
      const res = await respondPageChampionshipInvite(inviteId, accept);
      if (res.ok) {
        setDone(accept ? "aceito" : "rejeitado");
        router.refresh();
      }
    });
  }

  if (done) {
    return (
      <p className={`mt-2 text-xs font-medium ${done === "aceito" ? "text-green-700" : "text-gray-500"}`}>
        {done === "aceito" ? "Vínculo aceito — campeonato aparece na página agora." : "Convite recusado."}
      </p>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => respond(true)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <Check className="size-3.5" /> Aceitar
      </button>
      <button
        type="button"
        onClick={() => respond(false)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        <X className="size-3.5" /> Recusar
      </button>
    </div>
  );
}
