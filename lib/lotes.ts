// Preço escalonado por lote ("1º Lote R$50, 2º Lote R$70"). Server-only —
// usa admin client porque quem chama pode ser um visitante sem conta.
import { createAdminClient } from "@/lib/supabase/admin";

export type EntidadeLote = "category" | "ticket_type";

type TierRow = {
  id: string;
  nome: string;
  valor: number;
  ordem: number;
  quantidade_maxima: number | null;
  vendidos: number;
  data_fim: string | null;
  ativo: boolean;
};

type ResolucaoLote =
  | { status: "sem_lotes" }
  | { status: "ativo"; lote: { id: string; nome: string; valor: number } }
  | { status: "esgotado" };

function loteAtivoDaLista(lotes: TierRow[]): ResolucaoLote {
  const configurados = lotes.filter((l) => l.ativo);
  if (configurados.length === 0) return { status: "sem_lotes" };

  const agora = new Date();
  const ordenados = [...configurados].sort((a, b) => a.ordem - b.ordem);
  for (const l of ordenados) {
    const expirado = l.data_fim != null && agora > new Date(l.data_fim);
    const esgotado = l.quantidade_maxima != null && l.vendidos >= l.quantidade_maxima;
    if (!expirado && !esgotado) {
      return { status: "ativo", lote: { id: l.id, nome: l.nome, valor: Number(l.valor) } };
    }
  }
  return { status: "esgotado" };
}

/**
 * Resolve o preço efetivo de VÁRIAS categorias/tipos de uma vez — usado nas
 * telas de listagem (mostrar preço pro comprador antes de escolher). Não
 * reivindica nada, só lê.
 */
export async function resolverPrecos(
  entidade: EntidadeLote,
  ids: string[],
  valoresBase: Record<string, number>,
): Promise<Record<string, { valor: number; loteNome: string | null; esgotado: boolean }>> {
  const resultado: Record<string, { valor: number; loteNome: string | null; esgotado: boolean }> = {};
  if (ids.length === 0) return resultado;

  const admin = createAdminClient();
  const coluna = entidade === "category" ? "category_id" : "ticket_type_id";
  const { data: lotes } = await admin
    .from("pricing_tiers")
    .select("id, nome, valor, ordem, quantidade_maxima, vendidos, data_fim, ativo, category_id, ticket_type_id")
    .in(coluna, ids);

  const porId = new Map<string, TierRow[]>();
  for (const l of lotes ?? []) {
    const key = (entidade === "category" ? l.category_id : l.ticket_type_id) as string;
    if (!porId.has(key)) porId.set(key, []);
    porId.get(key)!.push(l as TierRow);
  }

  for (const id of ids) {
    const r = loteAtivoDaLista(porId.get(id) ?? []);
    if (r.status === "ativo") {
      resultado[id] = { valor: r.lote.valor, loteNome: r.lote.nome, esgotado: false };
    } else if (r.status === "esgotado") {
      resultado[id] = { valor: valoresBase[id] ?? 0, loteNome: null, esgotado: true };
    } else {
      resultado[id] = { valor: valoresBase[id] ?? 0, loteNome: null, esgotado: false };
    }
  }
  return resultado;
}

/**
 * Resolve e reivindica atomicamente `qty` unidades do lote vigente de UMA
 * categoria/tipo — usado nas actions de compra, nunca confia em preço vindo
 * do client. Se não houver lote configurado, devolve o valor base
 * (comportamento de sempre). Se os lotes esgotaram, retorna erro.
 */
export async function resolverEClaimarLote(
  entidade: EntidadeLote,
  entidadeId: string,
  valorBase: number,
  qty: number,
): Promise<{ ok: true; valor: number; loteId: string | null } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const coluna = entidade === "category" ? "category_id" : "ticket_type_id";
  const { data: lotes } = await admin
    .from("pricing_tiers")
    .select("id, nome, valor, ordem, quantidade_maxima, vendidos, data_fim, ativo")
    .eq(coluna, entidadeId);

  const r = loteAtivoDaLista((lotes ?? []) as TierRow[]);
  if (r.status === "sem_lotes") return { ok: true, valor: valorBase, loteId: null };
  if (r.status === "esgotado") {
    return { ok: false, error: "Os lotes desse valor esgotaram. Atualize a página pra ver o preço atual." };
  }

  const { data: claimed } = await admin.rpc("claim_pricing_tier", {
    p_tier_id: r.lote.id,
    p_qty: qty,
  });
  if (!claimed) return { ok: false, error: "Esse lote acabou de esgotar. Tente novamente." };

  return { ok: true, valor: r.lote.valor, loteId: r.lote.id };
}
