import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Plus,
  FileText,
  TrendingUp,
  Trophy,
  Users,
  Banknote,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { PainelLandingClient } from "@/components/painel/PainelLandingClient";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { ReceitaConsolidadaCard } from "@/components/painel/ReceitaConsolidadaCard";
import { DesktopSheetContourLight } from "@/components/shell/DesktopSheetContourLight";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtMedia(v: number) {
  return `~R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type OrganizerMetrics = Record<
  | "championshipTotal" | "championshipOpen" | "championshipRegistrationsOpen"
  | "championshipInProgress" | "championshipClosed" | "arenaCount"
  | "registrationPaidCount" | "registrationPaidValue" | "registrationPendingValue"
  | "registrationRefundedValue" | "spectatorPaidValue" | "spectatorPaidQuantity"
  | "activeStudentCount" | "activeMrr" | "rentalMonthCount"
  | "rentalMonthValue" | "rentalPaidValue" | "dailyMonthCount"
  | "dailyMonthValue" | "dailyPaidValue" | "chargePaidValue",
  number
>;

function metricNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function PainelOrganizadorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isOrganizer = false;
  let metrics: OrganizerMetrics | null = null;
  if (user) {
    const [orgRes, metricsRes] = await Promise.all([
      supabase.from("organizer_accounts").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("organizer_dashboard_metrics", { p_user_id: user.id }),
    ]);
    isOrganizer = !!orgRes.data;
    metrics = metricsRes.data as unknown as OrganizerMetrics | null;
  }

  if (user && (isOrganizer || metricNumber(metrics?.championshipTotal) > 0)) {
    const dashboardMetrics = metrics ?? ({} as OrganizerMetrics);
    const todos = { length: metricNumber(dashboardMetrics.championshipTotal) };
    const abertos = { length: metricNumber(dashboardMetrics.championshipOpen) };
    const campsAbertos = metricNumber(dashboardMetrics.championshipRegistrationsOpen);
    const campsAndamento = metricNumber(dashboardMetrics.championshipInProgress);
    const campsEncerrados = metricNumber(dashboardMetrics.championshipClosed);
    const arenaCount = metricNumber(dashboardMetrics.arenaCount);
    const arenaIds = { length: arenaCount };
    const regsPagas = { length: metricNumber(dashboardMetrics.registrationPaidCount) };
    const totalAtletas = metricNumber(dashboardMetrics.registrationPaidValue);
    const ticketAtletas = regsPagas.length > 0 ? totalAtletas / regsPagas.length : 0;
    const totalPlateia = metricNumber(dashboardMetrics.spectatorPaidValue);
    const qtdIngressos = metricNumber(dashboardMetrics.spectatorPaidQuantity);
    const ticketPlateia = qtdIngressos > 0 ? totalPlateia / qtdIngressos : 0;
    const saldoCampeonatos = totalAtletas + totalPlateia;
    const alunosAtivos = { length: metricNumber(dashboardMetrics.activeStudentCount) };
    const totalMRR = metricNumber(dashboardMetrics.activeMrr);
    const rentaisMes = { length: metricNumber(dashboardMetrics.rentalMonthCount) };
    const totalAluguelMs = metricNumber(dashboardMetrics.rentalMonthValue);
    const diariasMes = { length: metricNumber(dashboardMetrics.dailyMonthCount) };
    const totalDiariasMs = metricNumber(dashboardMetrics.dailyMonthValue);
    const saldoArena = totalMRR + totalAluguelMs + totalDiariasMs;
    const totalCharges = metricNumber(dashboardMetrics.chargePaidValue);
    const totalAluguelAll = metricNumber(dashboardMetrics.rentalPaidValue);
    const totalDiariasAll = metricNumber(dashboardMetrics.dailyPaidValue);
    const receitaTotal = totalAtletas + totalPlateia + totalCharges + totalAluguelAll + totalDiariasAll;

    const acoesCriacao = (
      <>
        <Link
          href="/perfil/ativar-arena"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
        >
          <Plus className="size-4" /> Cadastrar arena
        </Link>
        <Link
          href="/painel/novo-campeonato"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="size-4" /> Criar campeonato
        </Link>
      </>
    );

    if (todos.length === 0 && arenaCount === 0) {
      return (
        <PageContainer width="wide" className="space-y-6 py-8">
          <PageHeader
            title="Painel do organizador"
            description="Acompanhe seus campeonatos, inscrições e pagamentos."
          />
          <EmptyState
            icon={Trophy}
            title="Nenhum campeonato criado ainda"
            description="Sua conta de organizador está ativa. Crie seu primeiro campeonato para começar."
            actionLabel="Criar campeonato"
            actionHref="/painel/novo-campeonato"
          />
        </PageContainer>
      );
    }

    return (
      <div className="min-h-screen">
        <AutoRefresh intervalMs={60_000} />

        {/* ── Cabeçalho escuro unificado com resumo e atalhos ── */}
        <div className="bg-brand-dark px-6 pb-14 pt-8">
          <PageContainer width="wide" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Painel do organizador</h1>
                <p className="mt-1 text-sm text-white/60">Acompanhe seus campeonatos, inscrições e pagamentos.</p>
              </div>
              <div className="flex items-center gap-2">{acoesCriacao}</div>
            </div>

            {/* Cards de resumo com alto contraste */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-white/70">Campeonatos</p>
                <p className="mt-1 text-2xl font-bold text-white">{todos.length}</p>
                <p className="mt-1 text-xs text-white/60">{abertos.length} abertos</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-white/70">Arenas</p>
                <p className="mt-1 text-2xl font-bold text-white">{arenaCount}</p>
                <p className="mt-1 text-xs text-white/60">
                  {arenaCount === 0 ? "nenhuma ainda" : arenaCount === 1 ? "ativa" : "ativas"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-white/70">Saldo de Campeonatos</p>
                <p className="mt-1 text-xl font-bold text-white">{fmt(saldoCampeonatos)}</p>
                <p className="mt-1 text-xs text-white/60">atletas + plateia</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-medium text-white/70">Saldo da Arena</p>
                <p className="mt-1 text-xl font-bold text-white">{fmt(saldoArena)}</p>
                <p className="mt-1 text-xs text-white/60">MRR + aluguéis + diárias</p>
              </div>
            </div>

            {/* Atalhos para Arenas e Campeonatos */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/arena"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white ring-1 ring-white/10 transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/20">
                    <Building2 className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Minhas Arenas</p>
                    <p className="text-xs text-white/70">Alunos, presenças e mensalidades</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/50" />
              </Link>
              <Link
                href="/painel/campeonatos"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white ring-1 ring-white/10 transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20">
                    <Trophy className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Meus Campeonatos</p>
                    <p className="text-xs text-white/70">Categorias, inscrições e resultados</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/50" />
              </Link>
            </div>
          </PageContainer>
        </div>

        {/* ── Corpo: folha arredondada com alto contraste ── */}
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:pb-16">
          <DesktopSheetContourLight />
          <PageContainer width="wide" className="space-y-8">
            {/* Receita total consolidada com olhinho para ocultar/exibir */}
            <ReceitaConsolidadaCard valorFormatado={fmt(receitaTotal)} />

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Status dos campeonatos */}
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Status dos campeonatos</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { valor: campsAbertos,    label: "Inscrições abertas" },
                    { valor: campsAndamento,  label: "Em andamento" },
                    { valor: campsEncerrados, label: "Encerrados" },
                  ].map(({ valor, label }) => (
                    <div
                      key={label}
                      className={`rounded-2xl p-4 ring-1 text-center ${
                        valor > 0
                          ? "bg-blue-50 ring-blue-200"
                          : "bg-surface ring-border"
                      }`}
                    >
                      <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-ink"}`}>
                        {valor}
                      </p>
                      <p className={`mt-1 text-xs font-medium ${valor > 0 ? "text-blue-700" : "text-ink-muted"}`}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Status da arena */}
              {arenaIds.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Status da arena</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { valor: alunosAtivos.length, label: "Alunos mensalistas" },
                      { valor: rentaisMes.length,   label: "Aluguéis no mês" },
                      { valor: diariasMes.length,   label: "Diárias no mês" },
                    ].map(({ valor, label }) => (
                      <div
                        key={label}
                        className={`rounded-2xl p-4 ring-1 text-center ${
                          valor > 0
                            ? "bg-blue-50 ring-blue-200"
                            : "bg-surface ring-border"
                        }`}
                      >
                        <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-ink"}`}>
                          {valor}
                        </p>
                        <p className={`mt-1 text-xs font-medium ${valor > 0 ? "text-blue-700" : "text-ink-muted"}`}>
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Financeiro por Categoria */}
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Financeiro por categoria</h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border shadow-sm">
                {/* Saldo de atletas */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="size-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Saldo de atletas</p>
                      {regsPagas.length > 0 && (
                        <p className="text-xs font-medium text-ink-muted">média {fmtMedia(ticketAtletas)} / dupla</p>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-ink">{fmt(totalAtletas)}</p>
                </div>
                {/* Saldo de plateia */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Saldo de plateia</p>
                      <p className="text-xs font-medium text-ink-muted">
                        {qtdIngressos > 0 ? `média ${fmtMedia(ticketPlateia)} / ingresso` : "sem ingressos pagos"}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-ink">{fmt(totalPlateia)}</p>
                </div>
                {/* MRR */}
                {arenaIds.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Banknote className="size-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-ink">MRR (mensalidades ativas)</p>
                        <p className="text-xs font-medium text-ink-muted">
                          {alunosAtivos.length > 0
                            ? `média ${fmtMedia(totalMRR / alunosAtivos.length)} / aluno`
                            : "sem alunos ativos"}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-ink">{fmt(totalMRR)}</p>
                  </div>
                )}
                {/* Aluguéis + Diárias do mês */}
                {arenaIds.length > 0 && (totalAluguelMs > 0 || totalDiariasMs > 0) && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <CalendarCheck className="size-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-ink">Aluguéis + diárias (mês)</p>
                        <p className="text-xs font-medium text-ink-muted">
                          {rentaisMes.length} alug. · {diariasMes.length} diárias
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-ink">{fmt(totalAluguelMs + totalDiariasMs)}</p>
                  </div>
                )}
              </div>
            </section>

            <Link
              href="/termos"
              className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:bg-surface-2"
            >
              <FileText className="size-5 shrink-0 text-ink-muted" />
              <span className="flex-1 text-sm font-medium text-ink">Termos de uso</span>
              <ChevronRight className="size-4 shrink-0 text-ink-muted" />
            </Link>
          </PageContainer>
        </div>
      </div>
    );
  }

  // Landing page de conversão (não logado ou sem conta de organizador)
  return <PainelLandingClient isLoggedIn={!!user} />;
}
