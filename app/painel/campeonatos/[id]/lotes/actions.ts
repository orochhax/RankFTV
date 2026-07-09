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
  aplicarATodas?:   boolean; // replica o lote pra todas as categorias do campeonato
};

export async function criarLote(champId: string, input: CriarLoteInput): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const nome = input.nome.trim();
  if (!nome) return { ok: false, error: "Dê um nome ao lote." };
  const valor = Number(input.valor);
  if (isNaN(valor) || valor < 0) return { ok: false, error: "Valor inválido." };

  const quantidadeMaxima =
    input.quantidadeMaxima != null && Number.isFinite(input.quantidadeMaxima)
      ? Math.max(1, Math.floor(input.quantidadeMaxima))
      : null;
  if (!quantidadeMaxima && !input.dataFim)
    return { ok: false, error: "Escolha uma data de término ou uma quantidade máxima pra esse lote." };

  const supabase = await createClient();

  // Alvo(s) do lote: só a entidade escolhida, ou todas as categorias do
  // campeonato de uma vez (aplicarATodas só vale pra categoria, não plateia).
  let entidadeIds = [input.entidadeId];
  if (input.aplicarATodas && input.entidade === "category") {
    const { data: categorias, error: catErr } = await supabase
      .from("championship_categories")
      .select("id")
      .eq("championship_id", champId);
    if (catErr) {
      console.error("[criarLote] erro ao buscar categorias:", catErr);
      return { ok: false, error: "Erro ao buscar as categorias do campeonato." };
    }
    entidadeIds = (categorias ?? []).map((c) => c.id);
  }
  if (entidadeIds.length === 0) return { ok: false, error: "Nenhuma categoria encontrada." };

  // Ordem por entidade = quantos lotes ela já tem (cada categoria pode estar
  // em um "ponto" diferente da própria progressão de lotes).
  const coluna = input.entidade === "category" ? "category_id" : "ticket_type_id";
  const { data: lotesExistentes, error: lotesErr } = await supabase
    .from("pricing_tiers")
    .select(coluna)
    .in(coluna, entidadeIds);
  if (lotesErr) {
    console.error("[criarLote] erro ao contar lotes existentes:", lotesErr);
    return { ok: false, error: "Erro ao verificar os lotes existentes." };
  }

  const contagem = new Map<string, number>();
  for (const l of (lotesExistentes ?? []) as Record<string, string | null>[]) {
    const key = l[coluna];
    if (key) contagem.set(key, (contagem.get(key) ?? 0) + 1);
  }

  const dataFimIso = input.dataFim ? new Date(input.dataFim + "T23:59:59").toISOString() : null;

  const rows = entidadeIds.map((id) => ({
    category_id:       input.entidade === "category" ? id : null,
    ticket_type_id:    input.entidade === "ticket_type" ? id : null,
    nome,
    valor,
    ordem:             contagem.get(id) ?? 0,
    quantidade_maxima: quantidadeMaxima,
    data_fim:          dataFimIso,
  }));

  const { error } = await supabase.from("pricing_tiers").insert(rows);

  if (error) {
    console.error("[criarLote] erro ao inserir:", error);
    return { ok: false, error: `Erro ao criar o lote: ${error.message}` };
  }

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

export async function atualizarValorBase(
  champId: string,
  entidade: Entidade,
  entidadeId: string,
  novoValor: number,
  aplicarATodas = false,
): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const valor = Number(novoValor);
  if (isNaN(valor) || valor < 0) return { ok: false, error: "Valor inválido." };

  const supabase = await createClient();

  // aplicarATodas só vale pra categoria — atualiza o valor_inscricao de
  // todas as categorias do campeonato de uma vez.
  if (entidade === "category" && aplicarATodas) {
    const { error } = await supabase
      .from("championship_categories")
      .update({ valor_inscricao: valor })
      .eq("championship_id", champId);
    if (error) return { ok: false, error: "Erro ao atualizar o valor." };
  } else {
    const { error } =
      entidade === "category"
        ? await supabase.from("championship_categories").update({ valor_inscricao: valor }).eq("id", entidadeId)
        : await supabase.from("spectator_ticket_types").update({ valor }).eq("id", entidadeId);
    if (error) return { ok: false, error: "Erro ao atualizar o valor." };
  }

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
