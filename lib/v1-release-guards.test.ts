import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("commercial admin authorization has profiles.role as its only source of truth", () => {
  const roles = source("lib/supabase/roles.ts");
  assert.doesNotMatch(roles, /user\.email\s*&&\s*user\.email\s*===\s*process\.env\.ADMIN_EMAIL/);
  assert.match(roles, /return isAdminRole/);

  for (const file of [
    "app/admin/campeonatos/page.tsx",
    "app/admin/campeonatos/novo/page.tsx",
    "app/admin/campeonatos/[id]/editar/page.tsx",
    "app/admin/destaques/page.tsx",
    "app/admin/noticias/page.tsx",
    "app/admin/noticias/[id]/editar/page.tsx",
    "app/admin/taxas/page.tsx",
  ]) {
    const contents = source(file);
    assert.match(contents, /isAdminUser/);
    assert.doesNotMatch(contents, /ADMIN_EMAIL/);
  }
});

test("Arena paid subscriptions are opt-in and guarded in UI and server action", () => {
  assert.match(source("lib/release-flags.ts"), /ARENA_RECURRING_PAYMENTS_ENABLED\s*===\s*"1"/);
  assert.match(source("app/arenas/[handle]/assinar/[planId]/page.tsx"), /arenaRecurringPaymentsEnabled/);
  assert.match(source("app/arenas/[handle]/assinar/[planId]/actions.ts"), /if \(!arenaRecurringPaymentsEnabled\(\)\)/);
  assert.match(source(".env.example"), /ARENA_RECURRING_PAYMENTS_ENABLED=0/);
});

test("transactional email failures never log the recipient", () => {
  const email = source("lib/email/send.ts");
  assert.doesNotMatch(email, /console\.error\([^\n]*\bto\b/);
  assert.match(email, /email\.delivery_failed/);
  assert.match(email, /reportOperationalEvent/);
});

test("critical V1 server paths use sanitized operational logging", () => {
  for (const file of [
    "lib/arena-notify.ts",
    "lib/rate-limit.ts",
    "lib/audit.ts",
    "app/painel/campeonatos/[id]/lotes/actions.ts",
    "app/campeonatos/[id]/comprar/actions.ts",
  ]) {
    const contents = source(file);
    assert.match(contents, /reportOperationalEvent/);
    assert.doesNotMatch(contents, /console\.(?:log|error|warn|info)/);
  }
});

test("public copy does not promise boleto or self-service cancellation", () => {
  const publicCopy = [
    source("components/painel/PainelLandingClient.tsx"),
    source("app/arenas/[handle]/assinar/[planId]/SubscriptionPaymentUI.tsx"),
  ].join("\n");
  assert.doesNotMatch(publicCopy, /Pix ou boleto/i);
  assert.doesNotMatch(publicCopy, /Cancele a qualquer momento/i);
  assert.match(publicCopy, /Beta/i);
});
