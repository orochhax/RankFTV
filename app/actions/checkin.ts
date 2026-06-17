"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult =
  | { ok: true; nome: string }
  | { alreadyDone: true; nome: string }
  | { error: string };

export async function markCheckin(
  qrToken: string,
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

  // Busca credencial pelo token + campeonato.
  const { data: cred } = await supabase
    .from("credentials")
    .select("id, checked_in, user_id")
    .eq("qr_token", qrToken.trim())
    .eq("championship_id", championshipId)
    .maybeSingle();

  if (!cred) {
    return { error: "QR code não encontrado neste campeonato" };
  }

  // Pega o nome do atleta na tabela profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", cred.user_id)
    .maybeSingle();

  const nome = profile?.nome ?? "Atleta";

  if (cred.checked_in) {
    return { alreadyDone: true, nome };
  }

  await supabase
    .from("credentials")
    .update({ checked_in: true, checkin_at: new Date().toISOString() })
    .eq("id", cred.id);

  revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
  return { ok: true, nome };
}
