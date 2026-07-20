import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  executarRepasse,
  executarRepasseAtletaTicket,
  executarRepasseEspectador,
} from "@/lib/repasse";
import { transferirPix } from "@/lib/asaas";
import { pixKeyEmCooldown } from "@/lib/pix";

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

  // ── Expira pedidos Pix pendentes abandonados (ninguém pagou em 24h) ──────
  // Devolve vaga de lote e cupom (e quantidade do tipo de ingresso, quando
  // dá pra saber qual era) — sem isso um carrinho abandonado prendia
  // inventário/cupom pra sempre. Pedidos com >24h e ainda 'pendente' viram
  // 'expirado' (não apaga — mantém rastro).
  const PIX_PENDENTE_EXPIRA_HORAS = 24;
  const corte = new Date(Date.now() - PIX_PENDENTE_EXPIRA_HORAS * 60 * 60 * 1000).toISOString();
  let expirados = 0;

  {
    const { data: regsExpiradas } = await supabase
      .from("registrations")
      .select("id, lote_id, cupom_id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte);
    for (const r of regsExpiradas ?? []) {
      const { data: claimed } = await supabase
        .from("registrations")
        .update({ status_pagamento: "expirado" })
        .eq("id", r.id)
        .eq("status_pagamento", "pendente")
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      if (r.lote_id)  await supabase.rpc("release_pricing_tier", { p_tier_id: r.lote_id, p_qty: 1 });
      if (r.cupom_id) await supabase.rpc("release_coupon_use", { p_coupon_id: r.cupom_id });
      expirados++;
    }
  }

  {
    const { data: athExpirados } = await supabase
      .from("athlete_tickets")
      .select("id, lote_id, cupom_id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte);
    for (const t of athExpirados ?? []) {
      const { data: claimed } = await supabase
        .from("athlete_tickets")
        .update({ status_pagamento: "expirado" })
        .eq("id", t.id)
        .eq("status_pagamento", "pendente")
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      if (t.lote_id)  await supabase.rpc("release_pricing_tier", { p_tier_id: t.lote_id, p_qty: 1 });
      if (t.cupom_id) await supabase.rpc("release_coupon_use", { p_coupon_id: t.cupom_id });
      expirados++;
    }
  }

  {
    // spectator_tickets pode ter vários tipos por pedido (itens jsonb) — o
    // id do lote por linha não fica salvo, então só dá pra liberar a
    // quantidade do tipo quando o pedido tinha 1 item só (ticket_type_id
    // preenchido). Pedidos com múltiplos tipos expiram e liberam o cupom,
    // mas não a quantidade — limitação conhecida, registrada em
    // AUDITORIA-PRODUCAO.md pra uma migration futura guardar o id por linha.
    const { data: specExpirados } = await supabase
      .from("spectator_tickets")
      .select("id, ticket_type_id, quantidade, cupom_id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte);
    for (const t of specExpirados ?? []) {
      const { data: claimed } = await supabase
        .from("spectator_tickets")
        .update({ status_pagamento: "expirado" })
        .eq("id", t.id)
        .eq("status_pagamento", "pendente")
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      if (t.cupom_id) await supabase.rpc("release_coupon_use", { p_coupon_id: t.cupom_id });
      if (t.ticket_type_id) {
        await supabase.rpc("release_ticket_type_quantity", { p_type_id: t.ticket_type_id, p_qty: t.quantidade ?? 1 });
      }
      expirados++;
    }
  }

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
  let vencidosTotal = due?.length ?? 0;

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
      .select("chave_pix, chave_pix_atualizada_em")
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
        chavePixAtualizadaEm: org?.chave_pix_atualizada_em ?? null,
        repasseBase,
      },
      "aguardando_liquidacao",
    );
    if (res.ok) repassados++; else falhas++;
  }

  // Ingressos avulsos de atleta e plateia tambem aguardam D+3/D+32.
  const ticketSources = [
    {
      table: "athlete_tickets" as const,
      executar: executarRepasseAtletaTicket,
    },
    {
      table: "spectator_tickets" as const,
      executar: executarRepasseEspectador,
    },
  ];

  for (const source of ticketSources) {
    const { data: tickets } = await supabase
      .from(source.table)
      .select("id, championship_id, valor")
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200);
    vencidosTotal += tickets?.length ?? 0;

    for (const ticket of tickets ?? []) {
      const { data: claimed } = await supabase
        .from(source.table)
        .update({ repasse_status: "processando" })
        .eq("id", ticket.id)
        .eq("repasse_status", "aguardando_liquidacao")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const revert = async (erro: string) =>
        supabase
          .from(source.table)
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: erro.slice(0, 300) })
          .eq("id", ticket.id);

      const { data: champ } = await supabase
        .from("championships")
        .select("nome, organizador_id")
        .eq("id", ticket.championship_id)
        .maybeSingle();
      if (!champ) { await revert("Campeonato nao encontrado"); falhas++; continue; }

      const { data: org } = await supabase
        .from("organizer_accounts")
        .select("chave_pix, chave_pix_atualizada_em")
        .eq("user_id", champ.organizador_id)
        .maybeSingle();
      const chavePix = org?.chave_pix as string | undefined;
      if (!chavePix) { await revert("Organizador sem chave Pix"); falhas++; continue; }

      const res = await source.executar(
        supabase,
        {
          ticketId: ticket.id,
          champNome: champ.nome,
          chavePix,
          chavePixAtualizadaEm: org?.chave_pix_atualizada_em ?? null,
          valor: Number(ticket.valor ?? 0),
        },
        "aguardando_liquidacao",
      );
      if (res.ok) repassados++; else falhas++;
    }
  }

  // Receitas de arena: mensalidades, aluguel de quadra e diarias.
  const arenaSources = [
    { table: "student_charges" as const, descricao: "Mensalidade de arena" },
    { table: "arena_rentals" as const, descricao: "Aluguel de quadra" },
    { table: "arena_daily_passes" as const, descricao: "Diaria de arena" },
  ];

  for (const source of arenaSources) {
    const { data: itens } = await supabase
      .from(source.table)
      .select("id, arena_id, valor")
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200);
    vencidosTotal += itens?.length ?? 0;

    for (const item of itens ?? []) {
      const { data: claimed } = await supabase
        .from(source.table)
        .update({ repasse_status: "processando" })
        .eq("id", item.id)
        .eq("repasse_status", "aguardando_liquidacao")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const { data: account } = await supabase
        .from("arena_accounts")
        .select("chave_pix, chave_pix_atualizada_em")
        .eq("arena_id", item.arena_id)
        .maybeSingle();
      const chavePix = account?.chave_pix as string | undefined;
      if (!chavePix) {
        await supabase
          .from(source.table)
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: "Arena sem chave Pix" })
          .eq("id", item.id);
        falhas++;
        continue;
      }
      if (pixKeyEmCooldown(account?.chave_pix_atualizada_em ?? null)) {
        await supabase
          .from(source.table)
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: "Chave Pix da arena alterada recentemente — repasse retido em segurança." })
          .eq("id", item.id);
        continue;
      }

      try {
        const valor = Number(item.valor ?? 0);
        if (valor <= 0) {
          await supabase.from(source.table).update({ repasse_status: "concluido" }).eq("id", item.id);
          pulados++;
          continue;
        }
        const transferencia = await transferirPix({
          valor,
          chavePix,
          descricao: `${source.descricao} RankFTV`,
        });
        await supabase
          .from(source.table)
          .update({
            repasse_status: "concluido",
            repasse_transfer_id: transferencia.id,
            repasse_erro: null,
          })
          .eq("id", item.id);
        repassados++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from(source.table)
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: msg.slice(0, 300) })
          .eq("id", item.id);
        falhas++;
      }
    }
  }

  // Aulas avulsas: mesma lógica acima, mas a coluna de status do pagamento
  // se chama pagamento_status (não status_pagamento) — por isso um bloco à
  // parte em vez de entrar em arenaSources.
  {
    const { data: itens } = await supabase
      .from("arena_attendance")
      .select("id, arena_id, valor_avulso")
      .eq("pagamento_status", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200);
    vencidosTotal += itens?.length ?? 0;

    for (const item of itens ?? []) {
      const { data: claimed } = await supabase
        .from("arena_attendance")
        .update({ repasse_status: "processando" })
        .eq("id", item.id)
        .eq("repasse_status", "aguardando_liquidacao")
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const { data: account } = await supabase
        .from("arena_accounts")
        .select("chave_pix, chave_pix_atualizada_em")
        .eq("arena_id", item.arena_id)
        .maybeSingle();
      const chavePix = account?.chave_pix as string | undefined;
      if (!chavePix) {
        await supabase
          .from("arena_attendance")
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: "Arena sem chave Pix" })
          .eq("id", item.id);
        falhas++;
        continue;
      }
      if (pixKeyEmCooldown(account?.chave_pix_atualizada_em ?? null)) {
        await supabase
          .from("arena_attendance")
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: "Chave Pix da arena alterada recentemente — repasse retido em segurança." })
          .eq("id", item.id);
        continue;
      }

      try {
        const valor = Number(item.valor_avulso ?? 0);
        if (valor <= 0) {
          await supabase.from("arena_attendance").update({ repasse_status: "concluido" }).eq("id", item.id);
          pulados++;
          continue;
        }
        const transferencia = await transferirPix({ valor, chavePix, descricao: "Aula avulsa RankFTV" });
        await supabase
          .from("arena_attendance")
          .update({ repasse_status: "concluido", repasse_transfer_id: transferencia.id, repasse_erro: null })
          .eq("id", item.id);
        repassados++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("arena_attendance")
          .update({ repasse_status: "aguardando_liquidacao", repasse_erro: msg.slice(0, 300) })
          .eq("id", item.id);
        falhas++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    vencidos: vencidosTotal,
    repassados,
    falhas,
    pulados,
    expirados,
  });
}
