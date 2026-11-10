"use client";

import { useState, useId } from "react";
import { Crown, Sparkles, TrendingUp, ShieldCheck, Tv, FileText, Users } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";
import { TAXAS_EXIBICAO } from "@/lib/taxas";

export function CampeonatoRoiSimulator() {
  const [duplas, setDuplas] = useState<number>(40);
  const [valorDupla, setValorDupla] = useState<number>(180);
  const [ingressosPlateia, setIngressosPlateia] = useState<number>(40);
  const valorIngresso = 25; // R$ 25 plateia

  const inputDuplasId = useId();
  const inputValorDuplaId = useId();
  const inputPlateiaId = useId();

  // Cálculos
  const totalInscricoes = duplas * valorDupla;
  const totalPlateia = ingressosPlateia * valorIngresso;
  const arrecadacaoTotal = totalInscricoes + totalPlateia;

  // Comparativo de Taxas Pix
  const taxaPadraoPix = arrecadacaoTotal * (TAXAS_EXIBICAO.padrao.pix / 100);
  const taxaElitePix = arrecadacaoTotal * (TAXAS_EXIBICAO.elite.pix / 100);
  const economiaTaxas = Math.round(taxaPadraoPix - taxaElitePix);

  // Potencial de captação de patrocínio com Dossiê PDF e Modo TV
  const potencialPatrocinio = 1500;

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 via-white to-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            <Crown className="size-3.5 text-amber-600" />
            Simulador de Lucro do Campeonato
          </span>
          <h3 className="mt-2 text-xl font-black text-gray-900 md:text-2xl">
            Simule o retorno do seu torneio com o Plano PRO
          </h3>
          <p className="text-sm text-gray-600">
            Descubra a economia de taxas e o potencial de captação de patrocínio com as ferramentas exclusivas.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Controles Sliders */}
        <div className="space-y-5 lg:col-span-7">
          {/* Slider 1: Duplas */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputDuplasId} className="font-semibold text-gray-700">
                Quantidade de Duplas Esperadas:
              </label>
              <span className="text-base font-extrabold text-amber-600">
                {duplas} duplas ({duplas * 2} atletas)
              </span>
            </div>
            <input
              id={inputDuplasId}
              type="range"
              min={16}
              max={128}
              step={4}
              value={duplas}
              onChange={(e) => setDuplas(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-amber-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>16 duplas</span>
              <span>64 duplas</span>
              <span>128 duplas</span>
            </div>
          </div>

          {/* Slider 2: Valor da Inscrição */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputValorDuplaId} className="font-semibold text-gray-700">
                Valor da Inscrição por Dupla:
              </label>
              <span className="text-base font-extrabold text-amber-600">
                {formatBRL(valorDupla)}
              </span>
            </div>
            <input
              id={inputValorDuplaId}
              type="range"
              min={80}
              max={350}
              step={10}
              value={valorDupla}
              onChange={(e) => setValorDupla(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-amber-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>R$ 80</span>
              <span>R$ 180</span>
              <span>R$ 350</span>
            </div>
          </div>

          {/* Slider 3: Ingressos Plateia */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputPlateiaId} className="font-semibold text-gray-700">
                Ingressos de Plateia / Camarote:
              </label>
              <span className="text-base font-extrabold text-amber-600">
                {ingressosPlateia} ingressos (~{formatBRL(totalPlateia)})
              </span>
            </div>
            <input
              id={inputPlateiaId}
              type="range"
              min={0}
              max={200}
              step={10}
              value={ingressosPlateia}
              onChange={(e) => setIngressosPlateia(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-amber-500"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>0</span>
              <span>100</span>
              <span>200</span>
            </div>
          </div>
        </div>

        {/* Card de Resultados e Benefícios */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-300 bg-amber-950/90 p-5 text-white shadow-lg lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-amber-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                Arrecadação Bruta Prevista
              </span>
              <span className="text-sm font-bold text-amber-100">
                {formatBRL(arrecadacaoTotal)}
              </span>
            </div>

            {/* Comparativo de Taxas */}
            <div className="mt-4 rounded-xl bg-amber-900/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <ShieldCheck className="size-4" />
                Economia Direta nas Taxas de Inscrição
              </div>
              <p className="mt-1 text-2xl font-black text-amber-300">
                + {formatBRL(economiaTaxas)}
                <span className="text-xs font-normal text-amber-200"> economizados</span>
              </p>
              <p className="mt-1 text-[11px] text-amber-200">
                Taxa de Pix cai de {TAXAS_EXIBICAO.padrao.pix}% para {TAXAS_EXIBICAO.elite.pix}%, gerando economia direta.
              </p>
            </div>

            {/* Dossiê & Modo TV */}
            <div className="mt-3 space-y-2 rounded-xl bg-amber-900/40 p-3 text-xs text-amber-100">
              <div className="flex items-center gap-2">
                <Tv className="size-3.5 text-amber-400" />
                <span><strong>Modo Telão ao Vivo:</strong> Projetores e TVs sem propagandas.</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="size-3.5 text-amber-400" />
                <span><strong>Dossiê de Patrocínio:</strong> Relatório em PDF pronto para fechar marcas (+{formatBRL(potencialPatrocinio)}).</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-amber-400" />
                <span><strong>Troca de Duplas Automática:</strong> O titular resolve no painel sem chamar no Zap.</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-center">
            <p className="text-xs font-bold text-amber-300">
              🏆 Ativação de {formatBRL(PRECO_ELITE)} descontada dos repasses
            </p>
            <p className="mt-1 text-[11px] text-amber-200">
              Você não gasta nada agora: o valor é abatido diretamente das inscrições vendidas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
