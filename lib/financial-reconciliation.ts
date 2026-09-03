import "server-only";

import { NextRequest } from "next/server";
import {
  buscarAssinaturaPorReferencia,
  buscarCobrancaPorReferencia,
  buscarTransferenciaPorReferencia,
  consultarCobranca,
  consultarPixQrCode,
  listarEstornosCobranca,
  type StatusCobranca,
} from "@/lib/asaas";
import { financialProviderStatusToWebhookEvent } from "@/lib/financial-operations";
import { payoutRetryStatusForBilling, refundProviderStatus, refundStatusFromRefunds } from "@/lib/payment-provider-state";
import { createAdminClient } from "@/lib/supabase/admin";

type ReconcileOperation = {
  id: string;
  flow: string;
  operation_type: "payment" | "subscription" | "refund" | "transfer";
  record_id: string;
  external_reference: string;
  provider_id: string | null;
  metadata: Record<string, unknown> | null;
  attempt_count: number;
};

const PAYMENT_TABLES: Record<string, string> = {
  registration: "registrations",
  athlete_ticket: "athlete_tickets",
  spectator_ticket: "spectator_tickets",
  arena_rental: "arena_rentals",
  arena_daily_pass: "arena_daily_passes",
  arena_class: "arena_attendance",
  arena_monthly_charge: "student_charges",
};

const PAYOUT_TABLES = new Set([
  "registrations",
  "athlete_tickets",
  "spectator_tickets",
  "student_charges",
  "arena_rentals",
  "arena_daily_passes",
  "arena_attendance",
]);

async function reschedule(operation: ReconcileOperation, reason: string, seconds = 300) {
  await createAdminClient().rpc("financial_reschedule_outbox", {
    p_operation_id: operation.id,
    p_error: reason.slice(0, 300),
    p_retry_seconds: seconds,
  });
}

async function recordProvider(
  operation: ReconcileOperation,
  provider: { id: string; status?: string },
  status: "provider_created" | "confirmed" | "refunded" | "cancelled",
) {
  await createAdminClient().rpc("financial_complete_operation", {
    p_operation_id: operation.id,
    p_provider_id: provider.id,
    p_provider_status: provider.status ?? null,
    p_status: status,
  });
}

async function attachPayment(operation: ReconcileOperation, payment: StatusCobranca) {
  const table = PAYMENT_TABLES[operation.flow];
  if (!table) throw new Error("unsupported_payment_flow");
  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from(table)
    .select("id, asaas_payment_id")
    .eq("id", operation.record_id)
    .maybeSingle();
  if (readError || !current) throw new Error("financial_record_not_found");
  if (current.asaas_payment_id && current.asaas_payment_id !== payment.id) {
    throw new Error("provider_payment_conflict");
  }

  const update: Record<string, unknown> = { asaas_payment_id: payment.id };
  if (operation.flow !== "arena_class") update.billing_type = payment.billingType;
  if (["registration", "athlete_ticket", "spectator_ticket"].includes(operation.flow)) {
    update.invoice_url = payment.invoiceUrl ?? null;
  }
  if (payment.billingType === "PIX" && ["registration", "athlete_ticket", "spectator_ticket"].includes(operation.flow)) {
    try {
      const qr = await consultarPixQrCode(payment.id);
      update.pix_copy_paste = qr.payload;
      update.pix_qr_code_base64 = qr.encodedImage;
    } catch {
      // The payment link is still enough; QR retrieval will be retried by the
      // normal user flow without risking another charge.
    }
  }
  const { error: updateError } = await admin.from(table).update(update).eq("id", operation.record_id);
  if (updateError) throw new Error("financial_record_attach_failed");
}

async function dispatchPaymentEvent(payment: StatusCobranca) {
  const event = financialProviderStatusToWebhookEvent(payment.status);
  if (!event) return;
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token) throw new Error("asaas_webhook_token_missing");

  const { POST } = await import("@/app/api/webhooks/asaas/route");
  const request = new NextRequest("http://rankftv.internal/api/webhooks/asaas", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "asaas-access-token": token,
      "x-rankftv-event-source": "reconciliation",
    },
    body: JSON.stringify({
      id: `reconcile:${payment.id}:${event}`,
      event,
      dateCreated: new Date().toISOString(),
      payment,
    }),
  });
  const response = await POST(request);
  if (!response.ok) throw new Error(`domain_event_http_${response.status}`);
}

async function reconcilePayment(operation: ReconcileOperation) {
  const payment = operation.provider_id
    ? await consultarCobranca(operation.provider_id)
    : await buscarCobrancaPorReferencia(operation.external_reference);
  if (!payment) {
    await reschedule(operation, "provider_payment_not_found", Math.min(3_600, 120 * Math.max(1, operation.attempt_count)));
    return "pending" as const;
  }

  await attachPayment(operation, payment);
  await dispatchPaymentEvent(payment);
  const event = financialProviderStatusToWebhookEvent(payment.status);
  await recordProvider(operation, payment, event === "PAYMENT_REFUNDED" ? "refunded" : event ? "confirmed" : "provider_created");
  return "reconciled" as const;
}

