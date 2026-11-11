"use client";

import { Minus, Plus } from "lucide-react";

export type ModernSimulatorControlProps = {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  sliderMax: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  accentColor?: "amber" | "brand" | "teal";
  marks?: [string, string, string];
};

const THEMES = {
  amber: {
    color: "#f59e0b",
    focus: "focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20",
    btn: "hover:bg-amber-100 text-amber-700 active:scale-95",
    badge: "bg-amber-50 border-amber-200",
    val: "text-amber-600",
    accent: "accent-amber-500",
  },
  brand: {
    color: "#ff5d00",
    focus: "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
    btn: "hover:bg-brand-border/40 text-brand-ink active:scale-95",
    badge: "bg-brand-soft border-brand-border",
    val: "text-brand-ink",
    accent: "accent-brand",
  },
  teal: {
    color: "#0e4937",
    focus: "focus-within:border-brand-dark focus-within:ring-2 focus-within:ring-brand-dark/20",
    btn: "hover:bg-border/50 text-ink active:scale-95",
    badge: "bg-surface-2 border-border",
    val: "text-brand-dark",
    accent: "accent-brand-dark",
  },
} as const;

export function ModernSimulatorControl({
  id,
  label,
  description,
  value,
  onChange,
  min = 0,
  sliderMax,
  step = 1,
  prefix,
  suffix,
  accentColor = "amber",
  marks,
}: ModernSimulatorControlProps) {
  const currentMax = Math.max(sliderMax, value);
  const percent = Math.min(100, Math.max(0, ((value - min) / (currentMax - min || 1)) * 100));
  const t = THEMES[accentColor];

  const handleInputChange = (raw: string) => {
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, parsed));
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-[280px]">
          <label htmlFor={id} className="text-sm font-bold text-gray-800">
            {label}
          </label>
          <p className="mt-0.5 text-xs text-gray-500 leading-snug">{description}</p>
        </div>

        <div className={`flex items-center gap-1 rounded-xl border p-1 shadow-inner transition-all ${t.badge} ${t.focus}`}>
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - step))}
            disabled={value <= min}
            aria-label={`Diminuir ${label}`}
            className={`inline-flex size-7.5 items-center justify-center rounded-lg bg-white shadow-xs transition-transform disabled:opacity-30 disabled:cursor-not-allowed ${t.btn}`}
          >
            <Minus className="size-3.5" />
          </button>

          <div className="flex items-center px-1.5 min-w-[70px] justify-center">
            {prefix && <span className="text-xs font-bold text-gray-500 mr-0.5">{prefix}</span>}
            <input
              id={id}
              type="number"
              min={min}
              step={step}
              value={value === 0 ? "" : value}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`w-14 bg-transparent text-center text-base font-black ${t.val} outline-none`}
            />
            {suffix && <span className="text-xs font-bold text-gray-500 ml-0.5">{suffix}</span>}
          </div>

          <button
            type="button"
            onClick={() => onChange(value + step)}
            aria-label={`Aumentar ${label}`}
            className={`inline-flex size-7.5 items-center justify-center rounded-lg bg-white shadow-xs transition-transform ${t.btn}`}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3.5">
        <input
          type="range"
          min={min}
          max={currentMax}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, ${t.color} 0%, ${t.color} ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`,
          }}
          className={`h-2.5 w-full cursor-pointer appearance-none rounded-lg ${t.accent} focus:outline-none`}
        />
        {marks && (
          <div className="mt-1.5 flex justify-between text-[11px] font-medium text-gray-400">
            <span>{marks[0]}</span>
            <span className="text-gray-500">{marks[1]}</span>
            <span>{marks[2]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
