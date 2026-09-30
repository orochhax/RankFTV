export type SupportTrendMetric = "emailDelivered" | "ticketRecovered" | "linkInvalidated" | "assistedChange";

export type SupportTrendPoint = {
  day: string;
  emailDelivered: number;
  ticketRecovered: number;
  linkInvalidated: number;
  assistedChange: number;
};

export type DatedSupportEvent = { metric: SupportTrendMetric; occurredAt: string | null };

export function buildSupportTrend(events: DatedSupportEvent[], days = 30, now = new Date()): SupportTrendPoint[] {
  const points = new Map<string, SupportTrendPoint>();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
  for (let offset = 0; offset < Math.max(1, days); offset += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const day = date.toISOString().slice(0, 10);
    points.set(day, { day, emailDelivered: 0, ticketRecovered: 0, linkInvalidated: 0, assistedChange: 0 });
  }
  for (const event of events) {
    if (!event.occurredAt) continue;
    const point = points.get(event.occurredAt.slice(0, 10));
    if (point) point[event.metric] += 1;
  }
  return [...points.values()];
}
