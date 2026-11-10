"use client";

import { useState, useId } from "react";
import { TrendingUp, ShieldCheck, DollarSign, Sparkles, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/format";

export function ArenaRoiSimulator() {
  const [alunos, setAlunos] = useState<number>(60);
  const [mensalidade, setMensalidade] = useState<number>(160);
  const [horasQuadra, setHorasQuadra] = useState<number>(15);
  const valorHora = 80; // média R$ 80/hora

  const inputAlunosId = useId();
  const inputMensalidadeId = useId();
  const inputHorasId = useId();

  // Cálculos
  const faturamentoAlunos = alunos * mensalidade;
  const faturamentoQuadras = horasQuadra * 4 * valorHora; // 4 semanas no mês
  const faturamentoTotal = faturamentoAlunos + faturamentoQuadras;

  // Inadimplência média no Brasil sem régua automática: 12%
  const inadimplenciaEstimada = Math.round(faturamentoAlunos * 0.12);
  const custoPlanoPro = 139; // R$ 139/mês
  const lucroLiquidoRecuperado = inadimplenciaEstimada - custoPlanoPro;
  const multiplicadorRoi = (inadimplenciaEstimada / custoPlanoPro).toFixed(1);

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
            Ajuste a quantidade de alunos e mensalidade para calcular o retorno real com o Plano PRO.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Controles Sliders */}
        <div className="space-y-5 lg:col-span-7">
          {/* Slider 1: Alunos */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputAlunosId} className="font-semibold text-gray-700">
                Quantidade de Alunos Ativos:
              </label>
              <span className="text-base font-extrabold text-blue-600">
                {alunos} alunos
              </span>
            </div>
            <input
              id={inputAlunosId}
              type="range"
              min={15}
              max={250}
              step={5}
              value={alunos}
              onChange={(e) => setAlunos(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>15 alunos</span>
              <span>120 alunos</span>
              <span>250+ alunos</span>
            </div>
          </div>

          {/* Slider 2: Mensalidade */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputMensalidadeId} className="font-semibold text-gray-700">
                Mensalidade Média por Aluno:
              </label>
              <span className="text-base font-extrabold text-blue-600">
                {formatBRL(mensalidade)} /mês
              </span>
            </div>
            <input
              id={inputMensalidadeId}
              type="range"
              min={80}
              max={350}
              step={10}
              value={mensalidade}
              onChange={(e) => setMensalidade(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>R$ 80</span>
              <span>R$ 200</span>
              <span>R$ 350</span>
            </div>
          </div>

          {/* Slider 3: Aluguel de Quadras */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={inputHorasId} className="font-semibold text-gray-700">
                Horas de Quadra Alugadas por Semana:
              </label>
              <span className="text-base font-extrabold text-blue-600">
                {horasQuadra}h /semana (~{formatBRL(faturamentoQuadras)}/mês)
              </span>
            </div>
            <input
              id={inputHorasId}
              type="range"
              min={0}
              max={50}
              step={5}
              value={horasQuadra}
              onChange={(e) => setHorasQuadra(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>0h</span>
              <span>25h</span>
              <span>50h</span>
            </div>
          </div>
        </div>

        {/* Card de Resultados e ROI */}
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
                Com a régua automática Asaas (Pix e Cartão), você elimina atrasos e esquecimentos de alunos.
              </p>
            </div>

            {/* Custo vs Lucro */}
            <div className="mt-4 space-y-2 border-t border-blue-800/60 pt-3 text-xs">
              <div className="flex justify-between text-blue-200">
                <span>Custo do Plano Arena PRO:</span>
                <span className="font-bold text-white">R$ 139,00 /mês</span>
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
      </div>
    </div>
  );
}
