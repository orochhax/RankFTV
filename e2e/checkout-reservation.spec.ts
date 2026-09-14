import { createHash } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { sandboxBrowserMutationEnabled } from "../lib/e2e-auth-safety";
import { hasSandboxLogin, login } from "./support/auth";

const championshipId = process.env.E2E_CHAMPIONSHIP_ID
  ?? "2b3bb52c-2043-4167-aa7f-9e4359bd6dd9";
const categoryId = process.env.E2E_CATEGORY_ID
  ?? "bffb27fb-4ecf-4275-8d7a-2e75a0f16659";
const checkoutPath = `/campeonatos/${championshipId}/comprar?categoria=${categoryId}`;
const checkoutCookieName = `rankftv_athlete_checkout_${championshipId}`;
const mutationsEnabled = sandboxBrowserMutationEnabled("E2E_CHECKOUT_MUTATION_TESTS");

function sandboxAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("Configuração do Supabase Sandbox ausente");
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function reservationByHash(tokenHash: string) {
  const { data, error } = await sandboxAdmin()
    .from("checkout_reservations")
    .select("id,category_id,user_id,status,expires_at,released_at")
    .eq("token_hash", tokenHash)
    .single();
  if (error) throw error;
  return data;
}

async function forceRelease(tokenHash: string) {
  const { data, error } = await sandboxAdmin().rpc("release_athlete_checkout_reservation", {
    p_token_hash: tokenHash,
    p_force: true,
  });
  if (error) throw error;
  return data;
}

async function createReservation(page: Page, context: BrowserContext) {
  await page.goto(checkoutPath);
  await page.getByRole("button", { name: "Continuar com esta categoria" }).click();
  await expect(page.getByRole("region", { name: "Atleta 1" })).toBeVisible();
  const cookie = (await context.cookies()).find(({ name }) => name === checkoutCookieName);
  if (!cookie?.value) throw new Error("Cookie da reserva de atleta não encontrado");
  const tokenHash = createHash("sha256").update(cookie.value).digest("hex");
  return { initial: await reservationByHash(tokenHash), tokenHash };
}

async function verifyReloadAndSecondTab(page: Page, context: BrowserContext) {
  await page.reload();
  await expect(page.getByText("Vaga reservada", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Atleta 1" })).toBeVisible();
  const secondPage = await context.newPage();
  await secondPage.goto(checkoutPath);
  await expect(secondPage.getByRole("region", { name: "Atleta 1" })).toBeVisible();
  await secondPage.close();
}

async function verifyReusedReservation(page: Page, tokenHash: string, initial: Awaited<ReturnType<typeof reservationByHash>>) {
  await page.getByRole("button", { name: "Trocar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar com esta categoria" }).click();
  const reused = await reservationByHash(tokenHash);
  expect(reused.id).toBe(initial.id);
  expect(reused.expires_at).toBe(initial.expires_at);
}

async function verifyOnlyOneActiveReservation(userId: string) {
  const { count, error } = await sandboxAdmin()
    .from("checkout_reservations")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", championshipId)
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  expect(count).toBe(1);
}

function verifyInitialReservation(initial: Awaited<ReturnType<typeof reservationByHash>>) {
  expect(initial.status).toBe("active");
  expect(initial.category_id).toBe(categoryId);
  if (!initial.user_id) throw new Error("Reserva autenticada sem usuário");
  return initial.user_id;
}

async function verifyIdempotentRelease(tokenHash: string) {
  expect(await forceRelease(tokenHash)).toBe(true);
  const firstRelease = await reservationByHash(tokenHash);
  expect(await forceRelease(tokenHash)).toBe(false);
  const repeatedRelease = await reservationByHash(tokenHash);
  expect(repeatedRelease.status).toBe("released");
  expect(repeatedRelease.released_at).toBe(firstRelease.released_at);
}

test("athlete reservation survives reload and a second tab without duplication", async ({ page, context }) => {
  test.skip(!mutationsEnabled, "Checkout mutation tests were not enabled for the disposable Sandbox");
  test.slow();
  const email = process.env.E2E_ATHLETE_EMAIL;
  test.skip(!hasSandboxLogin(email, process.env.E2E_ATHLETE_PASSWORD), "Sandbox athlete credentials were not configured");
  if (!email) throw new Error("Sandbox athlete e-mail was not configured");

  let tokenHash: string | undefined;
  let released = false;
  try {
    await login(page, email, process.env.E2E_ATHLETE_PASSWORD);
    const created = await createReservation(page, context);
    tokenHash = created.tokenHash;
    const { initial } = created;
    const userId = verifyInitialReservation(initial);
    await verifyReloadAndSecondTab(page, context);
    await verifyReusedReservation(page, tokenHash, initial);
    await verifyOnlyOneActiveReservation(userId);
    await verifyIdempotentRelease(tokenHash);
    released = true;
  } finally {
    if (tokenHash && !released) await forceRelease(tokenHash);
  }
});
