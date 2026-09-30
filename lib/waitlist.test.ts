import assert from "node:assert/strict";
import test from "node:test";
import { createWaitlistInvite, hashWaitlistInvite, normalizeWaitlistEmail, validWaitlistEmail } from "./waitlist";

test("waitlist normalizes e-mail and stores only a token digest", () => {
  assert.equal(normalizeWaitlistEmail(" Atleta@Example.COM "), "atleta@example.com");
  assert.equal(validWaitlistEmail("atleta@example.com"), true);
  const invite = createWaitlistInvite();
  assert.notEqual(invite.token, invite.hash);
  assert.equal(hashWaitlistInvite(invite.token), invite.hash);
});
