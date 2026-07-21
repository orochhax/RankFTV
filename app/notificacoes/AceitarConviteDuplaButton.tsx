"use client";

import { useActionState } from "react";
import { aceitarConvite, type AceitarConviteResult } from "@/app/perfil/convite-actions";
import { AlertCircle } from "lucide-react";

const initialState: AceitarConviteResult = { ok: true };

export function AceitarConviteDuplaButton({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState<AceitarConviteResult, FormData>(
    async (_prev, formData) => aceitarConvite(formData),
    initialState,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="team_id" value={teamId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Aceitando…" : "Aceitar"}
      </button>
      {!state.ok && state.error && (
        <p className="flex items-start gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </p>
      )}
    </form>
  );
}
