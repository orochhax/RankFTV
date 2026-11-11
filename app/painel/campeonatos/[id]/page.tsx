import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  ListPlus,
  MapPin,
  ReceiptText,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { isUuid } from "@/lib/championship-slug";
import { isExpenseDueSoon, isExpenseOverdue, type ChampionshipExpense } from "@/lib/championship-expenses";
import { TierTag } from "@/components/ui/TierTag";
import { formatBRL, formatDateRangeBR } from "@/lib/format";
import { VagasProgressBar } from "@/components/painel/VagasProgressBar";
import { ReceitaConfirmadaCard } from "@/components/painel/ReceitaConfirmadaCard";
import {
  ChampionshipActions,
  type ActionBadge,
} from "@/components/painel/ChampionshipActions";
import { PageContainer } from "@/components/shell/PageContainer";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { StatCard } from "@/components/shell/StatCard";
import { Surface } from "@/components/shell/Surface";
import type { QuizAnswers } from "@/lib/tier";

export default async function PainelCampeonatoPage({
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
  const champId = camp.id;
  const publicSlug = camp.slug ?? champId;

  // Redireciona UUID para slug amigável (ex.: /painel/campeonatos/circuito-rankftv-open-pro-2026)
  if (isUuid(id) && publicSlug !== id) {
    redirect(`/painel/campeonatos/${publicSlug}`);
  }

  // Só o organizador dono pode acessar o painel desse camp.
  if (camp.organizadorId !== user.id) notFound();

  // Rascunho ainda não tem painel de gestão — manda pro fluxo de publicação.
  if (camp.status === "rascunho") redirect(`/painel/campeonatos/${champId}/criado`);

  const [
    tierRes,
    financialMetricsRes,
    orgAccountRes,
    spectatorRes,
    spectatorTypesRes,
    waitlistCountRes,
    staffCountRes,
    expensesRes,
  ] = await Promise.all([
    supabase.from("championships").select("tier_quiz, is_elite").eq("id", champId).maybeSingle(),
    supabase.rpc("organizer_championship_financial_metrics", { p_championship_id: champId }),
    supabase
      .from("organizer_accounts")
      .select("chave_pix, status_verificacao, motivo_rejeicao")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("spectator_tickets")
      .select("valor, quantidade")
      .eq("championship_id", champId)
      .eq("status_pagamento", "pago"),
    supabase
      .from("spectator_ticket_types")
      .select("id, max_quantidade, vendidos, ativo")
      .eq("championship_id", champId),
    supabase
      .from("championship_category_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("championship_id", champId)
      .eq("status", "waiting"),
    supabase
      .from("championship_staff")
      .select("id", { count: "exact", head: true })
      .eq("championship_id", champId)
      .in("status", ["aceito", "pendente"]),
    supabase
      .from("championship_expenses")
      .select("id, status, data_vencimento, valor")
      .eq("championship_id", champId)
      .eq("status", "pendente"),
  ]);

  const tierQuiz = (tierRes.data?.tier_quiz ?? null) as Partial<QuizAnswers> | null;
  const isElite = !!tierRes.data?.is_elite;
  const financialMetrics = (financialMetricsRes.data ?? {}) as {
    statuses?: Array<{ status: string; count: number; total: number }>;
    categories?: Array<{
      id?: string;
      category_id?: string;
      name: string;
      gender: string | null;
      count: number;
      total: number;
    }>;
  };
  const paidMetric = financialMetrics.statuses?.find((item) => item.status === "pago");
  const duplasPagas = Number(paidMetric?.count ?? 0);
  const totalArrecadado = Number(paidMetric?.total ?? 0);
  const totalPlateia = (spectatorRes.data ?? []).reduce((acc, t) => acc + Number(t.valor || 0), 0);
  const totalGeralConfirmado = totalArrecadado + totalPlateia;
  const temChavePix = !!orgAccountRes.data?.chave_pix;
  const temCategoriaPaga = camp.categorias.some((c) => (c.valorInscricao ?? 0) > 0);

  const ticketTypes = spectatorTypesRes.data ?? [];
  const temPlateia = ticketTypes.length > 0;
  const ingressosVendidos = (spectatorRes.data ?? []).reduce(
    (acc, t) => acc + (Number(t.quantidade) || 1),
    0,
  );
  const capacidadePlateia = ticketTypes.reduce(
    (acc, t) => acc + (t.max_quantidade ?? 0),
    0,
  );
  const plateiaValue =
    capacidadePlateia > 0
      ? `${ingressosVendidos} / ${capacidadePlateia}`
      : `${ingressosVendidos} vendidos`;
  const plateiaHint =
    capacidadePlateia > 0
      ? `${Math.round((ingressosVendidos / capacidadePlateia) * 100)}% da capacidade`
      : undefined;

  const categoryCounts = Object.fromEntries(
    (financialMetrics.categories ?? []).map((c) => [c.id ?? c.category_id ?? "", Number(c.count)]),
  );

  const vagasTotais = camp.categorias.reduce((acc, c) => acc + (c.maxDuplas ?? 0), 0);
  const totalPotencial = camp.categorias.reduce(
    (acc, c) => acc + (c.maxDuplas ?? 0) * (c.valorInscricao ?? 0),
    0,
  );

  const waitlistWaiting = waitlistCountRes.count ?? 0;
  const staffCount = staffCountRes.count ?? 0;
  const pendingExpenses = (expensesRes.data ?? []).map((row) => ({
    id: String(row.id),
    championshipId: champId,
    organizadorId: user.id,
    categoria: "Geral",
    nome: "Despesa",
    valor: Number(row.valor ?? 0),
    status: "pendente" as const,
    dataVencimento: String(row.data_vencimento).slice(0, 10),
    dataPagamento: null,
    observacao: null,
    createdAt: "",
    updatedAt: "",
  })) satisfies ChampionshipExpense[];
  const pendingExpensesTotal = pendingExpenses.reduce((acc, e) => acc + e.valor, 0);
  const urgentExpensesCount = pendingExpenses.filter(
    (e) => isExpenseOverdue(e.dataVencimento) || isExpenseDueSoon(e.dataVencimento),
  ).length;

  const actionBadges: Partial<Record<string, ActionBadge>> = {
    financeiro: { text: "Central única", tone: "emerald" },
  };
  if (pendingExpenses.length > 0) {
    actionBadges.despesas = {
      text: `${pendingExpenses.length} a pagar`,
      tone: urgentExpensesCount > 0 ? "rose" : "amber",
    };
  }
  if (waitlistWaiting > 0) {
    actionBadges["lista-espera"] = {
      text: `${waitlistWaiting} na fila`,
      tone: "amber",
    };
  }
  if (staffCount > 0) {
    actionBadges.equipe = {
      text: `${staffCount} ativo${staffCount === 1 ? "" : "s"}`,
      tone: "slate",
    };
  }
  if (temPlateia && ingressosVendidos > 0) {
    actionBadges.plateia = {
      text: `${ingressosVendidos} vendidos`,
      tone: "blue",
    };
  }

  type RadarAlert = {
    key: string;
    title: string;
    detail: string;
    href: string;
    cta: string;
    tone: "rose" | "amber" | "blue" | "emerald";
  };
  const radarAlerts: RadarAlert[] = [];
  if (urgentExpensesCount > 0) {
    radarAlerts.push({
      key: "urgent-expenses",
      title: `${urgentExpensesCount} despesa${urgentExpensesCount === 1 ? "" : "s"} próxima${urgentExpensesCount === 1 ? "" : "s"} do vencimento`,
      detail: `Total pendente de ${formatBRL(pendingExpensesTotal)}. Confira os prazos para evitar atrasos.`,
      href: `/painel/campeonatos/${publicSlug}/despesas`,
      cta: "Abrir despesas",
      tone: "rose",
    });
  } else if (pendingExpenses.length > 0) {
    radarAlerts.push({
      key: "pending-expenses",
      title: `${pendingExpenses.length} conta${pendingExpenses.length === 1 ? "" : "s"} em aberto no torneio`,
      detail: `${formatBRL(pendingExpensesTotal)} lançados em Despesas & DRE.`,
      href: `/painel/campeonatos/${publicSlug}/despesas`,
      cta: "Ver DRE",
      tone: "amber",
    });
  }
  if (waitlistWaiting > 0) {
    radarAlerts.push({
      key: "waitlist",
      title: `${waitlistWaiting} atleta${waitlistWaiting === 1 ? "" : "s"} na lista de espera`,
      detail: "Há pessoas aguardando vaga aberta por ordem de chegada.",
      href: `/painel/campeonatos/${publicSlug}/lista-espera`,
      cta: "Gerenciar fila",
      tone: "blue",
    });
  }
  if (!temPlateia) {
    radarAlerts.push({
      key: "plateia",
      title: "Bilheteria de plateia desativada",
      detail: "Crie tipos de ingresso pagos ou gratuitos para liberar a portaria do público.",
      href: `/painel/campeonatos/${publicSlug}/plateia`,
      cta: "Configurar plateia",
      tone: "blue",
    });
  }

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      {/* Meta superior — localização, data, plano e tier */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <CalendarDays className="size-4 text-brand" />
            {formatDateRangeBR(camp.dataInicio, camp.dataFim)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-ink-muted" />
            {camp.cidade} — {camp.estado}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isElite ? "bg-amber-100 text-amber-800" : "bg-surface-2 text-ink-muted"
            }`}
          >
            {isElite && <Crown className="size-3.5" />}
            {isElite ? "Plano Elite" : "Plano Padrão"}
          </span>
          <TierTag quiz={tierQuiz} duplasPagas={duplasPagas} />
        </div>

        <Link
          href={`/painel/campeonatos/${publicSlug}/financeiro`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Sparkles className="size-3.5" />
          Central Financeira
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* KPIs Executivos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Duplas inscritas"
          value={vagasTotais > 0 ? `${duplasPagas} / ${vagasTotais}` : `${duplasPagas}`}
          hint={vagasTotais > 0 ? `${Math.round((duplasPagas / vagasTotais) * 100)}% das vagas` : undefined}
          icon={Users}
        />
        <StatCard
          label="Categorias"
          value={camp.categorias.length}
          hint={
            waitlistWaiting > 0
              ? `${waitlistWaiting} na lista de espera`
              : `${camp.categorias.filter((c) => (c.valorInscricao ?? 0) > 0).length} pagas`
          }
          icon={Trophy}
        />
        {temPlateia ? (
          <StatCard
            label="Ingressos de plateia"
            value={plateiaValue}
            hint={plateiaHint}
            icon={Armchair}
          />
        ) : (
          <Surface padding="md" className="border-border/60 bg-surface-2/40 opacity-80">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-ink-muted">Ingressos de plateia</p>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
                <Armchair className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink-muted">Indisponível</p>
            <p className="mt-0.5 text-xs text-ink-muted">Nenhum lote criado</p>
          </Surface>
        )}
        <ReceitaConfirmadaCard
          totalGeralConfirmado={totalGeralConfirmado}
          totalArrecadado={totalArrecadado}
          totalPlateia={totalPlateia}
        />
      </div>

      {/* Aviso: chave Pix ou verificação KYC pendente */}
      {temCategoriaPaga &&
        (orgAccountRes.data?.status_verificacao === "em_analise" ? (
          <div className="flex items-start gap-3 rounded-card-lg bg-brand-soft p-4 ring-1 ring-brand-border">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <Clock className="size-5 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Documentos em análise de segurança</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Seus dados e documentos estão sendo conferidos pela equipe da RankFTV. Assim que aprovados, você poderá publicar e receber os pagamentos normalmente.
              </p>
            </div>
          </div>
        ) : orgAccountRes.data?.status_verificacao === "rejeitado" ? (
          <Link
            href={`/perfil/ativar-organizador?champId=${id}`}
            className="flex items-start gap-3 rounded-card-lg bg-rose-50 p-4 ring-1 ring-rose-200 transition-colors hover:brightness-95"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <AlertTriangle className="size-5 text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-rose-900">Pendência nos documentos do organizador</p>
              <p className="mt-0.5 text-sm text-rose-800">
                {orgAccountRes.data?.motivo_rejeicao || "Por favor, reenvie seus documentos para liberar as vendas."}
              </p>
              <p className="mt-1 text-xs font-semibold text-rose-700">Reenviar documentos agora →</p>
            </div>
          </Link>
        ) : !temChavePix || orgAccountRes.data?.status_verificacao !== "aprovado" ? (
          <Link
            href={`/perfil/ativar-organizador?champId=${id}`}
            className="flex items-start gap-3 rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30 transition-colors hover:brightness-95"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
              <DollarSign className="size-5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Configure seu recebimento e envie seus documentos</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Este campeonato tem categorias pagas. Para receber o dinheiro e liberar as vendas, cadastre sua chave Pix e envie seus documentos de identificação.
              </p>
              <p className="mt-1 text-xs font-medium text-warning">Configurar recebimento agora →</p>
            </div>
          </Link>
        ) : null)}

      {/* Cockpit Principal: Módulos à esquerda + Pulso do Torneio à direita */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ChampionshipActions
            champId={publicSlug}
            temPlateia={temPlateia}
            badges={actionBadges}
          />
        </div>

        <div className="space-y-6 xl:col-span-5">
          {/* Ocupação por Categoria */}
          <section>
            <SectionHeader title="Pulso do torneio" />
            <p className="mt-1 text-xs text-ink-muted">
              Ocupação das categorias e ritmo de arrecadação
            </p>
            <Surface padding="md" className="mt-3 space-y-4">
              {(duplasPagas > 0 || vagasTotais > 0) && (
                <VagasProgressBar
                  duplasPagas={duplasPagas}
                  vagasTotais={vagasTotais}
                  totalArrecadado={totalArrecadado}
                  totalPotencial={totalPotencial}
                />
              )}

              <div className="divide-y divide-border rounded-xl border border-border/80">
                {camp.categorias.map((cat) => {
                  const catDuplas = categoryCounts[cat.id] ?? 0;
                  const cap = cat.maxDuplas ?? 0;
                  const pct = cap > 0 ? Math.min(100, Math.round((catDuplas / cap) * 100)) : 0;
                  return (
                    <div key={cat.id} className="space-y-1.5 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{cat.nome}</p>
                          <p className="text-xs capitalize text-ink-muted">{cat.genero}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-ink">{formatBRL(cat.valorInscricao)}</p>
                          {cap > 0 && (
                            <p className="text-[11px] font-medium text-ink-muted">
                              {catDuplas} / {cap} duplas ({pct}%)
                            </p>
                          )}
                        </div>
                      </div>
                      {cap > 0 && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90
                                ? "bg-success"
                                : pct >= 50
                                  ? "bg-brand"
                                  : "bg-brand/60"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Surface>
          </section>

          {/* Radar do Organizador */}
          <section>
            <SectionHeader title="Radar do organizador" />
            <p className="mt-1 text-xs text-ink-muted">
              Ações rápidas recomendadas para este momento
            </p>
            <Surface padding="md" className="mt-3 space-y-2.5">
              {radarAlerts.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-900">Operação 100% em dia</p>
                    <p className="mt-0.5 text-emerald-800">
                      Sem despesas vencendo, fila de espera vazia e bilheteria configurada.
                    </p>
                  </div>
                </div>
              ) : (
                radarAlerts.map((alert) => {
                  const Icon =
                    alert.key.includes("expense")
                      ? ReceiptText
                      : alert.key === "waitlist"
                        ? ListPlus
                        : Armchair;
                  const toneClasses =
                    alert.tone === "rose"
                      ? "border-rose-200 bg-rose-50/70 text-rose-900"
                      : alert.tone === "amber"
                        ? "border-amber-200 bg-amber-50/70 text-amber-900"
                        : "border-brand-border bg-brand-soft/60 text-ink";
                  return (
                    <Link
                      key={alert.key}
                      href={alert.href}
                      className={`group flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all hover:shadow-sm ${toneClasses}`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Icon className="mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0 text-xs">
                          <p className="font-bold">{alert.title}</p>
                          <p className="mt-0.5 opacity-85">{alert.detail}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-[11px] font-bold text-ink shadow-xs">
                        {alert.cta}
                        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })
              )}
            </Surface>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
