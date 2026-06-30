"use client";

import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { aceitarAluno, recusarAluno } from "@/app/arena/actions";

export function AceitarAlunoButton({
  alunoId,
  arenaId,
}: {
  alunoId: string;
  arenaId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startTransition(() => { void aceitarAluno(alunoId, arenaId); })}
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Aceitar
      </button>
      <button
        onClick={() => startTransition(() => { void recusarAluno(alunoId, arenaId); })}
        disabled={pending}
        className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-60"
      >
        <X className="size-3" />
        Recusar
      </button>
    </div>
  );
}
