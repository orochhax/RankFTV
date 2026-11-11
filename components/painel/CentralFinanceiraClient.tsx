"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Armchair,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  FileDown,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";
import { calculateExpenseSummary, type CashflowCoverage, type ChampionshipDre, type ChampionshipExpense } from "@/lib/championship-expenses";
import { computeFinancialHealthScore } from "@/lib/financial-cockpit";
import type { DiaVenda } from "@/lib/financial-data-loader";
import { OrganizerWalletPanel, type WalletReceivable, type WalletSnapshot } from "@/components/painel/OrganizerWalletPanel";
import { DreResultadoCard } from "@/components/painel/DreResultadoCard";
import { DespesasManager } from "@/components/painel/DespesasManager";
import { ExpenseCategoryDonut, RevenueEvolutionChart } from "@/components/painel/FinancialCharts";
import { FinancialHealthCard } from "@/components/painel/FinancialHealthCard";
import { RelatoriosCustomPanel } from "@/components/painel/RelatoriosCustomPanel";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";

export type FinancialCockpitTab = "visao" | "carteira" | "despesas" | "relatorios" | "taxas";

type StatusCardData = {
  slug: string;
  label: string;
  count: number;
  valor: number;
  bg: string;
  ring: string;
  text: string;
};

type CatSummary = { nome: string; genero: string; count: number; total: number };
type CatItem = { id: string; nome: string; genero: string; valorInscricao: number | null };

export type CentralFinanceiraProps = {
  champId: string;
  champSlugOrId: string;
  championshipName: string;
  championshipStatus: string;
  initialTab?: FinancialCockpitTab;
  dre: ChampionshipDre;
  coverage: CashflowCoverage;
  expenses: ChampionshipExpense[];
  hasPixKey: boolean;
  statusCards: StatusCardData[];
  totalPix: number;
  totalCredito: number;
  totalDebito: number;
  totalPlateia: number;
  ingressosPlateiaPagos: number;
  categorias: CatItem[];
  catMap: Record<string, CatSummary>;
  isElite: boolean;
  feePendente: number;
  vendasDiarias: DiaVenda[];
  chavePixSection: ReactNode;
  cobrancasPendentesSection: ReactNode;
  wallet: WalletSnapshot;
  withdrawableReceivables: WalletReceivable[];
  anticipatableReceivables: WalletReceivable[];
};

const TABS: Array<{ id: FinancialCockpitTab; label: string; icon: typeof BarChart3 }> = [
  { id: "visao", label: "Visão Geral", icon: BarChart3 },
  { id: "carteira", label: "Carteira & Saques", icon: Wallet },
  { id: "despesas", label: "Despesas & DRE", icon: ReceiptText },
  { id: "relatorios", label: "Relatórios Personalizados", icon: FileDown },
  { id: "taxas", label: "Taxas & PRO", icon: Crown },
];