async function reconcileRefund(operation: ReconcileOperation) {
  const originalPaymentId = String(operation.metadata?.originalPaymentId ?? "");
  if (!originalPaymentId) throw new Error("refund_original_payment_missing");
  const refunds = await listarEstornosCobranca(originalPaymentId);
  const refundStatus = refundStatusFromRefunds(refunds);
  const providerStatus = refundProviderStatus(refunds);
  if (refundStatus === "REFUND_CANCELLED") {
    await recordProvider(operation, {
      id: originalPaymentId,
      status: providerStatus ?? "CANCELLED",
    }, "cancelled");
    return "reconciled" as const;
  }
  if (refundStatus !== "REFUNDED") {
    await recordProvider(operation, {
      id: originalPaymentId,
      status: providerStatus ?? "REFUND_NOT_FOUND",
    }, "provider_created");
    await reschedule(operation, `refund_status_${providerStatus ?? "REFUND_NOT_FOUND"}`, 300);
    return "pending" as const;
  }
  const payment = await consultarCobranca(originalPaymentId);
  await dispatchPaymentEvent({ ...payment, status: "REFUNDED" });
  await recordProvider(operation, { id: payment.id, status: refundStatus }, "refunded");
  return "reconciled" as const;
}

async function reconcileSubscription(operation: ReconcileOperation) {
  const subscription = await buscarAssinaturaPorReferencia(operation.external_reference);
  if (!subscription) {
    await reschedule(operation, "provider_subscription_not_found", 300);
    return "pending" as const;
  }
  const { error } = await createAdminClient()
    .from("arena_students")
    .update({ asaas_subscription_id: subscription.id })
    .eq("id", operation.record_id);
  if (error) throw new Error("subscription_attach_failed");
  await recordProvider(operation, subscription, "confirmed");
  return "reconciled" as const;
}

async function finalizeTransfer(operation: ReconcileOperation, transfer: { id: string; status: string }) {
  const sourceTable = String(operation.metadata?.sourceTable ?? "");
  if (!PAYOUT_TABLES.has(sourceTable)) throw new Error("payout_source_invalid");
  const finalStatus = ["registrations", "athlete_tickets", "spectator_tickets"].includes(sourceTable)
    ? "repassado"
    : "concluido";
  const { error } = await createAdminClient()
    .from(sourceTable)
    .update({ repasse_status: finalStatus, repasse_transfer_id: transfer.id, repasse_erro: null })
    .eq("id", operation.record_id);
  if (error) throw new Error("payout_finalize_failed");
  await recordProvider(operation, transfer, "confirmed");
}

async function payoutRetryStatus(
  sourceTable: string,
  recordId: string,
): Promise<"pendente" | "aguardando_liquidacao"> {
  if (sourceTable === "arena_attendance") return payoutRetryStatusForBilling(sourceTable, null);
  const { data } = await createAdminClient()
    .from(sourceTable)
    .select("billing_type")
    .eq("id", recordId)
    .maybeSingle();
  return payoutRetryStatusForBilling(sourceTable, data?.billing_type);
}

async function reconcileTransfer(operation: ReconcileOperation) {
  const transfer = await buscarTransferenciaPorReferencia(operation.external_reference);
  if (!transfer) {
    await reschedule(operation, "provider_transfer_not_found", 300);
    return "pending" as const;
  }
  if (["FAILED", "CANCELLED", "REJECTED"].includes(transfer.status)) {
    const sourceTable = String(operation.metadata?.sourceTable ?? "");
    if (!PAYOUT_TABLES.has(sourceTable)) throw new Error("payout_source_invalid");
    const retryStatus = await payoutRetryStatus(sourceTable, operation.record_id);
    const admin = createAdminClient();
    await admin
      .from(sourceTable)
      .update({
        repasse_status: retryStatus,
        repasse_transfer_id: transfer.id,
        repasse_erro: `Transferencia encerrada pelo provedor (${transfer.status}).`,
      })
      .eq("id", operation.record_id);

    if (sourceTable === "registrations" && Number(operation.metadata?.eliteDiscount ?? 0) > 0) {
      await admin.rpc("release_registration_elite_fee_once", {
        p_registration_id: operation.record_id,
      });
    }

    await recordProvider(operation, transfer, "cancelled");
    return "terminal_failed" as const;
  }
  if (transfer.status !== "DONE") {
    await createAdminClient()
      .from("financial_operations")
      .update({ provider_id: transfer.id, provider_status: transfer.status, updated_at: new Date().toISOString() })
      .eq("id", operation.id);
    await reschedule(operation, `transfer_status_${transfer.status}`, 300);
    return "pending" as const;
  }
  await finalizeTransfer(operation, transfer);
  return "reconciled" as const;
}

export async function reconcileFinancialOutbox(limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("financial_claim_outbox", { p_limit: Math.min(Math.max(limit, 1), 200) });
  if (error) throw new Error("financial_outbox_claim_failed");

  let reconciled = 0;
  let pending = 0;
  let failed = 0;
  for (const raw of data ?? []) {
    const operation = raw as unknown as ReconcileOperation;
    try {
      const result = operation.operation_type === "subscription"
        ? await reconcileSubscription(operation)
        : operation.operation_type === "refund"
          ? await reconcileRefund(operation)
          : operation.operation_type === "transfer"
            ? await reconcileTransfer(operation)
            : await reconcilePayment(operation);
      if (result === "reconciled") reconciled++;
      else if (result === "terminal_failed") failed++;
      else pending++;
    } catch (error) {
      failed++;
      const code = error instanceof Error ? error.message : "reconciliation_failed";
      await reschedule(operation, code, 600);
    }
  }
  return { claimed: data?.length ?? 0, reconciled, pending, failed };
}
