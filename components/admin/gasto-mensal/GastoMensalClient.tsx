"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Plus, ListPlus, ChevronLeft, ChevronRight, Wallet, TrendingDown, Scale, Inbox,
  Pencil, Trash2, Loader2, CheckCircle2, ReceiptText,
} from "lucide-react";
import { apagarDespesa, apagarReceita, alternarPagoDespesa } from "@/app/admin/gasto-mensal/actions";
import { DespesaForm } from "@/components/admin/gasto-mensal/DespesaForm";
import { ReceitaForm } from "@/components/admin/gasto-mensal/ReceitaForm";
import { ExcluirEscopoDialog } from "@/components/admin/gasto-mensal/ExcluirEscopoDialog";
import { ConfirmarExclusaoDialog } from "@/components/admin/gasto-mensal/ConfirmarExclusaoDialog";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  addMonthsToKey, monthLabelLong, itemsOfMonth, filterByPersonParticipation, sortByVisibleAmountDesc,
  amountForFilter, personOfAmounts, resultadoPrevisto, contarPagoPendente, buildExpenseChartPoints,
  groupMonthBounds, fazParteDeGrupo,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome, type PersonFilter, type ExpenseChartPoint, type EscopoEdicao,
} from "@/lib/monthly-budget";

const COR_CARLOS = "#2563eb"; // blue-600
const COR_JULIA  = "#f43f5e"; // rose-500

const PESSOA_OPCOES: { valor: PersonFilter; label: string; ativoCls: string }[] = [
  { valor: "todos",  label: "Todos",  ativoCls: "bg-gray-900 text-white" },
  { valor: "carlos", label: "Carlos", ativoCls: "bg-blue-600 text-white" },
  { valor: "julia",  label: "Julia",  ativoCls: "bg-rose-500 text-white" },
];

