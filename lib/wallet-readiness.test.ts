import test from "node:test";
import assert from "node:assert/strict";
import { walletReadiness } from "./wallet-readiness";

test("walletReadiness never returns secret values and identifies missing setup", () => {
  const result = walletReadiness({
    GOOGLE_WALLET_ISSUER_ID: "issuer",
    GOOGLE_WALLET_CLASS_ID: "class",
    GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: "private-value",
  });
  assert.equal(result.google.ready, true);
  assert.equal(result.apple.ready, false);
  assert.equal(JSON.stringify(result).includes("private-value"), false);
});
