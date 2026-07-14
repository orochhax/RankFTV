import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferirPix } from "@/lib/asaas";

// Webhook do Asaas para confirmar pagamento de mensalidade de aluno.
// externalReference = "mens:<student_charge_id>"
export async function POST(req: NextRequest) {
  // Autentica o webhook: só o Asaas conhece esse token (mesmo do webhook
  // principal). Sem isso, qualquer um poderia marcar mensalidade como paga.
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.event || !body?.payment) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { event, payment } = body as {
    event: string;
    payment: { id?: string; externalReference?: string; status?: string };
  };

  if (!["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event)) {
    return NextResponse.json({ ok: true });
  }

  const ref = payment.externalReference ?? "";
  if (!ref.startsWith("mens:")) {
    return NextResponse.json({ ok: true });
  }

  const chargeId = ref.slice(5);
  const supabase = createAdminClient();

  const { data: charge } = await supabase
    .from("student_charges")
    .select("id, arena_id, valor, asaas_payment_id")
    .eq("id", chargeId)
    .maybeSingle();
  if (!payment.id || !charge || charge.asaas_payment_id !== payment.id) {
    return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });
  }

  await supabase
    .from("student_charges")
    .update({ status_pagamento: "pago", pago_em: new Date().toISOString() })
    .eq("id", chargeId);

  const { data: claimed } = await supabase
    .from("student_charges")
    .update({ repasse_status: "processando" })
    .eq("id", chargeId)
    .eq("repasse_status", "pendente")
    .select("id");

  if (claimed && claimed.length > 0 && Number(charge.valor) > 0) {
    const { data: account } = await supabase
      .from("arena_accounts")
      .select("chave_pix")
      .eq("arena_id", charge.arena_id)
      .maybeSingle();
    const chavePix = account?.chave_pix as string | undefined;

    if (!chavePix) {
      await supabase
        .from("student_charges")
        .update({ repasse_status: "pendente", repasse_erro: "Arena sem chave Pix" })
        .eq("id", chargeId);
    } else {
      try {
        const transferencia = await transferirPix({
          valor: Number(charge.valor),
          chavePix,
          descricao: `Mensalidade arena ${chargeId}`,
        });
        await supabase
          .from("student_charges")
          .update({
            repasse_status: "concluido",
            repasse_transfer_id: transferencia.id,
            repasse_erro: null,
          })
          .eq("id", chargeId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("student_charges")
          .update({ repasse_status: "pendente", repasse_erro: msg.slice(0, 300) })
          .eq("id", chargeId);
      }
    }
  }
  if (claimed && claimed.length > 0 && Number(charge.valor) <= 0) {
    await supabase
      .from("student_charges")
      .update({ repasse_status: "concluido" })
      .eq("id", chargeId);
  }

  return NextResponse.json({ ok: true });
}
