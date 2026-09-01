import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ticket and checkout routes keep the authenticated navigation", () => {
  const navigation = source("components/shell/app-nav-items.ts");
  assert.doesNotMatch(navigation, /FOCUSED_SUBSTRINGS/);
  assert.doesNotMatch(navigation, /"\/comprar\/ingresso\/"/);
  assert.doesNotMatch(navigation, /"\/plateia\/ingresso\/"/);
  assert.match(navigation, /label: "Minhas compras"/);
});

test("athlete checkout preserves values and validates CPF and both access e-mails inline", () => {
  const form = source("components/campeonatos/IngressoAtletaForm.tsx");
  const action = source("app/campeonatos/[id]/comprar/actions.ts");

  assert.match(form, /value=\{values\.comprador_nome/);
  assert.match(form, /value=\{values\.parceiro_nome/);
  assert.match(form, /formatCpf\(event\.target\.value\)/);
  assert.match(form, /maxLength=\{14\}/);
  assert.match(form, /aria-invalid=\{!!visibleFieldError\("comprador_cpf"\)\}/);
  assert.match(action, /normalizeCpf\(formData\.get\("comprador_cpf"\)/);
  assert.match(action, /validaCPF\(cpf\)/);
  assert.match(action, /validaCPF\(pCpf\)/);
  assert.match(action, /fieldErrors\.comprador_cpf/);
  assert.match(form, /visibleFieldError\("comprador_email"\)/);
  assert.match(form, /visibleFieldError\("parceiro_email"\)/);
  assert.match(action, /fieldErrors\.comprador_email/);
  assert.match(action, /fieldErrors\.parceiro_email/);
  assert.match(action, /parceiro_email[\s\S]*\.trim\(\)\.toLowerCase\(\)/);
  assert.match(action, /pEmail === email/);
  assert.match(action, /e-mail diferente para cada atleta/);
});

test("guest ticket recovery keeps account discovery private and aligns recovered cards", () => {
  const request = source("app/api/meus-ingressos/route.ts");
  const page = source("app/meus-ingressos/MeusIngressosDeslogado.tsx");

  assert.match(request, /cpf[\s\S]*comprador_email[\s\S]*email/);
  assert.match(request, /parceiro_cpf[\s\S]*cpf[\s\S]*parceiro_email[\s\S]*email/);
  assert.match(request, /O código só será enviado se o CPF e o e-mail coincidirem/);
  assert.match(request, /Por segurança, não confirmamos nesta tela se existe uma inscrição/);
  assert.match(page, /results\.length === 1/);
  assert.match(page, /mx-auto w-full max-w-xl/);
  assert.match(page, /className="mt-8"/);
});

test("payment startup failures release the reserved athlete inventory", () => {
  const guestAction = source("app/campeonatos/[id]/comprar/actions.ts");
  const authenticatedAction = source("app/campeonatos/[id]/inscrever/actions.ts");

  assert.match(guestAction, /release_athlete_ticket_inventory/);
  assert.match(authenticatedAction, /release_registration_inventory/);
  assert.match(guestAction, /customer_or_payment_start_failed/);
  assert.match(authenticatedAction, /customer_or_payment_start_failed/);
});

test("pending Pix tickets display the persisted charged amount including fees", () => {
  const athletePage = source("app/campeonatos/[id]/comprar/ingresso/[ticketId]/page.tsx");
  const athleteStatus = source("components/campeonatos/IngressoAtletaPagamento.tsx");
  const spectatorPage = source("app/campeonatos/[id]/plateia/ingresso/[ticketId]/page.tsx");
  const spectatorStatus = source("components/plateia/IngressoPlateiaStatus.tsx");

  assert.match(athletePage, /paymentOperation\?\.amount/);
  assert.match(spectatorPage, /paymentOperation\?\.amount/);
  assert.match(athleteStatus, /formatBRL\(pixAmount\)/);
  assert.match(spectatorStatus, /formatBRL\(pixAmount\)/);
});

test("existing provider customer is synchronized before a new charge", () => {
  const asaas = source("lib/asaas.ts");
  assert.match(asaas, /method: "PUT"/);
  assert.match(asaas, /`\/customers\/\$\{existing\.id\}`/);
  assert.match(asaas, /updates\.name = name/);
  assert.match(asaas, /updates\.email = email/);
});

test("payment polling stops on every terminal ticket status", () => {
  const athlete = source("components/campeonatos/IngressoAtletaPagamento.tsx");
  assert.match(athlete, /\["estornado", "expirado"\]\.includes\(statusPagamento\)/);
  assert.match(athlete, /credentials\.every\(\(credential\) => credential\.checkedIn\)/);
  assert.match(athlete, /router\.refresh\(\)/);

  const spectator = source("components/plateia/IngressoPlateiaStatus.tsx");
  assert.match(spectator, /if \(statusPagamento !== "pendente"\) return/);
  assert.match(spectator, /if \(nextStatus !== "pendente"\)/);
  assert.match(spectator, /router\.refresh\(\)/);
});

test("a guest pair receives two linked individual entry credentials", () => {
  const migration = source("supabase/production-athlete-ticket-credentials.sql");
  const athletePage = source("app/campeonatos/[id]/comprar/ingresso/[ticketId]/page.tsx");
  const athleteStatus = source("components/campeonatos/IngressoAtletaPagamento.tsx");
  const individualPage = source("app/campeonatos/[id]/ingresso-atleta/[credentialId]/page.tsx");
  const recovery = source("app/api/meus-ingressos/verificar/route.ts");
  const delivery = source("lib/athlete-ticket-delivery.ts");
  const email = source("lib/email/send.ts");
  const ownership = source("app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions.ts");
  const statusApi = source("app/api/athlete-credential-status/route.ts");
  const credentialClient = source("components/campeonatos/IngressoAtletaCredencial.tsx");
  const recoveryClaim = source("lib/ticket-recovery.ts");
  const proxy = source("proxy.ts");

  assert.match(migration, /UNIQUE \(athlete_ticket_id, athlete_slot\)/i);
  assert.match(migration, /access_token[\s\S]*gen_random_uuid/i);
  assert.match(migration, /access_email_claimed_at/i);
  assert.match(migration, /access_email_sent_at timestamptz DEFAULT now\(\)/i);
  assert.match(migration, /ALTER COLUMN access_email_sent_at DROP DEFAULT/i);
  assert.match(migration, /VALUES \(1::smallint\), \(2::smallint\)/i);
  assert.match(migration, /sync_athlete_ticket_credentials/i);
  assert.match(migration, /sync_athlete_ticket_checkin_summary/i);
  assert.match(migration, /bool_or\(c\.checked_in\)/);
  assert.match(migration, /checked_in = v_any_checked/);
  assert.match(migration, /athlete_slot = 1 AND t\.user_id = auth\.uid\(\)/);
  assert.match(migration, /athlete_slot = 2 AND t\.parceiro_user_id = auth\.uid\(\)/);
  assert.match(migration, /USING \(user_id = auth\.uid\(\)\)/);
  assert.match(migration, /can_select_athlete_ticket_credential/);
  assert.match(migration, /ATHLETE_TICKET_CREDENTIAL_DOMAIN_MISMATCH/);
  assert.match(athletePage, /\.from\("athlete_ticket_credentials"\)/);
  assert.match(athletePage, /\.eq\("athlete_slot", 1\)/);
  assert.match(athleteStatus, /somente a credencial do comprador/);
  assert.match(athleteStatus, /credentials\.map/);
  assert.match(athleteStatus, /mx-auto grid w-full max-w-md/);
  assert.match(individualPage, /\.eq\("id", credentialId\)/);
  assert.match(individualPage, /\.eq\("access_token", accessToken\)/);
  assert.match(individualPage, /IngressoAtletaCredencial/);
  assert.match(recovery, /credential_access_token: credential\?\.access_token/);
  assert.match(recovery, /access_token: null/);
  assert.match(delivery, /enviarCredencialAtleta/);
  assert.match(delivery, /access_email_sent_at/);
  assert.match(delivery, /access_email_claimed_at/);
  assert.match(delivery, /athlete_tickets!inner\(status_pagamento\)/);
  assert.match(delivery, /idempotencyKey/);
  assert.match(email, /if \(result\.error\)/);
  assert.match(ownership, /access_token: nextAccessToken, user_id: null/);
  assert.match(ownership, /parceiro_user_id: null/);
  assert.match(ownership, /\.eq\("checked_in", false\)/);
  assert.match(ownership, /card_payment_persistence_failed/);
  assert.match(statusApi, /export async function POST/);
  assert.doesNotMatch(credentialClient, /athlete-credential-status\?\$\{/);
  assert.match(credentialClient, /setRevoked\(true\)/);
  assert.match(recoveryClaim, /\.is\("usado_em", null\)/);
  assert.match(recoveryClaim, /return Boolean\(claimed\)/);
  assert.match(proxy, /Cache-Control", "private, no-store/);
  assert.match(proxy, /Referrer-Policy", "no-referrer/);
});

test("refund details preserve request, confirmation and cancellation history", () => {
  const panel = source("components/ingressos/RefundStatusPanel.tsx");
  const menu = source("components/ingressos/IngressoOpcoesMenu.tsx");
  const athleteActions = source("app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions.ts");
  const spectatorActions = source("app/campeonatos/[id]/plateia/ingresso/[ticketId]/actions.ts");
  const athleteCancellation = athleteActions.slice(
    athleteActions.indexOf("export async function cancelarIngressoAtleta"),
  );
  const spectatorCancellation = spectatorActions.slice(
    spectatorActions.indexOf("export async function cancelarIngressoPlateia"),
  );

  assert.match(panel, /Estorno solicitado/);
  assert.match(panel, /Estorno confirmado/);
  assert.match(panel, /Ingresso cancelado/);
  assert.match(panel, /completedAt/);
  assert.match(panel, /cancelledAt/);
  assert.match(menu, /Seu reembolso foi solicitado com sucesso/);
  assert.match(menu, /closeOnBackdrop=\{false\}/);
  assert.match(menu, />\s*OK\s*</);
  assert.match(menu, /onClick=\{showUpdatedTicket\}/);
  assert.doesNotMatch(menu, /Indo para Minhas compras/);
  assert.doesNotMatch(athleteCancellation, /revalidatePath\(/);
  assert.doesNotMatch(spectatorCancellation, /revalidatePath\(/);
});
