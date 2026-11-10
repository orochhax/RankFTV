"use client";

import { useState, useId } from "react";
import { Crown, ShieldCheck, Tv, FileText, Users, Mail, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";
import { TAXAS_EXIBICAO } from "@/lib/taxas";

type SimulatorControlProps = {
  id: string;
  label: string;
  description: string;
  value: number;
  prefix?: string;
  suffix?: string;
  min?: number;
  sliderMax: number;
  step?: number;
  inputWidth?: string;
  onChange: (val: number) => void;
  marks: [string, string, string];
};

function SimulatorControl({
  id,
  label,
  description,
  value,
  prefix,
  suffix,
  min = 0,
  sliderMax,
  step = 1,
  inputWidth = "w-16",
  onChange,
  marks,
}: SimulatorControlProps) {
  const currentMax = Math.max(sliderMax, value);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label htmlFor={id} className="text-sm font-semibold text-gray-800">
            {label}
          </label>
          <p className="text-[11px] text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/70 px-2.5 py-1 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-amber-500">
          {prefix && <span className="text-xs font-bold text-amber-700">{prefix}</span>}
          <input
            id={id}
            type="number"
            min={min}
            step={step}
            value={value === 0 ? "" : value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(0);
                return;
              }
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) {
                onChange(Math.max(min, parsed));
              }
            }}
            className={`${inputWidth} bg-transparent text-right text-base font-extrabold text-amber-600 outline-none`}
          />
          {suffix && <span className="text-xs font-bold text-amber-700">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={currentMax}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-amber-500"
      />
      <div className="mt-1 flex justify-between text-[11px] text-gray-400">
        <span>{marks[0]}</span>
        <span>{marks[1]}</span>
        <span>{marks[2]}</span>
      </div>
    </div>
  );
}

