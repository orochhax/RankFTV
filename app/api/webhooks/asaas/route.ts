import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Eventos do Asaas que nos interessam.
const EVENTOS_CONFIRMADO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EVENTOS_ESTORNADO  = new Set(["PAYMENT_REFUNDED", "PAYMENT_DELETED"]);

type AsaasPayment = {
  id: string;
  externalReference?: string; // registration.id (definido por nós ao criar a cobrança)
  status: string;
  value: number;
  billingType: string;
};

type AsaasWebhookBody = {
  event: string;
  payment: AsaasPayment;
};

export async function POST(req: NextRequest) {
  // ── 1. Verifica autenticidade ─────────────────────────────────
  // O Asaas envia o token configurado no dashboard em cada requisição.
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Lê o payload ──────────────────────────────────────────
  let body: AsaasWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;

  // Ignora eventos que não são de pagamento.
  if (!EVENTOS_CONFIRMADO.has(event) && !EVENTOS_ESTORNADO.has(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ── 3. Busca a inscrição pelo externalReference ───────────────
  // externalReference = registration.id, definido em criarCobranca().
  const registrationId = payment.externalReference;
  if (!registrationId) {
    return NextResponse.json({ error: "externalReference ausente" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const novoStatus = EVENTOS_CONFIRMADO.has(event) ? "pago" : "estornado";

  const { error } = await supabase
    .from("registrations")
    .update({ status_pagamento: novoStatus })
    .eq("id", registrationId);

  if (error) {
    console.error("[webhook/asaas] Erro ao atualizar inscrição:", error);
    // Retorna 500 → o Asaas vai retentar automaticamente.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── 4. Pagamento confirmado → ativa a dupla ───────────────────
  if (novoStatus === "pago") {
    // Busca o team_id da inscrição e muda o status da dupla pra "confirmado".
    const { data: reg } = await supabase
      .from("registrations")
      .select("team_id")
      .eq("id", registrationId)
      .single();

    if (reg?.team_id) {
      await supabase
        .from("teams")
        .update({ status: "confirmado" })
        .eq("id", reg.team_id);
    }
  }

  return NextResponse.json({ ok: true, status: novoStatus });
}
