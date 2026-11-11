"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { salvarQuestionario } from "@/app/perfil/questionario/actions";

const initialState = { error: undefined as string | undefined };

export function QuestionarioForm() {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await salvarQuestionario(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800">
          Qual é o seu gênero?
        </legend>
        <p className="text-xs text-gray-500">
          Usamos isso para validar as categorias dos campeonatos (masculina,
          feminina ou mista). Quem escolher &quot;Outro&quot; pode se inscrever em qualquer
          categoria.
        </p>
        <div className="space-y-2">
          {[
            { valor: "masculino", texto: "Masculino" },
            { valor: "feminino",  texto: "Feminino"  },
            { valor: "outro",     texto: "Outro"     },
          ].map((opcao) => (
            <label
              key={opcao.valor}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm text-ink transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink hover:bg-surface-2"
            >
              <input
                type="radio"
                name="genero"
                value={opcao.valor}
                required
                className="accent-brand"
              />
              {opcao.texto}
            </label>
          ))}
        </div>
      </fieldset>

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
        {pending ? "Salvando..." : "Salvar e ver meu perfil"}
      </button>
    </form>
  );
}
