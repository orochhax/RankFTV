"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult =
  | { ok: true; nome: string }
  | { alreadyDone: true; nome: string }
  | { error: string };

export async function markCheckin(
  input: string,
  championshipId: string,
): Promise<CheckinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Só o dono do campeonato pode fazer check-in.
  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", championshipId)
    .maybeSingle();

  if (!champ || champ.organizador_id !== user.id) {
    return { error: "Sem permissão para este campeonato" };
  }

  const token = input.trim();
  const tokenUpper = token.toUpperCase();

  // Busca credencial pelo qr_token OU pelo code curto (case-insensitive).
  const { data: cred } = await supabase
    .from("credentials")
    .select("id, checked_in, user_id")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!cred) {
    return { error: "Código não encontrado neste campeonato" };
  }

  // Nome do atleta para o toast.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", cred.user_id)
    .maybeSingle();

  const nome = profile?.nome ?? "Atleta";

  if (cred.checked_in) {
    return { alreadyDone: true, nome };
  }

  // Marca check-in e registra quem escaneou.
  await supabase
    .from("credentials")
    .update({
      checked_in: true,
      checkin_at: new Date().toISOString(),
      checked_in_by: user.id,
    })
    .eq("id", cred.id);

  revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
  return { ok: true, nome };
}
