import { expect, test } from "@playwright/test";
import { login } from "./support/auth";

const email = process.env.E2E_PERFORMANCE_EMAIL;
const password = process.env.E2E_PERFORMANCE_PASSWORD;
const mutationsEnabled = process.env.E2E_PERFORMANCE_MUTATIONS === "true";

test.describe("Carteira em Rota", () => {
  test.skip(!email || !password, "Defina E2E_PERFORMANCE_EMAIL e E2E_PERFORMANCE_PASSWORD para validar a área privada.");

  test("mantém a rota responsiva e o modal de check-in acessível", async ({ page }) => {
    await login(page, email!, password!);
    await page.goto("/admin/performance?view=investments");
    await expect(page.getByRole("heading", { name: "Carteira em Rota", exact: true })).toBeVisible();

    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    const trigger = page.getByRole("button", { name: "Fazer check-in", exact: true }).first();
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Fazer check-in" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Fazer check-in" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("mantém wizard e laboratório locais até uma confirmação explícita", async ({ page }) => {
    await login(page, email!, password!);
    await page.goto("/admin/performance?view=investments");

    const createPlan = page.getByRole("button", { name: "Criar meu plano", exact: true }).first();
    const editPlan = page.getByRole("button", { name: "Ajustar plano", exact: true }).first();
    const wizardTrigger = (await createPlan.isVisible().catch(() => false)) ? createPlan : editPlan;
    if (await wizardTrigger.isVisible().catch(() => false)) {
      await wizardTrigger.click();
      const dialog = page.getByRole("dialog", { name: /Criar meu plano|Ajustar plano/ });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("list", { name: "Etapas do plano" })).toContainText("Destino");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(wizardTrigger).toBeFocused();
    }

    const lab = page.getByRole("heading", { name: "E se?", exact: true });
    test.skip(!(await lab.isVisible().catch(() => false)), "A conta de leitura não possui plano ativo para testar o laboratório.");
    const monthly = page.getByLabel("Aporte mensal", { exact: true });
    const savedValue = await monthly.inputValue();
    await monthly.fill(String(Number(savedValue || 0) + 100));
    await expect(page.getByText("Simulação não salva", { exact: true })).toBeVisible();
    await page.getByLabel("Mês-alvo", { exact: true }).fill("");
    await expect(page.getByText("Informe um mês-alvo válido para recalcular a simulação.")).toBeVisible();
    await expect(lab).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Aporte mensal", { exact: true })).toHaveValue(savedValue);
  });

  test.describe("fluxo mutável em conta E2E dedicada", () => {
    test.skip(!mutationsEnabled, "Defina E2E_PERFORMANCE_MUTATIONS=true somente para uma conta dedicada e descartável.");

    test("cria plano, faz check-in, registra aporte, aplica revisão e registra no diário", async ({ page }) => {
      await login(page, email!, password!);
      await page.goto("/admin/performance?view=investments");
      const createPlan = page.getByRole("button", { name: "Criar meu plano", exact: true }).first();
      test.skip(!(await createPlan.isVisible().catch(() => false)), "A conta mutável precisa começar sem plano ativo.");

      await createPlan.click();
      const wizard = page.getByRole("dialog", { name: "Criar meu plano" });
      await wizard.getByLabel("Nome do objetivo").fill("Destino E2E descartável");
      await wizard.getByLabel("Valor desejado").fill("500000");
      await wizard.getByRole("button", { name: "Continuar" }).click();
      const baseline = wizard.getByLabel("Valor atual da carteira");
      if (await baseline.isEnabled()) await baseline.fill("100000");
      await wizard.getByLabel("Aporte mensal planejado").fill("1000");
      await wizard.getByRole("button", { name: "Continuar" }).click();
      await wizard.getByRole("checkbox").check();
      await wizard.getByRole("button", { name: "Salvar plano e ver minha rota" }).click();
      await expect(page.getByText(/Plano (e primeiro check-in )?salvo/)).toBeVisible();

      await page.getByRole("button", { name: "Fazer check-in", exact: true }).first().click();
      const checkin = page.getByRole("dialog", { name: "Fazer check-in" });
      await checkin.getByLabel("Valor total da carteira").fill("100100");
      await checkin.getByLabel("Observação").fill("Check-in E2E");
      await checkin.getByRole("button", { name: "Salvar e recalcular rota" }).click();
      const replace = page.getByRole("alertdialog", { name: "Substituir check-in existente?" });
      if (await replace.isVisible().catch(() => false)) {
        await replace.getByRole("button", { name: "Substituir check-in" }).click();
      }
      await expect(page.getByText(/Check-in (salvo|atualizado)/)).toBeVisible();

      await page.getByRole("button", { name: "Aporte", exact: true }).click();
      const contribution = page.getByRole("dialog", { name: "Registrar aporte" });
      await contribution.getByLabel("Valor").fill("123.45");
      await contribution.getByLabel("Instituição").fill("E2E descartável");
      await contribution.getByRole("button", { name: "Salvar aporte" }).click();
      await expect(page.getByText("Aporte registrado.", { exact: true })).toBeVisible();

      const monthly = page.getByLabel("Aporte mensal", { exact: true });
      await monthly.fill(String(Number(await monthly.inputValue()) + 100));
      await page.getByRole("button", { name: "Aplicar ao plano" }).click();
      await page.getByRole("alertdialog", { name: "Aplicar simulação ao plano?" }).getByRole("button", { name: "Criar nova revisão" }).click();
      await expect(page.getByText(/Plano ajustado/).first()).toBeVisible();
      await expect(page.getByText(/Plano ajustado · revisão/).first()).toBeVisible();

      await page.getByRole("button", { name: /Excluir aporte de R\$ 123,45/ }).last().click();
      await page.getByRole("alertdialog", { name: "Excluir aporte?" }).getByRole("button", { name: "Excluir movimentação" }).click();
      await expect(page.getByText("Movimentação removida.", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Arquivar plano" }).click();
      await page.getByRole("alertdialog", { name: "Arquivar este plano?" }).getByRole("button", { name: "Arquivar plano" }).click();
      await expect(page.getByText("Plano arquivado", { exact: true }).first()).toBeVisible();
    });
  });
});
