"use client";

import { useActionState } from "react";
import { aceitarConvite } from "@/app/perfil/convite-actions";
import { CheckCircle2 } from "lucide-react";

type State = void | undefined;

export function AceitarConviteViaLink({
  teamId,
  champId,
}: {
  teamId: string;
  champId: string;
}) {
  const [, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      await aceitarConvite(formData);
      window.location.href = `/minhas-inscricoes/${champId}`;
    },
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="team_id" value={teamId} />
      <p className="text-xs text-gray-400 text-center">
        Após aceitar, você poderá escolher o tamanho do seu uniforme na página do ingresso.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
      >
        <CheckCircle2 className="size-4" />
        {pending ? "Aceitando…" : "Aceitar convite"}
      </button>
    </form>
  );
}
