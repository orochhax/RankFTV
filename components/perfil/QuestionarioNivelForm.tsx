"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { salvarQuestionarioNivel } from "@/app/perfil/questionario-nivel/actions";
import { PERGUNTAS_NIVEL } from "@/lib/motor-categoria";

const initialState = { error: undefined as string | undefined };

export function QuestionarioNivelForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await salvarQuestionarioNivel(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="redirect" value={redirectTo} />

      {PERGUNTAS_NIVEL.map((p, i) => (
        <fieldset key={p.key} className="space-y-3">
          <legend className="text-sm font-semibold text-gray-800">
            {i + 1}. {p.pergunta}
          </legend>
          <div className="space-y-2">
            {p.opcoes.map((op) => (
              <label
                key={op.valor}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name={p.key}
                  value={op.valor}
                  required
                  className="accent-blue-600"
                />
                {op.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Salvando..." : "Salvar e continuar"}
      </button>
    </form>
  );
}
