import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/payment-card-attempt-security.sql", "utf8");

test("card attempt ledger stores only fingerprints and masked last four", () => {
  const table = sql.match(/CREATE TABLE IF NOT EXISTS payment_card_attempts[\s\S]*?\n\);/)?.[0] ?? "";
  assert.match(table, /card_fingerprint\s+text NOT NULL/);
  assert.match(table, /card_last4\s+text NOT NULL/);
  assert.doesNotMatch(table, /\b(?:pan|cvv|ccv|card_number|numero_cartao)\b/i);
});

test("guard locks every deterministic scope before incrementing counters", () => {
  assert.match(sql, /array_agg\(value ORDER BY value\)/i);
  assert.match(sql, /WHERE scope_key = v_scope FOR UPDATE/i);
  assert.match(sql, /attempt_count = attempt_count \+ 1/i);
  assert.match(sql, /WHEN v_scope LIKE 'card:%' THEN 6/i);
});

test("a success cannot unlock broad IP or user abuse scopes", () => {
  assert.match(sql, /v_scope LIKE 'card:%' OR v_scope LIKE 'order:%'/i);
});
