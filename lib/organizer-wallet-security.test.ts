import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const CHAMP = "33333333-3333-4333-8333-333333333333";
const RECEIVABLE = "44444444-4444-4444-8444-444444444444";

async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT NULLIF(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
      'SELECT NULLIF(current_setting(''request.jwt.claim.role'',true),'''')';
    CREATE TABLE public.championships(id uuid PRIMARY KEY, organizador_id uuid REFERENCES auth.users(id), premium_fee_pendente numeric DEFAULT 0);
    CREATE TABLE public.registrations(id uuid PRIMARY KEY, championship_id uuid, status_pagamento text, valor numeric, asaas_payment_id text, billing_type text, repasse_data_prevista timestamptz, repasse_status text DEFAULT 'pendente', elite_fee_coletada numeric DEFAULT 0, created_at timestamptz DEFAULT now());
    CREATE TABLE public.athlete_tickets(id uuid PRIMARY KEY, championship_id uuid, status_pagamento text, valor numeric, asaas_payment_id text, billing_type text, repasse_data_prevista timestamptz, repasse_status text DEFAULT 'pendente', created_at timestamptz DEFAULT now());
    CREATE TABLE public.spectator_tickets(id uuid PRIMARY KEY, championship_id uuid, status_pagamento text, valor numeric, asaas_payment_id text, billing_type text, repasse_data_prevista timestamptz, repasse_status text DEFAULT 'pendente', created_at timestamptz DEFAULT now());
    INSERT INTO auth.users VALUES ('${OWNER}'),('${OTHER}');
    INSERT INTO championships VALUES ('${CHAMP}','${OWNER}',0);
  `);
  const migration = readFileSync(path.join(process.cwd(), "supabase/organizer-wallet-withdrawals.sql"), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.exec(`
    INSERT INTO organizer_receivables(id,organizer_id,championship_id,source_type,source_id,payment_id,billing_type,gross_amount,net_amount,available_at)
    VALUES ('${RECEIVABLE}','${OWNER}','${CHAMP}','registration','55555555-5555-4555-8555-555555555555','pay_1','PIX',100,100,now()-interval '1 day');
    SELECT set_config('request.jwt.claim.sub','${OWNER}',false);
    SELECT set_config('request.jwt.claim.role','authenticated',false);
  `);
  return db;
}

test("wallet reservation is atomic, idempotent and cannot spend another organizer balance", async () => {
  const db = await database();
  try {
    const key = "66666666-6666-4666-8666-666666666666";
    const [first, competing] = await Promise.allSettled([
      db.query(`SELECT reserve_organizer_withdrawal('${CHAMP}',80,'${key}') result`),
      db.query(`SELECT reserve_organizer_withdrawal('${CHAMP}',30,'77777777-7777-4777-8777-777777777777') result`),
    ]);
    assert.equal(first.status, "fulfilled");
    assert.equal(competing.status, "rejected");

    const duplicate = await db.query<{ result: { id: string } }>(`SELECT reserve_organizer_withdrawal('${CHAMP}',80,'${key}') result`);
    const withdrawals = await db.query<{ id: string; amount: string }>("SELECT id,amount FROM organizer_withdrawals WHERE status='reserved'");
    assert.equal(withdrawals.rows.length, 1);
    assert.equal(duplicate.rows[0].result.id, withdrawals.rows[0].id);
    assert.equal(Number(withdrawals.rows[0].amount), 80);

    await db.exec(`SELECT set_config('request.jwt.claim.sub','${OTHER}',false)`);
    await assert.rejects(() => db.query(`SELECT reserve_organizer_withdrawal('${CHAMP}',1,'88888888-8888-4888-8888-888888888888')`), /WALLET_FORBIDDEN/);
  } finally {
    await db.close();
  }
});

test("wallet migration keeps browser writes revoked and reservations serialized", () => {
  const sql = readFileSync(path.join(process.cwd(), "supabase/organizer-wallet-withdrawals.sql"), "utf8");
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('organizer-wallet:'/i);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER[\s\S]*FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /r\.organizer_id=v_user[\s\S]*r\.championship_id=p_championship_id/i);
  assert.match(sql, /w\.status IN \('reserved','submitting','provider_pending','paid'\)/i);
});
