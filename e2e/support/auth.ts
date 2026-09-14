import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { sandboxMagicLinkEnabled } from "../../lib/e2e-auth-safety";

export function hasSandboxLogin(email: string | undefined, password: string | undefined): boolean {
  return Boolean(email && (password || sandboxMagicLinkEnabled()));
}

export async function login(page: Page, email: string, password?: string) {
  if (sandboxMagicLinkEnabled()) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !secretKey) throw new Error("Configuração E2E do Sandbox ausente");
    const admin = createClient(
      supabaseUrl,
      secretKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw error;

    const callback = "/auth/callback"
      + `?token_hash=${encodeURIComponent(data.properties.hashed_token)}`
      + "&type=email&next=%2F";
    await page.goto(callback, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
    return;
  }

  if (!password) throw new Error("Senha E2E ausente");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
}
