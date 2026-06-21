"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarChavePix(
  chave: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const chaveClean = chave.trim();
  if (!chaveClean) return { ok: false, error: "Informe a chave Pix." };

  const { error } = await supabase
    .from("organizer_accounts")
    .upsert({ user_id: user.id, chave_pix: chaveClean }, { onConflict: "user_id" });

  if (error) return { ok: false, error: "Erro ao salvar chave Pix." };

  revalidatePath("/painel/campeonatos", "layout");
  return { ok: true };
}

/** Marca o campeonato como Elite (taxas reduzidas por transação). */
export async function tornarCampeonatoElite(
  champId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // Só o dono do campeonato pode ativar o Elite.
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id, is_elite")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id)
    return { ok: false, error: "Sem permissão." };
  if (champ.is_elite) return { ok: true }; // já é elite

  const { error } = await supabase
    .from("championships")
    .update({ is_elite: true, premium_fee_pendente: 0 })
    .eq("id", champId);

  if (error) return { ok: false, error: "Erro ao ativar o Elite." };

  revalidatePath(`/painel/campeonatos/${champId}`, "layout");
  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  return { ok: true };
}
