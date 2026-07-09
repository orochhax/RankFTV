"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };
type Entidade = "category" | "ticket_type";

// Confere se o usuário logado é o dono do campeonato.
async function assertOwner(champId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .maybeSingle();
  if (!champ || champ.organizador_id !== user.id) return { ok: false, error: "Sem permissão." };
  return { ok: true };
}

export type CriarLoteInput = {
  entidade:         Entidade;
  entidadeId:       string;
  nome:             string;
  valor:            number;
  ordem:            number;
  quantidadeMaxima: number | null;
  dataFim:          string | null; // "YYYY-MM-DD" ou null
};

export async function criarLote(champId: string, input: CriarLoteInput): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const nome = input.nome.trim();
  if (!nome) return { ok: false, error: "Dê um nome ao lote." };
  const valor = Number(input.valor);
  if (isNaN(valor) || valor < 0) return { ok: false, error: "Valor inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("pricing_tiers").insert({
    category_id:       input.entidade === "category" ? input.entidadeId : null,
    ticket_type_id:    input.entidade === "ticket_type" ? input.entidadeId : null,
    nome,
    valor,
    ordem:             input.ordem,
    quantidade_maxima: input.quantidadeMaxima,
    data_fim:          input.dataFim ? new Date(input.dataFim + "T23:59:59").toISOString() : null,
  });

  if (error) return { ok: false, error: "Erro ao criar o lote." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  return { ok: true };
}

export async function alternarLote(champId: string, loteId: string, ativo: boolean): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("pricing_tiers").update({ ativo }).eq("id", loteId);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  return { ok: true };
}

export async function excluirLote(champId: string, loteId: string): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("pricing_tiers").delete().eq("id", loteId);
  if (error) return { ok: false, error: "Erro ao excluir." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  return { ok: true };
}
