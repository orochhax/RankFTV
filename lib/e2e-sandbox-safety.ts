const SANDBOX_CONFIRMATION = "RANKFTV_DISPOSABLE_SANDBOX";
const PRODUCTION_SUPABASE_REF = "tkyopolcxfsdbhvrgadj";

type Env = Record<string, string | undefined>;

function hostname(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function financialMutationSandboxIssues(env: Env): string[] {
  const issues: string[] = [];
  const targetHost = hostname(env.E2E_BASE_URL);
  const supabaseHost = hostname(env.NEXT_PUBLIC_SUPABASE_URL);
  const sandboxRef = env.E2E_SANDBOX_SUPABASE_PROJECT_REF?.trim().toLowerCase();

  if (env.E2E_DISPOSABLE_SANDBOX !== SANDBOX_CONFIRMATION) {
    issues.push("confirmação explícita do Sandbox descartável ausente");
  }
  if (!targetHost || !targetHost.endsWith(".vercel.app") || !targetHost.includes("sandbox-homologacao")) {
    issues.push("E2E_BASE_URL não é o Preview sandbox-homologacao da Vercel");
  }
  if (!sandboxRef) {
    issues.push("referência do projeto Supabase Sandbox ausente");
  }
  if (!supabaseHost || !supabaseHost.endsWith(".supabase.co")) {
    issues.push("NEXT_PUBLIC_SUPABASE_URL não é uma URL válida do Supabase");
  }
  if (sandboxRef && supabaseHost !== `${sandboxRef}.supabase.co`) {
    issues.push("URL do Supabase não corresponde à referência Sandbox informada");
  }
  if (sandboxRef === PRODUCTION_SUPABASE_REF || supabaseHost === `${PRODUCTION_SUPABASE_REF}.supabase.co`) {
    issues.push("projeto Supabase de produção detectado");
  }

  return issues;
}

export function financialMutationSandboxEnabled(flagName: string, env: Env = process.env): boolean {
  if (env[flagName] !== "1") return false;
  const issues = financialMutationSandboxIssues(env);
  if (issues.length > 0) {
    throw new Error(`Teste financeiro mutante bloqueado: ${issues.join("; ")}.`);
  }
  return true;
}
