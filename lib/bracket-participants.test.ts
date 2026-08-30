import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/production-bracket-participants.sql", "utf8");
const actions = readFileSync(
  "app/painel/campeonatos/[id]/chaveamento/actions.ts",
  "utf8",
);
const organizerPage = readFileSync(
  "app/painel/campeonatos/[id]/chaveamento/page.tsx",
  "utf8",
);
const staffPage = readFileSync("app/staff/[id]/chaveamento/page.tsx", "utf8");
const publicPage = readFileSync("app/campeonatos/[id]/chaveamento/page.tsx", "utf8");

test("bracket participant migration normalizes both athlete purchase flows", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS bracket_participants/);
  assert.match(migration, /source_type IN \('team', 'athlete_ticket'\)/);
  assert.match(migration, /CREATE TRIGGER registrations_sync_bracket_participant/);
  assert.match(migration, /CREATE TRIGGER athlete_tickets_sync_bracket_participant/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS participant_a_id/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS participant_b_id/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS winner_participant_id/);
});

test("bracket participant records are not enumerable through the anonymous API", () => {
  assert.doesNotMatch(migration, /GRANT SELECT ON bracket_participants TO anon/);
  assert.match(migration, /c\.organizador_id = auth\.uid\(\)/);
  assert.match(migration, /cs\.can_chaveamento = true/);
  assert.match(publicPage, /createAdminClient/);
});

test("bracket writes validate active participants and mirror legacy team references", () => {
  assert.match(actions, /\.from\("bracket_participants"\)/);
  assert.match(actions, /\.eq\("active", true\)/g);
  assert.match(actions, /participant_a_id/);
  assert.match(actions, /participant_b_id/);
  assert.match(actions, /winner_participant_id/);
  assert.match(actions, /winner_id:\s+winnerTeamId/);
  assert.match(actions, /\.select\("round_index, winner_participant_id, is_third_place"\)/);
  assert.match(migration, /CREATE TRIGGER bracket_matches_participant_domain/);
});

test("organizer, staff and public brackets render canonical participants", () => {
  for (const page of [organizerPage, staffPage, publicPage]) {
    assert.match(page, /\.from\("bracket_participants"\)/);
    assert.match(page, /display_name_snapshot/);
    assert.match(page, /participant_a_id/);
    assert.match(page, /winner_participant_id/);
  }
});
