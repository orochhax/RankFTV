import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferirPix } from "@/lib/asaas";
import { getPlatformConfig, calcularRepasse } from "@/lib/platform-config";

const EVENTOS_CONFIRMADO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EVENTOS_ESTORNADO  = new Set(["PAYMENT_REFUNDED", "PAYMENT_DELETED"]);

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
  try {
  // 1. Autentica o webhook
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

  // 2. Atualiza status do pagamento
  const { error: updateError } = await supabase
    .from("registrations")
    .update({
      status_pagamento: novoStatus,
      ...(novoStatus === "pago" ? { billing_type: payment.billingType } : {}),
    })
    .eq("id", registrationId);

  if (updateError) {
    console.error("[webhook] Erro ao atualizar inscrição:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. Pagamento confirmado → ativa dupla + credenciais + repasse
  if (novoStatus === "pago") {
    // Busca inscrição + time + campeonato
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, valor, team_id, championship_id, category_id")
      .eq("id", registrationId)
      .single();

    if (!reg) return NextResponse.json({ ok: true });

    // Busca dados do campeonato (organizador + taxa da plataforma)
    const { data: champ } = await supabase
      .from("championships")
      .select("nome, organizador_id, taxa_plataforma")
      .eq("id", reg.championship_id)
      .single();

    // Ativa a dupla e busca atletas
    const { data: team } = await supabase
      .from("teams")
      .select("atleta1_id, atleta2_id")
      .eq("id", reg.team_id)
      .single();

    if (team) {
      await supabase
        .from("teams")
        .update({ status: "confirmado" })
        .eq("id", reg.team_id);

      // Gera credencial para atleta1 (se ainda não tiver)
      const atletasParaCredencial = [team.atleta1_id, team.atleta2_id].filter(Boolean) as string[];
      for (const atletaId of atletasParaCredencial) {
        const { data: credExistente } = await supabase
          .from("credentials")
          .select("id")
          .eq("user_id", atletaId)
          .eq("championship_id", reg.championship_id)
          .maybeSingle();

        if (!credExistente) {
          await supabase.from("credentials").insert({
            user_id:         atletaId,
            championship_id: reg.championship_id,
            role:            "atleta",
            qr_token:        crypto.randomUUID(),
            checked_in:      false,
          });
        }
      }
    }

    // Repasse ao organizador via Pix
    if (champ) {
      const [orgAccountRes, platformConfig] = await Promise.all([
        supabase.from("organizer_accounts").select("chave_pix").eq("user_id", champ.organizador_id).single(),
        getPlatformConfig(),
      ]);

      const chavePix   = orgAccountRes.data?.chave_pix as string | undefined;
      const valorBruto = Number(reg.valor ?? 0);

      const metodo =
        payment.billingType === "PIX"        ? "pix" :
        payment.billingType === "DEBIT_CARD" ? "debito" : "credito";

      const valorRepasse = calcularRepasse(valorBruto, metodo, platformConfig);

      if (chavePix && valorRepasse > 0) {
        const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;

        if (dias === 0) {
          try {
            const transferencia = await transferirPix({
              valor:     valorRepasse,
              chavePix,
              descricao: `Repasse RankFTV — ${champ.nome}`,
            });

            await supabase
              .from("registrations")
              .update({
                repasse_status:      "repassado",
                repasse_transfer_id: transferencia.id,
              })
              .eq("id", registrationId);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[webhook] Erro ao transferir Pix:", msg);
            await supabase
              .from("registrations")
              .update({ repasse_status: `erro: ${msg.slice(0, 200)}` })
              .eq("id", registrationId);
          }
        } else {
          const dataRepasse = new Date();
          dataRepasse.setDate(dataRepasse.getDate() + dias);

          await supabase
            .from("registrations")
            .update({
              repasse_status:        "aguardando_liquidacao",
              repasse_data_prevista: dataRepasse.toISOString(),
            })
            .eq("id", registrationId);
        }
      }
    }
  }

  // 4. Estorno
  if (novoStatus === "estornado") {
    await supabase
      .from("registrations")
      .update({ repasse_status: "estornado" })
      .eq("id", registrationId);
  }

  return NextResponse.json({ ok: true, status: novoStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] ERRO FATAL:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
