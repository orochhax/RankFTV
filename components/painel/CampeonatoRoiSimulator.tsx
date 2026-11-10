"use client";

import { useState, useId } from "react";
import { Sparkles } from "lucide-react";
import { ModernSimulatorControl } from "@/components/simulators/ModernSimulatorControl";
import { CampeonatoResultsCard } from "@/components/painel/CampeonatoResultsCard";
import { CampeonatoSimulatorPresets } from "@/components/painel/CampeonatoSimulatorPresets";

export function CampeonatoRoiSimulator() {
  const [duplas, setDuplas] = useState<number>(48);
  const [valorInscricao, setValorInscricao] = useState<number>(250);
  const [ingressosPlateia, setIngressosPlateia] = useState<number>(100);
  const [valorIngresso, setValorIngresso] = useState<number>(25);

  const inputDuplasId = useId();
  const inputValorInscricaoId = useId();
  const inputPlateiaId = useId();
  const inputValorIngressoId = useId();

  // Cálculos financeiros
  const totalInscricoes = Math.max(0, duplas) * Math.max(0, valorInscricao);
  const totalPlateia = Math.max(0, ingressosPlateia) * Math.max(0, valorIngresso);
  const arrecadacaoTotal = totalInscricoes + totalPlateia;

  const economiaInscricoes = Math.round(totalInscricoes * 0.01);
  const economiaPlateia = Math.round(totalPlateia * 0.01);
  const economiaTaxas = economiaInscricoes + economiaPlateia;

  const potencialPatrocinio = 1500;

  const applyPreset = (d: number, vi: number, ing: number, ving: number) => {
    setDuplas(d);
    setValorInscricao(vi);
    setIngressosPlateia(ing);
    setValorIngresso(ving);
  };

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 via-white to-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            <Sparkles className="size-3.5 text-amber-600" />
            Simulador de Lucro do Campeonato
          </span>
          <h3 className="mt-2 text-xl font-black text-gray-900 md:text-2xl">
            Simule o retorno do seu torneio com o Plano PRO
          </h3>
          <p className="text-sm text-gray-600">
            Descubra a economia de taxas e o potencial de captação de patrocínio com as ferramentas exclusivas.
          </p>
        </div>

        <CampeonatoSimulatorPresets currentDuplas={duplas} onApply={applyPreset} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-4 lg:col-span-7">
          <ModernSimulatorControl
            id={inputDuplasId}
            label="Quantidade de Duplas Esperadas"
            description="Total de duplas inscritas no campeonato"
            value={duplas}
            onChange={setDuplas}
            min={1}
            sliderMax={128}
            step={1}
            suffix="duplas"
            accentColor="amber"
            marks={["1 dupla", "64 duplas", `${Math.max(128, duplas)} duplas`]}
          />

          <ModernSimulatorControl
            id={inputValorInscricaoId}
            label="Valor Médio da Inscrição por Dupla"
            description="Valor médio da inscrição cobrado por dupla"
            value={valorInscricao}
            onChange={setValorInscricao}
            min={0}
            sliderMax={400}
            step={10}
            prefix="R$"
            accentColor="amber"
            marks={["R$ 0", "R$ 200", `R$ ${Math.max(400, valorInscricao)}`]}
          />

          <ModernSimulatorControl
            id={inputPlateiaId}
            label="Ingressos de Plateia / Camarote"
            description="Quantidade de ingressos avulsos vendidos para o público"
            value={ingressosPlateia}
            onChange={setIngressosPlateia}
            min={0}
            sliderMax={300}
            step={10}
            suffix="ing."
            accentColor="amber"
            marks={["0", "150", `${Math.max(300, ingressosPlateia)}`]}
          />

          <ModernSimulatorControl
            id={inputValorIngressoId}
            label="Valor Médio por Ingresso de Plateia"
            description="Preço médio cobrado no ingresso de arquibancada ou camarote"
            value={valorIngresso}
            onChange={setValorIngresso}
            min={0}
            sliderMax={100}
            step={5}
            prefix="R$"
            accentColor="amber"
            marks={["R$ 0", "R$ 50", `R$ ${Math.max(100, valorIngresso)}`]}
          />
        </div>

        <CampeonatoResultsCard
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
