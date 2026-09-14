const SANDBOX_SUPABASE_URL = "https://obfqzifcvsqnygwmtpnx.supabase.co";
const SANDBOX_CONFIRMATION = "RANKFTV_DISPOSABLE_SANDBOX";

type Env = Record<string, string | undefined>;

function hostname(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function sandboxMagicLinkIssues(env: Env): string[] {
  const issues: string[] = [];
  const targetHost = hostname(env.E2E_BASE_URL);

  if (env.E2E_DISPOSABLE_SANDBOX !== SANDBOX_CONFIRMATION) {
    issues.push("confirmação explícita do Sandbox descartável ausente");
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== SANDBOX_SUPABASE_URL) {
    issues.push("projeto Supabase Sandbox inesperado");
  }
  if (!env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_")) {
    issues.push("chave secreta moderna do Sandbox ausente");
  }
  if (
    !targetHost
    || (
      targetHost !== "localhost"
      && targetHost !== "127.0.0.1"
      && !(targetHost.endsWith(".vercel.app") && targetHost.includes("sandbox-homologacao"))
    )
  ) {
    issues.push("destino não é localhost nem Preview sandbox-homologacao");
  }

  return issues;
}

export function sandboxMagicLinkEnabled(env: Env = process.env): boolean {
  if (env.E2E_AUTH_MODE !== "sandbox-magic-link") return false;
  const issues = sandboxMagicLinkIssues(env);
  if (issues.length > 0) {
    throw new Error(`Login E2E administrativo bloqueado: ${issues.join("; ")}.`);
  }
  return true;
}

