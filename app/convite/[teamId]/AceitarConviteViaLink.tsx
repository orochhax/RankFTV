"use client";

import { useActionState } from "react";
import { aceitarConvite, type AceitarConviteResult } from "@/app/perfil/convite-actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

const initialState: AceitarConviteResult = { ok: true };

export function AceitarConviteViaLink({
  teamId,
  champId,
  inviteToken,
}: {
  teamId: string;
  champId: string;
  inviteToken: string;
}) {
  const [state, action, pending] = useActionState<AceitarConviteResult, FormData>(
    async (_prev, formData) => {
      const result = await aceitarConvite(formData);
      if (result.ok) {
        window.location.href = `/minhas-inscricoes/${champId}`;
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="invite_token" value={inviteToken} />
      {!state.ok && state.error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}
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
