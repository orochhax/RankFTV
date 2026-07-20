"use client";

import { useActionState, useTransition } from "react";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { adicionarStaff, removerStaff, type StaffState } from "@/app/arena/staff/actions";

export type EquipeMembro = {
  id: string;
  userId: string;
  papel: "professor" | "gerente";
  nome: string;
  username: string;
};

const PAPEL_LABEL: Record<EquipeMembro["papel"], string> = {
  professor: "Professor",
  gerente:   "Gerente",
};

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export function EquipeManager({ arenaId, equipe }: { arenaId: string; equipe: EquipeMembro[] }) {
  const [state, formAction, pending] = useActionState<StaffState, FormData>(adicionarStaff, {});
  const [removing, startRemove] = useTransition();

  return (
    <section className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-700">Equipe</h2>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Professores confirmam ou marcam ausência das aulas que dão. Gerentes têm as mesmas permissões do dono
        sobre aulas, presenças e financeiro.
      </p>

      {equipe.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Ninguém na equipe ainda.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {equipe.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{m.nome}</p>
                <p className="text-xs text-gray-400">@{m.username} · {PAPEL_LABEL[m.papel]}</p>
              </div>
              <button
                type="button"
                onClick={() => startRemove(() => { void removerStaff(m.id, arenaId); })}
                disabled={removing}
                aria-label={`Remover ${m.nome} da equipe`}
                className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="arena_id" value={arenaId} />
        <div className="min-w-[140px] flex-1">
          <label className="block text-xs font-medium text-gray-500">@usuário</label>
          <input name="username" placeholder="@usuario" className={`mt-1 ${inputCls}`} required />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500">Papel</label>
          <select name="papel" defaultValue="professor" className={`mt-1 ${selectCls}`}>
            <option value="professor">Professor</option>
            <option value="gerente">Gerente</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Adicionar
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </section>
  );
}
