export type RefundTimelineStep = {
  key: "requested" | "awaiting" | "completed" | "cancelled";
  date: string | null;
};

export type RefundTimelineInput = {
  refundStatus: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

function laterValidDate(first: string | null, second: string | null): string | null {
  const candidates = [first, second]
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, timestamp: new Date(value).getTime() }))
    .filter(({ timestamp }) => !Number.isNaN(timestamp));

  if (candidates.length === 0) return first ?? second;
  return candidates.reduce((latest, candidate) =>
    candidate.timestamp > latest.timestamp ? candidate : latest,
  ).value;
}

/**
 * Builds the customer-facing refund lifecycle.
 *
 * Inventory can be released before a provider confirmation in historical
 * records. That internal release must not make the UI announce a completed
 * cancellation while the refund is still pending. For a paid ticket, the
 * cancellation milestone therefore appears only after refund confirmation and
 * uses the later of both completion timestamps.
 */
export function buildRefundTimeline({
  refundStatus,
  requestedAt,
  completedAt,
  cancelledAt,
}: RefundTimelineInput): RefundTimelineStep[] {
  const hasRefund = Boolean(refundStatus || requestedAt);
  const refundCompleted = refundStatus === "refunded";
  const steps: RefundTimelineStep[] = [];

  if (hasRefund) {
    steps.push({ key: "requested", date: requestedAt });
  }

  if (refundCompleted) {
    steps.push({ key: "completed", date: completedAt });
  } else if (hasRefund) {
    steps.push({ key: "awaiting", date: null });
  }

  if (cancelledAt && (!hasRefund || refundCompleted)) {
    steps.push({
      key: "cancelled",
      date: refundCompleted ? laterValidDate(completedAt, cancelledAt) : cancelledAt,
    });
  }

  return steps;
}
