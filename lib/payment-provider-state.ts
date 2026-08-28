const TERMINAL_TRANSFER_FAILURES = new Set(["FAILED", "CANCELLED", "REJECTED"]);

export function transferProviderState(status: string): "confirmed" | "pending" | "failed" {
  if (status === "DONE") return "confirmed";
  if (TERMINAL_TRANSFER_FAILURES.has(status)) return "failed";
  return "pending";
}

export function refundProviderState(status: string): "confirmed" | "pending" {
  return status === "REFUNDED" ? "confirmed" : "pending";
}

/**
 * A Pix charge itself can remain RECEIVED while Asaas processes the refund.
 * The refund list is authoritative: PENDING protects inventory, DONE releases it.
 */
export function refundStatusFromRefunds(
  refunds: ReadonlyArray<{ status: string }> | null | undefined,
): "REFUND_REQUESTED" | "REFUNDED" | null {
  if (refunds?.some((refund) => refund.status === "PENDING")) return "REFUND_REQUESTED";
  if (refunds?.some((refund) => refund.status === "DONE")) return "REFUNDED";
  return null;
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
