const TERMINAL_TRANSFER_FAILURES = new Set(["FAILED", "CANCELLED", "REJECTED"]);

export function transferProviderState(status: string): "confirmed" | "pending" | "failed" {
  if (status === "DONE") return "confirmed";
  if (TERMINAL_TRANSFER_FAILURES.has(status)) return "failed";
  return "pending";
}

const PENDING_REFUND_STATUSES = new Set([
  "PENDING",
  "REFUND_REQUESTED",
  "AWAITING_CRITICAL_ACTION_AUTHORIZATION",
  "AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION",
]);

export function refundProviderState(status: string): "confirmed" | "pending" | "failed" {
  if (status === "REFUNDED") return "confirmed";
  if (["CANCELLED", "REFUND_CANCELLED"].includes(status)) return "failed";
  return "pending";
}

/**
 * A Pix charge itself can remain RECEIVED while Asaas processes the refund.
 * The refund list is authoritative: PENDING protects inventory, DONE releases it.
 */
export function refundStatusFromRefunds(
  refunds: ReadonlyArray<{ status: string }> | null | undefined,
): "REFUND_REQUESTED" | "REFUNDED" | "REFUND_CANCELLED" | null {
  if (refunds?.some((refund) => PENDING_REFUND_STATUSES.has(refund.status))) {
    return "REFUND_REQUESTED";
  }
  if (refunds?.some((refund) => refund.status === "DONE")) return "REFUNDED";
  if (refunds?.some((refund) => refund.status === "CANCELLED")) return "REFUND_CANCELLED";
  return null;
}

export function refundProviderStatus(
  refunds: ReadonlyArray<{ status: string }> | null | undefined,
): string | null {
  const normalizedStatus = refundStatusFromRefunds(refunds);
  if (normalizedStatus === "REFUND_REQUESTED") {
    return refunds?.find((refund) => PENDING_REFUND_STATUSES.has(refund.status))?.status
      ?? normalizedStatus;
  }
  if (normalizedStatus === "REFUND_CANCELLED") return "CANCELLED";
  return normalizedStatus;
}

export function mustReconcileWithoutCreating(input: {
  shouldExecute: boolean;
  previousStatus: string;
  retryUncertainOperation: boolean | undefined;
}): boolean {
  return input.shouldExecute
    && input.retryUncertainOperation === false
    && ["processing", "ambiguous"].includes(input.previousStatus);
}

export function payoutRetryStatusForBilling(
  sourceTable: string,
  billingType: string | null | undefined,
): "pendente" | "aguardando_liquidacao" {
  if (sourceTable !== "arena_attendance" && billingType === "PIX") return "pendente";
  return "aguardando_liquidacao";
}
