import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferirPix } from "@/lib/asaas";

const EVENTOS_CONFIRMADO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EVENTOS_ESTORNADO  = new Set(["PAYMENT_REFUNDED", "PAYMENT_DELETED"]);

// Dias até a plataforma receber e poder repassar ao organizador.
const DIAS_LIQUIDACAO: Record<string, number> = {
  PIX:         0,
  DEBIT_CARD:  3,
  CREDIT_CARD: 32,
};

type AsaasPayment = {
  id: string;
  externalReference?: string;
  status: string;
  value: number;
  billingType: string;
};

type AsaasWebhookBody = {
  event: string;
  payment: AsaasPayment;
};

export async function POST(req: NextRequest) {
  // ── 1. Autentica ──────────────────────────────────────────────
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;

  if (!EVENTOS_CONFIRMADO.has(event) && !EVENTOS_ESTORNADO.has(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const registrationId = payment.externalReference;
  if (!registrationId) {
    return NextResponse.json({ error: "externalReference ausente" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const novoStatus = EVENTOS_CONFIRMADO.has(event) ? "pago" : "estornado";

  // ── 2. Atualiza status do pagamento ───────────────────────────
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ status_pagamento: novoStatus })
    .eq("id", registrationId);

  if (updateError) {
    console.error("[webhook] Erro ao atualizar inscrição:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── 3. Pagamento confirmado → ativa dupla + repasse ───────────
  if (novoStatus === "pago") {
    // Busca a inscrição com campeonato → organizador → chave Pix
    const { data: reg } = await supabase
      .from("registrations")
      .select(`
        id,
        valor,
        team_id,
        championships (
          nome,
          organizador_id,
          organizer_accounts!championships_organizador_id_fkey (
            chave_pix
          )
        )
      `)
      .eq("id", registrationId)
      .single();

    // Ativa a dupla
    if (reg?.team_id) {
      await supabase
        .from("teams")
        .update({ status: "confirmado" })
        .eq("id", reg.team_id);
    }

    // Repasse ao organizador
    const champ = Array.isArray(reg?.championships)
      ? reg?.championships[0]
      : reg?.championships;

    const orgAccounts = champ?.organizer_accounts;
    const orgAccount  = Array.isArray(orgAccounts) ? orgAccounts[0] : orgAccounts;
    const chavePix    = orgAccount?.chave_pix as string | undefined;
    const valorBase   = Number(reg?.valor ?? 0);
    const champNome   = champ?.nome ?? "campeonato";

    if (chavePix && valorBase > 0) {
      const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;

      if (dias === 0) {
        // Pix: transfere agora
        try {
          const transferencia = await transferirPix({
            valor:     valorBase,
            chavePix,
            descricao: `Repasse RankFTV — ${champNome}`,
          });

          await supabase
            .from("registrations")
            .update({
              repasse_status:      "repassado",
              repasse_transfer_id: transferencia.id,
            })
            .eq("id", registrationId);
        } catch (err) {
          console.error("[webhook] Erro ao transferir Pix:", err);
        }
      } else {
        // Débito (D+3) ou crédito (D+32): agenda o repasse
        const dataRepasse = new Date();
        dataRepasse.setDate(dataRepasse.getDate() + dias);

        await supabase
          .from("registrations")
          .update({
            repasse_status:        "aguardando_d32",
            repasse_data_prevista: dataRepasse.toISOString(),
          })
          .eq("id", registrationId);
      }
    }
  }

  // ── 4. Estorno → marca aguardando_d32 como pendente de novo ──
  if (novoStatus === "estornado") {
    await supabase
      .from("registrations")
      .update({ repasse_status: "pendente" })
      .eq("id", registrationId);
  }

  return NextResponse.json({ ok: true, status: novoStatus });
}
