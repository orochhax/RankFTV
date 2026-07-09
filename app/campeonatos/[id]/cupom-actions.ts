"use server";

import { buscarCupomValido } from "@/lib/cupons";
import { calcularDesconto } from "@/lib/taxas";

export type CupomPreview =
  | { ok: true; codigo: string; desconto: number }
  | { ok: false; error: string };

// Validação em tempo real pro botão "Aplicar" no checkout — só confere e
// devolve o valor do desconto pra mostrar na tela. A reivindicação de
// verdade (que trava o uso) só acontece no submit final de cada fluxo.
export async function validarCupomPreview(
  championshipId: string,
  codigo: string,
  aplicaEm: "atleta" | "plateia",
  valorBase: number,
): Promise<CupomPreview> {
  const { cupom, error } = await buscarCupomValido(championshipId, codigo, aplicaEm);
  if (error || !cupom) return { ok: false, error: error ?? "Cupom inválido." };

  const desconto = calcularDesconto(valorBase, cupom.tipoDesconto, cupom.valorDesconto);
  return { ok: true, codigo: cupom.codigo, desconto };
}
