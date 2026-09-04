export const PUBLIC_FUNNEL_EVENTS = [
  "search_used",
  "championship_viewed",
  "category_selected",
  "athlete_data_started",
  "checkout_reviewed",
  "payment_confirmed",
] as const;

export type PublicFunnelEvent = (typeof PUBLIC_FUNNEL_EVENTS)[number];

export function isPublicFunnelEvent(value: unknown): value is PublicFunnelEvent {
  return typeof value === "string" && PUBLIC_FUNNEL_EVENTS.includes(value as PublicFunnelEvent);
}

export function validOptionalUuid(value: unknown): value is string | null | undefined {
  return value == null || (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
