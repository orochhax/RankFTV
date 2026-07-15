import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GastosDashboardClient } from "@/components/admin/gastos/GastosDashboardClient";
import { fetchCdiAnual } from "@/lib/bcb-cdi";
import type { InvestmentSettings } from "@/lib/personal-finance-investments";
import {
  SEM_CATEGORIA,
  type PersonalFinanceEntry, type RecurringOverride, type PersonalFinanceCategory,
  type InvestmentYieldMode, type RecurrenceDayMode,
} from "@/lib/personal-finance";

export const metadata = { title: "Gastos pessoais — Admin" };

type EntryRow = {
  id: string;
  person: "carlos" | "julia";
  name: string;
  category: string;
  entry_date: string;
  amount: number | string;
  type: "gasto" | "renda" | "investimento";
  bank: "inter" | "c6" | "mercado_pago" | "nubank" | "vale";
  payment_method: "credito" | "debito" | "pix";
  is_installment: boolean;
  installment_group_id: string | null;
  installment_number: number;
  installment_total: number;
  is_recurring: boolean;
  recurrence_day_mode: RecurrenceDayMode | null;
  recurrence_day: number | null;
  investment_yield_mode: InvestmentYieldMode | null;
  investment_cdi_percent: number | string | null;
  shared_entry_group_id: string | null;
};

type OverrideRow = {
  id: string;
  recurring_entry_id: string;
  month_key: string;
  name: string | null;
  category: string | null;
  entry_date: string | null;
  amount: number | string | null;
  type: "gasto" | "renda" | "investimento" | null;
  bank: "inter" | "c6" | "mercado_pago" | "nubank" | "vale" | null;
  payment_method: "credito" | "debito" | "pix" | null;
  person: "carlos" | "julia" | null;
  recurrence_day_mode: RecurrenceDayMode | null;
  recurrence_day: number | null;
  investment_yield_mode: InvestmentYieldMode | null;
  investment_cdi_percent: number | string | null;
  deleted: boolean;
};

type SettingsRow = {
  mercado_pago_bonus_cdi_percent: number | string;
  mercado_pago_bonus_limit: number | string;
  mercado_pago_excess_cdi_percent: number | string;
  last_cdi_annual: number | string | null;
  last_cdi_reference_date: string | null;
};

