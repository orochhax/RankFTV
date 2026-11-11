import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { loadChampionshipFinancialCockpitData } from "@/lib/financial-data-loader";
import {
  CentralFinanceiraClient,
  type FinancialCockpitTab,
} from "@/components/painel/CentralFinanceiraClient";

export type { DiaVenda } from "@/lib/financial-data-loader";

const VALID_TABS = new Set<FinancialCockpitTab>([
  "visao",
  "carteira",
  "despesas",
  "relatorios",
  "taxas",
]);

function resolveFinancialTab(raw?: string): FinancialCockpitTab {
  if (raw && VALID_TABS.has(raw as FinancialCockpitTab)) {
    return raw as FinancialCockpitTab;
  }
  return "visao";
}

export default async function FinanceiroCampeonatoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/painel/campeonatos/${id}/financeiro`);

  const camp = await getDbChampionshipById(id);
  if (!camp || camp.organizadorId !== user.id) notFound();

  const data = await loadChampionshipFinancialCockpitData(camp, user.id, supabase);

  return (
    <PageContainer width="wide" className="py-8">
      <CentralFinanceiraClient {...data} initialTab={resolveFinancialTab(tab)} />
    </PageContainer>
  );
}
