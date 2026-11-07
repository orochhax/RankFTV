"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Check, Info, Sparkles, X, ShieldCheck, ArrowRight, Zap } from "lucide-react";
import {
  ARENA_PLATFORM_TIERS,
  ARENA_BENEFITS_COMPARISON,
  type ArenaBenefitDetail,
  type ArenaPlatformTierId,
} from "@/lib/arena-platform-plans";

function PlanCardStart({
  currentTier,
  onSelectTier,
}: {
  currentTier: ArenaPlatformTierId;
  onSelectTier?: (tierId: ArenaPlatformTierId) => void;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all md:p-8 ${
        currentTier === "start"
          ? "border-gray-300 bg-white shadow-sm ring-2 ring-gray-900/5"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Plano Inicial
          </span>
          {currentTier === "start" && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Plano Atual
            </span>
          )}
        </div>
        <h3 className="mt-2 text-2xl font-black text-gray-900">
          {ARENA_PLATFORM_TIERS.start.nome}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {ARENA_PLATFORM_TIERS.start.descricao}
        </p>

        <div className="mt-6 border-y border-gray-100 py-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight text-gray-900">
              R$ 0
            </span>
            <span className="text-sm font-semibold text-gray-500">
              /mês de mensalidade fixa
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-gray-50 p-3 text-xs font-medium text-gray-700">
            ⚡ Cobrança de <strong className="text-gray-900">R$ 4,90 por aluno / mês (recorrente)</strong> limitada a no máximo 30 alunos.
          </div>
        </div>
      </div>

      <div className="mt-6">
        {currentTier === "start" ? (
          <div className="w-full rounded-xl bg-gray-100 py-3 text-center text-sm font-bold text-gray-600">
            Seu Plano Atual
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTier?.("start")}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 text-center text-sm font-bold text-gray-800 transition hover:bg-gray-50"
          >
            Permanecer no Start
          </button>
        )}
      </div>
    </div>
  );
}

function PlanCardPro({
  currentTier,
  arenaHandle,
  onSelectTier,
}: {
  currentTier: ArenaPlatformTierId;
  arenaHandle?: string;
  onSelectTier?: (tierId: ArenaPlatformTierId) => void;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl border-2 p-6 shadow-md transition-all md:p-8 ${
        currentTier === "pro"
          ? "border-blue-600 bg-white ring-4 ring-blue-500/10"
          : "border-blue-600 bg-gradient-to-b from-blue-50/40 via-white to-white"
      }`}
    >
      <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
        ⭐ Recomendado para Arenas
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Crescimento Ilimitado
          </span>
          {currentTier === "pro" && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              Plano Atual
            </span>
          )}
        </div>
        <h3 className="mt-2 flex items-center gap-2 text-2xl font-black text-gray-900">
          {ARENA_PLATFORM_TIERS.pro.nome}
          <Zap className="size-5 fill-amber-400 text-amber-500" />
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {ARENA_PLATFORM_TIERS.pro.descricao}
        </p>

        <div className="mt-6 border-y border-blue-100 py-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight text-blue-600">
              R$ 139
            </span>
            <span className="text-sm font-bold text-gray-700">
              ,00 /mês
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-900">
            ✨ <strong className="font-bold text-blue-950">Alunos Ilimitados:</strong> zero taxa por aluno. Economize dinheiro e automatize todo o dia a dia da arena.
          </div>
        </div>
      </div>

      <div className="mt-6">
        {currentTier === "pro" ? (
          <div className="w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-sm">
            Plano Pro Ativo
          </div>
        ) : arenaHandle ? (
          <Link
            href={`/arena/${arenaHandle}/assinatura/checkout`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <Sparkles className="size-4" />
            Assinar Plano Pro
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTier?.("pro")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
          >
            <Sparkles className="size-4" />
            Assinar Plano Pro
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function BenefitTableRow({
  benefit,
  isSeloPosition,
  isTooltipOpen,
  onToggleTooltip,
  onCloseTooltip,
}: {
  benefit: ArenaBenefitDetail;
  isSeloPosition: boolean;
  isTooltipOpen: boolean;
  onToggleTooltip: () => void;
  onCloseTooltip: () => void;
}) {
  return (
    <div
      className={`relative grid min-w-[640px] grid-cols-12 items-center px-6 py-4 text-sm transition-colors hover:bg-gray-50/70 ${
        benefit.destaque ? "bg-amber-50/20" : ""
      }`}
    >
      <div className="col-span-6 flex items-center gap-2">
        <span className="font-semibold text-gray-900">{benefit.titulo}</span>

        {isSeloPosition && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
            <ShieldCheck className="size-3.5 text-amber-600" />
            Destaque VIP
          </span>
        )}

        <div className="relative inline-block">
          <button
            type="button"
            onClick={onToggleTooltip}
            aria-label={`Informações sobre ${benefit.titulo}`}
            aria-expanded={isTooltipOpen}
            className="flex size-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-blue-600 active:scale-90"
          >
            <Info className="size-3.5" />
          </button>

          {isTooltipOpen && (
            <div
              role="tooltip"
              className="absolute left-0 top-7 z-50 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-gray-900">{benefit.titulo}</p>
                <button
                  type="button"
                  onClick={onCloseTooltip}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                {benefit.descricaoCurta}
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px]">
                <span className="text-gray-500">No Pro:</span>
                <span className="font-bold text-blue-600">{benefit.proValor}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-3 text-center text-xs text-gray-700">
        {benefit.startIncluso ? (
          <span className="font-medium">{benefit.startValor}</span>
        ) : (
          <span className="font-medium text-gray-400">Não incluso</span>
        )}
      </div>

      <div className="col-span-3 text-center text-xs font-bold text-blue-600">
        <span className="inline-flex items-center gap-1">
          <Check className="size-4 shrink-0 text-emerald-600" />
          {benefit.proValor}
        </span>
      </div>
    </div>
  );
}

export function ArenaPlansComparison({
  currentTier = "start",
  arenaHandle,
  onSelectTier,
}: {
  currentTier?: ArenaPlatformTierId;
  arenaHandle?: string;
  onSelectTier?: (tierId: ArenaPlatformTierId) => void;
}) {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveTooltipId(null);
      }
    }

    if (activeTooltipId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [activeTooltipId]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PlanCardStart currentTier={currentTier} onSelectTier={onSelectTier} />
        <PlanCardPro currentTier={currentTier} arenaHandle={arenaHandle} onSelectTier={onSelectTier} />
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50/75 px-6 py-4">
          <h4 className="text-base font-bold text-gray-900">
            Comparativo de Recursos & Benefícios
          </h4>
          <p className="text-xs text-gray-500">
            Toque no ícone <span className="inline-flex items-center text-blue-600 font-bold">(i)</span> para entender como cada recurso ajuda sua arena.
          </p>
        </div>

        <div className="divide-y divide-gray-100 overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-12 bg-gray-50/40 px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-6">Benefício / Recurso</div>
            <div className="col-span-3 text-center">Plano Start</div>
            <div className="col-span-3 text-center text-blue-600">Plano Pro</div>
          </div>

          {ARENA_BENEFITS_COMPARISON.map((benefit: ArenaBenefitDetail, idx: number) => (
            <BenefitTableRow
              key={benefit.id}
              benefit={benefit}
              isSeloPosition={idx === 2}
              isTooltipOpen={activeTooltipId === benefit.id}
              onToggleTooltip={() => setActiveTooltipId((prev) => (prev === benefit.id ? null : benefit.id))}
              onCloseTooltip={() => setActiveTooltipId(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
