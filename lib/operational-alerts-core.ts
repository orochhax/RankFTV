export type OperationalAlertKind =
  | "payment_pending"
  | "webhook_failed"
  | "assisted_refund"
  | "payout_rejected"
  | "email_queue_backlog"
  | "email_delivery_failed";

export type OperationalAlertCandidate = {
  kind: OperationalAlertKind;
  severity: "warning" | "critical";
  title: string;
  entityType: string;
  entityId: string;
};

type EmailQueueSnapshot = {
  championshipBacklogIds: string[];
  organizerBacklogIds: string[];
  exhaustedChampionshipIds: string[];
  exhaustedOrganizerIds: string[];
  failedTransactionalEmailIds: string[];
};

export function buildEmailQueueAlertCandidates(
  snapshot: EmailQueueSnapshot,
  backlogThreshold: number,
): OperationalAlertCandidate[] {
  const candidates: OperationalAlertCandidate[] = [];
  const backlog = [
    ...snapshot.championshipBacklogIds.map((id) => ({ id, queue: "championship_notice" })),
    ...snapshot.organizerBacklogIds.map((id) => ({ id, queue: "organizer_financial_notification" })),
  ];

  if (backlog.length >= Math.max(1, backlogThreshold)) {
    candidates.push({
      kind: "email_queue_backlog",
      severity: "warning",
      title: `Fila de e-mails acumulada (${backlog.length} pendências)`,
      entityType: "email_queue",
      entityId: `${backlog[0].queue}:${backlog[0].id}`,
    });
  }

  for (const id of snapshot.exhaustedChampionshipIds) {
    candidates.push({
      kind: "email_delivery_failed",
      severity: "critical",
      title: "Aviso de campeonato esgotou as tentativas",
      entityType: "championship_notice_delivery",
      entityId: id,
    });
  }
  for (const id of snapshot.exhaustedOrganizerIds) {
    candidates.push({
      kind: "email_delivery_failed",
      severity: "critical",
      title: "Aviso financeiro esgotou as tentativas",
      entityType: "organizer_financial_notification_delivery",
      entityId: id,
    });
  }
  for (const id of snapshot.failedTransactionalEmailIds) {
    candidates.push({
      kind: "email_delivery_failed",
      severity: "critical",
      title: "Provedor marcou e-mail transacional como falho",
      entityType: "transactional_email_event",
      entityId: id,
    });
  }

  return candidates;
}

export function operationalAlertDedupeKey(candidate: OperationalAlertCandidate): string {
  return `${candidate.kind}:${candidate.entityType}:${candidate.entityId}`;
}
