"use client";

import { formatBRL } from "@/lib/format";
import { parseBRLInput, splitAmountEqually, type PersonSelecao, type SplitMode } from "@/lib/monthly-budget";

export const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
export const labelCls = "block text-xs font-medium text-gray-500";

const PESSOA_OPCOES: { v: PersonSelecao; label: string }[] = [
  { v: "carlos", label: "Carlos" },
  { v: "julia", label: "Julia" },
  { v: "carlos_e_julia", label: "Carlos e Julia" },
];

function pessoaCls(v: PersonSelecao) {
  if (v === "carlos") return "has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600";
  if (v === "julia") return "has-[:checked]:border-rose-500 has-[:checked]:bg-rose-500";
  return "has-[:checked]:border-violet-600 has-[:checked]:bg-violet-600";
}

/**
 * Seletor de pessoa (Carlos/Julia/Carlos e Julia) + divisão de valor.
 * Compartilhado entre DespesaForm e ReceitaForm — os campos batem 1:1 com o
 * que app/admin/gasto-mensal/actions.ts espera (name="person", "split_mode",
 * "amount", "amount_carlos", "amount_julia").
 */
export function PersonAmountFields({
  pessoa,
  onPessoaChange,
  splitMode,
  onSplitModeChange,
  valorTotal,
  onValorTotalChange,
  valorCarlos,
  onValorCarlosChange,
  valorJulia,
  onValorJuliaChange,
}: {
  pessoa: PersonSelecao;
  onPessoaChange: (v: PersonSelecao) => void;
  splitMode: SplitMode;
  onSplitModeChange: (v: SplitMode) => void;
  valorTotal: string;
  onValorTotalChange: (v: string) => void;
  valorCarlos: string;
  onValorCarlosChange: (v: string) => void;
  valorJulia: string;
  onValorJuliaChange: (v: string) => void;
}) {
  const compartilhado = pessoa === "carlos_e_julia";

  const totalPersonalizado =
    (Number.isFinite(parseBRLInput(valorCarlos)) ? parseBRLInput(valorCarlos) : 0) +
    (Number.isFinite(parseBRLInput(valorJulia)) ? parseBRLInput(valorJulia) : 0);
  const previewIgual =
    Number.isFinite(parseBRLInput(valorTotal)) && parseBRLInput(valorTotal) > 0
      ? splitAmountEqually(parseBRLInput(valorTotal))
      : null;

  return (
    <div className="space-y-4">
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
                onChange={() => onPessoaChange(p.v)}
                className="sr-only"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <input type="hidden" name="split_mode" value={splitMode} />

      {!compartilhado ? (
        <div>
          <label className={labelCls}>Valor (R$)</label>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
            value={valorTotal}
            onChange={(e) => onValorTotalChange(e.target.value)}
            className={inputCls}
          />
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
          <div className="inline-flex gap-1 rounded-xl bg-white p-1 ring-1 ring-violet-200">
            {([
              { v: "igual" as const, label: "Dividir igualmente" },
              { v: "personalizado" as const, label: "Definir valores diferentes" },
            ]).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => onSplitModeChange(v)}
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
                onChange={(e) => onValorTotalChange(e.target.value)}
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
                  onChange={(e) => onValorCarlosChange(e.target.value)}
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
                  onChange={(e) => onValorJuliaChange(e.target.value)}
                  className={`${inputCls} focus:ring-rose-500`}
                />
              </div>
              <p className="col-span-2 text-xs text-violet-700">Total: {formatBRL(totalPersonalizado)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
