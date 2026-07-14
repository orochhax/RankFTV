"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Trash2, Plus, Pencil, X } from "lucide-react";
import { criarAula, editarAula, removerAula, type AulaState } from "@/app/arena/aulas/actions";

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
  duracao_minutos: number;
  dias_semana: number[] | null;
  ativo: boolean;
  nivel: string | null;
  max_alunos: number | null;
};

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function DiasSemanaField({ defaultDias }: { defaultDias: number[] }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Dias da semana</label>
      <div className="flex flex-wrap gap-2">
        {DIAS.map((d, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" name="dias_semana" value={i} defaultChecked={defaultDias.includes(i)} className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">{d}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CamposAula({ aula }: { aula?: Aula }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Título</label>
        <input name="titulo" defaultValue={aula?.titulo} className={`mt-1 ${inputCls}`} placeholder="Ex.: Treino técnico" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Horário</label>
          <input name="horario" type="time" defaultValue={aula?.horario ?? ""} className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Duração (min)</label>
          <input
            name="duracao_minutos"
            type="number"
            min={15}
            max={480}
            step={5}
            defaultValue={aula?.duracao_minutos ?? 60}
            className={`mt-1 ${inputCls}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nível</label>
          <select name="nivel" defaultValue={aula?.nivel ?? ""} className={`mt-1 ${selectCls}`}>
            <option value="">Todos os níveis</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
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
            defaultValue={aula?.max_alunos ?? ""}
            placeholder="Sem limite"
            className={`mt-1 ${inputCls}`}
          />
        </div>
      </div>

      <DiasSemanaField defaultDias={aula?.dias_semana ?? []} />
    </>
  );
}

function EditarAulaForm({ aula, arenaId, onClose }: { aula: Aula; arenaId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<AulaState, FormData>(async (_prev, formData) => {
    const result = await editarAula(_prev, formData);
    if (!result.error) {
      onClose();
      return {};
    }
    return result;
  }, {});

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-blue-50/60 p-5 ring-1 ring-blue-100">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Editar aula</p>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700">
          <X className="size-4" />
        </button>
      </div>

      <input type="hidden" name="id" value={aula.id} />
      <input type="hidden" name="arena_id" value={arenaId} />
      <input type="hidden" name="ativo" value="true" />

      <CamposAula aula={aula} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar alterações
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function AulasManager({ aulas, arenaId }: { aulas: Aula[]; arenaId: string }) {
  const [state, formAction, pending] = useActionState<AulaState, FormData>(criarAula, {});
  const [removing, startRemove] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Aulas cadastradas */}
      {aulas.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhuma aula cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {aulas.map((a) =>
            editingId === a.id ? (
              <li key={a.id}>
                <EditarAulaForm aula={a} arenaId={arenaId} onClose={() => setEditingId(null)} />
              </li>
            ) : (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
              >
                <div className="min-w-0">
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
                    {a.horario && ` · ${a.horario} (${a.duracao_minutos} min)`}
                    {a.max_alunos && ` · máx. ${a.max_alunos} alunos`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(a.id)}
                    aria-label={`Editar ${a.titulo}`}
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startRemove(() => { void removerAula(a.id, arenaId); })}
                    disabled={removing}
                    aria-label={`Remover ${a.titulo}`}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {/* Formulário de nova aula */}
      <form id="nova-aula" action={formAction} className="scroll-mt-20 space-y-4 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700">Nova aula</p>
        <input type="hidden" name="arena_id" value={arenaId} />

        <CamposAula />

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
