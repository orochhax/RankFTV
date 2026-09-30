import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase", "production-participant-category-uniqueness.sql"),
  "utf8",
);

test("a regra antiga por campeonato é substituída pela regra por categoria", () => {
  assert.match(sql, /DROP INDEX IF EXISTS teams_one_active_per_atleta1/i);
  assert.match(sql, /ON teams \(championship_id, category_id, atleta1_id\)/i);
  assert.match(sql, /ON teams \(championship_id, category_id, atleta2_id\)/i);
});

test("concorrência é serializada antes de consultar os dois fluxos", () => {
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(v_key, 0\)\)/i);
  assert.match(sql, /CREATE TRIGGER teams_participant_category_uniqueness/i);
  assert.match(sql, /CREATE TRIGGER athlete_tickets_participant_category_uniqueness/i);
  assert.match(sql, /FROM profiles_private pp/i);
  assert.match(sql, /FROM athlete_tickets a/i);
  assert.match(sql, /FROM teams t/i);
});

test("estorno e expiração liberam a categoria preservando o histórico", () => {
  assert.match(sql, /status_pagamento IN \('estornado', 'expirado'\)/i);
  assert.match(sql, /UPDATE teams t\s+SET status = 'cancelado'/i);
  assert.match(sql, /UPDATE teams SET status = 'cancelado'/i);
  assert.match(sql, /CREATE TRIGGER registrations_release_participant_category/i);
});

test("migração para antes de instalar se houver conflitos legados", () => {
  assert.match(sql, /P0_PARTICIPANT_CATEGORY_CONFLICTS/i);
  assert.match(sql, /P0_PARTICIPANT_CATEGORY_MISSING/i);
  assert.match(sql, /HAVING count\(\*\) > 1/i);
});
