import "server-only";

import { registrarAuditoria } from "@/lib/audit";
import { createEmailOperationalEvent, updateEmailOperationalEvent } from "@/lib/email/operations";
import { getResend, FROM } from "@/lib/email/resend";
import { comunicadoHtml } from "@/lib/email/templates";
import { reportOperationalEvent } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildChampionshipChangeNotice } from "@/lib/championship-notices-core";
import { emailRecipientDigest } from "@/lib/email/recipient-digest";
import { isEmailRecipientAllowed } from "@/lib/email/recipient-allowlist";

export type AuthenticatedRecipient = { userId: string; email: string; nome: string };
type RecipientSource = "authenticated" | "athlete_ticket";
type RecipientSlot = "user" | "buyer" | "partner";
type RecipientCandidate = { source: RecipientSource; ref: string; slot: RecipientSlot; email: string; name: string };
export type PreparedChampionshipNoticeRecipients = {
  deliveries: Array<{
    recipient_source: RecipientSource;
    recipient_ref: string;
    recipient_slot: RecipientSlot;
    recipient_hash: string;
  }>;
  notificationUserIds: string[];
};
type DeliveryRow = {
  id: string;
  notice_id: string;
  championship_id: string;
  recipient_source: RecipientSource;
  recipient_ref: string;
  recipient_slot: RecipientSlot;
  recipient_hash: string;
  attempt_count: number;
};

const MAX_ATTEMPTS = 5;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function championshipNoticeRetryAt(attemptCount: number, now = Date.now()): string {
  const delayMinutes = Math.min(24 * 60, 5 * 2 ** Math.max(0, attemptCount - 1));
  return new Date(now + delayMinutes * 60_000).toISOString();
}

async function resolveDeliveryRecipient(row: DeliveryRow): Promise<{ email: string; name: string } | null> {
  const admin = createAdminClient();
  if (row.recipient_source === "authenticated") {
    const { data, error } = await admin.auth.admin.getUserById(row.recipient_ref);
    const email = data.user?.email;
    if (error || !email) return null;
    const { data: profile } = await admin.from("profiles").select("nome").eq("id", row.recipient_ref).maybeSingle();
    return { email, name: profile?.nome || data.user.user_metadata?.nome || "Atleta" };
  }

  const { data: ticket, error } = await admin
    .from("athlete_tickets")
    .select("status_pagamento, comprador_email, comprador_nome, parceiro_email, parceiro_nome")
    .eq("id", row.recipient_ref)
    .maybeSingle();
  if (error || !ticket || ticket.status_pagamento !== "pago") return null;
  if (row.recipient_slot === "buyer" && ticket.comprador_email) {
    return { email: ticket.comprador_email, name: ticket.comprador_nome || "Atleta" };
  }
  if (row.recipient_slot === "partner" && ticket.parceiro_email) {
    return { email: ticket.parceiro_email, name: ticket.parceiro_nome || "Atleta" };
  }
  return null;
}