type ResultsCardProps = {
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

function SimulatorResultsCard({
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

  return (
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
        <div className="mt-1.5 flex justify-between text-[11px] text-amber-300/80">
          <span>{formatBRL(totalInscricoes)} atletas ({duplas} {duplas === 1 ? "dupla" : "duplas"})</span>
          <span>{formatBRL(totalPlateia)} plateia ({ingressosPlateia} {ingressosPlateia === 1 ? "ingresso" : "ingressos"})</span>
        </div>

        {/* Comparativo de Taxas (1% de desconto) */}
        <div className="mt-4 rounded-xl bg-amber-900/60 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ShieldCheck className="size-4" />
            Economia Direta nas Taxas (1% OFF)
          </div>
          <p className="mt-1 text-2xl font-black text-amber-300">
            + {formatBRL(economiaTaxas)}
            <span className="text-xs font-normal text-amber-200"> economizados</span>
          </p>
          <p className="mt-1 text-[11px] text-amber-200">
            Taxa Pix cai de {TAXAS_EXIBICAO.padrao.pix}% para {TAXAS_EXIBICAO.elite.pix}% (e cartão de {TAXAS_EXIBICAO.padrao.cartao}% para {TAXAS_EXIBICAO.elite.cartao}%).
            {totalPlateia > 0 && totalInscricoes > 0 && (
              <span className="mt-0.5 block opacity-85">
                Economia: {formatBRL(economiaInscricoes)} em inscrições + {formatBRL(economiaPlateia)} em ingressos.
              </span>
            )}
          </p>

          {cobreAtivacao && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
              <Sparkles className="size-3.5 shrink-0" />
              <span>A economia de taxas cobre 100% da ativação do PRO!</span>
            </div>
          )}
        </div>

        {/* Benefícios Exclusivos do Plano PRO */}
        <div className="mt-3 space-y-2 rounded-xl bg-amber-900/40 p-3 text-xs text-amber-100">
          <div className="flex items-center gap-2">
            <Tv className="size-3.5 shrink-0 text-amber-400" />
            <span><strong>Modo Telão ao Vivo:</strong> Projetores e TVs sem propagandas.</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 shrink-0 text-amber-400" />
            <span><strong>Dossiê de Patrocínio:</strong> Relatório em PDF pronto para fechar marcas (+{formatBRL(potencialPatrocinio)}).</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-3.5 shrink-0 text-amber-400" />
            <span><strong>Troca de Duplas Automática:</strong> O titular resolve no painel sem chamar no Zap.</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-amber-400" />
            <span><strong>Disparos por E-mail:</strong> Comunicação automática com atletas e plateia.</span>
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
  );
}

export function CampeonatoRoiSimulator() {
  const [duplas, setDuplas] = useState<number>(32);
  const [valorDupla, setValorDupla] = useState<number>(180);
  const [ingressosPlateia, setIngressosPlateia] = useState<number>(80);
  const [valorIngresso, setValorIngresso] = useState<number>(25);

  const inputDuplasId = useId();
  const inputValorDuplaId = useId();
  const inputPlateiaId = useId();
  const inputValorIngressoId = useId();

  // Cálculos financeiros
  const totalInscricoes = Math.max(0, duplas) * Math.max(0, valorDupla);
  const totalPlateia = Math.max(0, ingressosPlateia) * Math.max(0, valorIngresso);
  const arrecadacaoTotal = totalInscricoes + totalPlateia;

  // Comparativo de Taxas: 1% de desconto no Plano PRO (8% -> 7% Pix, 10% -> 9% Cartão)
  const taxaPadraoPix = arrecadacaoTotal * (TAXAS_EXIBICAO.padrao.pix / 100);
  const taxaElitePix = arrecadacaoTotal * (TAXAS_EXIBICAO.elite.pix / 100);
  const economiaTaxas = Math.round(taxaPadraoPix - taxaElitePix);
  const economiaInscricoes = Math.round(totalInscricoes * 0.01);
  const economiaPlateia = Math.round(totalPlateia * 0.01);

  // Estimativa de captação de patrocínio facilitada pelas ferramentas PRO
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
        {/* Controles: Duplas, Inscrição, Ingressos e Valor do Ingresso */}
        <div className="space-y-4 lg:col-span-7">
          <SimulatorControl
            id={inputDuplasId}
            label="Quantidade de Duplas Esperadas"
            description={`Simule com qualquer quantidade (${duplas * 2} atletas participantes)`}
            value={duplas}
            suffix="duplas"
            min={1}
            sliderMax={128}
            step={1}
            inputWidth="w-16"
            onChange={setDuplas}
            marks={["1 dupla", "64 duplas", `${Math.max(128, duplas)} duplas`]}
          />

          <SimulatorControl
            id={inputValorDuplaId}
            label="Valor Médio da Inscrição por Dupla"
            description="Média estimada considerando todas as categorias do torneio"
            value={valorDupla}
            prefix="R$"
            min={0}
            sliderMax={350}
            step={5}
            inputWidth="w-20"
            onChange={setValorDupla}
            marks={["R$ 0", "R$ 180", `R$ ${Math.max(350, valorDupla)}`]}
          />

          <SimulatorControl
            id={inputPlateiaId}
            label="Ingressos de Plateia / Camarote"
            description="Quantidade total de ingressos de público estimados"
            value={ingressosPlateia}
            suffix="ingressos"
            min={0}
            sliderMax={200}
            step={5}
            inputWidth="w-16"
            onChange={setIngressosPlateia}
            marks={["0", "100", `${Math.max(200, ingressosPlateia)}`]}
          />

          <SimulatorControl
            id={inputValorIngressoId}
            label="Valor Médio por Ingresso"
            description="Média estimada entre os tipos (arquibancada, área VIP, camarote)"
            value={valorIngresso}
            prefix="R$"
            min={0}
            sliderMax={100}
            step={5}
            inputWidth="w-16"
            onChange={setValorIngresso}
            marks={["R$ 0", "R$ 50", `R$ ${Math.max(100, valorIngresso)}`]}
          />
        </div>

        {/* Card de Resultados e Benefícios */}
        <SimulatorResultsCard
          arrecadacaoTotal={arrecadacaoTotal}
          totalInscricoes={totalInscricoes}
          totalPlateia={totalPlateia}
          duplas={duplas}
          ingressosPlateia={ingressosPlateia}
          economiaTaxas={economiaTaxas}
          economiaInscricoes={economiaInscricoes}
          economiaPlateia={economiaPlateia}
          potencialPatrocinio={potencialPatrocinio}
        />
      </div>
    </div>
  );
}
