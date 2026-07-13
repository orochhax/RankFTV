"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { criarLancamento } from "@/app/admin/gastos/actions";
import { formatBRL } from "@/lib/format";
import {
  BANK_LABEL, PAYMENT_METHOD_LABEL, TYPE_LABEL, SEM_CATEGORIA, parseBRLInput, splitAmountEqually,
  type Bank, type EntryType, type PaymentMethod, type PersonSelecao, type PersonalFinanceCategory,
  type InvestmentYieldMode, type RecurrenceDayMode,
} from "@/lib/personal-finance";

const initialState = { error: undefined as string | undefined };

export const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
export const labelCls = "block text-xs font-medium text-gray-500";

const CDI_SUGESTOES = ["100", "105", "110", "120"];

const PESSOA_OPCOES: { v: PersonSelecao; label: string }[] = [
  { v: "carlos", label: "Carlos" },
  { v: "julia", label: "Julia" },
  { v: "carlos_e_julia", label: "Carlos e Julia" },
];

export type NovoLancamentoInitialValues = {
  person?: PersonSelecao;
  type?: EntryType;
  amount?: string;
  amountCarlos?: string;
  amountJulia?: string;
  splitMode?: "igual" | "personalizado";
  entryDate?: string;
  isInstallment?: boolean;
  installmentTotal?: number;
  bank?: Bank;
  paymentMethod?: PaymentMethod;
  category?: string;
  name?: string;
};

export type NovoLancamentoDraft = {
  person: PersonSelecao;
  type: EntryType;
  splitMode: "igual" | "personalizado";
  entryDate: string;
  bank: Bank;
  paymentMethod: PaymentMethod;
  amount: string;
  amountCarlos: string;
  amountJulia: string;
  isInstallment: boolean;
  installmentTotal: number;
};

function defaultYieldMode(bank: Bank): InvestmentYieldMode {
  return bank === "mercado_pago" ? "mercado_pago_tiered" : "single_cdi";
}

function pessoaCls(v: PersonSelecao) {
  if (v === "carlos") return "has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600";
  if (v === "julia") return "has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500";
  return "has-[:checked]:border-violet-600 has-[:checked]:bg-violet-600";
}

