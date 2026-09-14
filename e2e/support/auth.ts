import { expect, type Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { sandboxMagicLinkEnabled } from "../../lib/e2e-auth-safety";

type SandboxAuthConfig = {
  baseUrl: string;
  publishableKey: string;
  secretKey: string;
  supabaseUrl: string;
};

function sandboxAuthConfig(): SandboxAuthConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const baseUrl = process.env.E2E_BASE_URL;
  if (!supabaseUrl || !secretKey || !publishableKey || !baseUrl) {
    throw new Error("Configuração E2E do Sandbox ausente");
  }
  return { baseUrl, publishableKey, secretKey, supabaseUrl };
}

async function verifiedSandboxTokens(email: string, config: SandboxAuthConfig) {
  const admin = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;

  const verifier = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await verifier.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "email",
  });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error("Supabase não devolveu uma sessão E2E");
  }
  return {
    access_token: result.data.session.access_token,
    refresh_token: result.data.session.refresh_token,
  };
}

async function createSessionCookies(config: SandboxAuthConfig, tokens: Awaited<ReturnType<typeof verifiedSandboxTokens>>) {
  const sessionCookies: Array<{ name: string; value: string }> = [];
  const ssr = createServerClient(config.supabaseUrl, config.publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => {
        sessionCookies.push(...cookies.map(({ name, value }) => ({ name, value })));
      },
    },
  });
  const { error } = await ssr.auth.setSession(tokens);
  if (error) throw error;
  if (sessionCookies.length === 0) {
    throw new Error("@supabase/ssr não gerou os cookies da sessão E2E");
  }
  return sessionCookies;
}

function applicationOrigins(baseUrl: string) {
  const origins = new Set([new URL(baseUrl).origin]);
  if (origins.has("http://127.0.0.1:3000")) origins.add("http://localhost:3000");
  if (origins.has("http://localhost:3000")) origins.add("http://127.0.0.1:3000");
  return [...origins];
}

async function loginWithSandboxMagicLink(page: Page, email: string) {
  const config = sandboxAuthConfig();
  const tokens = await verifiedSandboxTokens(email, config);
  const sessionCookies = await createSessionCookies(config, tokens);
  await page.context().addCookies(
    applicationOrigins(config.baseUrl).flatMap((url) => sessionCookies.map(({ name, value }) => ({
      name,
      value,
      url,
      httpOnly: false,
      secure: url.startsWith("https://"),
      sameSite: "Lax" as const,
    }))),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
}

export function hasSandboxLogin(email: string | undefined, password: string | undefined): boolean {
  return Boolean(email && (password || sandboxMagicLinkEnabled()));
}

export async function login(page: Page, email: string, password?: string) {
  if (sandboxMagicLinkEnabled()) {
    await loginWithSandboxMagicLink(page, email);
    return;
  }

  if (!password) throw new Error("Senha E2E ausente");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
}
