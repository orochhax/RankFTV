import "server-only";

import { createEmailOperationalEvent, updateEmailOperationalEvent } from "@/lib/email/operations";
import { emailRecipientDigest } from "@/lib/email/recipient-digest";
import { getResend, FROM } from "@/lib/email/resend";
import { organizerFinancialNotificationHtml } from "@/lib/email/templates";
import { reportOperationalEvent } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";
import { organizerFinancialNotificationCopy, organizerFinancialNotificationRetryAt, organizerFinancialNotificationSourceKey, type OrganizerFinancialNotificationKind } from "@/lib/organizer-financial-notifications-core";

const MAX_ATTEMPTS = 5;
type Delivery = { id: string; organizer_id: string; championship_id: string; payment_id: string; event_kind: OrganizerFinancialNotificationKind; record_type: string; record_id: string; amount: number | null; attempt_count: number };

const formatBRL = (value: number | null) => value == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

async function markFailure(row: Delivery, category: string) {
  const attempts = row.attempt_count + 1;
  await createAdminClient().from("organizer_financial_notification_deliveries").update({
    status: attempts >= MAX_ATTEMPTS ? "suppressed" : "failed", attempt_count: attempts,
    next_attempt_at: organizerFinancialNotificationRetryAt(attempts), claimed_at: null,
    last_error_category: category.slice(0, 120), updated_at: new Date().toISOString(),
  }).eq("id", row.id);
}

export async function queueOrganizerFinancialNotification(input: { championshipId: string; paymentId: string; kind: OrganizerFinancialNotificationKind; recordType: "registration" | "athlete_ticket" | "spectator_ticket"; recordId: string; amount?: number | null }) {
  const admin = createAdminClient();
  const { data: championship, error } = await admin.from("championships").select("organizador_id").eq("id", input.championshipId).maybeSingle();
  if (error || !championship?.organizador_id) throw new Error("organizer_financial_notification_championship_missing");
  const { error: insertError } = await admin.from("organizer_financial_notification_deliveries").upsert({
    organizer_id: championship.organizador_id, championship_id: input.championshipId,
    source_key: organizerFinancialNotificationSourceKey(input.paymentId, input.kind), payment_id: input.paymentId,
    event_kind: input.kind, record_type: input.recordType, record_id: input.recordId, amount: input.amount ?? null,
  }, { onConflict: "organizer_id,source_key", ignoreDuplicates: true });
  if (insertError) throw new Error(`organizer_financial_notification_enqueue_failed:${insertError.message}`);
}

export async function processPendingOrganizerFinancialNotifications(limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_organizer_financial_notification_deliveries", { p_limit: Math.min(Math.max(limit, 1), 250) });
  if (error) throw new Error(`organizer_financial_notification_claim_failed:${error.message}`);
  const result = { processed: 0, accepted: 0, failed: 0, suppressed: 0 };
  for (const row of (data ?? []) as Delivery[]) {
    result.processed++;
    const [{ data: user }, { data: profile }, { data: championship }] = await Promise.all([
      admin.auth.admin.getUserById(row.organizer_id), admin.from("profiles").select("nome").eq("id", row.organizer_id).maybeSingle(), admin.from("championships").select("nome").eq("id", row.championship_id).maybeSingle(),
    ]);
    const email = user.user?.email;
    if (!email || !championship) {
      await markFailure(row, "recipient_or_championship_missing"); result.failed++; continue;
    }
    const eventId = await createEmailOperationalEvent({ recipient: email, templateKey: "organizer_financial" });
    if (!process.env.RESEND_API_KEY) { await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_not_configured" }); await markFailure(row, "provider_not_configured"); result.failed++; continue; }
    const copy = organizerFinancialNotificationCopy(row.event_kind);
    try {
      const sent = await getResend().emails.send({ from: FROM, to: email, subject: `${copy.subject} — ${championship.nome}`, html: organizerFinancialNotificationHtml({ nomeOrganizador: profile?.nome || user.user?.user_metadata?.nome || "Organizador", nomeCampeonato: championship.nome, heading: copy.heading, detail: copy.detail, valorFormatado: formatBRL(row.amount) }) }, { idempotencyKey: `organizer-financial-${row.payment_id}-${row.event_kind}` });
      if (sent.error) { await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_rejected" }); await markFailure(row, "provider_rejected"); result.failed++; continue; }
      const now = new Date().toISOString();
      await updateEmailOperationalEvent({ id: eventId, status: "accepted", providerMessageId: sent.data?.id });
      await admin.from("organizer_financial_notification_deliveries").update({ status: "accepted", provider_message_id: sent.data?.id ?? null, recipient_hash: emailRecipientDigest(email), attempt_count: row.attempt_count + 1, claimed_at: null, accepted_at: now, last_error_category: null, updated_at: now }).eq("id", row.id);
      result.accepted++;
    } catch (error) {
      await updateEmailOperationalEvent({ id: eventId, status: "failed", failureCategory: "provider_exception" }); await markFailure(row, "provider_exception"); result.failed++;
      await reportOperationalEvent({ level: "error", event: "organizer_financial_notification.delivery_failed", message: "Organizer financial notification delivery failed", context: { deliveryId: row.id, eventKind: row.event_kind }, error, alert: true });
    }
  }
  return result;
}
