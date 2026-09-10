import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sql = readFileSync(
  path.join(process.cwd(), "supabase", "production-athlete-checkout-reservations.sql"),
  "utf8",
);

test("reserva a categoria sob lock e sem expor o token bruto", () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.checkout_reservations/i);
  assert.match(sql, /token_hash\s+text NOT NULL UNIQUE/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(p_token_hash/i);
  assert.match(sql, /FROM public\.championship_categories AS c[\s\S]*FOR UPDATE/i);
  assert.match(sql, /status_pagamento IN \('pendente', 'pago'\)/i);
  assert.match(sql, /checkout_category_sold_out/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.checkout_reservations FROM PUBLIC, anon, authenticated/i);
});

test("reutiliza a mesma reserva sem reiniciar o prazo e consome no ingresso", () => {
  assert.match(sql, /v_existing\.expires_at > v_now[\s\S]*'reused', true/i);
  assert.match(sql, /CREATE TRIGGER athlete_tickets_consume_checkout_reservation/i);
  assert.match(sql, /v_reservation\.expires_at <= v_now/i);
  assert.match(sql, /NEW\.checkout_expires_at := v_reservation\.expires_at/i);
  assert.match(sql, /status = 'converted'/i);
});

test("expira reservas e ingressos pendentes exatamente uma vez", () => {
  assert.match(sql, /FOR UPDATE SKIP LOCKED/i);
  assert.match(sql, /GREATEST\(0, vendidos - v_reservation\.quantity\)/i);
  assert.match(sql, /expire_athlete_ticket_inventory_if_pending/i);
  assert.match(sql, /v_ticket\.status_pagamento <> 'pendente'/i);
  assert.match(sql, /inventory_released_at = COALESCE\(inventory_released_at, v_now\)/i);
});
