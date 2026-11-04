import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sql = readFileSync(path.join(process.cwd(), "supabase", "20261029000100_youtube_idea_approaches.sql"), "utf8");

test("idea approaches are complete, indexed and private", () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.yt_idea_approaches/i);
  assert.match(sql, /UNIQUE \(idea_id, approach_key\)/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS yt_idea_approaches_idea_score_idx/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.yt_idea_approaches FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.yt_apply_codex_idea_approaches\(jsonb, uuid\) FROM PUBLIC, anon, authenticated/i);
});
