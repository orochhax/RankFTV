"use server";

import { readAthleteCredentialSession } from "@/lib/athlete-credential-session";
import { deliverAthleteTicketCredentials } from "@/lib/athlete-ticket-delivery";
import { enviarAvisoAlteracaoIngresso } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export async function substituirCredencialComprometida(input: {
  championshipId: string;
  credentialId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await readAthleteCredentialSession(input.credentialId);
  if (!accessToken) return { ok: false, error: "Sua sessão expirou. Recupere o ingresso novamente." };
  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("athlete_ticket_credentials")
    .select("id, athlete_ticket_id, championship_id, athlete_slot, checked_in")
    .eq("id", input.credentialId)
    .eq("championship_id", input.championshipId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!credential) return { ok: false, error: "Esta credencial já foi substituída." };
  if (credential.checked_in) return { ok: false, error: "A credencial não pode ser substituída após o check-in." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: rateError } = await admin
    .from("athlete_ticket_credential_events")
    .select("id", { count: "exact", head: true })
    .eq("credential_id", credential.id)
    .eq("event_type", "self_invalidated")
    .gte("created_at", since);
  if (rateError) return { ok: false, error: "A proteção operacional está indisponível. Procure o suporte." };
  if ((count ?? 0) >= 1) return { ok: false, error: "Por segurança, aguarde 24 horas ou procure o suporte." };

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, status_pagamento, comprador_email, parceiro_email")
    .eq("id", credential.athlete_ticket_id)
    .maybeSingle();
  if (!ticket || ticket.status_pagamento !== "pago") return { ok: false, error: "A credencial não está ativa." };

  const { error } = await admin
    .from("athlete_ticket_credentials")
    .update({
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      code: `A${credential.athlete_slot}${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      access_email_sent_at: null,
      access_email_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credential.id)
    .eq("access_token", accessToken)
    .eq("checked_in", false);
  if (error) return { ok: false, error: "Não foi possível substituir a credencial." };

  await admin.from("athlete_ticket_credential_events").insert({
    credential_id: credential.id,
    athlete_ticket_id: credential.athlete_ticket_id,
    championship_id: credential.championship_id,
    event_type: "self_invalidated",
    details: { reason: "reported_lost_or_shared", athlete_slot: credential.athlete_slot },
  });
  const email = credential.athlete_slot === 1 ? ticket.comprador_email : ticket.parceiro_email;
  const { data: championship } = await admin.from("championships").select("nome").eq("id", credential.championship_id).maybeSingle();
  if (email) await enviarAvisoAlteracaoIngresso({
    email,
    nomeCampeonato: championship?.nome ?? "seu campeonato",
    resumo: "Seu link e QR anteriores foram invalidados a seu pedido. Uma nova credencial foi emitida.",
  });
  const delivery = await deliverAthleteTicketCredentials(admin, ticket.id);
  return delivery.sent > 0
    ? { ok: true }
    : { ok: false, error: "A credencial foi protegida, mas o novo e-mail está pendente. Procure o suporte." };
}
