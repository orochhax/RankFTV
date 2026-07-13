"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarReceita, editarReceita } from "@/app/admin/gasto-mensal/actions";
import { inputCls, labelCls, PersonAmountFields } from "@/components/admin/gasto-mensal/PersonAmountFields";
import {
  formatBRLInput, personOfAmounts, totalAmount,
  type MonthlyBudgetIncome, type PersonSelecao, type SplitMode,
} from "@/lib/monthly-budget";

const initialState = { error: undefined as string | undefined };

export function ReceitaForm({
  monthKey,
  income,
  onClose,
  onSaved,
}: {
  monthKey: string;
  income?: MonthlyBudgetIncome | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const editando = !!income;

  const [pessoa, setPessoa] = useState<PersonSelecao>(income ? personOfAmounts(income) : "carlos");
  const [splitMode, setSplitMode] = useState<SplitMode>(
    income && personOfAmounts(income) === "carlos_e_julia" ? "personalizado" : "igual",
  );
  const [valorTotal, setValorTotal] = useState(income ? formatBRLInput(totalAmount(income)) : "");
  const [valorCarlos, setValorCarlos] = useState(income ? formatBRLInput(income.amountCarlos) : "");
  const [valorJulia, setValorJulia] = useState(income ? formatBRLInput(income.amountJulia) : "");

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = editando ? await editarReceita(formData) : await criarReceita(formData);
      if (result.ok) {
        router.refresh();
        onSaved?.();
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
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <p className="mb-4 text-lg font-semibold text-gray-900">{editando ? "Editar receita" : "Adicionar receita"}</p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="month_key" value={monthKey} />
          {editando && <input type="hidden" name="id" value={income!.id} />}

          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" required defaultValue={income?.name} className={inputCls} placeholder="Ex: Salário líquido" />
          </div>

          <PersonAmountFields
            pessoa={pessoa}
            onPessoaChange={setPessoa}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            valorTotal={valorTotal}
            onValorTotalChange={setValorTotal}
            valorCarlos={valorCarlos}
            onValorCarlosChange={setValorCarlos}
            valorJulia={valorJulia}
            onValorJuliaChange={setValorJulia}
          />

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
              {pending ? "Salvando…" : "Salvar receita"}
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
