import { createHash } from "node:crypto";

export function hashRateLimitKey(key: string): string {
  return `rl:${createHash("sha256").update(key).digest("hex")}`;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-vercel-forwarded-for")
    ?? headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
