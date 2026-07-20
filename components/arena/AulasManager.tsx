"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Trash2, Plus, Pencil, X } from "lucide-react";
import { criarAula, editarAula, removerAula, type AulaState } from "@/app/arena/aulas/actions";
import { PUBLICO_LABEL, horarioLabel, validarIntervaloHorario, type PublicoAula } from "@/lib/arena-dates";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const NIVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

export type StaffOpcao = { userId: string; nome: string };

type Aula = {
  id: string;
  titulo: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  dias_semana: number[] | null;
  ativo: boolean;
  nivel: string | null;
  publico: PublicoAula;
  max_alunos: number | null;
  valor_avulso: number | null;
  professor_id: string | null;
};

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";


const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS_PADRAO = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

// Dois selects (hora/minuto) em vez do <input type="time"> nativo — o widget
// nativo do navegador (roda de rolagem) é feio e inconsistente entre
// browsers. Minutos ficam em passos de 5 (granularidade normal de aula),
// mas se o valor salvo não cair num múltiplo de 5 (dado legado), o próprio
// minuto é injetado na lista pra nunca ser silenciosamente arredondado.
function TimeSelect({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [hora, minuto] = value ? value.split(":") : ["", ""];
  const minutos = minuto && !MINUTOS_PADRAO.includes(minuto)
    ? [...MINUTOS_PADRAO, minuto].sort()
    : MINUTOS_PADRAO;

  function mudarHora(novaHora: string) {
    if (!novaHora) { onChange(""); return; }
    onChange(`${novaHora}:${minuto || "00"}`);
  }
  function mudarMinuto(novoMinuto: string) {
    if (!hora) return;
    onChange(`${hora}:${novoMinuto}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="Hora"
        value={hora}
        onChange={(e) => mudarHora(e.target.value)}
        className={selectCls}
      >
        <option value="">--</option>
        {HORAS.map((h) => <option key={h} value={h}>{h}h</option>)}
      </select>
      <select
        aria-label="Minuto"
        value={minuto}
        onChange={(e) => mudarMinuto(e.target.value)}
        disabled={!hora}
        className={`${selectCls} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <option value="">--</option>
        {minutos.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

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

function CamposAula({ aula, staff }: { aula?: Aula; staff: StaffOpcao[] }) {
  const [horaInicio, setHoraInicio] = useState(aula?.hora_inicio ?? "");
  const [horaFim, setHoraFim] = useState(aula?.hora_fim ?? "");
  const erroHorario = validarIntervaloHorario(horaInicio, horaFim);

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Título</label>
        <input name="titulo" defaultValue={aula?.titulo} className={`mt-1 ${inputCls}`} placeholder="Ex.: Treino técnico" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Horário de início</label>
          <div className="mt-1">
            <TimeSelect name="hora_inicio" value={horaInicio} onChange={setHoraInicio} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Horário de término</label>
          <div className="mt-1">
            <TimeSelect name="hora_fim" value={horaFim} onChange={setHoraFim} />
          </div>
        </div>
      </div>
      {erroHorario && <p className="text-xs text-red-600">{erroHorario}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Público</label>
          <select name="publico" defaultValue={aula?.publico ?? "misto"} className={`mt-1 ${selectCls}`}>
            <option value="misto">{PUBLICO_LABEL.misto}</option>
            <option value="masculino">{PUBLICO_LABEL.masculino}</option>
            <option value="feminino">{PUBLICO_LABEL.feminino}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nível</label>
          <select name="nivel" defaultValue={aula?.nivel ?? ""} className={`mt-1 ${selectCls}`}>
            <option value="">Todos os níveis</option>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
            <option value="avancado">Avançado</option>
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-400">
        Público restringe a confirmação de presença ao gênero cadastrado no perfil do aluno.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Preço da aula avulsa <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            name="valor_avulso"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={aula?.valor_avulso ?? ""}
            placeholder="Sem cobrança avulsa"
            className={`mt-1 ${inputCls}`}
          />
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
      <p className="-mt-2 text-xs text-gray-400">
        Preço avulso é cobrado do aluno sem crédito de plano disponível. Vazio = só alunos com plano.
      </p>

      {aula && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Professor <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <select name="professor_id" defaultValue={aula.professor_id ?? ""} className={`mt-1 ${selectCls}`}>
            <option value="">Sem professor designado</option>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>{s.nome}</option>
            ))}
          </select>
        </div>
      )}

      <DiasSemanaField defaultDias={aula?.dias_semana ?? []} />
    </>
  );
}

function EditarAulaForm({ aula, arenaId, staff, onClose }: { aula: Aula; arenaId: string; staff: StaffOpcao[]; onClose: () => void }) {
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

      <CamposAula aula={aula} staff={staff} />

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

export function AulasManager({ aulas, arenaId, staff = [] }: { aulas: Aula[]; arenaId: string; staff?: StaffOpcao[] }) {
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
                <EditarAulaForm aula={a} arenaId={arenaId} staff={staff} onClose={() => setEditingId(null)} />
              </li>
            ) : (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                    {a.nivel && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        {NIVEL_LABEL[a.nivel] ?? a.nivel}
                      </span>
                    )}
                    {a.publico !== "misto" && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                        {PUBLICO_LABEL[a.publico]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {(a.dias_semana ?? []).map((d) => DIAS[d]).join(", ")}
                    {horarioLabel(a.hora_inicio, a.hora_fim) && ` · ${horarioLabel(a.hora_inicio, a.hora_fim)}`}
                    {a.max_alunos && ` · máx. ${a.max_alunos} alunos`}
                    {a.valor_avulso != null && ` · avulsa R$ ${a.valor_avulso.toFixed(2).replace(".", ",")}`}
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

        <CamposAula staff={staff} />

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
