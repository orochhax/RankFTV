import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("commercial admin authorization has profiles.role as its only source of truth", () => {
  const roles = source("lib/supabase/roles.ts");
  assert.doesNotMatch(roles, /user\.email\s*&&\s*user\.email\s*===\s*process\.env\.ADMIN_EMAIL/);
  assert.match(roles, /return isAdminRole/);

  for (const file of [
    "app/admin/campeonatos/page.tsx",
    "app/admin/campeonatos/novo/page.tsx",
    "app/admin/campeonatos/[id]/editar/page.tsx",
    "app/admin/destaques/page.tsx",
    "app/admin/noticias/page.tsx",
    "app/admin/noticias/[id]/editar/page.tsx",
    "app/admin/taxas/page.tsx",
  ]) {
    const contents = source(file);
    assert.match(contents, /isAdminUser/);
    assert.doesNotMatch(contents, /ADMIN_EMAIL/);
  }
});

test("assisted ticket support is CEO-only and fails closed when audit is unavailable", () => {
  const page = source("app/admin/suporte/page.tsx");
  const actions = source("app/admin/suporte/actions.ts");
  const center = source("components/admin/TicketSupportCenter.tsx");
  const menu = source("app/admin/page.tsx");

  assert.match(page, /isCeo\(role\)/);
  assert.match(actions, /if \(!user \|\| !isCeo\(role\)\)/);
  assert.match(actions, /athlete_ticket_email_correction_requested/);
  assert.match(actions, /if \(!auditReady\)/);
  assert.match(actions, /access_token: gerarTicketAccessToken\(\), user_id: null/);
  assert.match(actions, /deliverAthleteTicketCredentials/);
  assert.match(actions, /security_audit_log/);
  assert.match(actions, /SUPPORT_AUDIT_ACTIONS/);
  assert.match(actions, /reenviarCredencialSuporte/);
  assert.match(actions, /idempotencyScope: `support-resend-\$\{resendEvent\.id\}`/);
  assert.match(actions, /invalidarCredencialSuporte/);
  assert.match(actions, /Limite de 3 reenvios em 24 horas/);
  assert.match(actions, /listarOperacaoEmails/);
  assert.match(actions, /provider_status/);
  assert.match(actions, /criarCasoSuporte/);
  assert.match(actions, /atualizarCasoSuporte/);
  assert.match(actions, /dateFrom[\s\S]*\.gte\("created_at"/);
  assert.match(actions, /dateTo[\s\S]*\.lt\("created_at"/);
  assert.match(actions, /email_anterior: maskEmail\(oldEmail\)/);
  assert.match(actions, /email_novo: maskEmail\(newEmail\)/);
  assert.match(center, /Histórico de alterações/);
  assert.match(center, /Quem:/);
  assert.match(center, /Ver histórico deste ingresso/);
  assert.match(center, /type="date"/);
  assert.match(center, /Filtrar período/);
  assert.match(center, /Operação de e-mails/);
  assert.match(center, /Fila de casos/);
  assert.match(center, /Histórico das credenciais/);
  assert.match(center, /Aguardando autorização financeira/);
  assert.match(center, /setOperationError/);
  assert.match(center, /role="alert"/);
  assert.doesNotMatch(center, /alert\s*\(/);
  assert.match(page, /listarLogsSuporte/);
  assert.match(menu, /href: "\/admin\/suporte"[\s\S]*ownerOnly: true/);
});

test("Arena paid subscriptions are opt-in and guarded in UI and server action", () => {
  assert.match(source("lib/release-flags.ts"), /ARENA_RECURRING_PAYMENTS_ENABLED\s*===\s*"1"/);
  assert.match(source("app/arenas/[handle]/assinar/[planId]/page.tsx"), /arenaRecurringPaymentsEnabled/);
  assert.match(source("app/arenas/[handle]/assinar/[planId]/actions.ts"), /if \(!arenaRecurringPaymentsEnabled\(\)\)/);
  assert.match(source(".env.example"), /ARENA_RECURRING_PAYMENTS_ENABLED=0/);
});

test("category-level recommendation is disabled throughout the V1 flow", () => {
  const flags = source("lib/release-flags.ts");
  const newForm = source("components/painel/NovoCampeonatoForm.tsx");
  const editForm = source("components/painel/EditarCampeonatoForm.tsx");

  assert.match(flags, /function categoryLevelRecommendationEnabled/);
  assert.match(flags, /categoryLevelRecommendationEnabled[\s\S]*return false/);
  assert.doesNotMatch(newForm, /Recomendar categoria pro atleta/);
  assert.doesNotMatch(editForm, /Recomendar categoria pro atleta/);
  assert.match(newForm, /usaMotorCategoria: false/);
  assert.match(editForm, /usaMotorCategoria: false/);

  for (const file of [
    "app/campeonatos/[id]/comprar/actions.ts",
    "app/campeonatos/[id]/inscrever/actions.ts",
    "app/perfil/convite-actions.ts",
    "lib/supabase/championships.ts",
  ]) {
    assert.match(source(file), /categoryLevelRecommendationEnabled/);
  }

  assert.match(source("app/perfil/questionario-nivel/page.tsx"), /if \(!categoryLevelRecommendationEnabled\(\)\) redirect\("\/perfil"\)/);
  assert.match(source("app/perfil/questionario-nivel/actions.ts"), /if \(!categoryLevelRecommendationEnabled\(\)\)/);
});

test("transactional email failures never log the recipient", () => {
  const email = source("lib/email/send.ts");
  assert.doesNotMatch(email, /console\.error\([^\n]*\bto\b/);
  assert.match(email, /email\.delivery_failed/);
  assert.match(email, /reportOperationalEvent/);
  assert.match(email, /createEmailOperationalEvent/);
  assert.match(email, /providerMessageId: result\.data\?\.id/);

  const webhook = source("app/api/webhooks/resend/route.ts");
  assert.match(webhook, /RESEND_WEBHOOK_SECRET/);
  assert.match(webhook, /webhooks\.verify/);
  assert.match(webhook, /email\.bounced/);
  assert.match(webhook, /email\.complained/);
  assert.doesNotMatch(webhook, /\.insert\([^\n]*to:/);
});

test("critical V1 server paths use sanitized operational logging", () => {
  for (const file of [
    "lib/arena-notify.ts",
    "lib/rate-limit.ts",
    "lib/audit.ts",
    "app/painel/campeonatos/[id]/lotes/actions.ts",
    "app/campeonatos/[id]/comprar/actions.ts",
  ]) {
    const contents = source(file);
    assert.match(contents, /reportOperationalEvent/);
    assert.doesNotMatch(contents, /console\.(?:log|error|warn|info)/);
  }
});

test("public copy does not promise boleto or self-service cancellation", () => {
  const publicCopy = [
    source("components/painel/PainelLandingClient.tsx"),
    source("app/arenas/[handle]/assinar/[planId]/SubscriptionPaymentUI.tsx"),
  ].join("\n");
  assert.doesNotMatch(publicCopy, /Pix ou boleto/i);
  assert.doesNotMatch(publicCopy, /Cancele a qualquer momento/i);
  assert.match(publicCopy, /Beta/i);
});

test("organizer activation opens the empty dashboard before championship creation", () => {
  const activationAction = source("app/perfil/ativar-organizador/actions.ts");
  const activationPage = source("app/perfil/ativar-organizador/page.tsx");
  const championshipPage = source("app/painel/novo-campeonato/page.tsx");
  const dashboardPage = source("app/painel/page.tsx");
  const signupPage = source("app/cadastro/page.tsx");

  assert.match(activationAction, /revalidatePath\("\/", "layout"\)/);
  assert.match(activationAction, /redirect\("\/painel"\)/);
  assert.doesNotMatch(activationAction, /redirect\([^\n]*novo-campeonato/);
  assert.match(activationPage, /if \(conta\?\.habilitado\) redirect\("\/painel"\)/);
  assert.match(championshipPage, /if \(!conta\?\.habilitado\) redirect\("\/perfil\/ativar-organizador"\)/);
  assert.match(signupPage, /if \(modoOrganizador\) callbackUrl\.searchParams\.set\("next", "\/painel"\)/);
  assert.match(dashboardPage, /Nenhum campeonato criado ainda/);
  assert.match(dashboardPage, /Sua conta de organizador está ativa/);
});

test("new championships do not start with an unnamed category", () => {
  const form = source("components/painel/NovoCampeonatoForm.tsx");

  assert.match(form, /useState<CatForm\[\]>\(\[\]\)/);
  assert.match(form, /if \(!ativa\) addCat\(preset\)/);
  assert.match(form, /onClick=\{\(\) => addCat\(""\)\}/);
  assert.match(form, /function removeCat\(i: number\) \{\s*setCategorias\(\(cs\) => cs\.filter/);
});

test("categories with operational history cannot be deleted or trigger refunds", () => {
  const actions = source("app/painel/campeonatos/[id]/lotes/actions.ts");
  const editActions = source("app/painel/campeonatos/[id]/editar/actions.ts");
  const editForm = source("components/painel/EditarCampeonatoForm.tsx");
  const manager = source("components/painel/LotesManager.tsx");
  const migration = source("supabase/production-category-deletion-guard.sql");

  assert.match(actions, /\.from\("teams"\)[\s\S]*\.from\("athlete_tickets"\)/);
  assert.match(actions, /\.from\("bracket_participants"\)[\s\S]*\.from\("bracket_matches"\)/);
  assert.doesNotMatch(actions, /from\("pricing_tiers"\)\.delete\(\)\.eq\("category_id", categoriaId\)/);
  assert.match(actions, /CATEGORY_HAS_DEPENDENCIES/);
  assert.match(actions, /\.delete\(\)[\s\S]*\.select\("id"\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(actions, /if \(!deleted\)/);
  assert.match(manager, /não cancela compras nem gera reembolso/);
  assert.match(manager, /role="alert"/);
  assert.match(editActions, /deleteError\?\.code === "23503"/);
  assert.match(editActions, /CATEGORY_HAS_DEPENDENCIES/);
  assert.match(editActions, /if \(deleteError\) return \{ ok: false/);
  assert.match(editActions, /\(deleted \?\? \[\]\)\.length !== ids\.length/);
  assert.match(editForm, /role="alert"/);
  assert.match(migration, /BEFORE DELETE ON championship_categories/);
  assert.match(migration, /SELECT 1 FROM registrations/);
  assert.match(migration, /SELECT 1 FROM athlete_tickets/);
  assert.match(migration, /SELECT 1 FROM bracket_matches/);
  assert.match(migration, /ERRCODE = '23503'/);
  assert.doesNotMatch(migration, /refund|reembolso|estorno/i);
});

test("application errors never use native browser alerts", () => {
  for (const file of [
    "components/painel/EditarCampeonatoForm.tsx",
    "components/painel/LotesManager.tsx",
    "components/admin/AdminStatusSelect.tsx",
    "components/admin/AdminDeleteNoticia.tsx",
    "components/admin/AdminDeleteCampeonato.tsx",
  ]) {
    const contents = source(file);
    assert.doesNotMatch(contents, /(?:window\.)?alert\s*\(/);
    assert.match(contents, /role="alert"/);
  }
});

test("payment UX is provider-neutral while privacy disclosure stays transparent", () => {
  for (const file of [
    "components/painel/ReconciliarInscricaoButton.tsx",
    "components/arena/FinanceiroAlunoClient.tsx",
  ]) {
    assert.doesNotMatch(source(file), /Asaas/i);
  }

  const financePage = source("app/painel/campeonatos/[id]/financeiro/page.tsx");
  assert.doesNotMatch(financePage, /Verifique o status real no Asaas/i);
  assert.match(financePage, /processador de pagamentos/);
  const financeActions = source("app/painel/campeonatos/[id]/financeiro/actions.ts");
  assert.doesNotMatch(financeActions, /message:\s*[`\"][^\n]*Asaas/i);
  assert.match(source("app/privacidade/page.tsx"), /Asaas/);
});

test("championship finances keep the operational blocks ordered and mobile-safe", () => {
  const content = source("components/painel/FinanceiroConteudoClient.tsx");
  const page = source("app/painel/campeonatos/[id]/financeiro/page.tsx");
  const chart = source("components/painel/GraficoVendasDiarias.tsx");

  assert.match(
    content,
    /Saldo líquido[\s\S]*Status dos pagamentos[\s\S]*chavePixSection[\s\S]*Vendas por dia[\s\S]*cobrancasPendentesSection/,
  );
  assert.match(page, /max-h-96[\s\S]*overflow-y-auto/);
  assert.match(chart, /interval="preserveStartEnd"/);
  assert.match(chart, /minTickGap=\{18\}/);
  assert.doesNotMatch(chart, /toFixed\(0\)\}k/);
});

test("championship publishing has one secured Pix field for every paid product", () => {
  const page = source("app/painel/campeonatos/[id]/publicar/page.tsx");
  const form = source("components/painel/PublicarCampeonatoForm.tsx");
  const action = source("app/painel/campeonatos/[id]/publicar/actions.ts");
  const financialAction = source("app/painel/campeonatos/[id]/financeiro/actions.ts");

  assert.doesNotMatch(page, /ChavePixClient/);
  assert.equal([...form.matchAll(/name="chave_pix"/g)].length, 1);
  assert.match(page, /const temProdutoPago\s*=\s*temCategoriaPaga \|\| temIngressoPago/);
  assert.match(action, /const temProdutoPago = temCategoriaPaga \|\| temIngressoPago/);
  assert.match(action, /await salvarChavePix\(chavePix\)/);
  assert.doesNotMatch(action, /\.update\(\{ chave_pix: chavePix \}\)/);
  assert.match(financialAction, /const admin = createAdminClient\(\)/);
  assert.match(financialAction, /chave_pix_atualizada_em: new Date\(\)\.toISOString\(\)/);
});
