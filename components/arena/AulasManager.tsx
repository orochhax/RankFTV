"use client";

import { useActionState, useTransition } from "react";
import { Loader2, Trash2, Plus } from "lucide-react";
import { criarAula, removerAula, type AulaState } from "@/app/arena/aulas/actions";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const NIVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

type Aula = {
  id: string;
  titulo: string;
  horario: string | null;
  dias_semana: number[] | null;
  ativo: boolean;
  nivel: string | null;
  max_alunos: number | null;
};

export function AulasManager({ aulas }: { aulas: Aula[] }) {
  const [state, formAction, pending] = useActionState<AulaState, FormData>(criarAula, {});
  const [removing, startRemove] = useTransition();

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const select =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="space-y-6">
      {/* Aulas cadastradas */}
      {aulas.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhuma aula cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {aulas.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                  {a.nivel && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      {NIVEL_LABEL[a.nivel] ?? a.nivel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {(a.dias_semana ?? []).map((d) => DIAS[d]).join(", ")}
                  {a.horario && ` · ${a.horario}`}
                  {a.max_alunos && ` · máx. ${a.max_alunos} alunos`}
                </p>
              </div>
              <button
                onClick={() => startRemove(() => { void removerAula(a.id); })}
                disabled={removing}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Formulário de nova aula */}
      <form action={formAction} className="space-y-4 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700">Nova aula</p>

        <div>
          <label className="block text-sm font-medium text-gray-700">Título</label>
          <input name="titulo" className={`mt-1 ${input}`} placeholder="Ex.: Treino técnico" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Horário</label>
            <input name="horario" type="time" className={`mt-1 ${input}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nível</label>
            <select name="nivel" className={`mt-1 ${select}`} defaultValue="">
              <option value="">Todos os níveis</option>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Limite de alunos <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            name="max_alunos"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Sem limite"
            className={`mt-1 ${input}`}
          />
          <p className="mt-1 text-xs text-gray-400">
            Máximo de alunos que podem confirmar presença nessa aula. Deixe em branco para não limitar.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dias da semana</label>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((d, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" name="dias_semana" value={i} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">{d}</span>
              </label>
            ))}
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar aula
        </button>
      </form>
    </div>
  );
}
