import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/production-operational-email-alerts.sql", "utf8");

test("email alert migration is idempotent and keeps operational tables private", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS email_queue_enabled/i);
  assert.match(migration, /pg_constraint/);
  assert.match(migration, /email_queue_minutes BETWEEN 5 AND 1440/i);
  assert.match(migration, /email_queue_backlog_threshold BETWEEN 1 AND 500/i);
  assert.match(migration, /email_queue_backlog/);
  assert.match(migration, /email_delivery_failed/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /WHERE status IN \('queued', 'processing', 'failed'\)/i);
});
