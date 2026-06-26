import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook do Asaas para confirmar pagamento de mensalidade de aluno.
// externalReference = "mens:<student_charge_id>"
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.event || !body?.payment) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { event, payment } = body as {
    event: string;
    payment: { externalReference?: string; status?: string };
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

  await supabase
    .from("student_charges")
    .update({ status_pagamento: "pago", pago_em: new Date().toISOString() })
    .eq("id", chargeId);

  return NextResponse.json({ ok: true });
}
