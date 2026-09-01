import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarCredencialAtleta } from "@/lib/email/send";
import { reportOperationalEvent } from "@/lib/observability";
import { resolveBaseUrl } from "@/lib/site-url";

type CredentialRow = {
  id: string;
  athlete_slot: number;
  access_token: string;
  access_email_sent_at: string | null;
  access_email_claimed_at: string | null;
};

const DELIVERY_CLAIM_TTL_MS = 10 * 60 * 1000;

export type AthleteTicketDeliveryResult = {
  attempted: number;
  sent: number;
  failed: number;
};

function deliveryBaseUrl(): string {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return resolveBaseUrl(process.env.VERCEL_BRANCH_URL);
  }
  return resolveBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
}

// Entrega no mínimo uma vez e evita duplicação em webhooks concorrentes. A
// data é reivindicada antes do envio; se o provedor rejeitar, ela é liberada
// para que webhook/reconciliação posterior tente novamente.
export async function deliverAthleteTicketCredentials(
  supabase: SupabaseClient,
  ticketId: string,
): Promise<AthleteTicketDeliveryResult> {
  const result: AthleteTicketDeliveryResult = { attempted: 0, sent: 0, failed: 0 };
  const { data: ticket, error: ticketError } = await supabase
    .from("athlete_tickets")
    .select(
      "id, championship_id, categoria_nome, comprador_nome, comprador_email, parceiro_nome, parceiro_email, status_pagamento, access_token, championships(nome)",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketError) {
    result.failed += 1;
    await reportOperationalEvent({
      level: "error",
      event: "athlete_credential.delivery_query_failed",
      message: "Could not load athlete ticket for credential delivery",
      context: { ticketId },
      error: ticketError,
      alert: true,
    });
    return result;
  }
  if (!ticket || ticket.status_pagamento !== "pago") return result;

  const credentialResult = await supabase
    .from("athlete_ticket_credentials")
    .select("id, athlete_slot, access_token, access_email_sent_at, access_email_claimed_at")
    .eq("athlete_ticket_id", ticketId)
    .order("athlete_slot");

  if (credentialResult.error) {
    result.failed += 1;
    await reportOperationalEvent({
      level: "error",
      event: "athlete_credential.delivery_query_failed",
      message: "Could not load individual athlete credentials",
      context: { ticketId },
      error: credentialResult.error,
      alert: true,
    });
    return result;
  }

  const championship = ticket.championships as { nome?: string } | null;
  const credentials = (credentialResult.data ?? []) as CredentialRow[];
  const baseUrl = deliveryBaseUrl();

  for (const credential of credentials) {
    if (credential.access_email_sent_at) continue;

    const isBuyer = credential.athlete_slot === 1;
    const email = (isBuyer ? ticket.comprador_email : ticket.parceiro_email)?.trim().toLowerCase();
    const athleteName = (isBuyer ? ticket.comprador_nome : ticket.parceiro_nome)?.trim();
    const partnerName = (isBuyer ? ticket.parceiro_nome : ticket.comprador_nome)?.trim();
    if (!email || !email.includes("@") || !athleteName || !partnerName) {
      result.failed += 1;
      await reportOperationalEvent({
        level: "error",
        event: "athlete_credential.delivery_recipient_invalid",
        message: "Individual athlete credential has no valid recipient",
        context: { ticketId, athleteSlot: credential.athlete_slot },
        alert: true,
      });
      continue;
    }

    const previousClaim = credential.access_email_claimed_at;
    if (previousClaim) {
      const previousClaimMs = Date.parse(previousClaim);
      const stillClaimed = Number.isFinite(previousClaimMs)
        && Date.now() - previousClaimMs < DELIVERY_CLAIM_TTL_MS;
      if (stillClaimed) continue;
    }

    const claimedAt = new Date().toISOString();
    let claimQuery = supabase
      .from("athlete_ticket_credentials")
      .update({ access_email_claimed_at: claimedAt, updated_at: claimedAt })
      .eq("id", credential.id)
      .eq("access_token", credential.access_token)
      .is("access_email_sent_at", null);
    claimQuery = previousClaim
      ? claimQuery.eq("access_email_claimed_at", previousClaim)
      : claimQuery.is("access_email_claimed_at", null);
    const { data: claimed, error: claimError } = await claimQuery
      .select("id")
      .maybeSingle();
    if (claimError) {
      result.failed += 1;
      await reportOperationalEvent({
        level: "error",
        event: "athlete_credential.delivery_claim_failed",
        message: "Could not claim individual athlete credential delivery",
        context: { ticketId, credentialId: credential.id },
        error: claimError,
        alert: true,
      });
      continue;
    }
    if (!claimed) continue;
    result.attempted += 1;

    const url = new URL(
      `/campeonatos/${ticket.championship_id}/ingresso-atleta/${credential.id}`,
      `${baseUrl}/`,
    );
    url.searchParams.set("token", credential.access_token);

    const managementUrl = isBuyer
      ? new URL(
          `/campeonatos/${ticket.championship_id}/comprar/ingresso/${ticket.id}`,
          `${baseUrl}/`,
        )
      : null;
    if (managementUrl) managementUrl.searchParams.set("token", ticket.access_token);

    const sent = await enviarCredencialAtleta({
      emailAtleta: email,
      nomeAtleta: athleteName,
      nomeParceiro: partnerName,
      nomeCampeonato: championship?.nome ?? "Campeonato",
      nomeCategoria: ticket.categoria_nome ?? "Dupla",
      credencialUrl: url.toString(),
      gerenciarCompraUrl: managementUrl?.toString(),
      idempotencyKey: `athlete-credential-${credential.id}-${credential.access_token}`,
    });

    if (sent) {
      result.sent += 1;
      const completedAt = new Date().toISOString();
      const { error: completionError } = await supabase
        .from("athlete_ticket_credentials")
        .update({
          access_email_sent_at: completedAt,
          access_email_claimed_at: null,
          updated_at: completedAt,
        })
        .eq("id", credential.id)
        .eq("access_token", credential.access_token)
        .eq("access_email_claimed_at", claimedAt);
      if (completionError) {
        result.failed += 1;
        await reportOperationalEvent({
          level: "error",
          event: "athlete_credential.delivery_completion_failed",
          message: "Provider accepted credential email but completion was not persisted",
          context: { ticketId, credentialId: credential.id },
          error: completionError,
          alert: true,
        });
      }
    } else {
      result.failed += 1;
      const { error: releaseError } = await supabase
        .from("athlete_ticket_credentials")
        .update({ access_email_claimed_at: null, updated_at: new Date().toISOString() })
        .eq("id", credential.id)
        .eq("access_token", credential.access_token)
        .eq("access_email_claimed_at", claimedAt);
      if (releaseError) {
        await reportOperationalEvent({
          level: "error",
          event: "athlete_credential.delivery_release_failed",
          message: "Could not release failed credential email claim",
          context: { ticketId, credentialId: credential.id },
          error: releaseError,
          alert: true,
        });
      }
    }
  }
  return result;
}