export default async function GastosPessoaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  // Garante que "Sem categoria" sempre exista (idempotente).
  await supabase
    .from("personal_finance_categories")
    .upsert({ user_id: user.id, name: SEM_CATEGORIA, active: true }, { onConflict: "user_id,name" });

  // Garante que a linha de configuração de investimento exista, com os
  // valores padrão pedidos (120% até R$10k, 100% acima) — só cria se ainda
  // não existir; nunca sobrescreve o que o usuário já configurou.
  await supabase
    .from("personal_finance_investment_settings")
    .upsert(
      { user_id: user.id, mercado_pago_bonus_cdi_percent: 120, mercado_pago_bonus_limit: 10000, mercado_pago_excess_cdi_percent: 100 },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  // Busca a taxa CDI mais recente no Banco Central (cache de 24h) e atualiza
  // a configuração só se vier uma referência nova. Se a API falhar, segue
  // com o que já está salvo (fallback) — nunca quebra a página.
  const [{ data: settingsRow }, cdiFresco] = await Promise.all([
    supabase
      .from("personal_finance_investment_settings")
      .select("mercado_pago_bonus_cdi_percent, mercado_pago_bonus_limit, mercado_pago_excess_cdi_percent, last_cdi_annual, last_cdi_reference_date")
      .eq("user_id", user.id)
      .maybeSingle<SettingsRow>(),
    fetchCdiAnual(),
  ]);

  let lastCdiAnnual = settingsRow?.last_cdi_annual != null ? Number(settingsRow.last_cdi_annual) : null;
  let lastCdiReferenceDate = settingsRow?.last_cdi_reference_date ?? null;

  if (cdiFresco && cdiFresco.referenceDate !== lastCdiReferenceDate) {
    lastCdiAnnual = cdiFresco.annual;
    lastCdiReferenceDate = cdiFresco.referenceDate;
    await supabase
      .from("personal_finance_investment_settings")
      .update({ last_cdi_annual: cdiFresco.annual, last_cdi_reference_date: cdiFresco.referenceDate, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  const investmentSettings: InvestmentSettings = {
    mercadoPagoBonusCdiPercent: settingsRow ? Number(settingsRow.mercado_pago_bonus_cdi_percent) : 120,
    mercadoPagoBonusLimit: settingsRow ? Number(settingsRow.mercado_pago_bonus_limit) : 10000,
    mercadoPagoExcessCdiPercent: settingsRow ? Number(settingsRow.mercado_pago_excess_cdi_percent) : 100,
    lastCdiAnnual,
    lastCdiReferenceDate,
  };

  const [{ data: entriesData }, { data: overridesData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("personal_finance_entries")
      .select(
        "id, person, name, category, entry_date, amount, type, bank, payment_method, is_installment, installment_group_id, installment_number, installment_total, is_recurring, recurrence_day_mode, recurrence_day, investment_yield_mode, investment_cdi_percent, shared_entry_group_id",
      )
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false }),
    supabase
      .from("personal_finance_recurring_overrides")
      .select("id, recurring_entry_id, month_key, name, category, entry_date, amount, type, bank, payment_method, person, recurrence_day_mode, recurrence_day, investment_yield_mode, investment_cdi_percent, deleted")
      .eq("user_id", user.id),
    supabase
      .from("personal_finance_categories")
      .select("id, name, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name"),
  ]);

  const rows = (entriesData ?? []) as EntryRow[];
  const entries: PersonalFinanceEntry[] = rows.map((r) => ({
    id:                 r.id,
    person:             r.person,
    name:               r.name,
    category:           r.category,
    entryDate:          r.entry_date,
    amount:             Number(r.amount),
    type:               r.type,
    bank:               r.bank,
    paymentMethod:      r.payment_method,
    isInstallment:      r.is_installment,
    installmentGroupId: r.installment_group_id,
    installmentNumber:  r.installment_number,
    installmentTotal:   r.installment_total,
    isRecurring:        r.is_recurring,
    recurrenceDayMode:  r.recurrence_day_mode,
    recurrenceDay:      r.recurrence_day,
    investmentYieldMode:  r.investment_yield_mode,
    investmentCdiPercent: r.investment_cdi_percent == null ? null : Number(r.investment_cdi_percent),
    sharedEntryGroupId: r.shared_entry_group_id,
  }));

  const overrideRows = (overridesData ?? []) as OverrideRow[];
  const overrides: RecurringOverride[] = overrideRows.map((o) => ({
    id:                 o.id,
    recurringEntryId:   o.recurring_entry_id,
    monthKey:           o.month_key,
    name:               o.name,
    category:           o.category,
    entryDate:          o.entry_date,
    amount:             o.amount == null ? null : Number(o.amount),
    type:               o.type,
    bank:               o.bank,
    paymentMethod:      o.payment_method,
    person:             o.person,
    recurrenceDayMode:  o.recurrence_day_mode,
    recurrenceDay:      o.recurrence_day,
    investmentYieldMode:  o.investment_yield_mode,
    investmentCdiPercent: o.investment_cdi_percent == null ? null : Number(o.investment_cdi_percent),
    deleted:            o.deleted,
  }));

  const categories: PersonalFinanceCategory[] = (categoriesData ?? []) as PersonalFinanceCategory[];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> Admin
          </Link>
          <div className="flex items-center gap-2">
            <WalletCards className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Gastos pessoais</h1>
          </div>
          <p className="text-sm text-white/40">
            Controle financeiro pessoal — não entra em nenhum relatório do RankFTV.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <GastosDashboardClient
            entries={entries}
            overrides={overrides}
            categories={categories}
            investmentSettings={investmentSettings}
          />
        </div>
      </div>
    </div>
  );
}
