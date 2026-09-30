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

async function releasedReservationByHash(tokenHash: string) {
  let latest = await reservationByHash(tokenHash);
  await expect.poll(async () => {
    latest = await reservationByHash(tokenHash);
    return latest.status === "released" && Boolean(latest.released_at);
  }, { timeout: 5_000 }).toBe(true);
  return latest;
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

async function fillTemporaryParticipantDraft(page: Page) {
  const athleteTwo = page.getByRole("region", { name: "Atleta 2" });
  await athleteTwo.getByLabel("Nome completo").fill("Parceira Reserva Sandbox");
  await athleteTwo.getByLabel("E-mail", { exact: true }).fill("reserva-parceira@example.com");
}

async function verifyReloadAndSecondTab(page: Page, context: BrowserContext) {
  await page.reload();
  await expect(page.getByText("Vaga reservada", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Atleta 1" })).toBeVisible();
  const athleteTwo = page.getByRole("region", { name: "Atleta 2" });
  await expect(athleteTwo.getByLabel("Nome completo")).toHaveValue("Parceira Reserva Sandbox");
  await expect(athleteTwo.getByLabel("E-mail", { exact: true })).toHaveValue("reserva-parceira@example.com");
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
  const firstRelease = await releasedReservationByHash(tokenHash);
  expect(await forceRelease(tokenHash)).toBe(false);
  const repeatedRelease = await releasedReservationByHash(tokenHash);
  expect(repeatedRelease.status).toBe("released");
  expect(repeatedRelease.released_at).toBe(firstRelease.released_at);
}

test("athlete reservation and same-tab participant draft survive reload without duplication", async ({ page, context }) => {
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
    await fillTemporaryParticipantDraft(page);
    await verifyReloadAndSecondTab(page, context);
    await verifyReusedReservation(page, tokenHash, initial);
    await verifyOnlyOneActiveReservation(userId);
    await verifyIdempotentRelease(tokenHash);
    released = true;
  } finally {
    if (tokenHash && !released) await forceRelease(tokenHash);
  }
});
