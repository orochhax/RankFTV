export type SupportPriority = "low" | "normal" | "high" | "critical";

const SLA_HOURS: Record<SupportPriority, number> = { low: 72, normal: 24, high: 8, critical: 4 };

export function supportSlaDueAt(priority: SupportPriority, from = new Date()) {
  return new Date(from.getTime() + SLA_HOURS[priority] * 60 * 60 * 1000).toISOString();
}

export function isSupportPriority(value: unknown): value is SupportPriority {
  return typeof value === "string" && value in SLA_HOURS;
}