function FiltroPessoa({ value, onChange }: { value: PersonFilter; onChange: (v: PersonFilter) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-gray-100 p-1">
      {PESSOA_OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            value === o.valor ? o.ativoCls : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PessoaDots({ item }: { item: { amountCarlos: number; amountJulia: number } }) {
  const pessoa = personOfAmounts(item);
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {(pessoa === "carlos" || pessoa === "carlos_e_julia") && (
        <span className="size-2 rounded-full" style={{ backgroundColor: COR_CARLOS }} />
      )}
      {(pessoa === "julia" || pessoa === "carlos_e_julia") && (
        <span className="size-2 rounded-full" style={{ backgroundColor: COR_JULIA }} />
      )}
    </span>
  );
}

function ChartTooltip({ active, payload, filtro }: { active?: boolean; payload?: { payload: ExpenseChartPoint }[]; filtro: PersonFilter }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{p.label}</p>
      {filtro === "todos" ? (
        <>
          <p className="font-bold text-gray-900">{formatBRL(p.total)}</p>
          <p style={{ color: COR_CARLOS }}>Carlos: {formatBRL(p.carlos)}</p>
          <p style={{ color: COR_JULIA }}>Julia: {formatBRL(p.julia)}</p>
        </>
      ) : (
        <p className="font-bold" style={{ color: filtro === "carlos" ? COR_CARLOS : COR_JULIA }}>
          {formatBRL(filtro === "carlos" ? p.carlos : p.julia)}
        </p>
      )}
    </div>
  );
}

export function GastoMensalClient({
  expenses,
  incomes,
  initialMonthKey,
  todayMonthKey,
}: {
  expenses: MonthlyBudgetExpense[];
  incomes: MonthlyBudgetIncome[];
  initialMonthKey: string;
  todayMonthKey: string;
}) {
  const router = useRouter();

  const [filtro, setFiltro] = useState<PersonFilter>("todos");
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [despesaForm, setDespesaForm] = useState<{ expense: MonthlyBudgetExpense | null } | null>(null);
  const [receitaForm, setReceitaForm] = useState<{ income: MonthlyBudgetIncome | null } | null>(null);
  const [excluirDespesaAlvo, setExcluirDespesaAlvo] = useState<MonthlyBudgetExpense | null>(null);
  const [excluirReceitaAlvo, setExcluirReceitaAlvo] = useState<MonthlyBudgetIncome | null>(null);
  const [apagandoDespesaId, setApagandoDespesaId] = useState<string | null>(null);
  const [apagandoReceitaId, setApagandoReceitaId] = useState<string | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 2500);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  const despesasDoMes = useMemo(() => itemsOfMonth(expenses, monthKey), [expenses, monthKey]);
  const receitasDoMes = useMemo(() => itemsOfMonth(incomes, monthKey), [incomes, monthKey]);

  const despesasFiltradas = useMemo(
    () => sortByVisibleAmountDesc(filterByPersonParticipation(despesasDoMes, filtro), filtro),
    [despesasDoMes, filtro],
  );
  const receitasFiltradas = useMemo(
    () => sortByVisibleAmountDesc(filterByPersonParticipation(receitasDoMes, filtro), filtro),
    [receitasDoMes, filtro],
  );

  const resultado = useMemo(() => resultadoPrevisto(incomes, expenses, monthKey, filtro), [incomes, expenses, monthKey, filtro]);
  const { pagas, pendentes } = useMemo(() => contarPagoPendente(expenses, monthKey, filtro), [expenses, monthKey, filtro]);
  const chartPoints = useMemo(() => buildExpenseChartPoints(expenses, todayMonthKey), [expenses, todayMonthKey]);

  const resultadoCls =
    resultado.status === "positivo" ? "bg-green-50 text-green-700 ring-green-100" :
    resultado.status === "negativo" ? "bg-red-50 text-red-700 ring-red-100" :
    "bg-gray-50 text-gray-700 ring-gray-100";
  const resultadoValorCls =
    resultado.status === "positivo" ? "text-green-700" :
    resultado.status === "negativo" ? "text-red-700" :
    "text-gray-700";

  function handleTogglePago(despesa: MonthlyBudgetExpense) {
    setAlternandoId(despesa.id);
    startTransition(async () => {
      await alternarPagoDespesa(despesa.id, !despesa.isPaid);
      setAlternandoId(null);
      setMensagemSucesso(despesa.isPaid ? "Despesa marcada como pendente." : "Despesa marcada como paga.");
      router.refresh();
    });
  }

  function handleApagarDespesa(despesa: MonthlyBudgetExpense) {
    setExcluirDespesaAlvo(despesa);
  }

  function executarExclusaoDespesa(despesa: MonthlyBudgetExpense, escopo: EscopoEdicao) {
    setExcluirDespesaAlvo(null);
    setApagandoDespesaId(despesa.id);
    startTransition(async () => {
      await apagarDespesa({ id: despesa.id, escopo });
      setApagandoDespesaId(null);
      setMensagemSucesso("Despesa excluída.");
      router.refresh();
    });
  }

  function handleApagarReceita(income: MonthlyBudgetIncome) {
    setExcluirReceitaAlvo(income);
  }

  function executarExclusaoReceita(income: MonthlyBudgetIncome, escopo: EscopoEdicao) {
    setExcluirReceitaAlvo(null);
    setApagandoReceitaId(income.id);
    startTransition(async () => {
      await apagarReceita({ id: income.id, escopo });
      setApagandoReceitaId(null);
      setMensagemSucesso("Receita excluída.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Feedback de sucesso ── */}
      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 className="size-4 shrink-0" /> {mensagemSucesso}
        </div>
      )}

      {/* ── Filtro de pessoa + seletor de mês ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltroPessoa value={filtro} onChange={setFiltro} />
        <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMonthKey((mk) => addMonthsToKey(mk, -1))}
            className="rounded-xl p-1.5 text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-28 px-2 text-center text-sm font-semibold text-gray-800">{monthLabelLong(monthKey)}</span>
          <button
            type="button"
            onClick={() => setMonthKey((mk) => addMonthsToKey(mk, 1))}
            className="rounded-xl p-1.5 text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <Wallet className="size-4" />
            <p className="text-xs font-medium">Receitas previstas</p>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatBRL(resultado.receitas)}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex items-center gap-1.5 text-orange-600">
            <TrendingDown className="size-4" />
            <p className="text-xs font-medium">Despesas previstas</p>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatBRL(resultado.despesas)}</p>
        </div>

        <div className={`rounded-2xl p-4 ring-1 ${resultadoCls}`}>
          <div className="flex items-center gap-1.5">
            <Scale className="size-4" />
            <p className="text-xs font-medium">Resultado previsto</p>
          </div>
          <p className={`mt-2 text-xl font-bold ${resultadoValorCls}`}>{formatBRL(resultado.resultado)}</p>
        </div>
      </div>

      {/* ── Ações ── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDespesaForm({ expense: null })}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <ListPlus className="size-4" /> Nova despesa
        </button>
        <button
          type="button"
          onClick={() => setReceitaForm({ income: null })}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="size-4" /> Adicionar receita
        </button>
        <Link
          href="/admin/gasto-mensal/extrato"
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ReceiptText className="size-4" /> Extrato
        </Link>
      </div>

      {/* ── Checklist de despesas ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Despesas — {monthLabelLong(monthKey)}
          </h2>
          <p className="text-xs text-gray-400">
            <span className="font-medium text-emerald-600">{pagas} pagas</span> · <span className="font-medium text-orange-600">{pendentes} pendentes</span>
          </p>
        </div>

        {despesasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
            <Inbox className="size-8 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhuma despesa cadastrada para esse mês.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {despesasFiltradas.map((d) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${d.isPaid ? "opacity-60" : ""}`}>
                <button
                  type="button"
                  onClick={() => handleTogglePago(d)}
                  disabled={alternandoId === d.id}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    d.isPaid ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 text-transparent hover:border-blue-400"
                  }`}
                  title={d.isPaid ? "Desfazer pagamento" : "Marcar como paga"}
                  aria-label={d.isPaid ? "Marcar como pendente" : "Marcar como paga"}
                >
                  {alternandoId === d.id ? <Loader2 className="size-3.5 animate-spin text-gray-400" /> : <CheckCircle2 className="size-4" />}
                </button>

                <PessoaDots item={d} />

                <div className="min-w-0 flex-1 basis-32">
                  <p className={`truncate text-sm font-medium text-gray-900 ${d.isPaid ? "line-through" : ""}`}>{d.name}</p>
                  <p className="text-xs text-gray-400">
                    {d.isPaid ? "Pago" : "Pendente"}
                    {d.dueDate && ` · Vence ${formatDateBR(d.dueDate)}`}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-semibold text-gray-900">{formatBRL(amountForFilter(d, filtro))}</span>

                <button
                  type="button"
                  onClick={() => setDespesaForm({ expense: d })}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-600"
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApagarDespesa(d)}
                  disabled={apagandoDespesaId === d.id}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  title="Excluir"
                >
                  {apagandoDespesaId === d.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Receitas previstas (compacto) ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Receitas — {monthLabelLong(monthKey)}
        </h2>

        {receitasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-black/5">
            <Inbox className="size-6 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhuma receita cadastrada para esse mês.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {receitasFiltradas.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <PessoaDots item={r} />
                <p className="min-w-0 flex-1 basis-32 truncate text-sm font-medium text-gray-900">{r.name}</p>
                <span className="shrink-0 text-sm font-semibold text-emerald-600">{formatBRL(amountForFilter(r, filtro))}</span>
                <button
                  type="button"
                  onClick={() => setReceitaForm({ income: r })}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-600"
                  title="Editar"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApagarReceita(r)}
                  disabled={apagandoReceitaId === r.id}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  title="Excluir"
                >
                  {apagandoReceitaId === r.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Gráfico: mês atual + 3 anteriores ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Despesas planejadas — últimos 4 meses
        </h2>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartPoints} barSize={28} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<ChartTooltip filtro={filtro} />} cursor={{ fill: "#f3f4f6" }} />
              {filtro === "todos" && (
                <>
                  <Bar dataKey="carlos" stackId="a" fill={COR_CARLOS} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="julia" stackId="a" fill={COR_JULIA} radius={[4, 4, 0, 0]} />
                </>
              )}
              {filtro === "carlos" && <Bar dataKey="carlos" fill={COR_CARLOS} radius={[4, 4, 0, 0]} />}
              {filtro === "julia" && <Bar dataKey="julia" fill={COR_JULIA} radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-gray-400">
            Todas as despesas planejadas do mês, pagas ou pendentes.
          </p>
        </div>
      </section>

      {despesaForm && (
        <DespesaForm
          monthKey={monthKey}
          expense={despesaForm.expense}
          groupStartMonthKey={despesaForm.expense ? groupMonthBounds(expenses, despesaForm.expense).start : undefined}
          groupEndMonthKey={despesaForm.expense ? groupMonthBounds(expenses, despesaForm.expense).end : undefined}
          onClose={() => setDespesaForm(null)}
          onSaved={() => setMensagemSucesso(despesaForm.expense ? "Despesa atualizada." : "Despesa criada.")}
        />
      )}

      {receitaForm && (
        <ReceitaForm
          monthKey={monthKey}
          income={receitaForm.income}
          groupStartMonthKey={receitaForm.income ? groupMonthBounds(incomes, receitaForm.income).start : undefined}
          groupEndMonthKey={receitaForm.income ? groupMonthBounds(incomes, receitaForm.income).end : undefined}
          onClose={() => setReceitaForm(null)}
          onSaved={() => setMensagemSucesso(receitaForm.income ? "Receita atualizada." : "Receita criada.")}
        />
      )}

      {excluirDespesaAlvo && (
        fazParteDeGrupo(expenses, excluirDespesaAlvo) ? (
          <ExcluirEscopoDialog
            nome={excluirDespesaAlvo.name}
            onConfirm={(escopo) => executarExclusaoDespesa(excluirDespesaAlvo, escopo)}
            onCancel={() => setExcluirDespesaAlvo(null)}
          />
        ) : (
          <ConfirmarExclusaoDialog
            titulo="Excluir despesa?"
            mensagem={`Excluir a despesa "${excluirDespesaAlvo.name}"? Essa ação não pode ser desfeita.`}
            onConfirm={() => executarExclusaoDespesa(excluirDespesaAlvo, "esta")}
            onCancel={() => setExcluirDespesaAlvo(null)}
          />
        )
      )}

      {excluirReceitaAlvo && (
        fazParteDeGrupo(incomes, excluirReceitaAlvo) ? (
          <ExcluirEscopoDialog
            nome={excluirReceitaAlvo.name}
            onConfirm={(escopo) => executarExclusaoReceita(excluirReceitaAlvo, escopo)}
            onCancel={() => setExcluirReceitaAlvo(null)}
          />
        ) : (
          <ConfirmarExclusaoDialog
            titulo="Excluir receita?"
            mensagem={`Excluir a receita "${excluirReceitaAlvo.name}"? Essa ação não pode ser desfeita.`}
            onConfirm={() => executarExclusaoReceita(excluirReceitaAlvo, "esta")}
            onCancel={() => setExcluirReceitaAlvo(null)}
          />
        )
      )}
    </div>
  );
}
