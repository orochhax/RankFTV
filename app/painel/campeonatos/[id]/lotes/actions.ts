"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GeneroCategoria } from "@/lib/types";
import { resolverFaixaRating } from "@/lib/motor-categoria";

type Result = { ok: boolean; error?: string };
type Entidade = "category" | "ticket_type";

async function entidadePertenceAoCampeonato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  champId: string,
  entidade: Entidade,
  entidadeId: string,
): Promise<boolean> {
  const tabela = entidade === "category" ? "championship_categories" : "spectator_ticket_types";
  const { data } = await supabase
    .from(tabela)
    .select("id")
    .eq("id", entidadeId)
    .eq("championship_id", champId)
    .maybeSingle();
  return !!data;
}

async function lotePertenceAoCampeonato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  champId: string,
  loteId: string,
): Promise<boolean> {
  const { data: lote } = await supabase
    .from("pricing_tiers")
    .select("category_id, ticket_type_id")
    .eq("id", loteId)
    .maybeSingle();
  if (!lote) return false;
  if (lote.category_id)
    return entidadePertenceAoCampeonato(supabase, champId, "category", lote.category_id);
  if (lote.ticket_type_id)
    return entidadePertenceAoCampeonato(supabase, champId, "ticket_type", lote.ticket_type_id);
  return false;
}

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

  if (
    (input.entidade !== "category" && input.entidade !== "ticket_type") ||
    !(await entidadePertenceAoCampeonato(supabase, champId, input.entidade, input.entidadeId))
  ) {
    return { ok: false, error: "Categoria ou ingresso não pertence a este campeonato." };
  }

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
  if (!(await lotePertenceAoCampeonato(supabase, champId, loteId)))
    return { ok: false, error: "Lote não encontrado neste campeonato." };
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

  if (
    (entidade !== "category" && entidade !== "ticket_type") ||
    !(await entidadePertenceAoCampeonato(supabase, champId, entidade, entidadeId))
  ) {
    return { ok: false, error: "Categoria ou ingresso não pertence a este campeonato." };
  }

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
        ? await supabase.from("championship_categories").update({ valor_inscricao: valor }).eq("id", entidadeId).eq("championship_id", champId)
        : await supabase.from("spectator_ticket_types").update({ valor }).eq("id", entidadeId).eq("championship_id", champId);
    if (error) return { ok: false, error: "Erro ao atualizar o valor." };
  }

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  return { ok: true };
}

export async function excluirLote(champId: string, loteId: string): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  if (!(await lotePertenceAoCampeonato(supabase, champId, loteId)))
    return { ok: false, error: "Lote não encontrado neste campeonato." };
  const { error } = await supabase.from("pricing_tiers").delete().eq("id", loteId);
  if (error) return { ok: false, error: "Erro ao excluir." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  return { ok: true };
}

// ── Categorias (atleta) ──────────────────────────────────────────────────────

export async function criarCategoria(
  champId: string,
  nome: string,
  genero: GeneroCategoria,
  valorInscricao: number,
): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const nomeClean = nome.trim();
  if (!nomeClean) return { ok: false, error: "Dê um nome à categoria." };
  const valor = Math.max(0, Math.round(Number(valorInscricao) || 0));
  if (isNaN(valor)) return { ok: false, error: "Valor inválido." };

  const supabase = await createClient();

  const faixa = resolverFaixaRating(nomeClean);
  const { error } = await supabase.from("championship_categories").insert({
    championship_id:  champId,
    nome:             nomeClean,
    genero,
    valor_inscricao:  valor,
    corte_rating_min: faixa?.min ?? 0,
    corte_rating_max: faixa?.max ?? 9999,
  });
  if (error) return { ok: false, error: "Erro ao criar a categoria." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  revalidatePath(`/painel/campeonatos/${champId}/editar`);
  revalidatePath(`/campeonatos/${champId}`);
  return { ok: true };
}

export async function excluirCategoria(champId: string, categoriaId: string): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();

  if (!(await entidadePertenceAoCampeonato(supabase, champId, "category", categoriaId)))
    return { ok: false, error: "Categoria não encontrada neste campeonato." };

  const [{ count: inscricoesPagas }, { count: ingressosPagos }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoriaId)
      .eq("status_pagamento", "pago"),
    supabase
      .from("athlete_tickets")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoriaId)
      .eq("status_pagamento", "pago"),
  ]);
  if ((inscricoesPagas ?? 0) > 0 || (ingressosPagos ?? 0) > 0)
    return { ok: false, error: "Essa categoria já tem inscrições pagas — não dá pra excluir." };

  await supabase.from("pricing_tiers").delete().eq("category_id", categoriaId);
  const { error } = await supabase
    .from("championship_categories")
    .delete()
    .eq("id", categoriaId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao excluir a categoria." };

  revalidatePath(`/painel/campeonatos/${champId}/lotes`);
  revalidatePath(`/painel/campeonatos/${champId}/editar`);
  revalidatePath(`/campeonatos/${champId}`);
  return { ok: true };
}
