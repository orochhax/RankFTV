"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2 } from "lucide-react";
import { salvarConfiguracoesInvestimento } from "@/app/admin/gastos/actions";
import { inputCls, labelCls } from "@/components/admin/gastos/NovoLancamentoForm";
import { formatBRLInput } from "@/lib/personal-finance";
import type { InvestmentSettings } from "@/lib/personal-finance-investments";

const initialState = { error: undefined as string | undefined };

export function ConfiguracoesInvestimentoForm({
  settings,
  onClose,
}: {
  settings: InvestmentSettings;
  onClose: () => void;
}) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await salvarConfiguracoesInvestimento(formData);
      if (result.ok) {
        router.refresh();
        onClose();
        return initialState;
      }
      return { error: result.error ?? "Erro ao salvar." };
    },
    initialState,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2">
          <Settings2 className="size-5 text-emerald-600" />
          <p className="text-lg font-semibold text-gray-900">Regra do Mercado Pago</p>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Alterar aqui recalcula as projeções na hora, mas não altera nem apaga nenhum lançamento já salvo.
        </p>

        <form action={action} className="space-y-4">
          <div>
            <label className={labelCls}>% do CDI até o limite</label>
            <input
              name="mercado_pago_bonus_cdi_percent"
              inputMode="decimal"
              required
              defaultValue={formatBRLInput(settings.mercadoPagoBonusCdiPercent)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Limite do saldo (R$)</label>
            <input
              name="mercado_pago_bonus_limit"
              inputMode="decimal"
              required
              defaultValue={formatBRLInput(settings.mercadoPagoBonusLimit)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">
              Compartilhado entre Carlos e Julia — não é um limite por pessoa.
            </p>
          </div>
          <div>
            <label className={labelCls}>% do CDI acima do limite</label>
            <input
              name="mercado_pago_excess_cdi_percent"
              inputMode="decimal"
              required
              defaultValue={formatBRLInput(settings.mercadoPagoExcessCdiPercent)}
              className={inputCls}
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Salvando…" : "Salvar regra"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
