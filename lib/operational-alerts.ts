import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type AlertCandidate = { kind: "payment_pending" | "webhook_failed" | "assisted_refund" | "payout_rejected"; severity: "warning" | "critical"; title: string; entityType: string; entityId: string };

export async function scanOperationalAlerts() {
  const admin = createAdminClient();
  const { data: settings } = await admin.from("operational_alert_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings?.enabled) return { created: 0, scanned: 0 };
  const cutoff = new Date(Date.now() - Number(settings.payment_pending_minutes ?? 30) * 60_000).toISOString();
  const [registrations, tickets, outbox, refunds, payouts] = await Promise.all([
    settings.payment_pending_enabled ? admin.from("registrations").select("id").eq("status_pagamento", "pendente").not("asaas_payment_id", "is", null).lt("created_at", cutoff).limit(500) : Promise.resolve({ data: [] }),
    settings.payment_pending_enabled ? admin.from("athlete_tickets").select("id").eq("status_pagamento", "pendente").not("asaas_payment_id", "is", null).lt("created_at", cutoff).limit(500) : Promise.resolve({ data: [] }),
    settings.webhook_failed_enabled ? admin.from("financial_outbox").select("id").eq("status", "failed").limit(500) : Promise.resolve({ data: [] }),
    settings.assisted_refund_enabled ? admin.from("support_cases").select("id").eq("case_type", "estorno_pix").neq("status", "resolvido").limit(500) : Promise.resolve({ data: [] }),
    settings.payout_rejected_enabled ? admin.from("financial_operations").select("id").eq("flow", "payout").in("status", ["failed", "cancelled"]).limit(500) : Promise.resolve({ data: [] }),
  ]);
  const candidates: AlertCandidate[] = [
    ...(registrations.data ?? []).map((row) => ({ kind: "payment_pending" as const, severity: "warning" as const, title: "Pagamento de inscrição pendente", entityType: "registration", entityId: row.id })),
    ...(tickets.data ?? []).map((row) => ({ kind: "payment_pending" as const, severity: "warning" as const, title: "Pagamento de ingresso pendente", entityType: "athlete_ticket", entityId: row.id })),
    ...(outbox.data ?? []).map((row) => ({ kind: "webhook_failed" as const, severity: "critical" as const, title: "Processamento financeiro falhou", entityType: "financial_outbox", entityId: row.id })),
    ...(refunds.data ?? []).map((row) => ({ kind: "assisted_refund" as const, severity: "warning" as const, title: "Reembolso assistido aguardando ação", entityType: "support_case", entityId: row.id })),
    ...(payouts.data ?? []).map((row) => ({ kind: "payout_rejected" as const, severity: "critical" as const, title: "Repasse recusado", entityType: "financial_operation", entityId: row.id })),
  ];
  if (candidates.length === 0) return { created: 0, scanned: 0 };
  const { data: inserted } = await admin.from("operational_alerts").upsert(candidates.map((item) => ({ kind: item.kind, severity: item.severity, title: item.title, entity_type: item.entityType, entity_id: item.entityId, dedupe_key: `${item.kind}:${item.entityType}:${item.entityId}` })), { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
  return { created: inserted?.length ?? 0, scanned: candidates.length };
}
