import { expect, test } from "@playwright/test";
import { hasSandboxLogin, login } from "./support/auth";

const organizerEmail = process.env.E2E_ORGANIZER_EMAIL;
const organizerPassword = process.env.E2E_ORGANIZER_PASSWORD;
const championshipId = process.env.E2E_WALLET_CHAMPIONSHIP_ID
  ?? "2b3bb52c-2043-4167-aa7f-9e4359bd6dd9";

test("organizer wallet presents balances and accessible financial dialogs", async ({ page }) => {
  test.skip(
    !hasSandboxLogin(organizerEmail, organizerPassword),
    "Sandbox organizer credentials were not configured",
  );

  await login(page, organizerEmail!, organizerPassword);
  await page.goto(`/painel/campeonatos/${championshipId}/financeiro`);

  await expect(page.getByRole("heading", { name: "Sua carteira" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Solicitar saque" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Antecipar cartão" })).toBeVisible();

  await page.getByRole("button", { name: /Saldo pendente/ }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Próximas liberações" });
  await expect(scheduleDialog).toBeVisible();
  await expect(scheduleDialog.locator("strong").first()).toBeVisible();
  await scheduleDialog.getByRole("button", { name: "Fechar" }).click();

  await page.getByRole("button", { name: "Solicitar saque" }).click();
  const withdrawalDialog = page.getByRole("dialog", { name: "Selecionar vendas para saque" });
  await expect(withdrawalDialog).toBeVisible();
  await expect(withdrawalDialog.getByText("Saldo disponível")).toBeVisible();
  await expect(withdrawalDialog.getByRole("checkbox").first()).toBeVisible();
  await expect(withdrawalDialog.getByRole("button", { name: "Confirmar saque" })).toBeDisabled();
});
