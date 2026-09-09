import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GastoMensalClient } from "@/components/admin/gasto-mensal/GastoMensalClient";
import {
  dbDateToMonthKey, defaultMonthKey, hojeISOBahia,
  type MonthlyBudgetExpense, type MonthlyBudgetIncome, type MonthlyBudgetCategory,
  type SavingsJar, type SavingsMovement, type SavingsRepayment, type SavingsWithdrawal,
} from "@/lib/monthly-budget";

export const metadata = { title: "Gasto mensal — Admin" };

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
  category_id: string | null;
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
  category_id: string | null;
};

export default async function GastoMensalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");
  const todayDateKey = hojeISOBahia();

  const [
    { data: expensesData, error: expensesError },
    { data: incomesData, error: incomesError },
    { data: categoriesData },
    { data: jarsData },
    { data: movementsData },
    { data: withdrawalsData },
    { data: repaymentsData },
  ] = await Promise.all([
    supabase
      .from("monthly_budget_expenses")
      .select("id, month_key, name, amount_carlos, amount_julia, is_paid, paid_at, due_date, repeat_group_id, category_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("month_key", { ascending: false }),
    supabase
      .from("monthly_budget_incomes")
      .select("id, month_key, name, amount_carlos, amount_julia, repeat_group_id, category_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("month_key", { ascending: false }),
    supabase.from("monthly_budget_categories").select("id, name, active, created_at, updated_at")
      .eq("user_id", user.id).eq("active", true).order("name"),
    supabase.from("monthly_budget_savings_jars")
      .select("id, name, institution, note, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("monthly_budget_savings_movements")
      .select("id, jar_id, movement_type, amount_delta, movement_date, note, withdrawal_id, repayment_id, created_at")
      .eq("user_id", user.id).order("movement_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("monthly_budget_savings_withdrawals")
      .select("id, jar_id, jar_name, purpose, amount, withdrawn_on, note, created_at")
      .eq("user_id", user.id).order("withdrawn_on", { ascending: false }),
    supabase.from("monthly_budget_savings_repayments")
      .select("id, withdrawal_id, amount, repaid_on, note, created_at")
      .eq("user_id", user.id).order("repaid_on", { ascending: false }),
  ]);

  // Compatibilidade durante a aplicação da migração de categorias: nunca
  // transforma uma falha da nova coluna em uma tela vazia.
  const expensesFallback = expensesError
    ? (await supabase.from("monthly_budget_expenses")
      .select("id, month_key, name, amount_carlos, amount_julia, is_paid, paid_at, due_date, repeat_group_id, created_at, updated_at")
      .eq("user_id", user.id).order("month_key", { ascending: false })).data
    : expensesData;
  const incomesFallback = incomesError
    ? (await supabase.from("monthly_budget_incomes")
      .select("id, month_key, name, amount_carlos, amount_julia, repeat_group_id, created_at, updated_at")
      .eq("user_id", user.id).order("month_key", { ascending: false })).data
    : incomesData;

  const expenseRows = (expensesFallback ?? []) as ExpenseRow[];
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
    categoryId: r.category_id,
  }));

  const incomeRows = (incomesFallback ?? []) as IncomeRow[];
  const incomes: MonthlyBudgetIncome[] = incomeRows.map((r) => ({
    id: r.id,
    monthKey: dbDateToMonthKey(r.month_key),
    name: r.name,
    amountCarlos: Number(r.amount_carlos),
    amountJulia: Number(r.amount_julia),
    repeatGroupId: r.repeat_group_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    categoryId: r.category_id,
  }));
  const categories: MonthlyBudgetCategory[] = (categoriesData ?? []).map((r) => ({
    id: r.id, name: r.name, active: r.active, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  const movements = (movementsData ?? []).map((r): SavingsMovement => ({
    id: r.id, jarId: r.jar_id, type: r.movement_type as SavingsMovement["type"],
    amountDelta: Number(r.amount_delta), movementDate: r.movement_date, note: r.note,
    withdrawalId: r.withdrawal_id, repaymentId: r.repayment_id, createdAt: r.created_at,
  }));
  const movementsByJar = new Map<string, SavingsMovement[]>();
  for (const movement of movements) {
    const group = movementsByJar.get(movement.jarId) ?? [];
    group.push(movement);
    movementsByJar.set(movement.jarId, group);
  }
  const savingsJars: SavingsJar[] = (jarsData ?? []).map((r) => ({
    id: r.id, name: r.name, institution: r.institution, note: r.note, createdAt: r.created_at,
    movements: movementsByJar.get(r.id) ?? [],
  }));
  const repayments = (repaymentsData ?? []).map((r): SavingsRepayment => ({
    id: r.id, withdrawalId: r.withdrawal_id, amount: Number(r.amount), repaidOn: r.repaid_on,
    note: r.note, createdAt: r.created_at,
  }));
  const repaymentsByWithdrawal = new Map<string, SavingsRepayment[]>();
  for (const repayment of repayments) {
    const group = repaymentsByWithdrawal.get(repayment.withdrawalId) ?? [];
    group.push(repayment);
    repaymentsByWithdrawal.set(repayment.withdrawalId, group);
  }
  const withdrawals: SavingsWithdrawal[] = (withdrawalsData ?? []).map((r) => ({
    id: r.id, jarId: r.jar_id, jarName: r.jar_name, purpose: r.purpose, amount: Number(r.amount),
    withdrawnOn: r.withdrawn_on, note: r.note, createdAt: r.created_at,
    repayments: repaymentsByWithdrawal.get(r.id) ?? [],
  }));

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="w-full space-y-4">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> Admin
          </Link>
          <div className="flex items-center gap-2">
            <CalendarRange className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Gasto mensal</h1>
          </div>
          <p className="text-sm text-white/40">
            Planejamento financeiro mensal de Carlos e Julia — isolado dos Gastos pessoais e do RankFTV.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="w-full">
          <GastoMensalClient
            expenses={expenses}
            incomes={incomes}
            initialMonthKey={defaultMonthKey()}
            todayMonthKey={todayDateKey.slice(0, 7)}
            todayDateKey={todayDateKey}
            categories={categories}
            savingsWithdrawals={withdrawals}
            savingsJars={savingsJars}
          />
        </div>
      </div>
    </div>
  );
}
