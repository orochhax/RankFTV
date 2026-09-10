import assert from "node:assert/strict";
import test from "node:test";
import { isCronAuthorized } from "./cron-auth";

test("cron authorization accepts only the configured bearer token", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret-for-test";
  try {
    assert.equal(isCronAuthorized(new Headers({ authorization: "Bearer cron-secret-for-test" })), true);
    assert.equal(isCronAuthorized(new Headers({ authorization: "Bearer wrong" })), false);
    assert.equal(isCronAuthorized(new Headers()), false);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
