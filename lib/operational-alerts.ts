import "server-only";

import { reportOperationalEvent } from "@/lib/observability";
import {
  buildEmailQueueAlertCandidates,
  operationalAlertDedupeKey,
  type OperationalAlertCandidate,
} from "@/lib/operational-alerts-core";
import { createAdminClient } from "@/lib/supabase/admin";

type IdRow = { id: string };
type QueryError = { message: string };
type IdQueryResult = PromiseLike<{ data: IdRow[] | null; error: QueryError | null }>;

function ids(rows: IdRow[] | null): string[] {
  return (rows ?? []).map((row) => row.id);
}

function queryWhen(enabled: boolean, query: () => IdQueryResult): IdQueryResult {
  if (!enabled) return Promise.resolve({ data: [], error: null });
  return query();
}

function assertQueriesSucceeded(results: { error: QueryError | null }[]): void {
  if (results.some((result) => result.error)) {
    throw new Error("operational_alert_scan_query_failed");
  }
}

export async function scanOperationalAlerts() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("operational_alert_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.enabled) return { created: 0, scanned: 0 };

  const paymentCutoff = new Date(
    Date.now() - Number(settings.payment_pending_minutes ?? 30) * 60_000,
  ).toISOString();
  const emailCutoff = new Date(
    Date.now() - Number(settings.email_queue_minutes ?? 15) * 60_000,
  ).toISOString();
  const [
    registrations,
    tickets,
    outbox,
    refunds,
    payouts,
    championshipBacklog,
    organizerBacklog,
    exhaustedChampionship,
    exhaustedOrganizer,
    failedTransactionalEmails,
  ] = await Promise.all([
    queryWhen(settings.payment_pending_enabled, () =>
      admin.from("registrations").select("id").eq("status_pagamento", "pendente")
        .not("asaas_payment_id", "is", null).lt("created_at", paymentCutoff).limit(500)),
    queryWhen(settings.payment_pending_enabled, () =>
      admin.from("athlete_tickets").select("id").eq("status_pagamento", "pendente")
        .not("asaas_payment_id", "is", null).lt("created_at", paymentCutoff).limit(500)),
    queryWhen(settings.webhook_failed_enabled, () =>
      admin.from("financial_outbox").select("id").eq("status", "failed").limit(500)),
    queryWhen(settings.assisted_refund_enabled, () =>
      admin.from("support_cases").select("id").eq("case_type", "estorno_pix")
        .neq("status", "resolvido").limit(500)),
    queryWhen(settings.payout_rejected_enabled, () =>
      admin.from("financial_operations").select("id").eq("flow", "payout")
        .in("status", ["failed", "cancelled"]).limit(500)),
    queryWhen(settings.email_queue_enabled, () =>
      admin.from("championship_notice_deliveries").select("id")
        .in("status", ["queued", "processing", "failed"]).lt("created_at", emailCutoff)
        .order("created_at", { ascending: true }).limit(500)),
    queryWhen(settings.email_queue_enabled, () =>
      admin.from("organizer_financial_notification_deliveries").select("id")
        .in("status", ["queued", "processing", "failed"]).lt("created_at", emailCutoff)
        .order("created_at", { ascending: true }).limit(500)),
    queryWhen(settings.email_queue_enabled, () =>
      admin.from("championship_notice_deliveries").select("id")
        .eq("status", "suppressed").gte("attempt_count", 5)
        .order("updated_at", { ascending: false }).limit(500)),
    queryWhen(settings.email_queue_enabled, () =>
      admin.from("organizer_financial_notification_deliveries").select("id")
        .eq("status", "suppressed").gte("attempt_count", 5)
        .order("updated_at", { ascending: false }).limit(500)),
    queryWhen(settings.email_queue_enabled, () =>
      admin.from("transactional_email_events").select("id")
        .in("status", ["bounced", "complained", "failed"])
        .order("requested_at", { ascending: false }).limit(500)),
  ]);
  assertQueriesSucceeded([
    registrations,
    tickets,
    outbox,
    refunds,
    payouts,
    championshipBacklog,
    organizerBacklog,
    exhaustedChampionship,
    exhaustedOrganizer,
    failedTransactionalEmails,
  ]);

  const candidates: OperationalAlertCandidate[] = [
    ...ids(registrations.data).map((id) => ({
      kind: "payment_pending" as const,
      severity: "warning" as const,
      title: "Pagamento de inscrição pendente",
      entityType: "registration",
      entityId: id,
    })),
    ...ids(tickets.data).map((id) => ({
      kind: "payment_pending" as const,
      severity: "warning" as const,
      title: "Pagamento de ingresso pendente",
      entityType: "athlete_ticket",
      entityId: id,
    })),
    ...ids(outbox.data).map((id) => ({
      kind: "webhook_failed" as const,
      severity: "critical" as const,
      title: "Processamento financeiro falhou",
      entityType: "financial_outbox",
      entityId: id,
    })),
    ...ids(refunds.data).map((id) => ({
      kind: "assisted_refund" as const,
      severity: "warning" as const,
      title: "Reembolso assistido aguardando ação",
      entityType: "support_case",
      entityId: id,
    })),
    ...ids(payouts.data).map((id) => ({
      kind: "payout_rejected" as const,
      severity: "critical" as const,
      title: "Repasse recusado",
      entityType: "financial_operation",
      entityId: id,
    })),
    ...buildEmailQueueAlertCandidates({
      championshipBacklogIds: ids(championshipBacklog.data),
      organizerBacklogIds: ids(organizerBacklog.data),
      exhaustedChampionshipIds: ids(exhaustedChampionship.data),
      exhaustedOrganizerIds: ids(exhaustedOrganizer.data),
      failedTransactionalEmailIds: ids(failedTransactionalEmails.data),
    }, Number(settings.email_queue_backlog_threshold ?? 10)),
  ];

  if (candidates.length === 0) return { created: 0, scanned: 0 };
  const { data: inserted } = await admin.from("operational_alerts").upsert(
    candidates.map((candidate) => ({
      kind: candidate.kind,
      severity: candidate.severity,
      title: candidate.title,
      entity_type: candidate.entityType,
      entity_id: candidate.entityId,
      dedupe_key: operationalAlertDedupeKey(candidate),
    })),
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  ).select("id, severity, kind");

  if (inserted?.length) {
    const critical = inserted.filter((alert) => alert.severity === "critical").length;
    await reportOperationalEvent({
      level: critical > 0 ? "critical" : "warn",
      event: "operational_alerts.detected",
      message: `${inserted.length} novo(s) alerta(s) operacional(is)`,
      context: { created: inserted.length, critical },
      alert: true,
    });
  }

  return { created: inserted?.length ?? 0, scanned: candidates.length };
}
