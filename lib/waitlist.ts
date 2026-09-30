import { createHash, randomBytes } from "node:crypto";

export const WAITLIST_INVITE_HOURS = 24;

export function normalizeWaitlistEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validWaitlistEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function createWaitlistInvite() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashWaitlistInvite(token) };
}

export function hashWaitlistInvite(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
