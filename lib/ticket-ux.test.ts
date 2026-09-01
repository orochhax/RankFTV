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

  assert.match(migration, /UNIQUE \(athlete_ticket_id, athlete_slot\)/i);
  assert.match(migration, /VALUES \(1::smallint\), \(2::smallint\)/i);
  assert.match(migration, /sync_athlete_ticket_credentials/i);
  assert.match(migration, /sync_athlete_ticket_checkin_summary/i);
  assert.match(migration, /bool_or\(c\.checked_in\)/);
  assert.match(migration, /checked_in = v_any_checked/);
  assert.match(athletePage, /\.from\("athlete_ticket_credentials"\)/);
  assert.match(athleteStatus, /Cada atleta deve apresentar sua própria credencial/);
  assert.match(athleteStatus, /credentials\.map/);
  assert.match(athleteStatus, /mx-auto grid w-full max-w-3xl/);
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
