"use client";

import { useMemo, useState } from "react";
import { X, Calculator, ShoppingCart } from "lucide-react";
import {
  NovoLancamentoForm,
  type NovoLancamentoDraft,
  type NovoLancamentoInitialValues,
} from "@/components/admin/gastos/NovoLancamentoForm";
import { formatBRL } from "@/lib/format";
import {
  formatBRLInput,
  hojeISO,
  parseBRLInput,
  type PersonFilter,
  type PersonSelecao,
  type PersonalFinanceCategory,
  type PersonalFinanceEntry,
  type RecurringOverride,
} from "@/lib/personal-finance";
import {
  resolveCalculatorPurchaseAmounts,
  simulateQuickPurchase,
  type PurchaseSimulationMonth,
} from "@/lib/personal-finance-purchase";

const COR_CARLOS = "#2563eb";
const COR_JULIA = "#f43f5e";

function parseAmount(value: string): number {
  const parsed = parseBRLInput(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resultadoCls(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-red-600";
  return "text-gray-700";
}

function PreviewList({ preview, person }: { preview: PurchaseSimulationMonth[]; person: PersonSelecao }) {
  if (preview.length === 0) {
    return <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-400">Informe um valor para simular.</p>;
  }

  return (
    <div className="space-y-2">
      {preview.map((month) => {
        const isCarlos = person === "carlos";
        const isJulia = person === "julia";
        const before = isCarlos ? month.beforeCarlos : isJulia ? month.beforeJulia : month.beforeCombined;
        const impact = isCarlos ? month.impactCarlos : isJulia ? month.impactJulia : month.impactCombined;
        const after = isCarlos ? month.afterCarlos : isJulia ? month.afterJulia : month.afterCombined;
        const shared = person === "carlos_e_julia";

        return (
          <div key={month.monthKey} className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">{month.label}</p>
              <p className={`text-sm font-bold ${resultadoCls(after)}`}>{formatBRL(after)}</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
              <span>Antes<br /><b className="text-gray-700">{formatBRL(before)}</b></span>
              <span>Compra<br /><b className="text-gray-700">-{formatBRL(impact)}</b></span>
              <span>Depois<br /><b className={resultadoCls(after)}>{formatBRL(after)}</b></span>
            </div>
            {shared && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-200 pt-2 text-[11px]">
                <span style={{ color: COR_CARLOS }}>Carlos: -{formatBRL(month.impactCarlos)} / {formatBRL(month.afterCarlos)}</span>
                <span style={{ color: COR_JULIA }}>Julia: -{formatBRL(month.impactJulia)} / {formatBRL(month.afterJulia)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CalculadoraRapida({
  entries,
  overrides,
  categories,
  filtro,
  onClose,
}: {
  entries: PersonalFinanceEntry[];
  overrides: RecurringOverride[];
  categories: PersonalFinanceCategory[];
  filtro: PersonFilter;
  onClose: () => void;
}) {
  const pessoaInicial: PersonSelecao = filtro === "carlos" ? "carlos" : filtro === "julia" ? "julia" : "carlos_e_julia";
  const [stage, setStage] = useState<"simular" | "form">("simular");
  const [valor, setValor] = useState("");
  const [pessoa, setPessoa] = useState<PersonSelecao>(pessoaInicial);
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [splitMode, setSplitMode] = useState<"igual" | "personalizado">("igual");
  const [valorCarlos, setValorCarlos] = useState("");
  const [valorJulia, setValorJulia] = useState("");
  const [draft, setDraft] = useState<NovoLancamentoDraft | null>(null);

  const shared = pessoa === "carlos_e_julia";
  const hoje = hojeISO();
  const resolvedAmounts = resolveCalculatorPurchaseAmounts({
    totalAmount: parseAmount(valor),
    person: pessoa,
    splitMode,
    amountCarlos: parseAmount(valorCarlos),
    amountJulia: parseAmount(valorJulia),
    hasAmountCarlos: valorCarlos.trim().length > 0,
    hasAmountJulia: valorJulia.trim().length > 0,
  });
  const { totalAmount } = resolvedAmounts;

  const preview = useMemo(() => simulateQuickPurchase({
    entries,
    overrides,
    totalAmount,
    person: pessoa,
    splitMode,
    amountCarlos: resolvedAmounts.amountCarlos,
    amountJulia: resolvedAmounts.amountJulia,
    installmentTotal: parcelado ? parcelas : 1,
    firstDateISO: hoje,
  }), [entries, hoje, overrides, parcelado, parcelas, pessoa, resolvedAmounts.amountCarlos, resolvedAmounts.amountJulia, splitMode, totalAmount]);

  const draftPreview = useMemo(() => {
    if (!draft) return preview;
    const draftTotal = draft.person === "carlos_e_julia" && draft.splitMode === "personalizado"
      ? parseAmount(draft.amountCarlos) + parseAmount(draft.amountJulia)
      : parseAmount(draft.amount);
    return simulateQuickPurchase({
      entries,
      overrides,
      totalAmount: draftTotal,
      person: draft.person,
      splitMode: draft.splitMode,
      amountCarlos: parseAmount(draft.amountCarlos),
      amountJulia: parseAmount(draft.amountJulia),
      installmentTotal: draft.isInstallment ? draft.installmentTotal : 1,
      firstDateISO: draft.entryDate,
    });
  }, [draft, entries, overrides, preview]);

  function abrirFormulario() {
    const initial: NovoLancamentoInitialValues = {
      person: pessoa,
      type: "gasto",
      amount: formatBRLInput(totalAmount),
      amountCarlos: shared ? formatBRLInput(resolvedAmounts.amountCarlos) : valorCarlos,
      amountJulia: shared ? formatBRLInput(resolvedAmounts.amountJulia) : valorJulia,
      splitMode,
      entryDate: hoje,
      isInstallment: parcelado,
      installmentTotal: parcelas,
      bank: "nubank",
      paymentMethod: parcelado ? "credito" : "pix",
    };
    setDraft({
      person: initial.person!,
      type: "gasto",
      splitMode,
      entryDate: hoje,
      bank: initial.bank!,
      paymentMethod: initial.paymentMethod!,
      amount: initial.amount!,
      amountCarlos: initial.amountCarlos ?? "",
      amountJulia: initial.amountJulia ?? "",
      isInstallment: parcelado,
      installmentTotal: parcelas,
    });
    setStage("form");
  }

  if (stage === "form") {
    return (
      <NovoLancamentoForm
        categories={categories}
        onClose={onClose}
        onCancel={() => setStage("simular")}
        title="Lançar compra"
        submitLabel="Confirmar compra"
        cancelLabel="Voltar"
        lockedType="gasto"
        disableRecurring
        initialValues={{
          person: draft?.person ?? pessoa,
          type: "gasto",
          amount: formatBRLInput(totalAmount),
          amountCarlos: draft?.amountCarlos || valorCarlos,
          amountJulia: draft?.amountJulia || valorJulia,
          splitMode,
          entryDate: draft?.entryDate ?? hoje,
          isInstallment: parcelado,
          installmentTotal: parcelas,
          bank: draft?.bank ?? "nubank",
          paymentMethod: draft?.paymentMethod ?? (parcelado ? "credito" : "pix"),
        }}
        onDraftChange={setDraft}
        preview={<PreviewList preview={draftPreview} person={draft?.person ?? pessoa} />}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-blue-600" />
            <p className="text-lg font-semibold text-gray-900">Calcular rápido</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500">Valor total da compra</label>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ["carlos", "Carlos"],
              ["julia", "Julia"],
              ["carlos_e_julia", "Os dois"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setPessoa(value)} className={`rounded-lg border px-2 py-2 text-xs font-medium ${pessoa === value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>

          {shared && (
            <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSplitMode("igual")} className={`rounded-lg px-2 py-1.5 text-xs font-medium ${splitMode === "igual" ? "bg-violet-600 text-white" : "bg-white text-violet-700"}`}>Dividir igualmente</button>
                <button type="button" onClick={() => setSplitMode("personalizado")} className={`rounded-lg px-2 py-1.5 text-xs font-medium ${splitMode === "personalizado" ? "bg-violet-600 text-white" : "bg-white text-violet-700"}`}>Valores diferentes</button>
              </div>
              {splitMode === "personalizado" && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={valorCarlos} onChange={(e) => setValorCarlos(e.target.value)} inputMode="decimal" placeholder="Carlos" className="rounded-lg border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={valorJulia} onChange={(e) => setValorJulia(e.target.value)} inputMode="decimal" placeholder="Julia" className="rounded-lg border border-rose-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setParcelado(false)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${!parcelado ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600"}`}>À vista</button>
            <button type="button" onClick={() => setParcelado(true)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${parcelado ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600"}`}>Parcelado</button>
          </div>

          {parcelado && (
            <div>
              <label className="block text-xs font-medium text-gray-500">Parcelas</label>
              <input type="number" min={2} max={120} value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value || "2", 10))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <PreviewList preview={preview} person={pessoa} />

          <button type="button" onClick={abrirFormulario} disabled={preview.length === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <ShoppingCart className="size-4" />
            Lançar compra
          </button>
        </div>
      </div>
    </div>
  );
}
