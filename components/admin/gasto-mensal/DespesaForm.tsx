"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarDespesa, editarDespesa } from "@/app/admin/gasto-mensal/actions";
import { inputCls, labelCls, PersonAmountFields } from "@/components/admin/gasto-mensal/PersonAmountFields";
import {
  formatBRLInput, personOfAmounts, totalAmount,
  type MonthlyBudgetExpense, type PersonSelecao, type SplitMode,
} from "@/lib/monthly-budget";

const initialState = { error: undefined as string | undefined };

export function DespesaForm({
  monthKey,
  expense,
  onClose,
  onSaved,
}: {
  monthKey: string;
  expense?: MonthlyBudgetExpense | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const editando = !!expense;

  const [pessoa, setPessoa] = useState<PersonSelecao>(expense ? personOfAmounts(expense) : "carlos");
  const [splitMode, setSplitMode] = useState<SplitMode>(
    expense && personOfAmounts(expense) === "carlos_e_julia" ? "personalizado" : "igual",
  );
  const [valorTotal, setValorTotal] = useState(expense ? formatBRLInput(totalAmount(expense)) : "");
  const [valorCarlos, setValorCarlos] = useState(expense ? formatBRLInput(expense.amountCarlos) : "");
  const [valorJulia, setValorJulia] = useState(expense ? formatBRLInput(expense.amountJulia) : "");

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = editando ? await editarDespesa(formData) : await criarDespesa(formData);
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
        <p className="mb-4 text-lg font-semibold text-gray-900">{editando ? "Editar despesa" : "Nova despesa"}</p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="month_key" value={monthKey} />
          {editando && <input type="hidden" name="id" value={expense!.id} />}

          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" required defaultValue={expense?.name} className={inputCls} placeholder="Ex: Aluguel" />
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
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Salvando…" : "Salvar despesa"}
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