export async function retryPendingAthleteTicketDeliveries(
  supabase: SupabaseClient,
  limit = 50,
): Promise<AthleteTicketDeliveryResult & { tickets: number }> {
  const staleBefore = new Date(Date.now() - DELIVERY_CLAIM_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("athlete_ticket_credentials")
    .select("athlete_ticket_id, athlete_tickets!inner(status_pagamento)")
    .is("access_email_sent_at", null)
    .eq("athlete_tickets.status_pagamento", "pago")
    .or(`access_email_claimed_at.is.null,access_email_claimed_at.lt.${staleBefore}`)
    .order("created_at")
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) {
    await reportOperationalEvent({
      level: "error",
      event: "athlete_credential.retry_query_failed",
      message: "Could not load pending athlete credential deliveries",
      error,
      alert: true,
    });
    return { tickets: 0, attempted: 0, sent: 0, failed: 1 };
  }

  const ticketIds = [...new Set((data ?? []).map((row) => row.athlete_ticket_id as string))];
  const aggregate: AthleteTicketDeliveryResult & { tickets: number } = {
    tickets: ticketIds.length,
    attempted: 0,
    sent: 0,
    failed: 0,
  };
  for (const ticketId of ticketIds) {
    const delivery = await deliverAthleteTicketCredentials(supabase, ticketId);
    aggregate.attempted += delivery.attempted;
    aggregate.sent += delivery.sent;
    aggregate.failed += delivery.failed;
  }
  return aggregate;
}
