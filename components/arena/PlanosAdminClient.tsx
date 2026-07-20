"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Archive, Power, Pencil, Check, X, CreditCard, Settings2, AlertTriangle } from "lucide-react";
import { addPlan, togglePlan, arquivarPlano, updatePlan, updatePlanPaymentConfig } from "@/app/arena/planos/actions";

type PlanFormState = { error?: string };

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
  aulas_por_semana: number | null;
  arquivadoEm: string | null;
};

function fmt(v: number) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function PlanRow({ plan, handle }: { plan: Plan; handle: string }) {
  const [editing,       setEditing]       = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [pending, startTransition]        = useTransition();
  const [arquivarMsg, setArquivarMsg]     = useState<string | null>(null);

  // Local state for payment config toggles
  const [credito, setCredito]    = useState(plan.aceita_credito ?? true);
  const [debito,  setDebito]     = useState(plan.aceita_debito ?? false);
  const [diaVenc, setDiaVenc]    = useState(plan.dia_vencimento ?? 10);

  const [updateState, updateAction, updatePending] = useActionState<PlanFormState, FormData>(
    async (_prev, formData) => {
      const result = await updatePlan(formData);
      if (!result.error) setEditing(false);
      return result;
    },
    {},
  );

  function handleToggle() {
    startTransition(() => togglePlan(plan.id, !plan.ativo, handle));
  }

  function handleArquivar() {
    if (!confirm("Arquivar este plano? Ele some das novas contratações. Quem já assinou mantém o acesso até o fim do período pago, sem renovar de novo.")) return;
    setArquivarMsg(null);
    startTransition(async () => {
      const r = await arquivarPlano(plan.id, handle);
      if (r.error) setArquivarMsg(r.error);
    });
  }

  if (editing) {
    return (
      <form action={updateAction} className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 space-y-3">
        <input type="hidden" name="handle" value={handle} />
        <input type="hidden" name="planId" value={plan.id} />
        <input type="hidden" name="tipo"   value={plan.tipo} />
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
        <div>
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
          {plan.tipo === "mensalidade" && (
            <p className="mt-1 text-[11px] text-gray-400">
              Mudar o valor só vale pra novas contratações — quem já assinou continua pagando o valor atual até o fim do período, sem renovar sob o preço novo.
            </p>
          )}
        </div>
        {plan.tipo === "mensalidade" && (
          <div>
            <input
              name="aulas_por_semana"
              type="number"
              min="1"
              defaultValue={plan.aulas_por_semana ?? ""}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Aulas por semana (vazio = ilimitado)"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Quantas presenças por semana (seg a dom) esse plano dá direito.
            </p>
          </div>
        )}
        {updateState.error && (
          <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {updateState.error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={updatePending}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-gray-900 text-sm">{plan.nome}</p>
          {plan.arquivadoEm && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Arquivado</span>
          )}
        </div>
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
            <>
              <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                {plan.aulas_por_semana ? `${plan.aulas_por_semana}x por semana` : "Aulas ilimitadas"}
              </span>
              <span className="text-[10px] text-gray-400">vence dia {plan.dia_vencimento ?? 10}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          disabled={pending || !!plan.arquivadoEm}
          title={plan.arquivadoEm ? "Plano arquivado — sem edição" : "Editar"}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
        >
          <Pencil className="size-4" />
        </button>
        <button
          onClick={() => setEditingConfig(true)}
          disabled={pending || !!plan.arquivadoEm}
          title="Configurar pagamento"
          className="rounded-lg p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
        >
          <Settings2 className="size-4" />
        </button>
        <button
          onClick={handleToggle}
          disabled={pending || !!plan.arquivadoEm}
          title={plan.ativo ? "Desativar" : "Ativar"}
          className={`rounded-lg p-2 disabled:opacity-40 ${plan.ativo ? "text-blue-500 hover:bg-blue-50" : "text-gray-400 hover:bg-gray-100"}`}
        >
          <Power className="size-4" />
        </button>
        <button
          onClick={handleArquivar}
          disabled={pending || !!plan.arquivadoEm}
          title={plan.arquivadoEm ? "Já arquivado" : "Arquivar"}
          className="rounded-lg p-2 text-red-400 hover:bg-red-50 disabled:opacity-40"
        >
          <Archive className="size-4" />
        </button>
      </div>
      {arquivarMsg && (
        <p className="mt-2 basis-full text-xs text-amber-700">{arquivarMsg}</p>
      )}
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
        placeholder={tipo === "mensalidade" ? "Ex: Plano Básico (2x/semana)" : tipo === "aluguel" ? "Ex: Aluguel da quadra" : "Ex: Diária de treino"}
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
        placeholder={tipo === "mensalidade" ? "Valor mensal (R$)" : tipo === "aluguel" ? "Valor por hora (R$)" : "Valor por sessão (R$)"}
      />
      {tipo === "mensalidade" && (
        <div>
          <input
            name="aulas_por_semana"
            type="number"
            min="1"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Aulas por semana (vazio = ilimitado)"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Quantas presenças por semana (seg a dom) esse plano dá direito. Ex.: plano 3x = 3.
          </p>
        </div>
      )}
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
  const [addingAluguel,     setAddingAluguel]     = useState(false);
  const [addingDiaria,      setAddingDiaria]      = useState(false);

  const mensalidade = plans.filter((p) => p.tipo === "mensalidade");
  const aluguel     = plans.filter((p) => p.tipo === "aluguel");
  const diaria      = plans.filter((p) => p.tipo === "diaria");
  // Aluguel/diária são "singleton" (0 ou 1 plano) — um arquivado não deve
  // impedir o botão "Habilitar" de reaparecer pra cadastrar outro.
  const aluguelAtivo = aluguel.filter((p) => !p.arquivadoEm);
  const diariaAtivo  = diaria.filter((p) => !p.arquivadoEm);

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
          {aluguelAtivo.length === 0 && !addingAluguel && (
            <button
              onClick={() => setAddingAluguel(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="size-3.5" /> Habilitar
            </button>
          )}
        </div>

        {aluguelAtivo.length === 0 && !addingAluguel && (
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

      <div className="h-px bg-gray-100" />

      {/* ── Diária de aluno ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Diária de treino</h2>
          {diariaAtivo.length === 0 && !addingDiaria && (
            <button
              onClick={() => setAddingDiaria(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="size-3.5" /> Habilitar
            </button>
          )}
        </div>

        {diariaAtivo.length === 0 && !addingDiaria && (
          <p className="text-sm text-gray-400">Diária desabilitada. Clique em Habilitar para configurar.</p>
        )}

        {diaria.map((p) => (
          <PlanRow key={p.id} plan={p} handle={handle} />
        ))}

        {addingDiaria && (
          <AddPlanForm tipo="diaria" handle={handle} onDone={() => setAddingDiaria(false)} />
        )}

        <p className="text-xs text-gray-400">
          Cobrança por sessão avulsa. Use o ícone <Settings2 className="inline size-3" /> para aceitar crédito ou débito.
        </p>
      </section>

    </div>
  );
}
