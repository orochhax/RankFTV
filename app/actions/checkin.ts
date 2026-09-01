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

  const admin = createAdminClient();

  // No checkout de dupla, cada atleta tem uma credencial própria vinculada
  // ao mesmo pedido. O trigger da migration mantém athlete_tickets.checked_in
  // como resumo (ao menos um integrante presente) para bloquear reembolsos.
  const individualResult = await admin
    .from("athlete_ticket_credentials")
    .select("id, athlete_ticket_id, display_name_snapshot, checked_in")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();
  if (individualResult.error) {
    return { error: "Não foi possível validar o ingresso agora" };
  }
  const individualCredential = individualResult.data;

  if (individualCredential) {
    const { data: parentTicket } = await admin
      .from("athlete_tickets")
      .select("status_pagamento")
      .eq("id", individualCredential.athlete_ticket_id)
      .maybeSingle();
    const nome = individualCredential.display_name_snapshot?.trim() || "Atleta";

    if (parentTicket?.status_pagamento !== "pago") {
      return { error: "Ingresso não está ativo" };
    }
    if (individualCredential.checked_in) return { alreadyDone: true, nome };

    const { data: claimed, error: claimError } = await admin
      .from("athlete_ticket_credentials")
      .update({
        checked_in: true,
        checkin_at: new Date().toISOString(),
        checked_in_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", individualCredential.id)
      .eq("checked_in", false)
      .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
      .select("id")
      .maybeSingle();

    if (claimError) return { error: "Não foi possível confirmar o check-in" };
    if (!claimed) {
      const { data: current } = await admin
        .from("athlete_ticket_credentials")
        .select("checked_in")
        .eq("id", individualCredential.id)
        .maybeSingle();
      return current?.checked_in
        ? { alreadyDone: true, nome }
        : { error: "Esta credencial foi substituída. Leia o QR mais recente" };
    }

    revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
    revalidatePath(`/staff/${championshipId}/qrcode`);
    return { ok: true, nome };
  }

  // Compatibilidade temporária enquanto a migration ainda não existir e para
  // qualquer QR legado que não tenha recebido as duas credenciais no backfill.
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, comprador_nome, parceiro_nome, status_pagamento, checked_in")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!ticket) return { error: "Código não encontrado neste campeonato" };

  const existingIndividualResult = await admin
    .from("athlete_ticket_credentials")
    .select("id")
    .eq("athlete_ticket_id", ticket.id)
    .limit(1)
    .maybeSingle();
  if (existingIndividualResult.error) {
    return { error: "Não foi possível validar o ingresso agora" };
  }
  if (existingIndividualResult.data) {
    return { error: "Código não encontrado neste campeonato" };
  }

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
