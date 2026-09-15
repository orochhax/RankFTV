import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Supabase session cookies are marked Secure in production", () => {
  assert.match(source("lib/supabase/client.ts"), /cookieOptions: \{ secure: process\.env\.NODE_ENV === "production" \}/);
  assert.match(source("lib/supabase/server.ts"), /cookieOptions: \{ secure: process\.env\.NODE_ENV === "production" \}/);
  assert.match(source("proxy.ts"), /cookieOptions: \{ secure: !development \}/);
});

test("public polling endpoints are rate limited and do not receive access tokens in query strings", () => {
  const ticketStatus = source("app/api/ticket-status/route.ts");
  const credentialStatus = source("app/api/athlete-credential-status/route.ts");
  const cep = source("app/api/cep/[cep]/route.ts");
  assert.match(ticketStatus, /export async function POST/);
  assert.match(ticketStatus, /checkRateLimit/);
  assert.doesNotMatch(ticketStatus, /searchParams\.get\("token"\)/);
  assert.match(credentialStatus, /checkRateLimit/);
  assert.match(credentialStatus, /z\.object\(\{ id: z\.uuid\(\) \}\)\.strict\(\)/);
  assert.match(cep, /checkRateLimit/);
});

test("security hardening removes unnecessary anonymous credential access", () => {
  const migration = source("supabase/production-security-20-point-hardening.sql");
  assert.match(migration, /REVOKE SELECT ON TABLE public\.credentials FROM anon/i);
  assert.match(migration, /REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE TRUNCATE, TRIGGER ON ALL TABLES IN SCHEMA public/i);
  assert.match(migration, /public\.handle_new_user\(\)/i);
  assert.match(migration, /public\.arena_confirm_attendance\(uuid,date,boolean\)/i);
});

test("public ranking view executes with the caller permissions", () => {
  const baseline = source("supabase/perfil_desempenho.sql");
  const migration = source("supabase/production-ranking-entries-security-invoker.sql");
  const audit = source("supabase/manual-tests/security-posture-check.sql");

  assert.match(baseline, /CREATE VIEW ranking_entries WITH \(security_invoker = true\)/i);
  assert.match(migration, /ALTER VIEW public\.ranking_entries SET \(security_invoker = true\)/i);
  assert.match(audit, /views_without_security_invoker/i);
});

test("password recovery sends implicit-flow sessions to the browser page", () => {
  const recovery = source("app/recuperar-senha/page.tsx");
  const update = source("app/recuperar-senha/atualizar/page.tsx");

  assert.match(recovery, /new URL\("\/recuperar-senha\/atualizar", window\.location\.origin\)/);
  assert.doesNotMatch(recovery, /new URL\("\/auth\/callback", window\.location\.origin\)/);
  assert.match(recovery, /flowType: "implicit"/);
  assert.match(recovery, /persistSession: false/);
  assert.match(update, /flowType: "implicit"/);
  assert.match(update, /persistSession: false/);
  assert.match(update, /signOut\(\{ scope: "local" \}\)/);
});
