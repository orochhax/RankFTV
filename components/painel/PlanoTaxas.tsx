"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2 } from "lucide-react";
import { tornarCampeonatoElite } from "@/app/painel/campeonatos/[id]/financeiro/actions";

type Taxas = {
  pixFixo: number;
  debitoPercent: number;
  debitoFixo: number;
  creditoPercent: number;
  creditoFixo: number;
};

const PRECO_ELITE = 178;

function brl(n: number) {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function LinhasTaxa({ t }: { t: Taxas }) {
  return (
    <ul className="space-y-1.5 text-sm">
      <li className="flex justify-between">
        <span className="text-gray-500">⚡ Pix</span>
        <span className="font-medium text-gray-900">{brl(t.pixFixo)} fixo</span>
      </li>
      <li className="flex justify-between">
        <span className="text-gray-500">🏦 Débito</span>
        <span className="font-medium text-gray-900">
          {t.debitoPercent.toFixed(2).replace(".", ",")}% + {brl(t.debitoFixo)}
        </span>
      </li>
      <li className="flex justify-between">
        <span className="text-gray-500">💳 Crédito</span>
        <span className="font-medium text-gray-900">
          {t.creditoPercent.toFixed(2).replace(".", ",")}% + {brl(t.creditoFixo)}
        </span>
      </li>
    </ul>
  );
}

export function PlanoTaxas({
  champId,
  isElite,
  padrao,
  elite,
}: {
  champId: string;
  isElite: boolean;
  padrao: Taxas;
  elite: Taxas;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleAtivar() {
    setErro(null);
    if (
      !confirm(
        `Tornar este campeonato Elite por ${brl(PRECO_ELITE)}?\n\nVocê passa a pagar as taxas reduzidas (Elite) em cada inscrição paga.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await tornarCampeonatoElite(champId);
      if (res.ok) router.refresh();
      else setErro(res.error ?? "Erro ao ativar o Elite.");
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Plano de taxas
        </h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isElite
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {isElite && <Crown className="size-3.5" />}
          {isElite ? "Elite ativo" : "Plano Padrão"}
        </span>
      </div>

      <div className="grid gap-3">
        {/* Elite (em cima) */}
        <div
          className={`rounded-2xl p-4 ring-1 ${
            isElite ? "bg-amber-50 ring-amber-300" : "bg-white ring-black/5"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Crown className="size-4 text-amber-500" /> Elite
            </p>
            {isElite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Check className="size-3" /> Atual
              </span>
            )}
          </div>
          <LinhasTaxa t={elite} />

          {!isElite && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleAtivar}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Crown className="size-4" />
                )}
                Tornar meu campeonato Elite — {brl(PRECO_ELITE)}
              </button>
              {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
            </div>
          )}
        </div>

        {/* Padrão (embaixo) */}
        <div
          className={`rounded-2xl bg-white p-4 ring-1 ${
            isElite ? "ring-black/5 opacity-70" : "ring-blue-300"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Padrão</p>
            {!isElite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <Check className="size-3" /> Atual
              </span>
            )}
          </div>
          <LinhasTaxa t={padrao} />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        As taxas são descontadas do repasse a cada inscrição paga. No plano Elite
        elas ficam menores.
      </p>
    </section>
  );
}
