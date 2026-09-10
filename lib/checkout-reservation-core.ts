export type ReservationUrgency = "normal" | "warning" | "critical" | "expired";

export function reservationRemainingMs(
  expiresAt: string,
  serverNow: string,
  clientNowMs: number,
  clientStartedAtMs: number,
): number {
  const expiresMs = Date.parse(expiresAt);
  const serverStartedMs = Date.parse(serverNow);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(serverStartedMs)) return 0;
  const elapsed = Math.max(0, clientNowMs - clientStartedAtMs);
  return Math.max(0, expiresMs - serverStartedMs - elapsed);
}

export function reservationUrgency(remainingMs: number): ReservationUrgency {
  if (remainingMs <= 0) return "expired";
  if (remainingMs <= 60_000) return "critical";
  if (remainingMs <= 5 * 60_000) return "warning";
  return "normal";
}

export function formatReservationCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
