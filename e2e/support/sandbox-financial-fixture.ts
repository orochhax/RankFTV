import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SANDBOX_URL = "https://obfqzifcvsqnygwmtpnx.supabase.co";

export type AsaasWebhookFixture = {
  admin: SupabaseClient;
  ticketId: string;
  paymentId: string;
  externalReference: string;
  createdByTest: true;
};

function sandboxAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url !== SANDBOX_URL || !key?.startsWith("sb_secret_")) {
    throw new Error("A fixture financeira só pode usar o projeto Supabase Sandbox esperado.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createAsaasWebhookFixture(): Promise<AsaasWebhookFixture> {
  const admin = sandboxAdmin();
  const { data: championship, error: championshipError } = await admin
    .from("championships")
    .select("id")
    .ilike("nome", "%Sandbox%")
    .limit(1)
    .maybeSingle();
  if (championshipError || !championship) {
    throw new Error(`Campeonato Sandbox não encontrado: ${championshipError?.message ?? "sem resultado"}`);
  }
  const { data: category, error: categoryError } = await admin
    .from("championship_categories")
    .select("id, nome")
    .eq("championship_id", championship.id)
    .limit(1)
    .maybeSingle();
  if (categoryError || !category) {
    throw new Error(`Categoria Sandbox não encontrada: ${categoryError?.message ?? "sem resultado"}`);
  }

  const ticketId = randomUUID();
  const paymentId = `pay_e2e_${randomUUID().replaceAll("-", "")}`;
  const suffix = ticketId.replaceAll("-", "").slice(0, 10);
  const { error: insertError } = await admin.from("athlete_tickets").insert({
    id: ticketId,
    championship_id: championship.id,
    category_id: category.id,
    access_token: randomUUID(),
    asaas_payment_id: paymentId,
    categoria_nome: category.nome,
    comprador_nome: "Atleta E2E Um",
    comprador_cpf: `8${suffix}`.slice(0, 11),
    comprador_email: `rankftv.e2e.${suffix}.um@example.com`,
    parceiro_nome: "Atleta E2E Dois",
    parceiro_cpf: `9${suffix}`.slice(0, 11),
    parceiro_email: `rankftv.e2e.${suffix}.dois@example.com`,
    valor: 150,
    status_pagamento: "pendente",
  });
  if (insertError) throw new Error(`Falha ao criar ingresso E2E: ${insertError.message}`);

  return {
    admin,
    ticketId,
    paymentId,
    externalReference: `athl:${ticketId}`,
    createdByTest: true,
  };
}

export async function cleanupAsaasWebhookFixture(fixture: AsaasWebhookFixture): Promise<void> {
  const { admin, paymentId, ticketId } = fixture;
  const cleanupSteps = [
    admin.from("organizer_financial_notification_deliveries").delete().eq("payment_id", paymentId),
    admin.from("asaas_webhook_events").delete().eq("payment_id", paymentId),
    admin.from("athlete_ticket_credential_events").delete().eq("athlete_ticket_id", ticketId),
    admin.from("athlete_tickets").delete().eq("id", ticketId),
  ];
  const results = await Promise.all(cleanupSteps);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(`Falha ao limpar fixture financeira E2E: ${failure.message}`);
}
