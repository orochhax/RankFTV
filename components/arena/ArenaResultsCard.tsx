"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/format";

export type ArenaResultsCardProps = {
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

export function ArenaResultsCard({
  faturamentoTotal,
  faturamentoAlunos,
  faturamentoQuadras,
  alunos,
  horasQuadra,
  inadimplenciaEstimada,
  custoPlanoPro,
  lucroLiquidoRecuperado,
  multiplicadorRoi,
}: ArenaResultsCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-white shadow-xl backdrop-blur-md lg:col-span-5">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Faturamento Mensal Estimado
          </span>
          <span className="text-lg font-black text-blue-400">
            {formatBRL(faturamentoTotal)}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{formatBRL(faturamentoAlunos)} alunos ({alunos} ativos)</span>
          <span>{formatBRL(faturamentoQuadras)} locações ({horasQuadra}h/sem)</span>
        </div>

        {/* Bloco de Inadimplência Zero */}
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <ShieldCheck className="size-4 text-emerald-400" />
              Dinheiro Recuperado (Inadimplência Zero)
            </span>
            <span className="rounded-md bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Régua Asaas
            </span>
          </div>

          <p className="mt-1.5 text-3xl font-black text-emerald-400">
            + {formatBRL(inadimplenciaEstimada)}
            <span className="text-xs font-normal text-slate-300"> /mês</span>
          </p>

          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Com cobranças automáticas no Pix e Cartão, você elimina atrasos e esquecimentos de alunos sem desgaste manual.
          </p>
        </div>

        {/* Custo vs Lucro */}
        <div className="mt-4 space-y-2 rounded-2xl bg-slate-800/50 p-4 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Custo do Plano Arena PRO:</span>
            <span className="font-bold text-white">{formatBRL(custoPlanoPro)} /mês</span>
          </div>
          <div className="flex justify-between text-emerald-300 pt-1 border-t border-slate-700/60">
            <span>Lucro líquido adicional:</span>
            <span className="font-extrabold text-emerald-400">+ {formatBRL(lucroLiquidoRecuperado)} /mês</span>
          </div>
        </div>
      </div>

      {/* Selo de Retorno */}
      <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-xs font-extrabold text-emerald-300 flex items-center justify-center gap-1.5">
          <Sparkles className="size-4 text-emerald-400" />
          O sistema se paga {multiplicadorRoi}x todo mês na sua arena!
        </p>
        <p className="mt-1 text-[11px] text-slate-300">
          Custa menos do que a mensalidade de 1 único aluno.
        </p>
      </div>
    </div>
  );
}
