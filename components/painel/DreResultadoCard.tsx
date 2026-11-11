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
            <TrendingUp className="size-5 text-brand" />
            Resultado do Torneio (DRE)
          </h2>
          <p className="text-xs text-ink-muted">
            Balanço consolidado entre vendas líquidas da plataforma e despesas operacionais lançadas.
          </p>
        </div>
        {showLinkToExpenses && (
          <Link
            href={`/painel/campeonatos/${champSlugOrId}/despesas`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-brand-ink transition-colors hover:bg-border/60"
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
        <div className="rounded-2xl border border-brand-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">
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
        <div className="rounded-2xl border border-amber-200 bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
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
          className={`rounded-2xl border bg-surface p-4 ${
            isLucro
              ? "border-emerald-200"
              : isPrejuizo
                ? "border-rose-200"
                : "border-border"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                isLucro
                  ? "text-emerald-700"
                  : isPrejuizo
                    ? "text-rose-700"
                    : "text-ink-muted"
              }`}
            >
              Lucro Real no Bolso
            </p>
            {dre.vendasBrutas > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isLucro
                    ? "bg-emerald-100 text-emerald-800"
                    : isPrejuizo
                      ? "bg-rose-100 text-rose-800"
                      : "bg-surface-2 text-ink"
                }`}
              >
                {dre.margemLucroPercentual}%
              </span>
            )}
          </div>
          <p
            className={`mt-1 text-2xl font-black ${
              isLucro
                ? "text-emerald-600"
                : isPrejuizo
                  ? "text-rose-600"
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
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : !coverage.coberto && coverage.despesasPendentes > 0
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-border bg-surface-2 text-ink"
          }`}
        >
          {coverage.coberto && coverage.despesasPendentes > 0 ? (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          ) : !coverage.coberto && coverage.despesasPendentes > 0 ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
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
