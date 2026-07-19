import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExtratoClient } from "@/components/admin/gasto-mensal/ExtratoClient";
import {
  dbDateToMonthKey, mapHistoryEventRow, sortHistoryByOccurredAtDesc,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome, type HistoryEventRow,
} from "@/lib/monthly-budget";

export const metadata = { title: "Extrato — Gasto mensal — Admin" };

type ExpenseRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  is_paid: boolean;
  paid_at: string | null;
  due_date: string | null;
  repeat_group_id: string | null;
  created_at: string;
  updated_at: string;
};

type IncomeRow = {
  id: string;
  month_key: string;
  name: string;
  amount_carlos: number | string;
  amount_julia: number | string;
  repeat_group_id: string | null;
  created_at: string;
  updated_at: string;
};

// O Extrato é uma timeline de EVENTOS (monthly_budget_history_events) — não
// uma listagem de cada ocorrência mensal de monthly_budget_expenses/incomes.
// Ainda assim busca os registros "ao vivo" das duas tabelas, porque:
//  1. precisa saber se um lançamento ainda existe (pra mostrar "Editar/
//     Excluir lançamento atual" só quando fizer sentido);
//  2. editar/excluir pelo Extrato reaproveita DespesaForm/ReceitaForm, que
//     esperam um MonthlyBudgetExpense/Income completo, não um snapshot.
export default async function ExtratoGastoMensalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const [{ data: eventsData }, { data: expensesData }, { data: incomesData }] = await Promise.all([
    supabase
      .from("monthly_budget_history_events")
      .select("id, entity_kind, action, entity_group_id, anchor_entry_id, anchor_month_key, edit_scope, previous_event_id, occurred_at, before_snapshot, after_snapshot, affected_months, metadata")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("monthly_budget_expenses")
      .select("id, month_key, name, amount_carlos, amount_julia, is_paid, paid_at, due_date, repeat_group_id, created_at, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("monthly_budget_incomes")
      .select("id, month_key, name, amount_carlos, amount_julia, repeat_group_id, created_at, updated_at")
      .eq("user_id", user.id),
  ]);

  const events = sortHistoryByOccurredAtDesc(
    ((eventsData ?? []) as HistoryEventRow[]).map(mapHistoryEventRow),
  );

  const expenseRows = (expensesData ?? []) as ExpenseRow[];
  const expenses: MonthlyBudgetExpense[] = expenseRows.map((r) => ({
    id: r.id,
    monthKey: dbDateToMonthKey(r.month_key),
    name: r.name,
    amountCarlos: Number(r.amount_carlos),
    amountJulia: Number(r.amount_julia),
    isPaid: r.is_paid,
    paidAt: r.paid_at,
    dueDate: r.due_date,
    repeatGroupId: r.repeat_group_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const incomeRows = (incomesData ?? []) as IncomeRow[];
  const incomes: MonthlyBudgetIncome[] = incomeRows.map((r) => ({
    id: r.id,
    monthKey: dbDateToMonthKey(r.month_key),
    name: r.name,
    amountCarlos: Number(r.amount_carlos),
    amountJulia: Number(r.amount_julia),
    repeatGroupId: r.repeat_group_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto — mesmo padrão visual da página Gasto mensal ── */}
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href="/admin/gasto-mensal" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> Gasto mensal
          </Link>
          <div className="flex items-center gap-2">
            <ReceiptText className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Extrato</h1>
          </div>
          <p className="text-sm text-white/40">
            Histórico de ações — cada linha é um cadastro, edição, exclusão ou mudança de pagamento, não uma ocorrência mensal.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl">
          <ExtratoClient events={events} expenses={expenses} incomes={incomes} />
        </div>
      </div>
    </div>
  );
}
