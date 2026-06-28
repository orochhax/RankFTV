"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Power, Pencil, Check, X } from "lucide-react";
import { addPlan, togglePlan, deletePlan, updatePlan } from "@/app/arena/planos/actions";

type Plan = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  valor: number;
  ativo: boolean;
};

function fmt(v: number) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function PlanRow({ plan, handle }: { plan: Plan; handle: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(() => togglePlan(plan.id, !plan.ativo, handle));
  }

  function handleDelete() {
    if (!confirm("Remover este plano?")) return;
    startTransition(() => deletePlan(plan.id, handle));
  }

  if (editing) {
    return (
      <form
        action={updatePlan}
        onSubmit={() => setEditing(false)}
        className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 space-y-3"
      >
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="planId" value={plan.id} />
        <input
          name="nome"
          defaultValue={plan.nome}
          required
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Nome do plano"
        />
        <input
          name="descricao"
          defaultValue={plan.descricao ?? ""}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Descrição (opcional)"
        />
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0"
          defaultValue={plan.valor}
          required
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Valor (R$)"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Check className="size-4" /> Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          >
            <X className="size-4" /> Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 transition-opacity ${
        plan.ativo ? "bg-white ring-black/5" : "bg-gray-50 opacity-60 ring-black/5"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{plan.nome}</p>
        {plan.descricao && <p className="text-xs text-gray-400 mt-0.5">{plan.descricao}</p>}
        <p className="mt-1 text-base font-black text-blue-600">{fmt(plan.valor)}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={handleToggle}
          disabled={pending}
          title={plan.ativo ? "Desativar" : "Ativar"}
          className={`rounded-lg p-2 ${plan.ativo ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
        >
          <Power className="size-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="rounded-lg p-2 text-red-400 hover:bg-red-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AddPlanForm({ tipo, handle, onDone }: { tipo: string; handle: string; onDone: () => void }) {
  return (
    <form action={addPlan} onSubmit={onDone} className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 space-y-3">
      <input type="hidden" name="handle" value={handle} />
      <input type="hidden" name="tipo" value={tipo} />
      <input
        name="nome"
        required
        autoFocus
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={tipo === "mensalidade" ? "Ex: Plano Básico (2x/semana)" : "Ex: Aluguel da quadra"}
      />
      <input
        name="descricao"
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Descrição (opcional)"
      />
      <input
        name="valor"
        type="number"
        step="0.01"
        min="0"
        required
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder={tipo === "aluguel" ? "Valor por hora (R$)" : "Valor mensal (R$)"}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Check className="size-4" /> Salvar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
        >
          <X className="size-4" /> Cancelar
        </button>
      </div>
    </form>
  );
}

export function PlanosAdminClient({ plans, handle }: { plans: Plan[]; handle: string }) {
  const [addingMensalidade, setAddingMensalidade] = useState(false);
  const [addingAluguel, setAddingAluguel] = useState(false);

  const mensalidade = plans.filter((p) => p.tipo === "mensalidade");
  const aluguel     = plans.filter((p) => p.tipo === "aluguel");

  return (
    <div className="space-y-8">

      {/* ── Mensalidade ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Planos de mensalidade</h2>
          {!addingMensalidade && (
            <button
              onClick={() => setAddingMensalidade(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="size-3.5" /> Adicionar
            </button>
          )}
        </div>

        {mensalidade.length === 0 && !addingMensalidade && (
          <p className="text-sm text-gray-400">Nenhum plano cadastrado. Adicione o primeiro.</p>
        )}

        {mensalidade.map((p) => (
          <PlanRow key={p.id} plan={p} handle={handle} />
        ))}

        {addingMensalidade && (
          <AddPlanForm tipo="mensalidade" handle={handle} onDone={() => setAddingMensalidade(false)} />
        )}
      </section>

      <div className="h-px bg-gray-100" />

      {/* ── Aluguel da quadra ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Aluguel da quadra</h2>
          {aluguel.length === 0 && !addingAluguel && (
            <button
              onClick={() => setAddingAluguel(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="size-3.5" /> Habilitar
            </button>
          )}
        </div>

        {aluguel.length === 0 && !addingAluguel && (
          <p className="text-sm text-gray-400">Aluguel desabilitado. Clique em Habilitar para configurar.</p>
        )}

        {aluguel.map((p) => (
          <PlanRow key={p.id} plan={p} handle={handle} />
        ))}

        {addingAluguel && (
          <AddPlanForm tipo="aluguel" handle={handle} onDone={() => setAddingAluguel(false)} />
        )}
      </section>

    </div>
  );
}
