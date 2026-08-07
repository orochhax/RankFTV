import { expect, test } from "@playwright/test";
import { login } from "./support/auth";

function scriptDirective(csp: string) {
  return csp.split(";").map((part) => part.trim()).find((part) => part.startsWith("script-src")) ?? "";
}

test("public, protected and error responses receive request CSP", async ({ request }) => {
  for (const path of ["/login", "/admin", "/route-that-does-not-exist-e2e"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const csp = response.headers()["content-security-policy"] ?? "";

    expect(response.headers()["x-request-id"]).toBeTruthy();
    expect(scriptDirective(csp)).toContain("'nonce-");
    expect(scriptDirective(csp)).not.toContain("'unsafe-inline'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  }
});

test("anonymous admin access is redirected to the site login", async ({ request }) => {
  const response = await request.get("/admin", { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers().location).toContain("/login");
});

test("login remains usable on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("athlete can reach the registrations area", async ({ page }) => {
  test.skip(!process.env.E2E_ATHLETE_EMAIL || !process.env.E2E_ATHLETE_PASSWORD, "Sandbox athlete credentials were not configured");
  await login(page, process.env.E2E_ATHLETE_EMAIL!, process.env.E2E_ATHLETE_PASSWORD!);
  await page.goto("/minhas-inscricoes");
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator("body")).toContainText(/inscri/i);
});

test("organizer can reach the management panel", async ({ page }) => {
  test.skip(!process.env.E2E_ORGANIZER_EMAIL || !process.env.E2E_ORGANIZER_PASSWORD, "Sandbox organizer credentials were not configured");
  await login(page, process.env.E2E_ORGANIZER_EMAIL!, process.env.E2E_ORGANIZER_PASSWORD!);
  await page.goto("/painel");
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator("body")).toContainText(/campeonato|organizador/i);
});
