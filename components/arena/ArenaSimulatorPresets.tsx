"use client";

import { Zap, Building2, Flame } from "lucide-react";

type ArenaPresetsProps = {
  currentAlunos: number;
  onApply: (alunos: number, mensalidade: number, horasQuadra: number, valorHora: number) => void;
};

export function ArenaSimulatorPresets({ currentAlunos, onApply }: ArenaPresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-gray-500">Exemplos:</span>
      <button
        type="button"
        onClick={() => onApply(35, 150, 8, 70)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentAlunos === 35
            ? "border-blue-600 bg-blue-600 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
        }`}
      >
        <Zap className="size-3" />
        Iniciante (35)
      </button>
      <button
        type="button"
        onClick={() => onApply(70, 180, 20, 85)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentAlunos === 70
            ? "border-blue-600 bg-blue-600 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
        }`}
      >
        <Building2 className="size-3" />
        Média (70)
      </button>
      <button
        type="button"
        onClick={() => onApply(150, 220, 40, 100)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentAlunos === 150
            ? "border-blue-600 bg-blue-600 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
        }`}
      >
        <Flame className="size-3" />
        Complexo (150)
      </button>
    </div>
  );
}
