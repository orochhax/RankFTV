"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Power, Pencil, Check, X, CreditCard, Settings2 } from "lucide-react";
import { addPlan, togglePlan, deletePlan, updatePlan, updatePlanPaymentConfig } from "@/app/arena/planos/actions";

type Plan = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  valor: number;
  ativo: boolean;
  aceita_credito: boolean | null;
  aceita_debito: boolean | null;
  dia_vencimento: number | null;
};

function fmt(v: number) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function PlanRow({ plan, handle }: { plan: Plan; handle: string }) {
  const [editing,       setEditing]       = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [pending, startTransition]        = useTransition();

  // Local state for payment config toggles
  const [credito, setCredito]    = useState(plan.aceita_credito ?? true);
  const [debito,  setDebito]     = useState(plan.aceita_debito ?? false);
  const [diaVenc, setDiaVenc]    = useState(plan.dia_vencimento ?? 10);

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

  if (editingConfig) {
    return (
      <form
        action={updatePlanPaymentConfig}
        onSubmit={() => setEditingConfig(false)}
        className="rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100 space-y-4"
      >
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="planId" value={plan.id} />
        <input type="hidden" name="aceita_credito" value={String(credito)} />
        <input type="hidden" name="aceita_debito"  value={String(debito)} />
        <input type="hidden" name="dia_vencimento" value={String(diaVenc)} />

        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5">
          <CreditCard className="size-3.5" /> Formas de pagamento aceitas
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setCredito((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                credito ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block size-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                credito ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-gray-700">Crédito</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setDebito((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                debito ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block size-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                debito ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-sm text-gray-700">Débito</span>
          </label>
        </div>

        {plan.tipo === "mensalidade" && (
          <div>
            <label className="block text-xs font-medium text-indigo-700 mb-1">
              Dia de vencimento (1–28)
            </label>
            <input
              type="number"
              min={1}
              max={28}
              value={diaVenc}
              onChange={(e) => setDiaVenc(Number(e.target.value))}
              className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Check className="size-4" /> Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditingConfig(false)}
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

        {/* Badge de formas de pagamento */}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {(plan.aceita_credito ?? true) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              <CreditCard className="size-2.5" /> Crédito
            </span>
          )}
          {(plan.aceita_debito ?? false) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
              <CreditCard className="size-2.5" /> Débito
            </span>
          )}
          {plan.tipo === "mensalidade" && (
            <span className="text-[10px] text-gray-400">vence dia {plan.dia_vencimento ?? 10}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          title="Editar"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={() => setEditingConfig(true)}
          disabled={pending}
          title="Configurar pagamento"
          className="rounded-lg p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Settings2 className="size-4" />
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
          title="Remover"
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

        <p className="text-xs text-gray-400">
          Clique no ícone <Settings2 className="inline size-3" /> para configurar formas de pagamento e dia de vencimento.
        </p>
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

        <p className="text-xs text-gray-400">
          O valor informado é por hora. Use o ícone <Settings2 className="inline size-3" /> para aceitar crédito ou débito.
        </p>
      </section>

    </div>
  );
}
