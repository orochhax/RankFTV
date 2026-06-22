import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarRepasse } from "@/lib/repasse";

export const dynamic = "force-dynamic";

// Job de liquidação diferida do repasse de cartão (crédito D+32 / débito D+3).
// O webhook só transfere Pix na hora; cartão fica 'aguardando_liquidacao' até a
// data prevista. Este cron roda diariamente (ver vercel.json), pega o que já
// venceu e transfere ao organizador via Pix — abatendo a dívida Elite igual ao
// fluxo imediato (mesmo helper executarRepasse).

export async function GET(req: NextRequest) {
  // Auth: a Vercel envia Authorization: Bearer ${CRON_SECRET} nas chamadas de cron.
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const agora    = new Date().toISOString();

  // Inscrições pagas cujo repasse já venceu a liquidação.
  const { data: due } = await supabase
    .from("registrations")
    .select("id, valor, billing_type, championship_id")
    .eq("status_pagamento", "pago")
    .eq("repasse_status", "aguardando_liquidacao")
    .lte("repasse_data_prevista", agora)
    .limit(200);

  let repassados = 0;
  let falhas     = 0;
  let pulados    = 0;

  for (const reg of due ?? []) {
    // Reivindica atomicamente: só processa se ainda estiver aguardando.
    const { data: claimed } = await supabase
      .from("registrations")
      .update({ repasse_status: "processando" })
      .eq("id", reg.id)
      .eq("repasse_status", "aguardando_liquidacao")
      .select("id");
    if (!claimed || claimed.length === 0) continue; // outro processo pegou

    const revert = async (erro?: string) =>
      supabase
        .from("registrations")
        .update({ repasse_status: "aguardando_liquidacao", ...(erro ? { repasse_erro: erro } : {}) })
        .eq("id", reg.id);

    const { data: champ } = await supabase
      .from("championships")
      .select("nome, organizador_id, is_elite, premium_fee_pendente")
      .eq("id", reg.championship_id)
      .single();
    if (!champ) { await revert("Campeonato não encontrado"); falhas++; continue; }

    const { data: org } = await supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .single();
    const chavePix = org?.chave_pix as string | undefined;
    if (!chavePix) { await revert("Organizador sem chave Pix"); falhas++; continue; }

    // Organizador recebe o valor cheio (a taxa foi paga pelo comprador).
    const repasseBase = Number(reg.valor ?? 0);
    if (repasseBase <= 0) {
      await supabase.from("registrations").update({ repasse_status: "repassado" }).eq("id", reg.id);
      pulados++;
      continue;
    }

    const res = await executarRepasse(
      supabase,
      {
        registrationId: reg.id,
        championshipId: reg.championship_id,
        champNome:      champ.nome,
        isElite:        !!champ.is_elite,
        feePendente:    Number(champ.premium_fee_pendente ?? 0),
        chavePix,
        repasseBase,
      },
      "aguardando_liquidacao",
    );
    if (res.ok) repassados++; else falhas++;
  }

  return NextResponse.json({
    ok: true,
    vencidos: due?.length ?? 0,
    repassados,
    falhas,
    pulados,
  });
}
