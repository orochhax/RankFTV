"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import {
  validateExpenseInput,
  type ChampionshipExpense,
  type ChampionshipExpenseStatus,
} from "@/lib/championship-expenses";

export type ActionResponse<T = unknown> = {
  ok: boolean;
  error?: string;
  expense?: ChampionshipExpense;
  data?: T;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateExpensePaths(campId: string, slug: string | null | undefined) {
  const publicSlug = slug ?? campId;
  revalidatePath(`/painel/campeonatos/${publicSlug}/despesas`);
  revalidatePath(`/painel/campeonatos/${publicSlug}/financeiro`);
  if (publicSlug !== campId) {
    revalidatePath(`/painel/campeonatos/${campId}/despesas`);
    revalidatePath(`/painel/campeonatos/${campId}/financeiro`);
  }
}

// Helper para mapear row do Postgres para o tipo TypeScript
function mapExpenseRow(row: Record<string, unknown>): ChampionshipExpense {
  return {
    id: String(row.id),
    championshipId: String(row.championship_id),
    organizadorId: String(row.organizador_id),
    categoria: String(row.categoria),
    nome: String(row.nome),
    valor: Number(row.valor),
    status: row.status as ChampionshipExpenseStatus,
    dataVencimento: String(row.data_vencimento).slice(0, 10),
    dataPagamento: row.data_pagamento ? String(row.data_pagamento) : null,
    observacao: row.observacao ? String(row.observacao) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * Cria uma nova despesa operacional do campeonato.
 */
export async function criarDespesaAction(input: {
  champId: string;
  nome: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  status: ChampionshipExpenseStatus;
  observacao?: string | null;
}): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const camp = await getDbChampionshipById(input.champId);
  if (!camp) return { ok: false, error: "Campeonato não encontrado." };
  if (camp.organizadorId !== user.id) {
    return { ok: false, error: "Acesso negado: apenas o organizador dono pode lançar despesas." };
  }

  const validation = validateExpenseInput(input);
  if (!validation.valid || !validation.data) {
    return { ok: false, error: validation.errors.join(" ") };
  }

  const { data: expRow, error } = await supabase
    .from("championship_expenses")
    .insert({
      championship_id: camp.id,
      organizador_id: user.id,
      categoria: validation.data.categoria,
      nome: validation.data.nome,
      valor: validation.data.valor,
      status: validation.data.status,
      data_vencimento: validation.data.dataVencimento,
      data_pagamento: validation.data.status === "pago" ? new Date().toISOString() : null,
      observacao: validation.data.observacao,
    })
    .select()
    .single();

  if (error || !expRow) {
    return { ok: false, error: error?.message ?? "Falha ao gravar despesa no banco." };
  }

  revalidateExpensePaths(camp.id, camp.slug);

  return { ok: true, expense: mapExpenseRow(expRow as Record<string, unknown>) };
}

/**
 * Atualiza os dados de uma despesa existente.
 */
export async function atualizarDespesaAction(input: {
  champId: string;
  expenseId: string;
  nome: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  status: ChampionshipExpenseStatus;
  observacao?: string | null;
}): Promise<ActionResponse> {
  if (!UUID_RE.test(input.expenseId)) return { ok: false, error: "Identificador de despesa inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const camp = await getDbChampionshipById(input.champId);
  if (!camp) return { ok: false, error: "Campeonato não encontrado." };
  if (camp.organizadorId !== user.id) {
    return { ok: false, error: "Acesso negado." };
  }

  const validation = validateExpenseInput(input);
  if (!validation.valid || !validation.data) {
    return { ok: false, error: validation.errors.join(" ") };
  }

  const { data: expRow, error } = await supabase
    .from("championship_expenses")
    .update({
      categoria: validation.data.categoria,
      nome: validation.data.nome,
      valor: validation.data.valor,
      status: validation.data.status,
      data_vencimento: validation.data.dataVencimento,
      data_pagamento: validation.data.status === "pago" ? new Date().toISOString() : null,
      observacao: validation.data.observacao,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.expenseId)
    .eq("championship_id", camp.id)
    .select()
    .single();

  if (error || !expRow) {
    return { ok: false, error: error?.message ?? "Falha ao atualizar despesa." };
  }

  revalidateExpensePaths(camp.id, camp.slug);

  return { ok: true, expense: mapExpenseRow(expRow as Record<string, unknown>) };
}

/**
 * Alterna atomicamente o status entre pendente e pago.
 */
export async function alternarStatusDespesaAction(input: {
  champId: string;
  expenseId: string;
  nextStatus: ChampionshipExpenseStatus;
}): Promise<ActionResponse> {
  if (!UUID_RE.test(input.expenseId)) return { ok: false, error: "Identificador de despesa inválido." };
  const nextStatus: ChampionshipExpenseStatus = input.nextStatus === "pago" ? "pago" : "pendente";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const camp = await getDbChampionshipById(input.champId);
  if (!camp || camp.organizadorId !== user.id) {
    return { ok: false, error: "Acesso negado." };
  }

  const { error } = await supabase
    .from("championship_expenses")
    .update({
      status: nextStatus,
      data_pagamento: nextStatus === "pago" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.expenseId)
    .eq("championship_id", camp.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateExpensePaths(camp.id, camp.slug);

  return { ok: true };
}

/**
 * Exclui uma despesa.
 */
export async function excluirDespesaAction(input: {
  champId: string;
  expenseId: string;
}): Promise<ActionResponse> {
  if (!UUID_RE.test(input.expenseId)) return { ok: false, error: "Identificador de despesa inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const camp = await getDbChampionshipById(input.champId);
  if (!camp || camp.organizadorId !== user.id) {
    return { ok: false, error: "Acesso negado." };
  }

  const { error } = await supabase
    .from("championship_expenses")
    .delete()
    .eq("id", input.expenseId)
    .eq("championship_id", camp.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateExpensePaths(camp.id, camp.slug);

  return { ok: true };
}
