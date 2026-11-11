"use client";

import Link from "next/link";
import { TrendingUp, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, ReceiptText } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Surface } from "@/components/shell/Surface";
import type { ChampionshipDre, CashflowCoverage } from "@/lib/championship-expenses";

export type DreResultadoCardProps = {
  dre: ChampionshipDre;
  coverage?: CashflowCoverage;
  champSlugOrId: string;
  showLinkToExpenses?: boolean;
};

export function DreResultadoCard({
  dre,
  coverage,
  champSlugOrId,
  showLinkToExpenses = false,
}: DreResultadoCardProps) {
  const isLucro = dre.status === "lucro";
  const isPrejuizo = dre.status === "prejuizo";

  return (
    <Surface padding="md" className="space-y-5 border-border/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <TrendingUp className="size-5 text-blue-600" />
            Resultado do Torneio (DRE)
          </h2>
          <p className="text-xs text-ink-muted">
            Balanço consolidado entre vendas líquidas da plataforma e despesas operacionais lançadas.
          </p>
        </div>
        {showLinkToExpenses && (
          <Link
            href={`/painel/campeonatos/${champSlugOrId}/despesas`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-border/60"
          >
            <ReceiptText className="size-3.5" />
            Gerenciar despesas
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>

      {/* Grid de 3 Cards de Resultado */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* 1. Receita Líquida */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Receita Líquida
          </p>
          <p className="mt-1 text-2xl font-black text-ink">
            {formatBRL(dre.receitaLiquida)}
          </p>
          <p className="mt-1 text-xs text-ink-muted leading-tight">
            Vendas brutas: {formatBRL(dre.vendasBrutas)}
            <br />
            Taxas: -{formatBRL(dre.taxasPlataforma)}
          </p>
        </div>

        {/* 2. Despesas Totais */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4 dark:bg-amber-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Despesas Totais
          </p>
          <p className="mt-1 text-2xl font-black text-ink">
            {formatBRL(dre.despesasTotais)}
          </p>
          <p className="mt-1 text-xs text-ink-muted leading-tight">
            Pagas: {formatBRL(dre.despesasPagas)}
            <br />
            A vencer: {formatBRL(dre.despesasPendentes)}
          </p>
        </div>

        {/* 3. Lucro Líquido Real */}
        <div
          className={`rounded-2xl border p-4 ${
            isLucro
              ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20"
              : isPrejuizo
                ? "border-rose-500/30 bg-rose-50/60 dark:bg-rose-950/20"
                : "border-border bg-surface-2"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                isLucro
                  ? "text-emerald-700 dark:text-emerald-400"
                  : isPrejuizo
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-ink-muted"
              }`}
            >
              Lucro Real no Bolso
            </p>
            {dre.vendasBrutas > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isLucro
                    ? "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                    : isPrejuizo
                      ? "bg-rose-200/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                      : "bg-surface-3 text-ink"
                }`}
              >
                {dre.margemLucroPercentual}%
              </span>
            )}
          </div>
          <p
            className={`mt-1 text-2xl font-black ${
              isLucro
                ? "text-emerald-600 dark:text-emerald-400"
                : isPrejuizo
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-ink"
            }`}
          >
            {formatBRL(dre.lucroLiquidoReal)}
          </p>
          <p className="mt-1 text-xs text-ink-muted leading-tight">
            Já descontando taxas da plataforma e todas as despesas lançadas.
          </p>
        </div>
      </div>

      {/* Bloco de Cobertura de Caixa com a Carteira */}
      {coverage && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-relaxed ${
            coverage.coberto && coverage.despesasPendentes > 0
              ? "border-emerald-500/20 bg-emerald-50/40 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
              : !coverage.coberto && coverage.despesasPendentes > 0
                ? "border-amber-500/30 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
                : "border-border bg-surface-2 text-ink-muted"
          }`}
        >
          {coverage.coberto && coverage.despesasPendentes > 0 ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : !coverage.coberto && coverage.despesasPendentes > 0 ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          )}

          <div className="flex-1">
            {coverage.despesasPendentes > 0 ? (
              coverage.coberto ? (
                <span>
                  <strong>Saúde de Caixa Excelente:</strong> Seu saldo liberado para saque no RankFTV (
                  <strong>{formatBRL(coverage.saldoDisponivel)}</strong>) cobre 100% das suas despesas a vencer (
                  <strong>{formatBRL(coverage.despesasPendentes)}</strong>), mantendo uma folga de caixa de{" "}
                  <strong>{formatBRL(coverage.diferenca)}</strong>.
                </span>
              ) : (
                <span>
                  <strong>Atenção ao Caixa:</strong> Você tem <strong>{formatBRL(coverage.despesasPendentes)}</strong> em despesas a vencer. Seu saldo liberado para saque agora é de{" "}
                  <strong>{formatBRL(coverage.saldoDisponivel)}</strong> ({coverage.percentualCobertura}% de cobertura). O restante (
                  {formatBRL(coverage.diferenca)}) será coberto conforme novas inscrições entrarem ou no repasse pós-evento (D+2).
                </span>
              )
            ) : (
              <span>
                <strong>Contas 100% em dia:</strong> Não há despesas pendentes no momento. Todo o lucro líquido está preservado.
              </span>
            )}
          </div>
        </div>
      )}
    </Surface>
  );
}
