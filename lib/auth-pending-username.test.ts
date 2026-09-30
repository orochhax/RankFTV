import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sql = readFileSync(
  path.join(process.cwd(), "supabase", "production-auth-pending-username-release.sql"),
  "utf8",
);
const callback = readFileSync(
  path.join(process.cwd(), "app", "auth", "callback", "route.ts"),
  "utf8",
);

test("cadastro pendente não reserva o username antes da confirmação", () => {
  assert.match(sql, /WHEN new\.email_confirmed_at IS NULL[\s\S]*'pending_' \|\| left\(replace\(new\.id::text/i);
  assert.match(sql, /UPDATE public\.profiles AS p[\s\S]*u\.email_confirmed_at IS NULL/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.handle_new_user\(\) FROM PUBLIC, anon, authenticated/i);
});

test("confirmação efetiva o username e trata colisão concorrente", () => {
  assert.match(callback, /update\(profileUpdate\)[\s\S]*\.eq\("id", user\.id\)/i);
  assert.match(callback, /error\?\.code === "23505"\) return "username_taken"/i);
  assert.match(callback, /\/cadastro\/escolher-usuario/i);
});
