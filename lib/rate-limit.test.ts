import assert from "node:assert/strict";
import test from "node:test";
import { getClientIp } from "./rate-limit-core";

test("client IP prefers the Vercel-controlled forwarding header", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "203.0.113.10",
    "x-forwarded-for": "198.51.100.20",
    "x-real-ip": "192.0.2.30",
  });
  assert.equal(getClientIp(headers), "203.0.113.10");
});

test("client IP keeps local and non-Vercel fallbacks", () => {
  assert.equal(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.20, 10.0.0.1" })), "198.51.100.20");
  assert.equal(getClientIp(new Headers({ "x-real-ip": "192.0.2.30" })), "192.0.2.30");
  assert.equal(getClientIp(new Headers()), "unknown");
});
