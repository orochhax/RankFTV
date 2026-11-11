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
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm text-ink transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink hover:bg-surface-2"
              >
                <input
                  type="radio"
                  name={p.key}
                  value={op.valor}
                  required
                  className="accent-brand"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Salvando..." : "Salvar e continuar"}
      </button>
    </form>
  );
}
