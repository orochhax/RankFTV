"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarReceita, editarReceita } from "@/app/admin/gasto-mensal/actions";
import { inputCls, labelCls, PersonAmountFields } from "@/components/admin/gasto-mensal/PersonAmountFields";
import {
  formatBRLInput, personOfAmounts, totalAmount, monthLabelLong,
  type MonthlyBudgetIncome, type PersonSelecao, type SplitMode, type EscopoEdicao,
} from "@/lib/monthly-budget";

const initialState = { error: undefined as string | undefined };

const ESCOPO_OPCOES: { v: EscopoEdicao; label: string }[] = [
  { v: "esta", label: "Editar somente este mês" },
  { v: "esta_e_proximas", label: "Editar este mês e os próximos" },
  { v: "todas", label: "Editar todos os meses" },
];

const lockedFieldCls = `${inputCls} cursor-not-allowed bg-gray-50 text-gray-400`;

export function ReceitaForm({
  monthKey,
  income,
  groupStartMonthKey,
  groupEndMonthKey,
  onClose,
  onSaved,
}: {
  monthKey: string;
  income?: MonthlyBudgetIncome | null;
  groupStartMonthKey?: string;
  groupEndMonthKey?: string;
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
  const [mesInicial, setMesInicial] = useState(monthKey);
  const [mesFinal, setMesFinal] = useState("");

  const [escopo, setEscopo] = useState<EscopoEdicao>("esta");
  const [novoPrimeiroMes, setNovoPrimeiroMes] = useState(groupStartMonthKey ?? income?.monthKey ?? "");
  const [novoUltimoMes, setNovoUltimoMes] = useState(groupEndMonthKey ?? income?.monthKey ?? "");

  function handleMesInicialChange(v: string) {
    setMesInicial(v);
    if (mesFinal && mesFinal < v) setMesFinal("");
  }

  function handleNovoPrimeiroMesChange(v: string) {
    setNovoPrimeiroMes(v);
    if (novoUltimoMes && novoUltimoMes < v) setNovoUltimoMes(v);
  }

  function handleEscopoChange(v: EscopoEdicao) {
    setEscopo(v);
    if (v === "esta_e_proximas" && income && novoUltimoMes < income.monthKey) {
      setNovoUltimoMes(income.monthKey);
    }
  }

  const deTravado = escopo !== "todas";
  const ateTravado = escopo === "esta";

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
          {editando ? (
            <>
              <input type="hidden" name="id" value={income!.id} />
              <input type="hidden" name="escopo" value={escopo} />

              <div className="space-y-1.5 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
                <p className="text-xs font-semibold text-violet-800">O que você quer alterar?</p>
                {ESCOPO_OPCOES.map(({ v, label }) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-violet-900">
                    <input
                      type="radio"
                      checked={escopo === v}
                      onChange={() => handleEscopoChange(v)}
                      className="size-3.5 text-violet-600 focus:ring-violet-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div>
                <label className={labelCls}>Nome</label>
                <input name="name" required defaultValue={income?.name} className={inputCls} placeholder="Ex: Salário líquido" />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>De (mês inicial)</label>
                    {deTravado ? (
                      <>
                        <input type="hidden" name="month_key" value={groupStartMonthKey ?? income!.monthKey} />
                        <div className={lockedFieldCls}>{monthLabelLong(groupStartMonthKey ?? income!.monthKey)}</div>
                      </>
                    ) : (
                      <input
                        name="month_key"
                        type="month"
                        required
                        value={novoPrimeiroMes}
                        onChange={(e) => handleNovoPrimeiroMesChange(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Até (mês final)</label>
                    {ateTravado ? (
                      <div className={lockedFieldCls}>{monthLabelLong(groupEndMonthKey ?? income!.monthKey)}</div>
                    ) : (
                      <input
                        name="repeat_until_month"
                        type="month"
                        required
                        min={escopo === "esta_e_proximas" ? income!.monthKey : novoPrimeiroMes}
                        value={novoUltimoMes}
                        onChange={(e) => setNovoUltimoMes(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {escopo === "esta" && 'Para alterar o período, selecione "Editar todos os meses".'}
                  {escopo === "esta_e_proximas" && "O início da série não muda nesse modo — só o fim, a partir deste mês pra frente."}
                  {escopo === "todas" && "Muda o período inteiro: cria os meses que faltam e apaga os que ficaram de fora."}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Nome</label>
                <input name="name" required className={inputCls} placeholder="Ex: Salário líquido" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>De (mês inicial)</label>
                  <input
                    name="month_key"
                    type="month"
                    required
                    value={mesInicial}
                    onChange={(e) => handleMesInicialChange(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Até (opcional)</label>
                  <input
                    name="repeat_until_month"
                    type="month"
                    min={mesInicial}
                    value={mesFinal}
                    onChange={(e) => setMesFinal(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-gray-400">
                Deixe &ldquo;Até&rdquo; em branco pra lançar só no mês &ldquo;De&rdquo;. Escolhendo os dois, cria essa receita em todos os meses do
                intervalo — pode ser um mês futuro, sem precisar navegar até ele.
              </p>
            </>
          )}

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
