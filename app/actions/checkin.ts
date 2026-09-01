"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  if (cred) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", cred.user_id)
      .maybeSingle();

    const nome = profile?.nome ?? "Atleta";
    if (cred.checked_in) return { alreadyDone: true, nome };

    // A condição checked_in=false transforma leituras simultâneas do mesmo QR
    // em uma única confirmação. Quem perder a disputa recebe alreadyDone.
    const { data: claimed, error: claimError } = await supabase
      .from("credentials")
      .update({
        checked_in:     true,
        checkin_at:     new Date().toISOString(),
        checked_in_by:  user.id,
      })
      .eq("id", cred.id)
      .eq("checked_in", false)
      .select("id")
      .maybeSingle();

    if (claimError) return { error: "Não foi possível confirmar o check-in" };
    if (!claimed) return { alreadyDone: true, nome };

    revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
    revalidatePath(`/staff/${championshipId}/qrcode`);
    return { ok: true, nome };
  }

  // O checkout visitante não cria uma linha em credentials: o próprio
  // athlete_tickets é a credencial. Depois da autorização acima, o client
  // administrativo permite que organizador e staff validem esse QR sem abrir
  // UPDATE direto da tabela aos usuários autenticados.
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, comprador_nome, parceiro_nome, status_pagamento, checked_in")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!ticket) return { error: "Código não encontrado neste campeonato" };

  const nome = [ticket.comprador_nome, ticket.parceiro_nome]
    .map((name) => name?.trim())
    .filter(Boolean)
    .join(" + ") || "Dupla";
  if (ticket.status_pagamento !== "pago") return { error: "Ingresso não está ativo" };
  if (ticket.checked_in) return { alreadyDone: true, nome };

  const { data: claimed, error: claimError } = await admin
    .from("athlete_tickets")
    .update({ checked_in: true, checkin_at: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status_pagamento", "pago")
    .eq("checked_in", false)
    .select("id")
    .maybeSingle();

  if (claimError) return { error: "Não foi possível confirmar o check-in" };
  if (!claimed) {
    const { data: current } = await admin
      .from("athlete_tickets")
      .select("status_pagamento, checked_in")
      .eq("id", ticket.id)
      .maybeSingle();
    return current?.checked_in
      ? { alreadyDone: true, nome }
      : { error: "Ingresso não está ativo" };
  }

  revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
  revalidatePath(`/staff/${championshipId}/qrcode`);
  return { ok: true, nome };
}
