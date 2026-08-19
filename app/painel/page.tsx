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
import { StatCard } from "@/components/shell/StatCard";

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtMedia(v: number) {
  return `~R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type OrganizerMetrics = {
  championshipTotal: number;
  championshipOpen: number;
  championshipRegistrationsOpen: number;
  championshipInProgress: number;
  championshipClosed: number;
  arenaCount: number;
  registrationPaidCount: number;
  registrationPaidValue: number;
  registrationPendingValue: number;
  registrationRefundedValue: number;
  spectatorPaidValue: number;
  spectatorPaidQuantity: number;
  activeStudentCount: number;
  activeMrr: number;
  rentalMonthCount: number;
  rentalMonthValue: number;
  rentalPaidValue: number;
  dailyMonthCount: number;
  dailyMonthValue: number;
  dailyPaidValue: number;
  chargePaidValue: number;
};

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
    const totalPendente = metricNumber(dashboardMetrics.registrationPendingValue);
    const totalEstornado = metricNumber(dashboardMetrics.registrationRefundedValue);
    const ticketAtletas  = regsPagas.length > 0 ? totalAtletas / regsPagas.length : 0;

    const totalPlateia = metricNumber(dashboardMetrics.spectatorPaidValue);
    const qtdIngressos = metricNumber(dashboardMetrics.spectatorPaidQuantity);
    const ticketPlateia  = qtdIngressos > 0 ? totalPlateia / qtdIngressos : 0;
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
    const receitaTotal    = totalAtletas + totalPlateia + totalCharges + totalAluguelAll + totalDiariasAll;

    // suppress unused-var warnings for pending/estornado (kept for future use)
    void totalPendente;
    void totalEstornado;

    const acoesCriacao = (
      <>
        <Link
          href="/perfil/ativar-arena"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 md:border-0 md:bg-white/10 md:text-white/80 md:hover:bg-white/15"
        >
          <Plus className="size-4" /> Cadastrar arena
        </Link>
        <Link
          href="/painel/novo-campeonato"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
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

        {/* ── Cabeçalho: faixa escura no mobile, claro + StatCards no desktop ── */}
        <div className="bg-black px-6 pb-16 pt-8 md:hidden">
          <div className="w-full space-y-5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel do organizador</h1>
            <div className="flex items-center gap-2">{acoesCriacao}</div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Campeonatos</p>
                <p className="text-2xl font-bold text-white">{todos.length}</p>
                <p className="mt-1 text-[11px] text-white/40">{abertos.length} abertos</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Arenas</p>
                <p className="text-2xl font-bold text-white">{arenaCount}</p>
                <p className="mt-1 text-[11px] text-white/40">
                  {arenaCount === 0 ? "nenhuma ainda" : arenaCount === 1 ? "ativa" : "ativas"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Saldo de Campeonatos</p>
                <p className="text-xl font-bold text-white">{fmt(saldoCampeonatos)}</p>
                <p className="mt-1 text-[11px] text-white/40">atletas + plateia</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-white/50">Saldo da Arena</p>
                <p className="text-xl font-bold text-white">{fmt(saldoArena)}</p>
                <p className="mt-1 text-[11px] text-white/40">MRR + aluguéis + diárias</p>
              </div>
            </div>

            {/* Atalhos */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Link
                href="/arena"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-blue-400" />
                  <div>
                    <p className="font-semibold text-white">Minhas Arenas</p>
                    <p className="text-xs text-white/40">Alunos, presenças e mensalidades</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
              <Link
                href="/painel/campeonatos"
                className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4 text-white transition-colors hover:bg-white/15"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="size-5 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">Meus Campeonatos</p>
                    <p className="text-xs text-white/40">Categorias, inscrições e resultados</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden border-b border-border bg-surface md:block">
          <PageContainer width="wide" className="space-y-6 py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">Painel do organizador</h1>
              <div className="flex items-center gap-2">{acoesCriacao}</div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Campeonatos" value={todos.length} hint={`${abertos.length} abertos`} icon={Trophy} />
              <StatCard
                label="Arenas"
                value={arenaCount}
                hint={arenaCount === 0 ? "nenhuma ainda" : arenaCount === 1 ? "ativa" : "ativas"}
                icon={Building2}
              />
              <StatCard label="Saldo de Campeonatos" value={fmt(saldoCampeonatos)} hint="atletas + plateia" tone="success" />
              <StatCard label="Saldo da Arena" value={fmt(saldoArena)} hint="MRR + aluguéis + diárias" tone="success" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/arena"
                className="flex items-center justify-between rounded-card-lg bg-surface-2 px-5 py-4 ring-1 ring-border transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-ink">Minhas Arenas</p>
                    <p className="text-xs text-ink-muted">Alunos, presenças e mensalidades</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-ink-muted" />
              </Link>
              <Link
                href="/painel/campeonatos"
                className="flex items-center justify-between rounded-card-lg bg-surface-2 px-5 py-4 ring-1 ring-border transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="size-5 text-amber-500" />
                  <div>
                    <p className="font-semibold text-ink">Meus Campeonatos</p>
                    <p className="text-xs text-ink-muted">Categorias, inscrições e resultados</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-ink-muted" />
              </Link>
            </div>
          </PageContainer>
        </div>

        {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
        <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
          <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />
          <PageContainer width="wide" className="space-y-8">

            {/* Receita total consolidada */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Receita total consolidada</p>
              <p className="mt-2 text-3xl font-bold text-white">{fmt(receitaTotal)}</p>
              <p className="mt-1 text-xs text-blue-200/70">
                atletas + plateia + mensalidades + aluguéis + diárias (tudo recebido)
              </p>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Status dos campeonatos */}
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status dos campeonatos</h2>
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
                          ? "bg-blue-50 ring-blue-100"
                          : "bg-gray-50 ring-gray-100"
                      }`}
                    >
                      <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-gray-400"}`}>
                        {valor}
                      </p>
                      <p className={`mt-1 text-xs ${valor > 0 ? "text-blue-600" : "text-gray-400"}`}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Status da arena */}
              {arenaIds.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Status da arena</h2>
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
                            ? "bg-blue-50 ring-blue-100"
                            : "bg-gray-50 ring-gray-100"
                        }`}
                      >
                        <p className={`text-2xl font-bold ${valor > 0 ? "text-blue-700" : "text-gray-400"}`}>
                          {valor}
                        </p>
                        <p className={`mt-1 text-xs ${valor > 0 ? "text-blue-600" : "text-gray-400"}`}>
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
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Financeiro por categoria</h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {/* Saldo de atletas */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-700">Saldo de atletas</p>
                      {regsPagas.length > 0 && (
                        <p className="text-xs text-gray-400">média {fmtMedia(ticketAtletas)} / dupla</p>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{fmt(totalAtletas)}</p>
                </div>
                {/* Saldo de plateia */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-700">Saldo de plateia</p>
                      <p className="text-xs text-gray-400">
                        {qtdIngressos > 0 ? `média ${fmtMedia(ticketPlateia)} / ingresso` : "sem ingressos pagos"}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{fmt(totalPlateia)}</p>
                </div>
                {/* MRR */}
                {arenaIds.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Banknote className="size-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-700">MRR (mensalidades ativas)</p>
                        <p className="text-xs text-gray-400">
                          {alunosAtivos.length > 0
                            ? `média ${fmtMedia(totalMRR / alunosAtivos.length)} / aluno`
                            : "sem alunos ativos"}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{fmt(totalMRR)}</p>
                  </div>
                )}
                {/* Aluguéis + Diárias do mês */}
                {arenaIds.length > 0 && (totalAluguelMs > 0 || totalDiariasMs > 0) && (
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="size-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-700">Aluguéis + diárias (mês)</p>
                        <p className="text-xs text-gray-400">
                          {rentaisMes.length} alug. · {diariasMes.length} diárias
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{fmt(totalAluguelMs + totalDiariasMs)}</p>
                  </div>
                )}
              </div>
            </section>

            <Link
              href="/termos"
              className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
            >
              <FileText className="size-5 shrink-0 text-gray-400" />
              <span className="flex-1 text-sm font-medium text-gray-700">Termos de uso</span>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
            </Link>
          </PageContainer>
        </div>
      </div>
    );
  }

  // Landing page de conversão (não logado ou sem conta de organizador)
  return <PainelLandingClient isLoggedIn={!!user} />;
}
