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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Permite: organizador do campeonato OU staff aceito com can_qrcode
  const [{ data: champ }, { data: staffRow }] = await Promise.all([
    supabase
      .from("championships")
      .select("organizador_id")
      .eq("id", championshipId)
      .maybeSingle(),
    supabase
      .from("championship_staff")
      .select("can_qrcode")
      .eq("championship_id", championshipId)
      .eq("user_id", user.id)
      .eq("status", "aceito")
      .maybeSingle(),
  ]);

  const isOrganizer = champ?.organizador_id === user.id;
  const isStaff     = staffRow?.can_qrcode === true;

  if (!isOrganizer && !isStaff) {
    return { error: "Sem permissão para este campeonato" };
  }

  const token      = input.trim();
  const tokenUpper = token.toUpperCase();

  // Só aceita o formato esperado (UUID do qr_token ou código alfanumérico).
  // Isso impede injeção de filtro no PostgREST via vírgula/parênteses no `.or()`.
  if (!/^[A-Za-z0-9-]{1,64}$/.test(token)) {
    return { error: "Código inválido" };
  }

  const { data: cred } = await supabase
    .from("credentials")
    .select("id, checked_in, user_id")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!cred) {
    return { error: "Código não encontrado neste campeonato" };
  }

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
    .update({
      checked_in:     true,
      checkin_at:     new Date().toISOString(),
      checked_in_by:  user.id,
    })
    .eq("id", cred.id);

  revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
  revalidatePath(`/staff/${championshipId}/qrcode`);
  return { ok: true, nome };
}
