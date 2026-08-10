import { createHash } from "node:crypto";

export function hashRateLimitKey(key: string): string {
  return `rl:${createHash("sha256").update(key).digest("hex")}`;
}
