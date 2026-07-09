"use client";

import { useState, useTransition } from "react";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { validarCupomPreview } from "@/app/campeonatos/[id]/cupom-actions";
import { formatBRL } from "@/lib/format";

export type CupomAplicado = { codigo: string; desconto: number };

// Campo de cupom reutilizado nos 3 fluxos de checkout (inscrição de atleta
// logado, ingresso de atleta guest, ingresso de plateia). O "Aplicar" só
// valida e mostra o desconto — a reivindicação de verdade (que trava o uso)
// acontece no servidor, no submit do formulário pai. Por isso o próprio
// <input> de código já vai com `name="cupom_codigo"` dentro do form pai.
export function CupomInput({
  championshipId,
  aplicaEm,
  valorBase,
  onChange,
}: {
  championshipId: string;
  aplicaEm: "atleta" | "plateia";
  valorBase: number;
  /** Avisa o formulário pai do desconto atual, pra atualizar o resumo/total exibido. */
  onChange?: (aplicado: CupomAplicado | null) => void;
}) {
  const [codigo, setCodigo]   = useState("");
  const [aplicado, setAplicado] = useState<CupomAplicado | null>(null);
  const [erro, setErro]       = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function aplicar() {
    if (!codigo.trim() || valorBase <= 0) return;
    setErro(null);
    startTransition(async () => {
      const r = await validarCupomPreview(championshipId, codigo, aplicaEm, valorBase);
      if (!r.ok) {
        setErro(r.error);
        setAplicado(null);
        onChange?.(null);
        return;
      }
      const info = { codigo: r.codigo, desconto: r.desconto };
      setAplicado(info);
      onChange?.(info);
    });
  }

  function remover() {
    setAplicado(null);
    setCodigo("");
    setErro(null);
    onChange?.(null);
  }

  if (valorBase <= 0) return null;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      {/* O código só vai pro form quando confirmado como válido */}
      <input type="hidden" name="cupom_codigo" value={aplicado?.codigo ?? ""} />

      <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        <Tag className="size-4 text-blue-500" /> Cupom de desconto
      </label>

      {aplicado ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 ring-1 ring-blue-100">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700">
            <Check className="size-4" /> {aplicado.codigo} aplicado — -{formatBRL(aplicado.desconto)}
          </span>
          <button
            type="button"
            onClick={remover}
            className="rounded-md p-1 text-blue-400 hover:text-blue-600"
            aria-label="Remover cupom"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wide text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={aplicar}
            disabled={pending || !codigo.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Aplicar"}
          </button>
        </div>
      )}

      {erro && <p className="mt-1.5 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
