import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function migration(name: string) {
  return readFileSync(path.join(process.cwd(), "supabase", name), "utf8");
}

test("financial migration serializes one operation per external reference", () => {
  const sql = migration("financial-operations.sql");
  assert.match(sql, /UNIQUE\s*\(operation_type,\s*external_reference\)/i);
  assert.match(sql, /FOR UPDATE;/i);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/i);
  assert.match(sql, /status = 'ambiguous'[\s\S]*next_reconcile_at > now\(\)/i);
  assert.match(sql, /'previousStatus', v_previous_status/i);
  assert.match(sql, /FINANCIAL_PROVIDER_ID_CONFLICT/i);
  assert.match(sql, /financial_resolve_transfer_reference/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /v_latest\.status NOT IN \('failed', 'cancelled'\)/i);
  assert.match(sql, /p_base_reference \|\| ':retry:' \|\| v_generation/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS financial_outbox/i);
  assert.match(sql, /REVOKE ALL ON financial_operations, financial_outbox FROM PUBLIC, anon, authenticated/i);
});

test("spectator migration preserves every normalized line and reports uncertain legacy rows", () => {
  const sql = migration("production-spectator-ticket-items.sql");
  assert.match(sql, /UNIQUE\s*\(ticket_id,\s*line_number\)/i);
  assert.match(sql, /spectator_ticket_items_backfill_report/i);
  assert.match(sql, /explicit_type\.championship_id = e\.championship_id/i);
  assert.match(sql, /jsonb_array_length\(st\.itens\) > 0[\s\S]*WHEN st\.ticket_type_id IS NOT NULL THEN 1/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION create_spectator_ticket_order/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION release_spectator_ticket_order/i);
  assert.match(sql, /SELECT tt\.id, tt\.nome, tt\.valor, tt\.max_quantidade, tt\.vendidos, tt\.ativo/i);
  assert.match(sql, /SELECT pt\.id, pt\.nome, pt\.valor, pt\.quantidade_maxima, pt\.vendidos/i);
  assert.match(sql, /ORDER BY ticket_type_id, pricing_tier_id, id[\s\S]*FOR UPDATE/i);
  assert.match(sql, /usos_atuais = GREATEST\(0, usos_atuais - 1\)/i);
});

test("registration and athlete inventory releases are exactly once", () => {
  const sql = migration("production-order-inventory-release.sql");
  assert.match(sql, /inventory_released_at IS NOT NULL/i);
  assert.match(sql, /FROM registrations WHERE id = p_registration_id FOR UPDATE/i);
  assert.match(sql, /FROM athlete_tickets WHERE id = p_ticket_id FOR UPDATE/i);
  assert.match(sql, /claim_registration_elite_fee_once/i);
  assert.match(sql, /release_registration_elite_fee_once/i);
});

test("webhook ledger is durable, retryable and monotonic", () => {
  const sql = migration("asaas-webhook-idempotency.sql");
  assert.match(sql, /event_id\s+text PRIMARY KEY/i);
  assert.match(sql, /highest_event_rank/i);
  assert.match(sql, /p_event_rank < v_state.highest_event_rank/i);
  assert.match(sql, /v_event.status = 'failed'/i);
  assert.match(sql, /v_event\.event_rank < v_state\.highest_event_rank/i);
  assert.match(sql, /highest_event_id IS DISTINCT FROM v_event\.event_id/i);
  assert.match(sql, /ASAAS_EVENT_ID_CONFLICT/i);
  assert.match(sql, /REVOKE ALL ON asaas_webhook_events, asaas_payment_event_state FROM PUBLIC, anon, authenticated/i);
});

test("production list queries have supporting indexes and owner-scoped aggregates", () => {
  const sql = migration("production-query-indexes.sql");
  for (const name of [
    "arenas_nome_search_idx",
    "championships_organizer_created_idx",
    "spectator_tickets_champ_created_idx",
    "arena_students_owner_list_idx",
    "registrations_champ_payment_idx",
  ]) {
    assert.match(sql, new RegExp(`CREATE INDEX IF NOT EXISTS ${name}`, "i"));
  }
  assert.match(sql, /organizer_championship_financial_metrics/i);
  assert.match(sql, /organizer_spectator_financial_metrics/i);
  assert.match(sql, /organizador_id = auth\.uid\(\)/i);
});

test("operational retention never exposes its privileged function to clients", () => {
  const sql = migration("production-data-retention.sql");
  assert.match(sql, /REVOKE ALL ON FUNCTION purge_rankftv_operational_data\(\) FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /interval '6 years'/i);
  assert.match(sql, /interval '180 days'/i);
});
