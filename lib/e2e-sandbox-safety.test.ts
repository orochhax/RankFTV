import assert from "node:assert/strict";
import test from "node:test";
import {
  financialMutationSandboxEnabled,
  financialMutationSandboxIssues,
} from "./e2e-sandbox-safety";

const safeEnv = {
  E2E_BASE_URL: "https://rank-ftv-git-sandbox-homologacao-example.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: "https://sandboxprojectref.supabase.co",
  E2E_SANDBOX_SUPABASE_PROJECT_REF: "sandboxprojectref",
  E2E_DISPOSABLE_SANDBOX: "RANKFTV_DISPOSABLE_SANDBOX",
};

test("autoriza mutações somente com flag estrita e Sandbox coerente", () => {
  assert.equal(financialMutationSandboxEnabled("E2E_ASAAS_MUTATION_TESTS", {
    ...safeEnv,
    E2E_ASAAS_MUTATION_TESTS: "1",
  }), true);
  assert.equal(financialMutationSandboxEnabled("E2E_ASAAS_MUTATION_TESTS", {
    ...safeEnv,
    E2E_ASAAS_MUTATION_TESTS: "0",
  }), false);
});

test("bloqueia domínio de produção e Supabase de produção", () => {
  const issues = financialMutationSandboxIssues({
    ...safeEnv,
    E2E_BASE_URL: "https://www.rankftv.com",
    NEXT_PUBLIC_SUPABASE_URL: "https://tkyopolcxfsdbhvrgadj.supabase.co",
    E2E_SANDBOX_SUPABASE_PROJECT_REF: "tkyopolcxfsdbhvrgadj",
  });
  assert.ok(issues.some((issue) => issue.includes("produção")));
  assert.ok(issues.some((issue) => issue.includes("sandbox-homologacao")));
});

test("bloqueia referência declarada diferente da URL do Supabase", () => {
  const issues = financialMutationSandboxIssues({
    ...safeEnv,
    E2E_SANDBOX_SUPABASE_PROJECT_REF: "outroprojeto",
  });
  assert.ok(issues.some((issue) => issue.includes("não corresponde")));
});
