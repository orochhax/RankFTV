"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, Lock } from "lucide-react";
import { tornarCampeonatoElite } from "@/app/painel/campeonatos/[id]/financeiro/actions";
import { PRECO_ELITE } from "@/lib/elite";
import { TAXAS_EXIBICAO } from "@/lib/taxas";

function brl(n: number) {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function LinhasTaxa({ pix, cartao }: { pix: number; cartao: number }) {
  return (
    <ul className="space-y-1.5 text-sm">
      <li className="flex justify-between">
        <span className="text-gray-500">⚡ Pix</span>
        <span className="font-medium text-gray-900">{pix}%</span>
      </li>
      <li className="flex justify-between">
        <span className="text-gray-500">💳 Cartão (crédito/débito)</span>
        <span className="font-medium text-gray-900">{cartao}%</span>
      </li>
      <li className="flex justify-between">
        <span className="text-gray-500">Mínimo</span>
        <span className="font-medium text-gray-900">{brl(TAXAS_EXIBICAO.minimo)}</span>
      </li>
    </ul>
  );
}

export function PlanoTaxas({
  champId,
  isElite,
  status,
  feePendente,
}: {
  champId: string;
  isElite: boolean;
  /** Status do campeonato — Elite só ativa com inscrições abertas/rascunho. */
  status: string;
  /** Quanto da ativação Elite (R$178) ainda falta abater dos repasses. */
  feePendente: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const inscricoesAbertas = status === "rascunho" || status === "inscricoes_abertas";
  const podeAtivar = !isElite && inscricoesAbertas;
  const feeQuitada = feePendente <= 0;

  function handleAtivar() {
    setErro(null);
    if (
      !confirm(
        `Tornar este campeonato Elite?\n\n` +
          `Você NÃO paga nada agora. Os ${brl(PRECO_ELITE)} da ativação são ` +
          `descontados automaticamente das suas próximas inscrições pagas. ` +
          `A partir daí a taxa que o comprador paga fica menor (Elite).`,
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
            isElite ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isElite && <Crown className="size-3.5" />}
          {isElite ? "Elite ativo" : "Plano Padrão"}
        </span>
      </div>

      <div className="grid gap-3">
        {/* Elite (em cima) */}
        <div className={`rounded-2xl p-4 ring-1 ${isElite ? "bg-amber-50 ring-amber-300" : "bg-white ring-black/5"}`}>
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
          <LinhasTaxa pix={TAXAS_EXIBICAO.elite.pix} cartao={TAXAS_EXIBICAO.elite.cartao} />

          {isElite && (
            <div className="mt-3 border-t border-amber-200/60 pt-3">
              {feeQuitada ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" />
                  Ativação de {brl(PRECO_ELITE)} já quitada.
                </p>
              ) : (
                <p className="text-xs text-amber-700">
                  Ativação de {brl(PRECO_ELITE)} — faltam{" "}
                  <strong>{brl(feePendente)}</strong> a descontar das próximas inscrições pagas.
                </p>
              )}
            </div>
          )}

          {podeAtivar && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={handleAtivar}
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                Tornar meu campeonato Elite
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Sem cobrança agora — os {brl(PRECO_ELITE)} saem das próximas inscrições.
              </p>
              {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
            </div>
          )}

          {!isElite && !inscricoesAbertas && (
            <div className="mt-4 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-400">
              <Lock className="size-3.5" />
              Ativação Elite indisponível — as inscrições já encerraram.
            </div>
          )}
        </div>

        {/* Padrão (embaixo) */}
        <div className={`rounded-2xl bg-white p-4 ring-1 ${isElite ? "ring-black/5 opacity-70" : "ring-blue-300"}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Padrão</p>
            {!isElite && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                <Check className="size-3" /> Atual
              </span>
            )}
          </div>
          <LinhasTaxa pix={TAXAS_EXIBICAO.padrao.pix} cartao={TAXAS_EXIBICAO.padrao.cartao} />
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        A taxa é paga pelo comprador (somada ao valor) — você recebe o valor cheio de cada
        inscrição. No plano Elite a taxa do comprador fica menor.
      </p>
    </section>
  );
}