export function NovoLancamentoForm({
  onClose,
  categories,
  initialValues,
  lockedType,
  disableRecurring = false,
  title = "Novo lançamento",
  submitLabel = "Salvar lançamento",
  cancelLabel = "Cancelar",
  onCancel,
  onDraftChange,
  preview,
}: {
  onClose: () => void;
  categories: PersonalFinanceCategory[];
  initialValues?: NovoLancamentoInitialValues;
  lockedType?: EntryType;
  disableRecurring?: boolean;
  title?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onDraftChange?: (draft: NovoLancamentoDraft) => void;
  preview?: ReactNode;
}) {
  const router = useRouter();
  const [parcelado, setParcelado] = useState(initialValues?.isInstallment ?? false);
  const [fixo, setFixo] = useState(false);
  const [type, setType] = useState<EntryType>(lockedType ?? initialValues?.type ?? "gasto");
  const [bank, setBank] = useState<Bank>(initialValues?.bank ?? "nubank");
  const [yieldMode, setYieldMode] = useState<InvestmentYieldMode>("single_cdi");
  const [cdiPercent, setCdiPercent] = useState("100");
  const [pessoa, setPessoa] = useState<PersonSelecao>(initialValues?.person ?? "carlos");
  const [splitMode, setSplitMode] = useState<"igual" | "personalizado">(initialValues?.splitMode ?? "igual");
  const [valorTotal, setValorTotal] = useState(initialValues?.amount ?? "");
  const [valorCarlos, setValorCarlos] = useState(initialValues?.amountCarlos ?? "");
  const [valorJulia, setValorJulia] = useState(initialValues?.amountJulia ?? "");
  const [entryDate, setEntryDate] = useState(initialValues?.entryDate ?? new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialValues?.paymentMethod ?? "pix");
  const [installmentTotal, setInstallmentTotal] = useState(initialValues?.installmentTotal ?? 2);
  const [recurrenceDayMode, setRecurrenceDayMode] = useState<RecurrenceDayMode>("calendar_day");
  const [recurrenceDay, setRecurrenceDay] = useState("5");

  const ehInvestimento = type === "investimento";
  const compartilhado = pessoa === "carlos_e_julia";

  useEffect(() => {
    onDraftChange?.({
      person: pessoa,
      type,
      splitMode,
      entryDate,
      bank,
      paymentMethod,
      amount: valorTotal,
      amountCarlos: valorCarlos,
      amountJulia: valorJulia,
      isInstallment: parcelado,
      installmentTotal,
    });
  }, [bank, entryDate, installmentTotal, onDraftChange, parcelado, paymentMethod, pessoa, splitMode, type, valorCarlos, valorJulia, valorTotal]);

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await criarLancamento(formData);
      if (result.ok) {
        router.refresh();
        onClose();
        return initialState;
      }
      return { error: result.error ?? "Erro ao salvar." };
    },
    initialState,
  );

  function handleTypeChange(v: EntryType) {
    if (lockedType) return;
    setType(v);
    if (v === "investimento") {
      setYieldMode(defaultYieldMode(bank));
      setParcelado(false); // investimento não pode ser parcelado
    }
  }

  function handleBankChange(v: Bank) {
    setBank(v);
    if (ehInvestimento) setYieldMode(defaultYieldMode(v));
  }

  const totalPersonalizado = (Number.isFinite(parseBRLInput(valorCarlos)) ? parseBRLInput(valorCarlos) : 0)
    + (Number.isFinite(parseBRLInput(valorJulia)) ? parseBRLInput(valorJulia) : 0);
  const previewIgual = Number.isFinite(parseBRLInput(valorTotal)) && parseBRLInput(valorTotal) > 0
    ? splitAmountEqually(parseBRLInput(valorTotal))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel ?? onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <p className="mb-4 text-lg font-semibold text-gray-900">{title}</p>

        <form action={action} className="space-y-4">
          {/* Pessoa */}
          <div>
            <label className={labelCls}>Pessoa</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {PESSOA_OPCOES.map((p) => (
                <label
                  key={p.v}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors has-[:checked]:text-white ${pessoaCls(p.v)} border-gray-200 text-gray-600 hover:bg-gray-50`}
                >
                  <input
                    type="radio"
                    name="person"
                    value={p.v}
                    required
                    checked={pessoa === p.v}
                    onChange={() => setPessoa(p.v)}
                    className="sr-only"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" required className={inputCls} placeholder="Ex: Supermercado" />
          </div>

          {/* Valor — total (pessoa única / dividir igualmente) ou personalizado (Carlos + Julia) */}
          {!compartilhado ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input name="entry_date" type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
              <input type="hidden" name="split_mode" value={splitMode} />
              <div className="inline-flex gap-1 rounded-xl bg-white p-1 ring-1 ring-violet-200">
                {([
                  { v: "igual" as const, label: "Dividir igualmente" },
                  { v: "personalizado" as const, label: "Definir valores diferentes" },
                ]).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSplitMode(v)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      splitMode === v ? "bg-violet-600 text-white" : "text-violet-700 hover:bg-violet-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {splitMode === "igual" ? (
                <div>
                  <label className={labelCls}>Valor total (R$)</label>
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    className={inputCls}
                  />
                  {previewIgual && (
                    <p className="mt-1 text-xs text-violet-700">
                      Carlos {formatBRL(previewIgual.carlos)} · Julia {formatBRL(previewIgual.julia)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-blue-600">Valor de Carlos</label>
                    <input
                      name="amount_carlos"
                      required
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valorCarlos}
                      onChange={(e) => setValorCarlos(e.target.value)}
                      className={`${inputCls} focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rose-600">Valor de Julia</label>
                    <input
                      name="amount_julia"
                      required
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valorJulia}
                      onChange={(e) => setValorJulia(e.target.value)}
                      className={`${inputCls} focus:ring-rose-500`}
                    />
                  </div>
                  <p className="col-span-2 text-xs text-violet-700">Total: {formatBRL(totalPersonalizado)}</p>
                </div>
              )}

              <div>
                <label className={labelCls}>Data</label>
                <input name="entry_date" type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Categoria</label>
            <select name="category" required defaultValue={initialValues?.category ?? SEM_CATEGORIA} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Tipo</label>
              {lockedType && <input type="hidden" name="type" value={type} />}
              <select name={lockedType ? undefined : "type"} required value={type} disabled={Boolean(lockedType)} onChange={(e) => handleTypeChange(e.target.value as EntryType)} className={inputCls}>
                {(Object.keys(TYPE_LABEL) as EntryType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Banco</label>
              <select name="bank" required value={bank} onChange={(e) => handleBankChange(e.target.value as Bank)} className={inputCls}>
                {(Object.keys(BANK_LABEL) as Bank[]).map((b) => (
                  <option key={b} value={b}>{BANK_LABEL[b]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Forma</label>
              <select name="payment_method" required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputCls}>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Regra de rendimento — só pra investimento */}
          {ehInvestimento && (
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="text-xs font-semibold text-emerald-800">Regra de rendimento</p>
              <div className="mt-2 space-y-1.5">
                {([
                  { v: "mercado_pago_tiered" as const, label: "Mercado Pago por faixas" },
                  { v: "single_cdi" as const, label: "Percentual único do CDI" },
                ]).map(({ v, label }) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-emerald-900">
                    <input
                      type="radio"
                      name="investment_yield_mode"
                      value={v}
                      checked={yieldMode === v}
                      onChange={() => setYieldMode(v)}
                      className="size-3.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {yieldMode === "mercado_pago_tiered" ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Usa a regra configurada no card de investimentos (por faixa de saldo). O limite é compartilhado entre Carlos e Julia.
                </p>
              ) : (
                <div className="mt-2">
                  <label className={labelCls}>% do CDI</label>
                  <input
                    name="investment_cdi_percent"
                    inputMode="decimal"
                    value={cdiPercent}
                    onChange={(e) => setCdiPercent(e.target.value)}
                    placeholder="Ex: 100"
                    className={inputCls}
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    {CDI_SUGESTOES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCdiPercent(v)}
                        className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          cdiPercent === v ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
              <label className={`flex items-center gap-2 text-sm font-medium ${fixo || ehInvestimento ? "text-gray-300" : "text-gray-700"}`}>
                <input
                  type="checkbox"
                  name="is_installment"
                  checked={parcelado}
                  disabled={fixo || ehInvestimento}
                  onChange={(e) => setParcelado(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Parcelado
              </label>
              {ehInvestimento && <p className="mt-1 text-xs text-gray-400">Investimento não pode ser parcelado.</p>}
              {parcelado && !ehInvestimento && (
                <div className="mt-2">
                  <label className={labelCls}>Parcelas</label>
                  <input
                    name="installment_total"
                    type="number"
                    min={2}
                    max={120}
                    value={installmentTotal}
                    onChange={(e) => setInstallmentTotal(parseInt(e.target.value || "2", 10))}
                    required
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
              <label className={`flex items-center gap-2 text-sm font-medium ${parcelado || disableRecurring ? "text-gray-300" : "text-gray-700"}`}>
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={fixo}
                  disabled={parcelado || disableRecurring}
                  onChange={(e) => setFixo(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Fixo
              </label>
              <p className="mt-1 text-xs text-gray-400">
                Vale todo mês pra sempre, sem término (ex: salário, aluguel, aporte mensal).
              </p>
            </div>
          </div>

          {fixo && (
            <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
              <p className="text-xs font-semibold text-blue-800">Quando lançar</p>
              <div className="mt-2 space-y-1.5">
                {([
                  { v: "calendar_day" as const, label: "Dia do mês" },
                  { v: "business_day" as const, label: "Dia útil do mês" },
                ]).map(({ v, label }) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                    <input
                      type="radio"
                      name="recurrence_day_mode"
                      value={v}
                      checked={recurrenceDayMode === v}
                      onChange={() => setRecurrenceDayMode(v)}
                      className="size-3.5 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <input
                  name="recurrence_day"
                  type="number"
                  min={1}
                  max={recurrenceDayMode === "business_day" ? 23 : 31}
                  required
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-blue-700">
                  {recurrenceDayMode === "business_day"
                    ? "Ex: 5 = quinto dia útil de cada mês (varia conforme o calendário)."
                    : "Ex: 5 = todo dia 5. Se o mês não tiver esse dia, usa o último dia dele."}
                </p>
              </div>
            </div>
          )}
          {(parcelado || fixo) && (
            <p className="text-xs text-gray-400">
              {parcelado
                ? "Gera uma parcela por mês, mesmo valor, a partir da data escolhida."
                : "Não gera lançamentos repetidos — conta automaticamente em todo mês, no dia definido acima."}
            </p>
          )}

          {preview}

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
              {pending ? "Salvando..." : submitLabel}
            </button>
            <button
              type="button"
              onClick={onCancel ?? onClose}
              disabled={pending}
              className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
            >{cancelLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
