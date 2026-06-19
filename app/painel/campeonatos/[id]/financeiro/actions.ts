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
