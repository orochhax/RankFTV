import assert from "node:assert/strict";
import test from "node:test";
import { isEmailRecipientAllowed } from "./recipient-allowlist";

test("allowlist ausente não restringe entregas de produção", () => {
  assert.equal(isEmailRecipientAllowed("atleta@example.com", undefined), true);
  assert.equal(isEmailRecipientAllowed("atleta@example.com", ""), true);
});

test("allowlist compara destinatários normalizados", () => {
  const allowlist = " teste@example.com, OUTRO@example.com ";
  assert.equal(isEmailRecipientAllowed("TESTE@example.com", allowlist), true);
  assert.equal(isEmailRecipientAllowed("outro@example.com", allowlist), true);
});

test("allowlist bloqueia destinatário não autorizado", () => {
  assert.equal(
    isEmailRecipientAllowed("terceiro@example.com", "teste@example.com"),
    false,
  );
});
