"use client";

import { useActionState } from "react";
import { aceitarConvite } from "@/app/perfil/convite-actions";
import { CheckCircle2 } from "lucide-react";

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"];

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

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          Tamanho da sua camisa
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {TAMANHOS.map((t) => (
            <label key={t} className="cursor-pointer">
              <input
                type="radio"
                name="tamanho_camisa"
                value={t}
                required
                className="peer sr-only"
              />
              <span className="flex items-center justify-center rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
      >
        <CheckCircle2 className="size-4" />
        {pending ? "Aceitando…" : "Aceitar convite"}
      </button>
    </form>
  );
}
