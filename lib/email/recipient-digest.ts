import { createHmac } from "node:crypto";

export function emailRecipientDigest(email: string): string {
  const secret = process.env.EMAIL_EVENT_HASH_SECRET
    ?? process.env.PAYMENT_FINGERPRINT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Email recipient HMAC secret is missing or too short");
  }
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
}
