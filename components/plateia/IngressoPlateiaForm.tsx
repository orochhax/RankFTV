"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Ticket, Minus, Plus } from "lucide-react";
import { comprarIngresso, type ComprarState } from "@/app/campeonatos/[id]/plateia/actions";
import { formatBRL } from "@/lib/format";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";
import { CupomInput, type CupomAplicado } from "@/components/ui/CupomInput";

type Tipo = { id: string; nome: string; valor: number; loteNome?: string | null; esgotado?: boolean };

export function IngressoPlateiaForm({
  championshipId,
  tipos,
  isElite,
}: {
  championshipId: string;
  tipos: Tipo[];
  isElite: boolean;
}) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [state, formAction, pending] = useActionState<ComprarState, FormData>(comprarIngresso, {});

  function setQty(id: string, q: number) {
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, Math.min(20, q)) }));
    setCupom(null); // muda a quantidade → o desconto validado não vale mais
  }

  const { totalBase, totalQty, itens } = useMemo(() => {
    let base = 0, qty = 0;
    const its: { ticketTypeId: string; qty: number }[] = [];
    for (const t of tipos) {
      const q = qtys[t.id] ?? 0;
      if (q > 0) {
        base += Number(t.valor) * q;
        qty += q;
        its.push({ ticketTypeId: t.id, qty: q });
      }
    }
    return { totalBase: base, totalQty: qty, itens: its };
  }, [qtys, tipos]);

  const valorFinal = cupom ? Math.max(0, totalBase - cupom.desconto) : totalBase;
  const isGratis = valorFinal <= 0;
  const taxa  = calcularTaxaComprador(valorFinal, "pix", isElite);
  const total = calcularTotalComprador(valorFinal, "pix", isElite);

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="championship_id" value={championshipId} />
      <input type="hidden" name="itens" value={JSON.stringify(itens)} />

      {/* Tipos de ingresso com quantidade */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Ingressos</p>
        {tipos.map((t) => {
          const q = qtys[t.id] ?? 0;
          if (t.esgotado) {
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 opacity-60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Ticket className="size-5 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{t.nome}</p>
                    <p className="text-sm text-gray-400">Esgotado</p>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                q > 0 ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${q > 0 ? "bg-blue-600" : "bg-gray-100"}`}>
                  <Ticket className={`size-5 ${q > 0 ? "text-white" : "text-gray-400"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-gray-900">{t.nome}</p>
                    {t.loteNome && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        {t.loteNome}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{Number(t.valor) === 0 ? "Grátis" : formatBRL(Number(t.valor))}</p>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty(t.id, q - 1)}
                  disabled={q === 0}
                  aria-label="Diminuir"
                  className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">{q}</span>
                <button
                  type="button"
                  onClick={() => setQty(t.id, q + 1)}
                  aria-label="Aumentar"
                  className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cupom de desconto */}
      {totalQty > 0 && totalBase > 0 && (
        <CupomInput
          championshipId={championshipId}
          aplicaEm="plateia"
          valorBase={totalBase}
          onChange={setCupom}
        />
      )}

      {/* Dados do comprador */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Seu nome</label>
          <input name="nome" className={`mt-1 ${input}`} placeholder="Nome completo" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input name="email" type="email" className={`mt-1 ${input}`} placeholder="voce@email.com" required />
          <p className="mt-1 text-xs text-gray-400">O ingresso com o QR de entrada vai pra esse e-mail.</p>
        </div>
        {!isGratis && (
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input name="cpf" inputMode="numeric" className={`mt-1 ${input}`} placeholder="Somente números" />
          </div>
        )}
      </div>

      {/* Resumo: total + taxa */}
      {totalQty > 0 && !isGratis && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between text-gray-500">
            <span>{totalQty} {totalQty === 1 ? "ingresso" : "ingressos"}</span><span>{formatBRL(totalBase)}</span>
          </div>
          {cupom && (
            <div className="mt-1 flex items-center justify-between text-blue-600">
              <span>Cupom {cupom.codigo}</span><span>- {formatBRL(cupom.desconto)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-gray-500">
            <span>Taxa de serviço</span><span>+ {formatBRL(taxa)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
            <span>Total no Pix</span><span>{formatBRL(total)}</span>
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || totalQty === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {totalQty === 0
          ? "Escolha os ingressos"
          : isGratis
            ? `Pegar ${totalQty} ${totalQty === 1 ? "ingresso" : "ingressos"} grátis`
            : `Continuar pro pagamento — ${formatBRL(total)}`}
      </button>
    </form>
  );
}
