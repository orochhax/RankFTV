"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { editarLancamento } from "@/app/admin/gastos/actions";
import { inputCls, labelCls } from "@/components/admin/gastos/NovoLancamentoForm";
import { formatBRL } from "@/lib/format";
import {
  BANK_LABEL, PAYMENT_METHOD_LABEL, TYPE_LABEL, monthLabelLong, formatBRLInput, parseBRLInput,
  type Bank, type EntryType, type PaymentMethod, type Person, type InvestmentYieldMode, type RecurrenceDayMode,
  type PersonalFinanceCategory, type PersonalFinanceEntry,
} from "@/lib/personal-finance";

const initialState = { error: undefined as string | undefined };

const CDI_SUGESTOES = ["100", "105", "110", "120"];

function defaultYieldMode(bank: Bank): InvestmentYieldMode {
  return bank === "mercado_pago" ? "mercado_pago_tiered" : "single_cdi";
}

export function EditarLancamentoForm({
  entry,
  sibling,
  monthKey,
  categories,
  onClose,
}: {
  entry: PersonalFinanceEntry;
  sibling?: PersonalFinanceEntry | null;
  monthKey: string;
  categories: PersonalFinanceCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [escopoParcela, setEscopoParcela] = useState<"esta" | "estas_proximas" | "todas">("esta");
  const [escopoFixo, setEscopoFixo] = useState<"este_mes" | "todos_os_meses">("este_mes");
  const [escopoPessoa, setEscopoPessoa] = useState<"esta" | "ambos">("esta");
  const [type, setType] = useState<EntryType>(entry.type);
  const [bank, setBank] = useState<Bank>(entry.bank);
  const [yieldMode, setYieldMode] = useState<InvestmentYieldMode>(entry.investmentYieldMode ?? defaultYieldMode(entry.bank));
  const [cdiPercent, setCdiPercent] = useState(entry.investmentCdiPercent != null ? String(entry.investmentCdiPercent) : "100");
  const [recurrenceDayMode, setRecurrenceDayMode] = useState<RecurrenceDayMode>(entry.recurrenceDayMode ?? "calendar_day");
  const [recurrenceDay, setRecurrenceDay] = useState(entry.recurrenceDay != null ? String(entry.recurrenceDay) : "5");

  const ehInvestimento = type === "investimento";
  const ehCompartilhado = entry.sharedEntryGroupId != null && !!sibling;
  const ambos = ehCompartilhado && escopoPessoa === "ambos";

  const valorCarlosInicial = entry.person === "carlos" ? entry.amount : sibling?.amount ?? 0;
  const valorJuliaInicial = entry.person === "julia" ? entry.amount : sibling?.amount ?? 0;
  const [valorCarlos, setValorCarlos] = useState(formatBRLInput(valorCarlosInicial));
  const [valorJulia, setValorJulia] = useState(formatBRLInput(valorJuliaInicial));

  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await editarLancamento(formData);
      if (result.ok) {
        router.refresh();
        onClose();
        return initialState;
      }
      return { error: result.error ?? "Erro ao salvar." };
    },
    initialState,
  );

  function handleBankChange(v: Bank) {
    setBank(v);
    if (ehInvestimento) setYieldMode(defaultYieldMode(v));
  }

  const mostrarParcelas = entry.isInstallment && escopoParcela !== "esta";
  const totalAmbos = (Number.isFinite(parseBRLInput(valorCarlos)) ? parseBRLInput(valorCarlos) : 0)
    + (Number.isFinite(parseBRLInput(valorJulia)) ? parseBRLInput(valorJulia) : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <p className="mb-4 text-lg font-semibold text-gray-900">Editar lançamento</p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="month_key" value={monthKey} />
          {ambos && <input type="hidden" name="split_mode" value="personalizado" />}

          {/* Escopo de pessoa (lançamento compartilhado) */}
          {ehCompartilhado && (
            <div className="space-y-1.5 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-800">
                <Users className="size-3.5" /> Esse lançamento foi criado pra Carlos e Julia — o que você quer alterar?
              </p>
              <input type="hidden" name="escopo_pessoa" value={escopoPessoa} />
              {([
                { v: "esta" as const, label: `Editar somente ${entry.person === "carlos" ? "Carlos" : "Julia"}` },
                { v: "ambos" as const, label: "Editar Carlos e Julia juntos" },
              ]).map(({ v, label }) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-violet-900">
                  <input
                    type="radio"
                    checked={escopoPessoa === v}
                    onChange={() => setEscopoPessoa(v)}
                    className="size-3.5 text-violet-600 focus:ring-violet-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          {/* Escopo de fixo/recorrente */}
          {entry.isRecurring && (
            <div className="space-y-1.5 rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
              <p className="text-xs font-semibold text-blue-800">Esse é um lançamento fixo — o que você quer alterar?</p>
              {(["este_mes", "todos_os_meses"] as const).map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-blue-900">
                  <input
                    type="radio"
                    name="escopo_fixo"
                    value={v}
                    checked={escopoFixo === v}
                    onChange={() => setEscopoFixo(v)}
                    className="size-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  {v === "este_mes"
                    ? `Editar somente ${monthLabelLong(monthKey)}${ambos ? " (Carlos e Julia)" : ""}`
                    : `Editar todos os meses${ambos ? " (Carlos e Julia)" : ""}`}
                </label>
              ))}
            </div>
          )}

          {/* Escopo de parcela */}
          {entry.isInstallment && (
            <div className="space-y-1.5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
              <p className="text-xs font-semibold text-amber-800">
                Essa é a parcela {entry.installmentNumber}/{entry.installmentTotal} — o que você quer alterar?
              </p>
              {([
                { v: "esta", label: "Editar somente esta parcela" },
                { v: "estas_proximas", label: "Editar esta e as próximas" },
                { v: "todas", label: "Editar todas as parcelas" },
              ] as const).map(({ v, label }) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 text-sm text-amber-900">
                  <input
                    type="radio"
                    name="escopo_parcela"
                    value={v}
                    checked={escopoParcela === v}
                    onChange={() => setEscopoParcela(v)}
                    className="size-3.5 text-amber-600 focus:ring-amber-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}

          {/* Pessoa — só quando não está editando os dois juntos */}
          {!ambos && (
            <div>
              <label className={labelCls}>Pessoa</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["carlos", "julia"] as Person[]).map((p) => (
                  <label
                    key={p}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors has-[:checked]:text-white ${
                      p === "carlos"
                        ? "has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600"
                        : "has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500"
                    } border-gray-200 text-gray-600 hover:bg-gray-50`}
                  >
                    <input type="radio" name="person" value={p} required defaultChecked={p === entry.person} className="sr-only" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Nome</label>
            <input name="name" required defaultValue={entry.name} className={inputCls} placeholder="Ex: Supermercado" />
          </div>

          {!ambos ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input name="amount" required inputMode="decimal" defaultValue={formatBRLInput(entry.amount)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input name="entry_date" type="date" required defaultValue={entry.entryDate} className={inputCls} />
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-blue-600">Valor de Carlos</label>
                  <input
                    name="amount_carlos"
                    required
                    inputMode="decimal"
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
                    value={valorJulia}
                    onChange={(e) => setValorJulia(e.target.value)}
                    className={`${inputCls} focus:ring-rose-500`}
                  />
                </div>
                <p className="col-span-2 text-xs text-violet-700">Total: {formatBRL(totalAmbos)}</p>
              </div>
              <div>
                <label className={labelCls}>Data</label>
                <input name="entry_date" type="date" required defaultValue={entry.entryDate} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Categoria</label>
            <select name="category" required defaultValue={entry.category} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="type" required value={type} onChange={(e) => setType(e.target.value as EntryType)} className={inputCls}>
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
              <select name="payment_method" required defaultValue={entry.paymentMethod} className={inputCls}>
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

          {mostrarParcelas && (
            <div>
              <label className={labelCls}>Quantidade de parcelas</label>
              <input
                name="installment_total"
                type="number"
                min={1}
                max={120}
                defaultValue={entry.installmentTotal}
                required
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">
                Aumentar cria parcelas novas no futuro; diminuir apaga as excedentes.
              </p>
            </div>
          )}

          {/* Quando lançar — só pra fixo */}
          {entry.isRecurring && (
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
              </div>
            </div>
          )}

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
              {pending ? "Salvando…" : "Salvar alterações"}
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
