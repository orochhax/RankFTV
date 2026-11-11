"use client";

import { Crown, ShieldCheck, Tv, FileText, Users, Sparkles, BadgeCheck, Star } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";
import { TAXAS_EXIBICAO } from "@/lib/taxas";

export type ResultsCardProps = {
  arrecadacaoTotal: number;
  totalInscricoes: number;
  totalPlateia: number;
  duplas: number;
  ingressosPlateia: number;
  economiaTaxas: number;
  economiaInscricoes: number;
  economiaPlateia: number;
  potencialPatrocinio: number;
};

export function CampeonatoResultsCard({
  arrecadacaoTotal,
  totalInscricoes,
  totalPlateia,
  duplas,
  ingressosPlateia,
  economiaTaxas,
  economiaInscricoes,
  economiaPlateia,
  potencialPatrocinio,
}: ResultsCardProps) {
  const cobreAtivacao = economiaTaxas >= PRECO_ELITE;
  const lucroAposAtivacao = Math.max(0, economiaTaxas - PRECO_ELITE);

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-brand-dark-2 bg-brand-dark p-6 text-white shadow-xl backdrop-blur-md lg:col-span-5">
      <div>
        {/* Cabeçalho de Arrecadação */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-app-bg/75">
            Arrecadação Bruta Prevista
          </span>
          <span className="text-lg font-black text-amber-400">
            {formatBRL(arrecadacaoTotal)}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-xs text-app-bg/75">
          <span>{formatBRL(totalInscricoes)} atletas ({duplas} duplas)</span>
          <span>{formatBRL(totalPlateia)} plateia ({ingressosPlateia} ing.)</span>
        </div>

        {/* Bloco de Destaque: Economia Direta */}
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <ShieldCheck className="size-4 text-amber-400" />
              Economia Direta nas Taxas
            </span>
            <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              1% OFF
            </span>
          </div>

          <p className="mt-1.5 text-3xl font-black text-amber-400">
            + {formatBRL(economiaTaxas)}
            <span className="text-xs font-normal text-slate-300"> economizados</span>
          </p>

          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Taxa Pix cai de {TAXAS_EXIBICAO.padrao.pix}% para {TAXAS_EXIBICAO.elite.pix}% (e cartão de {TAXAS_EXIBICAO.padrao.cartao}% para {TAXAS_EXIBICAO.elite.cartao}%).
            {totalPlateia > 0 && totalInscricoes > 0 && (
              <span className="mt-0.5 block text-slate-400 text-[11px]">
                {formatBRL(economiaInscricoes)} em inscrições + {formatBRL(economiaPlateia)} em ingressos.
              </span>
            )}
          </p>
        </div>

        {/* Ferramentas e Benefícios Exclusivos */}
        <div className="mt-4 space-y-2.5 rounded-2xl bg-slate-800/50 p-4 text-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Vantagens & Ferramentas do Plano PRO
          </p>
          <div className="flex items-start gap-2.5 text-slate-200">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span><strong>Selo de Verificado:</strong> Torneio oficial verificado com selo de credibilidade para atletas e marcas.</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-200">
            <Star className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span><strong>Campeonato em Destaque:</strong> Posição de destaque na Home e prioridade no topo da lista de torneios.</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-200">
            <Tv className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span><strong>Modo Telão ao Vivo:</strong> Projete o chaveamento em TVs na quadra sem propagandas.</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-200">
            <FileText className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span><strong>Dossiê de Patrocínio:</strong> Relatório em PDF para fechar marcas (+{formatBRL(potencialPatrocinio)}).</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-200">
            <Users className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span><strong>Troca de Duplas Automática:</strong> O próprio atleta resolve no painel sem chamar no Zap.</span>
          </div>
        </div>
      </div>

      {/* Rodapé: Retorno do Investimento */}
      <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
        {cobreAtivacao ? (
          <div>
            <p className="text-xs font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
              <Sparkles className="size-4 text-amber-400" />
              O Plano PRO já se pagou com {formatBRL(lucroAposAtivacao)} de lucro extra!
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              A economia de taxas cobre os {formatBRL(PRECO_ELITE)} de ativação e ainda sobra dinheiro.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
              <Crown className="size-4 text-amber-400" />
              Ativação de {formatBRL(PRECO_ELITE)} descontada dos repasses
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              Você não gasta nada agora: o valor é abatido diretamente das inscrições vendidas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
