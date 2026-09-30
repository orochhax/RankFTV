import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = headers.get("authorization");
  if (!secret || !authorization) return false;

  const provided = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
