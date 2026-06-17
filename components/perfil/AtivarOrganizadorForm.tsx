"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { ativarOrganizador } from "@/app/perfil/ativar-organizador/actions";

const initialState = { error: undefined as string | undefined };

export function AtivarOrganizadorForm() {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await ativarOrganizador(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Celular (com DDD)
        </label>
        <input
          name="telefone"
          type="tel"
          placeholder="(11) 99999-8888"
          required
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          É para cá que vamos transferir sua parte de cada inscrição paga.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Ativando..." : "Ativar conta de organizador"}
      </button>
    </form>
  );
}