export function CentralFinanceiraClient(props: CentralFinanceiraProps) {
  const {
    champId,
    champSlugOrId,
    championshipName,
    championshipStatus,
    initialTab = "visao",
    dre,
    coverage,
    expenses,
    hasPixKey,
    statusCards,
    totalPix,
    totalCredito,
    totalDebito,
    totalPlateia,
    ingressosPlateiaPagos,
    categorias,
    catMap,
    isElite,
    feePendente,
    vendasDiarias,
    chavePixSection,
    cobrancasPendentesSection,
    wallet,
    withdrawableReceivables,
    anticipatableReceivables,
  } = props;

  const [activeTab, setActiveTab] = useState<FinancialCockpitTab>(initialTab);
  const [mostrar, setMostrar] = useState(true);

  const val = (v: number) => (mostrar ? formatBRL(v) : "R$ ••••••");
  const expenseSummary = calculateExpenseSummary(expenses);

  const paidCount = statusCards.find((s) => s.slug === "pagos")?.count ?? 0;
  const pendingCount = statusCards.find((s) => s.slug === "pendentes")?.count ?? 0;
  const refundedCount = statusCards.find((s) => s.slug === "estornados")?.count ?? 0;

  const health = computeFinancialHealthScore({
    dre,
    coverage,
    expenses,
    paidCount,
    pendingCount,
    refundedCount,
    hasPixKey,
    isElite,
  });

  function selectTab(next: FinancialCockpitTab) {
    setActiveTab(next);
    if (typeof window !== "undefined") {
      const targetUrl =
        next === "visao"
          ? `/painel/campeonatos/${champSlugOrId}/financeiro`
          : `/painel/campeonatos/${champSlugOrId}/financeiro?tab=${next}`;
      window.history.replaceState(null, "", targetUrl);
    }
  }

  const maxCatTotal = Math.max(...categorias.map((c) => catMap[c.id]?.total ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Unificado + Atalhos Rápidos */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Central Financeira Unificada
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                health.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : health.tone === "blue"
                    ? "border-brand-border bg-brand-soft text-brand-ink"
                    : health.tone === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <Activity className="size-3" />
              Saúde {health.score}/100
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Faturamento, despesas, carteira, saques e exportação sob medida em um único painel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {mostrar ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {mostrar ? "Ocultar valores" : "Mostrar valores"}
          </button>

          <button
            type="button"
            onClick={() => selectTab("despesas")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            <Plus className="size-3.5" />
            Lançar despesa
          </button>
        </div>
      </div>

      {/* Navegação por Abas (Horizontal Scroll-Safe) */}
      <nav
        aria-label="Seções financeiras"
        className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-surface p-1.5"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
                active
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.id === "despesas" && expenseSummary.countPendentes > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {expenseSummary.countPendentes}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === "visao" && (
        <div className="space-y-6">
          {/* 4 KPIs Executivos */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiBox
              label="Receita Líquida"
              value={val(dre.receitaLiquida)}
              hint={`Bruto ${val(dre.vendasBrutas)} · Taxas -${val(dre.taxasPlataforma)}`}
              accent="blue"
            />
            <KpiBox
              label="Despesas Totais"
              value={val(dre.despesasTotais)}
              hint={`${expenseSummary.count} lançamento(s) · ${val(dre.despesasPendentes)} a vencer`}
              accent="amber"
            />
            <KpiBox
              label="Lucro Real no Bolso"
              value={val(dre.lucroLiquidoReal)}
              hint={
                dre.vendasBrutas > 0
                  ? `${dre.margemLucroPercentual}% de margem líquida`
                  : "Após taxas e despesas"
              }
              accent={dre.status === "prejuizo" ? "rose" : "emerald"}
            />
            <KpiBox
              label="Disponível p/ Saque"
              value={val(wallet.payoutLimits?.maxWithdrawableNow ?? wallet.available)}
              hint={`Pendente: ${val(wallet.pending)}`}
              accent="slate"
              onClick={() => selectTab("carteira")}
            />
          </div>

          {/* Cockpit Assimétrico 2 Colunas */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_360px] lg:items-start">
            {/* Esquerda: Evolução, Categorias & Canais */}
            <div className="min-w-0 space-y-6">
              <RevenueEvolutionChart dados={vendasDiarias} showValues={mostrar} />

              {/* Arrecadação por Categoria + Canais & Plateia */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Arrecadação por categoria</h3>
                    <p className="text-xs text-ink-muted">Participação das categorias nas inscrições.</p>
                  </div>

                  {categorias.length === 0 ? (
                    <p className="text-xs text-ink-muted">Nenhuma categoria cadastrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {categorias.map((cat) => {
                        const total = catMap[cat.id]?.total ?? 0;
                        const count = catMap[cat.id]?.count ?? 0;
                        const pct = Math.min(100, (total / maxCatTotal) * 100);
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-ink">{cat.nome}</span>
                              <span className="font-bold text-ink">{val(total)}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <div
                                  className="h-full rounded-full bg-brand transition-[width]"
                                  style={{ width: `${mostrar ? pct : 0}%` }}
                                />
                              </div>
                              <span className="w-16 text-right text-[11px] text-ink-muted">
                                {count} dupla{count === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Formas de pagamento + Status + Bilheteria Plateia */}
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Canais & Status de Cobrança</h3>
                    <p className="text-xs text-ink-muted">Atletas, métodos de pagamento e bilheteria.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {statusCards.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/painel/campeonatos/${champId}/financeiro/${c.slug}`}
                        className={`group relative rounded-xl p-3 ring-1 transition-all hover:shadow-sm ${c.bg} ${c.ring}`}
                      >
                        <p className={`text-[11px] font-semibold ${c.text}`}>{c.label}</p>
                        <p className={`mt-1 text-lg font-extrabold ${c.text}`}>{c.count}</p>
                        <p className={`text-[10px] ${c.text} opacity-80 truncate`}>{val(c.valor)}</p>
                        <ChevronRight className={`absolute right-2 top-2 size-3 opacity-0 group-hover:opacity-70 ${c.text}`} />
                      </Link>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-surface-2/40 p-2.5">
                      <p className="text-[11px] font-medium text-ink-muted">⚡ Pix</p>
                      <p className="mt-1 text-xs font-bold text-ink">{val(totalPix)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/40 p-2.5">
                      <p className="text-[11px] font-medium text-ink-muted">💳 Crédito</p>
                      <p className="mt-1 text-xs font-bold text-ink">{val(totalCredito)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2/40 p-2.5">
                      <p className="text-[11px] font-medium text-ink-muted">🏦 Débito</p>
                      <p className="mt-1 text-xs font-bold text-ink">{val(totalDebito)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Armchair className="size-4" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-ink">Bilheteria de Plateia</p>
                        <p className="text-[11px] text-ink-muted">
                          {ingressosPlateiaPagos} ingresso(s) pago(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-ink">{val(totalPlateia)}</p>
                      <Link
                        href={`/painel/campeonatos/${champSlugOrId}/plateia`}
                        className="text-[11px] font-semibold text-brand-ink hover:underline"
                      >
                        Ver ingressos →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direita: Saúde Financeira Inteligente */}
            <div className="lg:sticky lg:top-6">
              <FinancialHealthCard health={health} onNavigateTab={selectTab} />
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CARTEIRA & SAQUES */}
      {activeTab === "carteira" && (
        <div className="space-y-6">
          <OrganizerWalletPanel
            champId={champId}
            wallet={wallet}
            withdrawableReceivables={withdrawableReceivables}
            anticipatableReceivables={anticipatableReceivables}
            showValues={mostrar}
            onToggleShowValues={() => setMostrar((current) => !current)}
          />

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-3">{chavePixSection}</div>
            <div>{cobrancasPendentesSection}</div>
          </div>
        </div>
      )}

      {/* ABA 3: DESPESAS & DRE */}
      {activeTab === "despesas" && (
        <div className="space-y-6">
          <DreResultadoCard
            dre={dre}
            coverage={coverage}
            champSlugOrId={champSlugOrId}
            showLinkToExpenses={false}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_340px] lg:items-start">
            <DespesasManager
              champId={champId}
              champSlugOrId={champSlugOrId}
              initialExpenses={expenses}
            />
            <div className="lg:sticky lg:top-6">
              <ExpenseCategoryDonut
                porCategoria={expenseSummary.porCategoria}
                total={expenseSummary.total}
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: RELATÓRIOS PERSONALIZADOS */}
      {activeTab === "relatorios" && (
        <RelatoriosCustomPanel
          champId={champId}
          championshipName={championshipName}
          dre={dre}
          health={health}
        />
      )}

      {/* ABA 5: TAXAS & PRO */}
      {activeTab === "taxas" && (
        <div className="space-y-6">
          {isElite && feePendente > 0 && (
            <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-900">Plano Elite — ativação</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-amber-700">
                <span>Saldo devedor</span>
                <span className="text-red-600">{mostrar ? formatBRL(-feePendente) : "••••••"}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width]"
                  style={{ width: `${Math.round(((PRECO_ELITE - feePendente) / PRECO_ELITE) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-amber-700">
                {Math.round(((PRECO_ELITE - feePendente) / PRECO_ELITE) * 100)}% quitado — abatido automaticamente dos repasses das próximas inscrições pagas.
              </p>
            </div>
          )}

          {isElite && feePendente <= 0 && (
            <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">Plano Elite — Ativação 100% quitada</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Quitado
                </span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                A taxa de ativação de {formatBRL(PRECO_ELITE)} já foi quitada com seus repasses. Todas as vendas seguintes entram com as taxas reduzidas do Plano Elite (7% Pix / 9% Cartão).
              </p>
            </div>
          )}

          <PlanoTaxas
            champId={champId}
            isElite={isElite}
            status={championshipStatus}
            feePendente={feePendente}
            permitirCancelar
          />
        </div>
      )}
    </div>
  );
}

function KpiBox({
  label,
  value,
  hint,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "blue" | "amber" | "emerald" | "rose" | "slate";
  onClick?: () => void;
}) {
  const accentStyles = {
    blue: "border-border hover:border-brand-border",
    amber: "border-border hover:border-amber-200",
    emerald: "border-emerald-200/80 hover:border-emerald-300",
    rose: "border-rose-200 hover:border-rose-300",
    slate: "border-border hover:border-brand-border",
  }[accent];

  const valTone = {
    blue: "text-ink",
    amber: "text-ink",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    slate: "text-brand-ink",
  }[accent];

  const content = (
    <>
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${valTone}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-ink-muted">{hint}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-2xl border bg-surface p-4 text-left transition-all ${accentStyles}`}
      >
        {content}
      </button>
    );
  }

  return <div className={`rounded-2xl border bg-surface p-4 ${accentStyles}`}>{content}</div>;
}
