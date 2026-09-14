import assert from "node:assert/strict";
import test from "node:test";
import { sandboxMagicLinkEnabled, sandboxMagicLinkIssues } from "./e2e-auth-safety";

const safeEnv = {
  E2E_AUTH_MODE: "sandbox-magic-link",
  E2E_BASE_URL: "https://rank-ftv-git-sandbox-homologacao-example.vercel.app",
  E2E_DISPOSABLE_SANDBOX: "RANKFTV_DISPOSABLE_SANDBOX",
  NEXT_PUBLIC_SUPABASE_URL: "https://obfqzifcvsqnygwmtpnx.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_fixture",
};

test("habilita link mágico somente no Sandbox descartável esperado", () => {
  assert.equal(sandboxMagicLinkEnabled(safeEnv), true);
  assert.equal(sandboxMagicLinkEnabled({ ...safeEnv, E2E_AUTH_MODE: "password" }), false);
});

test("bloqueia produção, chave legada e preview sem identidade de Sandbox", () => {
  const issues = sandboxMagicLinkIssues({
    ...safeEnv,
    E2E_BASE_URL: "https://www.rankftv.com",
    NEXT_PUBLIC_SUPABASE_URL: "https://tkyopolcxfsdbhvrgadj.supabase.co",
    SUPABASE_SECRET_KEY: "service_role_fixture",
  });

  assert.ok(issues.some((issue) => issue.includes("projeto Supabase Sandbox")));
  assert.ok(issues.some((issue) => issue.includes("chave secreta moderna")));
  assert.ok(issues.some((issue) => issue.includes("sandbox-homologacao")));
});

test("permite localhost quando o banco continua sendo o Sandbox", () => {
  assert.deepEqual(sandboxMagicLinkIssues({ ...safeEnv, E2E_BASE_URL: "http://127.0.0.1:3000" }), []);
});

