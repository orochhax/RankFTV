"use client";

import { useState, useId } from "react";
import { Sparkles } from "lucide-react";
import { ModernSimulatorControl } from "@/components/simulators/ModernSimulatorControl";
import { ArenaResultsCard } from "@/components/arena/ArenaResultsCard";
import { ArenaSimulatorPresets } from "@/components/arena/ArenaSimulatorPresets";

export function ArenaRoiSimulator() {
  const [alunos, setAlunos] = useState<number>(60);
  const [mensalidade, setMensalidade] = useState<number>(160);
  const [horasQuadra, setHorasQuadra] = useState<number>(15);
  const [valorHora, setValorHora] = useState<number>(80);

  const inputAlunosId = useId();
  const inputMensalidadeId = useId();
  const inputHorasId = useId();
  const inputValorHoraId = useId();

  // Cálculos financeiros
  const faturamentoAlunos = Math.max(0, alunos) * Math.max(0, mensalidade);
  const faturamentoQuadras = Math.max(0, horasQuadra) * 4 * Math.max(0, valorHora); // 4 semanas no mês
  const faturamentoTotal = faturamentoAlunos + faturamentoQuadras;

  // Inadimplência média no Brasil sem régua automática: 12%
  const inadimplenciaEstimada = Math.round(faturamentoAlunos * 0.12);
  const custoPlanoPro = 139; // R$ 139/mês
  const lucroLiquidoRecuperado = Math.max(0, inadimplenciaEstimada - custoPlanoPro);
  const multiplicadorRoi = custoPlanoPro > 0
    ? (inadimplenciaEstimada / custoPlanoPro).toFixed(1)
    : "0.0";

  const applyPreset = (al: number, men: number, hq: number, vh: number) => {
    setAlunos(al);
    setMensalidade(men);
    setHorasQuadra(hq);
    setValorHora(vh);
  };

  return (
    <div className="rounded-3xl border border-brand-border bg-gradient-to-b from-brand-soft/60 via-white to-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-ink">
            <Sparkles className="size-3.5 text-brand" />
            Simulador de Retorno da Arena
          </span>
          <h3 className="mt-2 text-xl font-black text-gray-900 md:text-2xl">
            Veja quanto sua arena deixa de perder todo mês
          </h3>
          <p className="text-sm text-gray-600">
            Ajuste a quantidade de alunos, mensalidade e aluguel de quadras para calcular o retorno real com o Plano PRO.
          </p>
        </div>

        <ArenaSimulatorPresets currentAlunos={alunos} onApply={applyPreset} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-4 lg:col-span-7">
          <ModernSimulatorControl
            id={inputAlunosId}
            label="Quantidade de Alunos Ativos"
            description="Total de alunos matriculados nas turmas da sua arena"
            value={alunos}
            onChange={setAlunos}
            min={1}
            sliderMax={180}
            step={1}
            suffix="alunos"
            accentColor="brand"
            marks={["1 aluno", "90 alunos", `${Math.max(180, alunos)} alunos`]}
          />

          <ModernSimulatorControl
            id={inputMensalidadeId}
            label="Mensalidade Média por Aluno"
            description="Média estimada entre os planos e frequências semanais"
            value={mensalidade}
            onChange={setMensalidade}
            min={0}
            sliderMax={350}
            step={5}
            prefix="R$"
            accentColor="brand"
            marks={["R$ 0", "R$ 175", `R$ ${Math.max(350, mensalidade)}`]}
          />

          <ModernSimulatorControl
            id={inputHorasId}
            label="Horas de Quadra Alugadas por Semana"
            description="Total de horas semanais locadas para jogos avulsos e mensalistas"
            value={horasQuadra}
            onChange={setHorasQuadra}
            min={0}
            sliderMax={50}
            step={1}
            suffix="h/sem"
            accentColor="brand"
            marks={["0h", "25h", `${Math.max(50, horasQuadra)}h`]}
          />

          <ModernSimulatorControl
            id={inputValorHoraId}
            label="Valor Médio da Hora de Quadra"
            description="Preço médio cobrado por hora de locação da quadra de areia"
            value={valorHora}
            onChange={setValorHora}
            min={0}
            sliderMax={150}
            step={5}
            prefix="R$"
            accentColor="brand"
            marks={["R$ 0", "R$ 75", `R$ ${Math.max(150, valorHora)}`]}
          />
        </div>

        <ArenaResultsCard
          faturamentoTotal={faturamentoTotal}
          faturamentoAlunos={faturamentoAlunos}
          faturamentoQuadras={faturamentoQuadras}
          alunos={alunos}
          horasQuadra={horasQuadra}
          inadimplenciaEstimada={inadimplenciaEstimada}
          custoPlanoPro={custoPlanoPro}
          lucroLiquidoRecuperado={lucroLiquidoRecuperado}
          multiplicadorRoi={multiplicadorRoi}
        />
      </div>
    </div>
  );
}
