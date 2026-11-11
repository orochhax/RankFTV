import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { DreResultadoCard } from "@/components/painel/DreResultadoCard";
import { DespesasManager } from "@/components/painel/DespesasManager";
import {
  computeDreAndCoverageFromWallet,
  type ChampionshipExpense,
  type ChampionshipExpenseStatus,
} from "@/lib/championship-expenses";
import {
  calculateOrganizerWithdrawalLimits,
  computeWithdrawableCashNow,
  resolveWalletAccountingTotals,
  type WalletSnapshotNumbers,
} from "@/lib/organizer-payout-rules";

export default async function DespesasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const champId = camp.id;
  const publicSlug = camp.slug ?? champId;

  // Busca despesas, métricas de vendas, datas e carteira em paralelo
  const [expensesRes, financialMetricsRes, walletRes, spectatorRes, champDatesRes] = await Promise.all([
    supabase
      .from("championship_expenses")
      .select("*")
      .eq("championship_id", champId)
      .order("status", { ascending: true })
      .order("data_vencimento", { ascending: true }),
    supabase.rpc("organizer_championship_financial_metrics", { p_championship_id: champId }),
    supabase.rpc("organizer_wallet_snapshot", { p_championship_id: champId }),
    supabase
      .from("spectator_tickets")
      .select("valor")
      .eq("championship_id", champId)
      .eq("status_pagamento", "pago"),
    supabase.from("championships").select("data_fim").eq("id", champId).maybeSingle(),
  ]);

  const rawExpenses = (expensesRes.data ?? []) as Array<Record<string, unknown>>;
  const expenses: ChampionshipExpense[] = rawExpenses.map((row) => ({
    id: String(row.id),
    championshipId: String(row.championship_id),
    organizadorId: String(row.organizador_id),
    categoria: String(row.categoria),
    nome: String(row.nome),
    valor: Number(row.valor),
    status: row.status as ChampionshipExpenseStatus,
    dataVencimento: String(row.data_vencimento).slice(0, 10),
    dataPagamento: row.data_pagamento ? String(row.data_pagamento) : null,
    observacao: row.observacao ? String(row.observacao) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const metrics = (financialMetricsRes.data ?? {}) as {
    statuses?: Array<{ status: string; count: number; total: number }>;
  };
  const paidMetric = metrics.statuses?.find((item) => item.status === "pago");
  const totalInscricoesBruto = Number(paidMetric?.total ?? 0);
  const totalPlateiaBruto = (spectatorRes.data ?? []).reduce(
    (acc, t) => acc + Number(t.valor || 0),
    0,
  );

  const hasWalletSnapshot = !walletRes.error && walletRes.data && typeof walletRes.data === "object";
  const walletTotals = resolveWalletAccountingTotals(
    (walletRes.data ?? {}) as WalletSnapshotNumbers,
  );
  const payoutLimits = calculateOrganizerWithdrawalLimits({
    totalNet: walletTotals.lifetimeTotalNet,
    alreadyWithdrawn: walletTotals.totalCommitted,
    dataFim: champDatesRes.data?.data_fim,
  });
  const saldoSacavelAgora = computeWithdrawableCashNow({
    available: walletTotals.available,
    maxWithdrawableNow: payoutLimits.maxWithdrawableNow,
  });

  const { dre, coverage } = computeDreAndCoverageFromWallet({
    totalInscricoesBruto,
    totalPlateiaBruto,
    lifetimeReceitaLiquida: hasWalletSnapshot ? walletTotals.lifetimeTotalNet : null,
    saldoSacavelAgora,
    expenses,
  });

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Despesas & DRE do Campeonato"
        description="Controle os custos do seu evento, consulte o lucro real no seu bolso e acompanhe o vencimento de fornecedores."
      />

      {/* Relatório Consolidado de Resultado (DRE) */}
      <DreResultadoCard
        dre={dre}
        coverage={coverage}
        champSlugOrId={publicSlug}
        showLinkToExpenses={false}
      />

      {/* Gerenciador Interativo de Despesas */}
      <DespesasManager
        champId={champId}
        champSlugOrId={publicSlug}
        initialExpenses={expenses}
      />
    </PageContainer>
  );
}
