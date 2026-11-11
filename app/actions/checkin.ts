"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const checkinInputSchema = z.object({
  input: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9-]+$/),
  championshipId: z.uuid(),
}).strict();

export type CheckinResult =
  | { ok: true; nome: string; tipo?: "atleta" | "plateia" }
  | { alreadyDone: true; nome: string; tipo?: "atleta" | "plateia" }
  | { error: string };

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function claimUserCredential(
  supabase: SupabaseServer,
  championshipId: string,
  token: string,
  tokenUpper: string,
  userId: string,
): Promise<CheckinResult | null> {
  const { data: cred } = await supabase
    .from("credentials")
    .select("id, checked_in, user_id")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!cred) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", cred.user_id)
    .maybeSingle();

  const nome = profile?.nome ?? "Atleta";
  if (cred.checked_in) return { alreadyDone: true, nome, tipo: "atleta" };

  const { data: claimed, error: claimError } = await supabase
    .from("credentials")
    .update({
      checked_in: true,
      checkin_at: new Date().toISOString(),
      checked_in_by: userId,
    })
    .eq("id", cred.id)
    .eq("checked_in", false)
    .select("id")
    .maybeSingle();

  if (claimError) return { error: "Não foi possível confirmar o check-in" };
  if (!claimed) return { alreadyDone: true, nome, tipo: "atleta" };

  return { ok: true, nome, tipo: "atleta" };
}

async function claimIndividualCredential(
  admin: SupabaseAdmin,
  championshipId: string,
  token: string,
  tokenUpper: string,
  userId: string,
): Promise<CheckinResult | null> {
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
  if (!individualCredential) return null;

  const { data: parentTicket } = await admin
    .from("athlete_tickets")
    .select("status_pagamento")
    .eq("id", individualCredential.athlete_ticket_id)
    .maybeSingle();
  const nome = individualCredential.display_name_snapshot?.trim() || "Atleta";

  if (parentTicket?.status_pagamento !== "pago") {
    return { error: "Ingresso não está ativo" };
  }
  if (individualCredential.checked_in) return { alreadyDone: true, nome, tipo: "atleta" };

  const { data: claimed, error: claimError } = await admin
    .from("athlete_ticket_credentials")
    .update({
      checked_in: true,
      checkin_at: new Date().toISOString(),
      checked_in_by: userId,
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
      ? { alreadyDone: true, nome, tipo: "atleta" }
      : { error: "Esta credencial foi substituída. Leia o QR mais recente" };
  }

  return { ok: true, nome, tipo: "atleta" };
}

async function claimLegacyTicket(
  admin: SupabaseAdmin,
  championshipId: string,
  token: string,
  tokenUpper: string,
): Promise<CheckinResult | null> {
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, comprador_nome, parceiro_nome, status_pagamento, checked_in")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!ticket) return null;

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
  if (ticket.checked_in) return { alreadyDone: true, nome, tipo: "atleta" };

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
      ? { alreadyDone: true, nome, tipo: "atleta" }
      : { error: "Ingresso não está ativo" };
  }

  return { ok: true, nome, tipo: "atleta" };
}

async function claimSpectatorTicket(
  admin: SupabaseAdmin,
  championshipId: string,
  token: string,
  tokenUpper: string,
): Promise<CheckinResult | null> {
  const { data: ticket } = await admin
    .from("spectator_tickets")
    .select("id, comprador_nome, tipo_nome, quantidade, status_pagamento, checked_in")
    .eq("championship_id", championshipId)
    .or(`qr_token.eq.${token},code.eq.${tokenUpper}`)
    .maybeSingle();

  if (!ticket) return null;

  const qtdDesc = Number(ticket.quantidade) > 1 ? ` · ${ticket.quantidade} ingressos` : "";
  const nome = `${ticket.comprador_nome} (${ticket.tipo_nome ?? "Plateia"}${qtdDesc})`;

  if (ticket.status_pagamento !== "pago") {
    return { error: "Ingresso de plateia não está pago" };
  }
  if (ticket.checked_in) {
    return { alreadyDone: true, nome, tipo: "plateia" };
  }

  const { data: claimed, error: claimError } = await admin
    .from("spectator_tickets")
    .update({
      checked_in: true,
      checkin_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .eq("status_pagamento", "pago")
    .eq("checked_in", false)
    .select("id")
    .maybeSingle();

  if (claimError) return { error: "Não foi possível confirmar o check-in da plateia" };
  if (!claimed) {
    const { data: current } = await admin
      .from("spectator_tickets")
      .select("checked_in")
      .eq("id", ticket.id)
      .maybeSingle();
    return current?.checked_in
      ? { alreadyDone: true, nome, tipo: "plateia" }
      : { error: "Ingresso de plateia não está ativo" };
  }

  return { ok: true, nome, tipo: "plateia" };
}

export async function markCheckin(
  input: string,
  championshipId: string,
): Promise<CheckinResult> {
  const parsed = checkinInputSchema.safeParse({ input, championshipId });
  if (!parsed.success) return { error: "Código inválido" };
  const token = parsed.data.input;

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
  const isStaff = staffRow?.can_qrcode === true;
  if (!isOrganizer && !isStaff) {
    return { error: "Sem permissão para este campeonato" };
  }

  const tokenUpper = token.toUpperCase();

  // 1. Atletas autenticados (credentials)
  const userCredResult = await claimUserCredential(supabase, championshipId, token, tokenUpper, user.id);
  if (userCredResult) {
    if ("ok" in userCredResult) {
      revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
      revalidatePath(`/staff/${championshipId}/qrcode`);
    }
    return userCredResult;
  }

  const admin = createAdminClient();

  // 2. Atletas por credencial individual de ticket
  const indResult = await claimIndividualCredential(admin, championshipId, token, tokenUpper, user.id);
  if (indResult) {
    if ("ok" in indResult) {
      revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
      revalidatePath(`/staff/${championshipId}/qrcode`);
    }
    return indResult;
  }

  // 3. Atletas por ticket legado
  const legResult = await claimLegacyTicket(admin, championshipId, token, tokenUpper);
  if (legResult) {
    if ("ok" in legResult) {
      revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
      revalidatePath(`/staff/${championshipId}/qrcode`);
    }
    return legResult;
  }

  // 4. Ingressos de plateia / camarote (unificação portaria)
  const specResult = await claimSpectatorTicket(admin, championshipId, token, tokenUpper);
  if (specResult) {
    if ("ok" in specResult) {
      revalidatePath(`/painel/campeonatos/${championshipId}/checkin`);
      revalidatePath(`/painel/campeonatos/${championshipId}/plateia/checkin`);
      revalidatePath(`/staff/${championshipId}/qrcode`);
    }
    return specResult;
  }

  return { error: "Código não encontrado neste campeonato" };
}
