import "server-only";

import {
  buscarCobrancaPorReferencia,
  cancelarCobrancaPendente,
  consultarCobranca,
  type StatusCobranca,
} from "@/lib/asaas";
import { confirmarAthleteTicketPago } from "@/lib/pagamento-inscricao";
import { reportOperationalEvent } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";

export type AthleteCheckoutExpirationResult = {
  status: "pendente" | "pago" | "expirado" | "estornado";
  reconciliationPending?: boolean;
};

function paymentIsConfirmed(payment: StatusCobranca): boolean {
  return ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(payment.status);
}

export async function expireAthleteCheckoutIfNeeded(
  ticketId: string,
): Promise<AthleteCheckoutExpirationResult> {
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, status_pagamento, asaas_payment_id, billing_type, checkout_expires_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return { status: "expirado" };
  if (ticket.status_pagamento !== "pendente") {
    return { status: ticket.status_pagamento as AthleteCheckoutExpirationResult["status"] };
  }
  if (!ticket.checkout_expires_at || Date.parse(ticket.checkout_expires_at) > Date.now()) {
    return { status: "pendente" };
  }

  let payment: StatusCobranca | null = null;
  try {
    if (ticket.asaas_payment_id) {
      payment = await consultarCobranca(ticket.asaas_payment_id);
    } else {
      const { data: operation } = await admin
        .from("financial_operations")
        .select("status")
        .eq("flow", "athlete_ticket")
        .eq("operation_type", "payment")
        .eq("record_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (operation && !["failed", "cancelled"].includes(operation.status)) {
        payment = await buscarCobrancaPorReferencia(`athl:${ticketId}`);
        if (!payment) return { status: "pendente", reconciliationPending: true };
      }
    }
  } catch (error) {
    await reportOperationalEvent({
      level: "warn",
      event: "athlete_checkout.expiration_reconciliation_failed",
      message: "Expired athlete checkout remains reserved pending provider reconciliation",
      error,
      context: { ticketId },
    });
    return { status: "pendente", reconciliationPending: true };
  }

  if (payment && paymentIsConfirmed(payment)) {
    const confirmation = await confirmarAthleteTicketPago(admin, ticketId, {
      id: payment.id,
      billingType: payment.billingType || ticket.billing_type || "PIX",
    });
    return confirmation.ok
      ? { status: "pago" }
      : { status: "pendente", reconciliationPending: true };
  }

  if (payment) {
    try {
      await cancelarCobrancaPendente(payment.id);
      await admin
        .from("financial_operations")
        .update({ status: "cancelled", provider_status: "DELETED", updated_at: new Date().toISOString() })
        .eq("flow", "athlete_ticket")
        .eq("operation_type", "payment")
        .eq("record_id", ticketId)
        .neq("status", "confirmed");
    } catch (error) {
      await reportOperationalEvent({
        level: "warn",
        event: "athlete_checkout.payment_cancellation_failed",
        message: "Expired provider payment could not be cancelled; inventory remains reserved",
        error,
        context: { ticketId, providerPaymentId: payment.id },
        alert: true,
      });
      return { status: "pendente", reconciliationPending: true };
    }
  }

  const { data: expired, error: expirationError } = await admin.rpc(
    "expire_athlete_ticket_inventory_if_pending",
    { p_ticket_id: ticketId },
  );
  if (expirationError) {
    await reportOperationalEvent({
      level: "error",
      event: "athlete_checkout.inventory_expiration_failed",
      message: "Expired athlete checkout inventory could not be released",
      error: expirationError,
      context: { ticketId },
      alert: true,
    });
    return { status: "pendente", reconciliationPending: true };
  }
  if (expired) return { status: "expirado" };

  const { data: latest } = await admin
    .from("athlete_tickets")
    .select("status_pagamento")
    .eq("id", ticketId)
    .maybeSingle();
  return {
    status: (latest?.status_pagamento ?? "pendente") as AthleteCheckoutExpirationResult["status"],
  };
}

export async function expireStaleAthleteCheckouts(limit = 100): Promise<{
  reservationsExpired: number;
  ticketsExpired: number;
  pendingReconciliation: number;
}> {
  const admin = createAdminClient();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const { data: reservationsExpired, error: reservationError } = await admin.rpc(
    "expire_athlete_checkout_reservations",
    { p_limit: safeLimit },
  );
  if (reservationError) throw new Error("checkout_reservation_expiration_failed");

  const { data: tickets, error: ticketError } = await admin
    .from("athlete_tickets")
    .select("id")
    .eq("status_pagamento", "pendente")
    .not("checkout_expires_at", "is", null)
    .lte("checkout_expires_at", new Date().toISOString())
    .order("checkout_expires_at", { ascending: true })
    .limit(safeLimit);
  if (ticketError) throw new Error("checkout_ticket_expiration_query_failed");

  let ticketsExpired = 0;
  let pendingReconciliation = 0;
  for (const ticket of tickets ?? []) {
    const result = await expireAthleteCheckoutIfNeeded(ticket.id);
    if (result.status === "expirado") ticketsExpired++;
    if (result.reconciliationPending) pendingReconciliation++;
  }

  return {
    reservationsExpired: Number(reservationsExpired ?? 0),
    ticketsExpired,
    pendingReconciliation,
  };
}
