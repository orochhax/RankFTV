import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { sandboxBrowserMutationEnabled } from "../lib/e2e-auth-safety";
import { hasSandboxLogin, login } from "./support/auth";

const championshipId = process.env.E2E_CHAMPIONSHIP_ID
  ?? "2b3bb52c-2043-4167-aa7f-9e4359bd6dd9";
const categoryId = process.env.E2E_CATEGORY_ID
  ?? "bffb27fb-4ecf-4275-8d7a-2e75a0f16659";
const athleteCookieName = `rankftv_athlete_checkout_${championshipId}`;
const athleteMutationsEnabled = sandboxBrowserMutationEnabled("E2E_CHECKOUT_MUTATION_TESTS");

function sandboxAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("Configuração do Supabase Sandbox ausente");
  return createClient(
    supabaseUrl,
    secretKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function expectLegalDialog(page: Page, buttonName: string, title: string, path: string) {
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTitle(title)).toHaveAttribute("src", path);
  await dialog.getByRole("button", { name: `Fechar ${buttonName}` }).click();
  await expect(dialog).not.toBeVisible();
}

async function fillAuthenticatedAthletes(page: Page) {
  const athleteOne = page.getByRole("region", { name: "Atleta 1" });
  const athleteTwo = page.getByRole("region", { name: "Atleta 2" });
  await expect(athleteOne).toBeVisible();
  const categorySummary = page.getByRole("region", { name: "Categoria concluída" });
  await expect(categorySummary).toContainText("Categoria escolhida");
  await expect(categorySummary.getByRole("button", { name: "Trocar" })).toBeVisible();
  const footerSummary = page.getByRole("complementary", { name: "Resumo da compra" });
  await expect(footerSummary).toContainText("2 atletas");
  await footerSummary.locator("summary").click();
  await expect(footerSummary).toContainText("Inscrição");
  await expect(footerSummary).toContainText("Taxa de serviço");
  await athleteOne.getByRole("checkbox", { name: /Você é um dos atletas/ }).check();
  await athleteTwo.getByLabel("Nome completo").fill("Parceira E2E Sandbox");
  await athleteTwo.getByLabel("CPF").fill("11144477735");
  await athleteTwo.getByLabel("E-mail", { exact: true }).fill("parceira-e2e@example.com");
  await athleteTwo.getByLabel("Confirme o e-mail do parceiro").fill("parceira-e2e@example.com");
  await athleteTwo.getByLabel("Gênero").selectOption("feminino");
  await page.getByRole("button", { name: "Revisar dados antes de pagar" }).click();
}

async function verifyAthleteLegalConsent(page: Page) {
  await expect(page.getByText("Revise antes de confirmar")).toBeVisible();
  const participantsSummary = page.getByRole("region", { name: "Participantes concluídos" });
  await expect(participantsSummary).toContainText("Parceira E2E Sandbox");
  await expect(participantsSummary.getByRole("button", { name: "Editar" })).toBeVisible();
  const consent = page.getByRole("checkbox", { name: /Li e concordo/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: /Pagar com/ }).click();
  await expect(consent).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/campeonatos/${championshipId}/comprar`));
  await expectLegalDialog(page, "Termos de Uso", "Termos de Uso da RankFTV", "/termos");
  await expectLegalDialog(page, "Política de Privacidade", "Política de Privacidade da RankFTV", "/privacidade");
}

async function releaseReservation(tokenHash: string) {
  const admin = sandboxAdmin();
  const { error } = await admin.rpc("release_athlete_checkout_reservation", {
    p_token_hash: tokenHash,
    p_force: true,
  });
  if (error) throw error;
  const { data: reservation, error: readError } = await admin
    .from("checkout_reservations")
    .select("status,released_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (readError) throw readError;
  expect(reservation?.status).toBe("released");
  expect(reservation?.released_at).toBeTruthy();
}

test("authenticated athlete cannot submit without consent and opens both legal documents", async ({ page }) => {
  test.skip(!athleteMutationsEnabled, "Checkout mutation tests were not enabled for the disposable Sandbox");
  test.slow();
  const email = process.env.E2E_ATHLETE_EMAIL;
  test.skip(!hasSandboxLogin(email, process.env.E2E_ATHLETE_PASSWORD), "Sandbox athlete credentials were not configured");
  if (!email) throw new Error("Sandbox athlete e-mail was not configured");
  let reservationTokenHash: string | undefined;

  try {
    await login(page, email, process.env.E2E_ATHLETE_PASSWORD);
    await page.goto(`/campeonatos/${championshipId}/comprar?categoria=${categoryId}`);
    await expect(page.getByRole("button", { pressed: true })).toContainText(/vagas? disponíveis|Sem limite de vagas/);
    await page.getByRole("button", { name: "Continuar com esta categoria" }).click();

    const athleteOne = page.getByRole("region", { name: "Atleta 1" });
    await expect(athleteOne).toBeVisible();
    const reservationCookie = (await page.context().cookies())
      .find((item) => item.name === athleteCookieName);
    if (!reservationCookie?.value) throw new Error("Cookie da reserva de atleta não encontrado");
    reservationTokenHash = createHash("sha256").update(reservationCookie.value).digest("hex");
    await fillAuthenticatedAthletes(page);
    await verifyAthleteLegalConsent(page);
  } finally {
    if (reservationTokenHash) await releaseReservation(reservationTokenHash);
  }
});

test("spectator checkout cannot submit without consent and opens separate legal pages", async ({ page, context }) => {
  test.slow();
  await page.goto(`/campeonatos/${championshipId}/plateia`);
  await page.getByRole("button", { name: "Aumentar" }).first().click();
  await page.getByLabel("Seu nome").fill("Espectador E2E Sandbox");
  await page.getByLabel("E-mail", { exact: true }).fill("espectador-e2e@example.com");
  await page.getByLabel("CPF").fill("52998224725");

  const consent = page.getByRole("checkbox", { name: /Li e concordo/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: /Continuar pro pagamento/ }).click();
  await expect(consent).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/campeonatos/${championshipId}/plateia`));

  for (const [name, path] of [["Termos de Uso", "/termos"], ["Política de Privacidade", "/privacidade"]] as const) {
    const opened = context.waitForEvent("page");
    await page.getByRole("link", { name, exact: true }).click();
    const legalPage = await opened;
    await legalPage.waitForLoadState("domcontentloaded");
    await expect(legalPage).toHaveURL(new RegExp(`${path}$`));
    await legalPage.close();
  }
});
