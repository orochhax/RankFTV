"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

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

export type CriarCupomInput = {
  codigo: string;
  tipoDesconto: "percentual" | "valor_fixo";
  valorDesconto: number;
  aplicaEm: "atleta" | "plateia" | "ambos";
  quantidadeMaxima: number | null;
  dataFim: string | null; // "YYYY-MM-DD" ou null
};

export async function criarCupom(champId: string, input: CriarCupomInput): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const codigo = input.codigo.trim().toUpperCase();
  if (!codigo) return { ok: false, error: "Dê um código ao cupom." };
  if (!/^[A-Z0-9_-]{3,20}$/.test(codigo)) {
    return { ok: false, error: "Código deve ter 3–20 caracteres: letras, números, - ou _." };
  }
  const valor = Number(input.valorDesconto);
  if (!valor || valor <= 0) return { ok: false, error: "Informe um valor de desconto." };
  if (input.tipoDesconto === "percentual" && valor > 100) {
    return { ok: false, error: "Desconto percentual não pode passar de 100%." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    championship_id:   champId,
    codigo,
    tipo_desconto:      input.tipoDesconto,
    valor_desconto:     valor,
    aplica_em:          input.aplicaEm,
    quantidade_maxima:  input.quantidadeMaxima,
    data_fim:           input.dataFim ? new Date(input.dataFim + "T23:59:59").toISOString() : null,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe um cupom com esse código." };
    return { ok: false, error: "Erro ao criar o cupom." };
  }

  revalidatePath(`/painel/campeonatos/${champId}/cupons`);
  return { ok: true };
}

export async function alternarCupom(champId: string, cupomId: string, ativo: boolean): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ ativo })
    .eq("id", cupomId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  revalidatePath(`/painel/campeonatos/${champId}/cupons`);
  return { ok: true };
}

export async function excluirCupom(champId: string, cupomId: string): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", cupomId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao excluir." };

  revalidatePath(`/painel/campeonatos/${champId}/cupons`);
  return { ok: true };
}
