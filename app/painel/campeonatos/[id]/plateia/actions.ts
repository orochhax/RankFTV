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

export async function criarTipoIngresso(
  champId: string,
  nome: string,
  valor: number,
): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const nomeClean = nome.trim();
  if (!nomeClean) return { ok: false, error: "Dê um nome ao ingresso." };
  const valorClean = Math.max(0, Number(valor) || 0);

  const supabase = await createClient();
  const { error } = await supabase.from("spectator_ticket_types").insert({
    championship_id: champId,
    nome: nomeClean,
    valor: valorClean,
    ativo: true,
  });
  if (error) return { ok: false, error: "Erro ao criar o ingresso." };

  revalidatePath(`/painel/campeonatos/${champId}/plateia`);
  return { ok: true };
}

export async function alternarTipoIngresso(champId: string, tipoId: string, ativo: boolean): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("spectator_ticket_types")
    .update({ ativo })
    .eq("id", tipoId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  revalidatePath(`/painel/campeonatos/${champId}/plateia`);
  return { ok: true };
}

export async function excluirTipoIngresso(champId: string, tipoId: string): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("spectator_ticket_types")
    .delete()
    .eq("id", tipoId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao excluir." };

  revalidatePath(`/painel/campeonatos/${champId}/plateia`);
  return { ok: true };
}

// Check-in de plateia (marcar presença manualmente, pela busca).
export async function checkinEspectador(champId: string, ticketId: string, presente: boolean): Promise<Result> {
  const auth = await assertOwner(champId);
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("spectator_tickets")
    .update({ checked_in: presente, checkin_at: presente ? new Date().toISOString() : null })
    .eq("id", ticketId)
    .eq("championship_id", champId);
  if (error) return { ok: false, error: "Erro ao registrar presença." };

  revalidatePath(`/painel/campeonatos/${champId}/plateia/checkin`);
  return { ok: true };
}