async function markDeliveryFailure(row: DeliveryRow, category: string) {
  const attempts = row.attempt_count + 1;
  await createAdminClient().from("championship_notice_deliveries").update({
    status: attempts >= MAX_ATTEMPTS ? "suppressed" : "failed",
    attempt_count: attempts,
    next_attempt_at: championshipNoticeRetryAt(attempts),
    claimed_at: null,
    last_error_category: category.slice(0, 120),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
}

export async function processPendingChampionshipNoticeDeliveries(options?: {
  noticeId?: string;
  limit?: number;
}): Promise<{ processed: number; accepted: number; failed: number; suppressed: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_championship_notice_deliveries", {
    p_notice_id: options?.noticeId ?? null,
    p_limit: Math.min(Math.max(options?.limit ?? 50, 1), 250),
  });
  if (error) {
    await reportOperationalEvent({
      level: "error", event: "championship_notice.queue_read_failed",
      message: "Championship change notification queue could not be read", error, alert: true,
    });
    return { processed: 0, accepted: 0, failed: 0, suppressed: 0 };
  }

  const result = { processed: 0, accepted: 0, failed: 0, suppressed: 0 };
  for (const row of (data ?? []) as DeliveryRow[]) {
    result.processed += 1;
    const recipient = await resolveDeliveryRecipient(row);
    if (!recipient || emailRecipientDigest(recipient.email) !== row.recipient_hash) {
      await admin.from("championship_notice_deliveries").update({
        status: "suppressed", attempt_count: row.attempt_count + 1,
        claimed_at: null, last_error_category: "recipient_no_longer_eligible",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      result.suppressed += 1;
      continue;
    }

    if (!isEmailRecipientAllowed(recipient.email, process.env.CHAMPIONSHIP_NOTICE_EMAIL_ALLOWLIST)) {
      await admin.from("championship_notice_deliveries").update({
        status: "suppressed", attempt_count: row.attempt_count + 1,
        claimed_at: null, last_error_category: "recipient_not_allowlisted",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      result.suppressed += 1;
      continue;
    }

    const [{ data: notice }, { data: championship }] = await Promise.all([
      admin.from("championship_notices").select("title, message").eq("id", row.notice_id).maybeSingle(),
      admin.from("championships").select("nome").eq("id", row.championship_id).maybeSingle(),
    ]);
    if (!notice || !championship) {
      await markDeliveryFailure(row, "source_record_missing");
      result.failed += 1;
      continue;
    }

    const operationalEventId = await createEmailOperationalEvent({ recipient: recipient.email, templateKey: "championship_change" });
    if (!process.env.RESEND_API_KEY) {
      await updateEmailOperationalEvent({ id: operationalEventId, status: "failed", failureCategory: "provider_not_configured" });
      await markDeliveryFailure(row, "provider_not_configured");
      result.failed += 1;
      continue;
    }

    try {
      const sent = await getResend().emails.send({
        from: FROM,
        to: recipient.email,
        subject: `${championship.nome} — ${notice.title}`,
        html: comunicadoHtml({ nomeAtleta: recipient.name, nomeCampeonato: championship.nome, titulo: notice.title, mensagem: notice.message }),
      }, { idempotencyKey: `championship-change-${row.notice_id}-${row.recipient_hash}` });
      if (sent.error) {
        await updateEmailOperationalEvent({ id: operationalEventId, status: "failed", failureCategory: "provider_rejected" });
        await markDeliveryFailure(row, "provider_rejected");
        result.failed += 1;
        continue;
      }
      const acceptedAt = new Date().toISOString();
      await updateEmailOperationalEvent({ id: operationalEventId, status: "accepted", providerMessageId: sent.data?.id });
      await admin.from("championship_notice_deliveries").update({
        status: "accepted", provider_message_id: sent.data?.id ?? null,
        attempt_count: row.attempt_count + 1, accepted_at: acceptedAt,
        claimed_at: null, last_error_category: null, updated_at: acceptedAt,
      }).eq("id", row.id);
      result.accepted += 1;
    } catch (error) {
      await updateEmailOperationalEvent({ id: operationalEventId, status: "failed", failureCategory: "provider_exception" });
      await markDeliveryFailure(row, "provider_exception");
      await reportOperationalEvent({
        level: "error", event: "championship_notice.delivery_failed",
        message: "Championship change email delivery failed",
        context: { noticeId: row.notice_id, source: row.recipient_source }, error, alert: true,
      });
      result.failed += 1;
    }
  }
  return result;
}

export async function prepareChampionshipNoticeRecipients(input: {
  championshipId: string;
  authenticatedRecipients: AuthenticatedRecipient[];
}): Promise<PreparedChampionshipNoticeRecipients> {
  const { data: guestTickets, error: ticketError } = await createAdminClient()
    .from("athlete_tickets")
    .select("id, comprador_email, comprador_nome, parceiro_email, parceiro_nome")
    .eq("championship_id", input.championshipId)
    .eq("status_pagamento", "pago");
  if (ticketError) throw ticketError;

  const recipients = new Map<string, RecipientCandidate>();
  for (const recipient of input.authenticatedRecipients) {
    if (!recipient.email) continue;
    recipients.set(normalizeEmail(recipient.email), {
      source: "authenticated", ref: recipient.userId, slot: "user",
      email: recipient.email, name: recipient.nome || "Atleta",
    });
  }
  for (const ticket of guestTickets ?? []) {
    if (ticket.comprador_email && !recipients.has(normalizeEmail(ticket.comprador_email))) {
      recipients.set(normalizeEmail(ticket.comprador_email), {
        source: "athlete_ticket", ref: ticket.id, slot: "buyer",
        email: ticket.comprador_email, name: ticket.comprador_nome || "Atleta",
      });
    }
    if (ticket.parceiro_email && !recipients.has(normalizeEmail(ticket.parceiro_email))) {
      recipients.set(normalizeEmail(ticket.parceiro_email), {
        source: "athlete_ticket", ref: ticket.id, slot: "partner",
        email: ticket.parceiro_email, name: ticket.parceiro_nome || "Atleta",
      });
    }
  }

  return {
    deliveries: [...recipients.values()].map((recipient) => ({
      recipient_source: recipient.source,
      recipient_ref: recipient.ref,
      recipient_slot: recipient.slot,
      recipient_hash: emailRecipientDigest(recipient.email),
    })),
    notificationUserIds: [...new Set(input.authenticatedRecipients.map((recipient) => recipient.userId))],
  };
}

export async function publishChampionshipChangeNotice(input: {
  championshipId: string;
  championshipName: string;
  actorId: string;
  notice: NonNullable<ReturnType<typeof buildChampionshipChangeNotice>>;
  authenticatedRecipients: AuthenticatedRecipient[];
}): Promise<{ noticeId: string | null; queued: number; accepted: number }> {
  const admin = createAdminClient();
  try {
    const { error: upsertError } = await admin.from("championship_notices").upsert({
      championship_id: input.championshipId, created_by: input.actorId,
      kind: input.notice.kind, title: input.notice.title,
      message: input.notice.message, dedupe_key: input.notice.dedupeKey,
    }, { onConflict: "championship_id,dedupe_key", ignoreDuplicates: true });
    if (upsertError) throw upsertError;
    const { data: notice, error: noticeError } = await admin.from("championship_notices")
      .select("id").eq("championship_id", input.championshipId)
      .eq("dedupe_key", input.notice.dedupeKey).single();
    if (noticeError || !notice) throw noticeError ?? new Error("notice_not_found_after_upsert");

    const prepared = await prepareChampionshipNoticeRecipients({
      championshipId: input.championshipId,
      authenticatedRecipients: input.authenticatedRecipients,
    });
    if (prepared.deliveries.length > 0) {
      const { error: deliveryError } = await admin.from("championship_notice_deliveries").upsert(
        prepared.deliveries.map((recipient) => ({
          notice_id: notice.id, championship_id: input.championshipId,
          ...recipient,
        })),
        { onConflict: "notice_id,recipient_hash", ignoreDuplicates: true },
      );
      if (deliveryError) throw deliveryError;
    }

    if (prepared.notificationUserIds.length > 0) {
      const { error: notificationError } = await admin.from("notifications").upsert(
        prepared.notificationUserIds.map((userId) => ({
          user_id: userId, championship_id: input.championshipId,
          tipo: "championship_change", titulo: input.notice.title,
          mensagem: input.notice.message, source_notice_id: notice.id,
        })),
        { onConflict: "user_id,source_notice_id", ignoreDuplicates: true },
      );
      if (notificationError) throw notificationError;
    }

    await registrarAuditoria({
      actorId: input.actorId, acao: "championship.change_notice_queued",
      alvoTabela: "championships", alvoId: input.championshipId,
      detalhes: { noticeId: notice.id, recipientCount: prepared.deliveries.length, kind: input.notice.kind },
    });
    const processed = await processPendingChampionshipNoticeDeliveries({ noticeId: notice.id, limit: 50 });
    return { noticeId: notice.id, queued: prepared.deliveries.length, accepted: processed.accepted };
  } catch (error) {
    await reportOperationalEvent({
      level: "error", event: "championship_notice.publish_failed",
      message: "Championship change notice could not be queued",
      context: { championshipId: input.championshipId, kind: input.notice.kind }, error, alert: true,
    });
    return { noticeId: null, queued: 0, accepted: 0 };
  }
}
