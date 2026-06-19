"use client";

import { useActionState } from "react";
import { Loader2, Rocket } from "lucide-react";
import {
  publicarCampeonato,
  type PublicarState,
} from "@/app/painel/campeonatos/[id]/publicar/actions";

const initial: PublicarState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function PublicarCampeonatoForm({
  championshipId,
  precisaPix,
}: {
  championshipId: string;
  precisaPix: boolean;
}) {
  const [state, action, pending] = useActionState(publicarCampeonato, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="championship_id" value={championshipId} />

      {precisaPix && (
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Pra onde mandamos sua parte</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Precisamos disso pra repassar o dinheiro das inscrições pra você.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Celular (com DDD)</label>
            <input
              name="telefone"
              type="tel"
              placeholder="(11) 99999-8888"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Chave Pix para receber os repasses
            </label>
            <input
              name="chave_pix"
              type="text"
              placeholder="CPF, celular, e-mail ou chave aleatória"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              É para cá que transferimos sua parte de cada inscrição paga.
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
        {pending ? "Publicando…" : "Publicar campeonato"}
      </button>
    </form>
  );
}
