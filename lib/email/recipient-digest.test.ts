import assert from "node:assert/strict";
import test from "node:test";
import { emailRecipientDigest } from "./recipient-digest";

test("email recipient digest requires a private HMAC secret", () => {
  const emailSecret = process.env.EMAIL_EVENT_HASH_SECRET;
  const paymentSecret = process.env.PAYMENT_FINGERPRINT_SECRET;
  delete process.env.EMAIL_EVENT_HASH_SECRET;
  delete process.env.PAYMENT_FINGERPRINT_SECRET;
  try {
    assert.throws(() => emailRecipientDigest("athlete@example.com"), /HMAC secret/);
  } finally {
    if (emailSecret !== undefined) process.env.EMAIL_EVENT_HASH_SECRET = emailSecret;
    if (paymentSecret !== undefined) process.env.PAYMENT_FINGERPRINT_SECRET = paymentSecret;
  }
});

test("email recipient digest is normalized, deterministic and keyed", () => {
  const previous = process.env.EMAIL_EVENT_HASH_SECRET;
  process.env.EMAIL_EVENT_HASH_SECRET = "test-secret-with-at-least-thirty-two-bytes";
  try {
    const first = emailRecipientDigest(" Athlete@Example.COM ");
    assert.equal(first, emailRecipientDigest("athlete@example.com"));
    assert.match(first, /^[a-f0-9]{64}$/);
    process.env.EMAIL_EVENT_HASH_SECRET = "another-secret-with-at-least-thirty-two";
    assert.notEqual(first, emailRecipientDigest("athlete@example.com"));
  } finally {
    if (previous === undefined) delete process.env.EMAIL_EVENT_HASH_SECRET;
    else process.env.EMAIL_EVENT_HASH_SECRET = previous;
  }
});
