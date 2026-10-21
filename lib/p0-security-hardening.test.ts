import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("sensitive RPC migration removes caller-controlled Elite price and browser Pix grants", () => {
  const migration = read("supabase/20261020000100_p0_sensitive_rpc_hardening.sql");
  const financeActions = read("app/painel/campeonatos/[id]/financeiro/actions.ts");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.ativar_championship_elite\(p_champ_id uuid\)/);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.ativar_championship_elite\(uuid, numeric\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION %s TO service_role/);
  assert.match(migration, /r\.status_pagamento = 'pago'/);
  assert.match(migration, /a\.status_pagamento = 'pago'/);
  assert.doesNotMatch(financeActions, /p_preco_elite/);
});

test("support uploads cross the authenticated server boundary and validate actual bytes", () => {
  const component = read("components/admin/SupportAttachmentUpload.tsx");
  const actions = read("app/admin/suporte/actions.ts");
  const route = read("app/api/admin/support-attachments/route.ts");

  assert.match(component, /fetch\("\/api\/admin\/support-attachments"/);
  assert.doesNotMatch(component, /createSignedUploadUrl|uploadToSignedUrl|supabase\/client/);
  assert.doesNotMatch(actions, /export async function (preparar|confirmar)AnexoSuporte/);
  assert.match(route, /isCeo\(role\)/);
  assert.match(route, /readBoundedRequestBody\(request, MAX_REQUEST_BYTES\)/);
  assert.match(route, /validateUploadBytes\(bytes, candidate\.type, MAX_FILE_BYTES\)/);
});

test("public and provider endpoints enforce bounded bodies and minimal health output", () => {
  for (const path of [
    "app/api/webhooks/asaas/route.ts",
    "app/api/webhooks/asaas/withdrawal-authorization/route.ts",
    "app/api/webhooks/resend/route.ts",
    "app/api/analytics/public-funnel/route.ts",
  ]) {
    assert.match(read(path), /readBoundedRequestBody/);
  }

  const funnel = read("app/api/analytics/public-funnel/route.ts");
  const dedupe = read("supabase/20261020000200_public_funnel_deduplication.sql");
  assert.match(funnel, /const occurredAt = new Date\(\)\.toISOString\(\)/);
  assert.match(funnel, /error\?\.code === "23505"/);
  assert.match(dedupe, /CREATE UNIQUE INDEX IF NOT EXISTS public_funnel_events_dedupe_idx/);

  const health = read("app/api/health/route.ts");
  assert.match(health, /NextResponse\.json\(\{ status: "ok" \}/);
  assert.doesNotMatch(health, /VERCEL_GIT_COMMIT_SHA|databaseLatencyMs|timestamp/);
});
