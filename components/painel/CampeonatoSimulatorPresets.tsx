"use client";

import { Zap, Trophy, Flame } from "lucide-react";

type PresetsProps = {
  currentDuplas: number;
  onApply: (duplas: number, valorInscricao: number, plateia: number, valorIngresso: number) => void;
};

export function CampeonatoSimulatorPresets({ currentDuplas, onApply }: PresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-gray-500">Exemplos:</span>
      <button
        type="button"
        onClick={() => onApply(24, 180, 40, 20)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentDuplas === 24
            ? "border-amber-500 bg-amber-500 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
        }`}
      >
        <Zap className="size-3" />
        24 Duplas
      </button>
      <button
        type="button"
        onClick={() => onApply(48, 250, 100, 25)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentDuplas === 48
            ? "border-amber-500 bg-amber-500 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
        }`}
      >
        <Trophy className="size-3" />
        48 Duplas
      </button>
      <button
        type="button"
        onClick={() => onApply(96, 320, 250, 35)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
          currentDuplas === 96
            ? "border-amber-500 bg-amber-500 text-white shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
        }`}
      >
        <Flame className="size-3" />
        96 Duplas
      </button>
    </div>
  );
}
