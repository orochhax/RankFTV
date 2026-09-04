export type PendingCheckin = {
  championshipId: string;
  token: string;
  scannedAt: string;
};

const TOKEN_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export function parsePendingCheckins(value: string | null): PendingCheckin[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingCheckin =>
      item && typeof item === "object" &&
      typeof item.championshipId === "string" && UUID_PATTERN.test(item.championshipId) &&
      typeof item.token === "string" && TOKEN_PATTERN.test(item.token) &&
      typeof item.scannedAt === "string" && !Number.isNaN(Date.parse(item.scannedAt)),
    ).slice(-500);
  } catch {
    return [];
  }
}

export function enqueuePendingCheckin(queue: PendingCheckin[], item: PendingCheckin) {
  if (!TOKEN_PATTERN.test(item.token) || !UUID_PATTERN.test(item.championshipId)) return queue;
  if (queue.some((current) => current.championshipId === item.championshipId && current.token === item.token)) return queue;
  return [...queue, item].slice(-500);
}
