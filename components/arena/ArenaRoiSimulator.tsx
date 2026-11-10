"use client";

import { useState, useId } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/format";

type ArenaControlProps = {
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

function ArenaControl({
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
}: ArenaControlProps) {
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
        <div className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50/70 px-2.5 py-1 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500">
          {prefix && <span className="text-xs font-bold text-blue-700">{prefix}</span>}
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
            className={`${inputWidth} bg-transparent text-right text-base font-extrabold text-blue-600 outline-none`}
          />
          {suffix && <span className="text-xs font-bold text-blue-700">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={currentMax}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
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
  faturamentoTotal: number;
  faturamentoAlunos: number;
  faturamentoQuadras: number;
  alunos: number;
  horasQuadra: number;
  inadimplenciaEstimada: number;
  custoPlanoPro: number;
  lucroLiquidoRecuperado: number;
  multiplicadorRoi: string;
};

function ArenaSimulatorResultsCard({
  faturamentoTotal,
  faturamentoAlunos,
  faturamentoQuadras,
  alunos,
  horasQuadra,
  inadimplenciaEstimada,
  custoPlanoPro,
  lucroLiquidoRecuperado,
  multiplicadorRoi,
}: ResultsCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-900/90 p-5 text-white shadow-lg lg:col-span-5">
      <div>
        <div className="flex items-center justify-between border-b border-blue-800 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Faturamento Mensal Estimado
          </span>
          <span className="text-sm font-bold text-blue-100">
            {formatBRL(faturamentoTotal)}
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-blue-300/80">
          <span>{formatBRL(faturamentoAlunos)} alunos ({alunos} ativos)</span>
          <span>{formatBRL(faturamentoQuadras)} locações ({horasQuadra}h/sem)</span>
        </div>

        {/* Inadimplência evitada */}
        <div className="mt-4 rounded-xl bg-blue-800/80 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="size-4" />
            Dinheiro Recuperado (Inadimplência Zero)
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            + {formatBRL(inadimplenciaEstimada)}
            <span className="text-xs font-normal text-emerald-200"> /mês</span>
          </p>
          <p className="mt-1 text-[11px] leading-tight text-blue-200">
            Com a régua automática Asaas (Pix e Cartão), você elimina atrasos e cobranças manuais no WhatsApp.
          </p>
        </div>

        {/* Custo vs Lucro */}
        <div className="mt-4 space-y-2 border-t border-blue-800/60 pt-3 text-xs">
          <div className="flex justify-between text-blue-200">
            <span>Custo do Plano Arena PRO:</span>
            <span className="font-bold text-white">{formatBRL(custoPlanoPro)} /mês</span>
          </div>
          <div className="flex justify-between text-emerald-300">
            <span>Lucro líquido adicional:</span>
            <span className="font-bold text-emerald-300">+ {formatBRL(lucroLiquidoRecuperado)} /mês</span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center">
        <p className="text-xs font-bold text-emerald-300">
          ⚡ O sistema se paga {multiplicadorRoi}x todo mês na sua arena!
        </p>
        <p className="mt-1 text-[11px] text-blue-200">
          Custa menos do que a mensalidade de 1 único aluno.
        </p>
      </div>
    </div>
  );
}

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

  return (
    <div className="rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/60 via-white to-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
            <Sparkles className="size-3.5 text-blue-600" />
            Simulador de Retorno da Arena
          </span>
          <h3 className="mt-2 text-xl font-black text-gray-900 md:text-2xl">
            Veja quanto sua arena deixa de perder todo mês
          </h3>
          <p className="text-sm text-gray-600">
            Ajuste a quantidade de alunos, mensalidade e aluguel de quadras para calcular o retorno real com o Plano PRO.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Controles da Arena */}
        <div className="space-y-4 lg:col-span-7">
          {/* Controle 1: Alunos Ativos */}
          <ArenaControl
            id={inputAlunosId}
            label="Quantidade de Alunos Ativos"
            description="Total de alunos matriculados nas turmas da sua arena"
            value={alunos}
            suffix="alunos"
            min={1}
            sliderMax={150}
            step={1}
            inputWidth="w-16"
            onChange={setAlunos}
            marks={["1 aluno", "75 alunos", `${Math.max(150, alunos)} alunos`]}
          />

          {/* Controle 2: Mensalidade Média */}
          <ArenaControl
            id={inputMensalidadeId}
            label="Mensalidade Média por Aluno"
            description="Média estimada entre os planos e frequências (1x, 2x ou 3x na semana)"
            value={mensalidade}
            prefix="R$"
            min={0}
            sliderMax={300}
            step={5}
            inputWidth="w-20"
            onChange={setMensalidade}
            marks={["R$ 0", "R$ 150", `R$ ${Math.max(300, mensalidade)}`]}
          />

          {/* Controle 3: Horas de Quadra Alugadas por Semana */}
          <ArenaControl
            id={inputHorasId}
            label="Horas de Quadra Alugadas por Semana"
            description="Total de horas semanais locadas para jogos avulsos e mensalistas"
            value={horasQuadra}
            suffix="h/sem"
            min={0}
            sliderMax={40}
            step={1}
            inputWidth="w-16"
            onChange={setHorasQuadra}
            marks={["0h", "20h", `${Math.max(40, horasQuadra)}h`]}
          />

          {/* Controle 4: Valor Médio por Hora de Quadra */}
          <ArenaControl
            id={inputValorHoraId}
            label="Valor Médio da Hora de Quadra"
            description="Média cobrada por hora de aluguel (diurno, noturno e fins de semana)"
            value={valorHora}
            prefix="R$"
            min={0}
            sliderMax={150}
            step={5}
            inputWidth="w-20"
            onChange={setValorHora}
            marks={["R$ 0", "R$ 75", `R$ ${Math.max(150, valorHora)}`]}
          />
        </div>

        {/* Card de Resultados e ROI */}
        <ArenaSimulatorResultsCard
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
