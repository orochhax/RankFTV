import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  executarRepasse,
  executarRepasseAtletaTicket,
  executarRepasseEspectador,
} from "@/lib/repasse";
import { pixKeyEmCooldown } from "@/lib/pix";
import { executeArenaPayout } from "@/lib/arena-payout";
import { reportOperationalEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

// Job de liquidação diferida do repasse de cartão (crédito D+32 / débito D+3).
// O webhook tenta transferir Pix na hora; falhas terminais voltam a 'pendente'
// e entram novamente neste cron com uma referencia de retry. Cartao fica em
// 'aguardando_liquidacao' ate D+3/D+32. O helper de repasse e o mesmo nos dois
// caminhos, inclusive para o abatimento Elite.

async function runSettlement(req: NextRequest) {
  // Auth: a Vercel envia Authorization: Bearer ${CRON_SECRET} nas chamadas de cron.
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const requestId = req.headers.get("x-request-id");
  const agora    = new Date().toISOString();

  // ── Expira pedidos Pix pendentes abandonados (ninguém pagou em 24h) ──────
  // Devolve vaga de lote e cupom (e quantidade do tipo de ingresso, quando
  // dá pra saber qual era) — sem isso um carrinho abandonado prendia
  // inventário/cupom pra sempre. Pedidos com >24h e ainda 'pendente' viram
  // 'expirado' (não apaga — mantém rastro).
  const PIX_PENDENTE_EXPIRA_HORAS = 24;
  const corte = new Date(Date.now() - PIX_PENDENTE_EXPIRA_HORAS * 60 * 60 * 1000).toISOString();
  let expirados = 0;
  let falhas = 0;

  {
    const { data: regsExpiradas, error: expirationError } = await supabase
      .from("registrations")
      .select("id, lote_id, cupom_id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte)
      .limit(200);
    if (expirationError) throw new Error(`registration_expiration_query_${expirationError.code ?? "failed"}`);
    for (const r of regsExpiradas ?? []) {
      const { data: released, error } = await supabase.rpc("release_registration_inventory", {
        p_registration_id: r.id,
        p_target_status: "expirado",
      });
      if (error) falhas++;
      else if (released) expirados++;
    }
  }

  {
    const { data: athExpirados, error: expirationError } = await supabase
      .from("athlete_tickets")
      .select("id, lote_id, cupom_id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte)
      .limit(200);
    if (expirationError) throw new Error(`athlete_expiration_query_${expirationError.code ?? "failed"}`);
    for (const t of athExpirados ?? []) {
      const { data: released, error } = await supabase.rpc("release_athlete_ticket_inventory", {
        p_ticket_id: t.id,
        p_target_status: "expirado",
      });
      if (error) falhas++;
      else if (released) expirados++;
    }
  }

  {
    // A RPC normalizada devolve todos os tipos, lotes e o cupom exatamente uma
    // vez. Pedido legado ambiguo permanece intacto e entra na contagem de falha.
    const { data: specExpirados, error: expirationError } = await supabase
      .from("spectator_tickets")
      .select("id")
      .eq("status_pagamento", "pendente")
      .eq("billing_type", "PIX")
      .lt("created_at", corte)
      .limit(200);
    if (expirationError) throw new Error(`spectator_expiration_query_${expirationError.code ?? "failed"}`);
    for (const t of specExpirados ?? []) {
      const { data: released, error } = await supabase.rpc("release_spectator_ticket_order", {
        p_ticket_id: t.id,
        p_target_status: "expirado",
      });
      if (error) falhas++;
      else if (released) expirados++;
    }
  }

  // Inscrições pagas cujo repasse já venceu a liquidação.
  const [scheduledRegistrations, immediatePixRegistrations] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, valor, billing_type, championship_id, repasse_status")
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200),
    supabase
      .from("registrations")
      .select("id, valor, billing_type, championship_id, repasse_status")
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "pendente")
      .eq("billing_type", "PIX")
      .limit(200),
  ]);
  if (scheduledRegistrations.error || immediatePixRegistrations.error) {
    throw new Error(`registration_payout_query_${scheduledRegistrations.error?.code ?? immediatePixRegistrations.error?.code ?? "failed"}`);
  }
  const due = [...(scheduledRegistrations.data ?? []), ...(immediatePixRegistrations.data ?? [])];

  let repassados = 0;
  let pulados    = 0;
  let vencidosTotal = due?.length ?? 0;

  for (const reg of due ?? []) {
    const originalStatus = reg.repasse_status === "pendente" ? "pendente" : "aguardando_liquidacao";
    // Reivindica atomicamente a partir do mesmo estado lido.
    const { data: claimed } = await supabase
      .from("registrations")
      .update({ repasse_status: "processando" })
      .eq("id", reg.id)
      .eq("repasse_status", originalStatus)
      .select("id");
    if (!claimed || claimed.length === 0) continue; // outro processo pegou

    const revert = async (erro?: string) =>
      supabase
        .from("registrations")
        .update({ repasse_status: originalStatus, ...(erro ? { repasse_erro: erro } : {}) })
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
      originalStatus,
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
    const [scheduledTickets, immediatePixTickets] = await Promise.all([
      supabase
        .from(source.table)
        .select("id, championship_id, valor, repasse_status")
        .eq("status_pagamento", "pago")
        .eq("repasse_status", "aguardando_liquidacao")
        .lte("repasse_data_prevista", agora)
        .limit(200),
      supabase
        .from(source.table)
        .select("id, championship_id, valor, repasse_status")
        .eq("status_pagamento", "pago")
        .eq("repasse_status", "pendente")
        .eq("billing_type", "PIX")
        .limit(200),
    ]);
    if (scheduledTickets.error || immediatePixTickets.error) {
      throw new Error(`${source.table}_payout_query_${scheduledTickets.error?.code ?? immediatePixTickets.error?.code ?? "failed"}`);
    }
    const tickets = [...(scheduledTickets.data ?? []), ...(immediatePixTickets.data ?? [])];
    vencidosTotal += tickets?.length ?? 0;

    for (const ticket of tickets ?? []) {
      const originalStatus = ticket.repasse_status === "pendente" ? "pendente" : "aguardando_liquidacao";
      const { data: claimed } = await supabase
        .from(source.table)
        .update({ repasse_status: "processando" })
        .eq("id", ticket.id)
        .eq("repasse_status", originalStatus)
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const revert = async (erro: string) =>
        supabase
          .from(source.table)
          .update({ repasse_status: originalStatus, repasse_erro: erro.slice(0, 300) })
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
        originalStatus,
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
    const { data: itens, error: payoutQueryError } = await supabase
      .from(source.table)
      .select("id, arena_id, valor")
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200);
    if (payoutQueryError) throw new Error(`${source.table}_payout_query_${payoutQueryError.code ?? "failed"}`);
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

      const valor = Number(item.valor ?? 0);
      const result = await executeArenaPayout({
        supabase,
        table: source.table,
        recordId: item.id,
        amount: valor,
        pixKey: chavePix,
        description: `${source.descricao} RankFTV`,
        revertStatus: "aguardando_liquidacao",
      });
      if (result.ok) {
        if (valor <= 0) pulados++; else repassados++;
      } else if (!result.pendingReconciliation) {
        falhas++;
      }
    }
  }

  // Aulas avulsas: mesma lógica acima, mas a coluna de status do pagamento
  // se chama pagamento_status (não status_pagamento) — por isso um bloco à
  // parte em vez de entrar em arenaSources.
  {
    const { data: itens, error: payoutQueryError } = await supabase
      .from("arena_attendance")
      .select("id, arena_id, valor_avulso")
      .eq("pagamento_status", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .limit(200);
    if (payoutQueryError) throw new Error(`arena_attendance_payout_query_${payoutQueryError.code ?? "failed"}`);
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

      const valor = Number(item.valor_avulso ?? 0);
      const result = await executeArenaPayout({
        supabase,
        table: "arena_attendance",
        recordId: item.id,
        amount: valor,
        pixKey: chavePix,
        description: "Aula avulsa RankFTV",
        revertStatus: "aguardando_liquidacao",
      });
      if (result.ok) {
        if (valor <= 0) pulados++; else repassados++;
      } else if (!result.pendingReconciliation) {
        falhas++;
      }
    }
  }

  const result = {
    ok: true,
    vencidos: vencidosTotal,
    repassados,
    falhas,
    pulados,
    expirados,
  };
  await reportOperationalEvent({
    level: falhas > 0 ? "error" : "info",
    event: "cron.payout_settlement_completed",
    message: falhas > 0 ? "Some due payouts failed" : undefined,
    requestId,
    context: result,
    alert: falhas > 0,
  });
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  try {
    return await runSettlement(req);
  } catch (error) {
    await reportOperationalEvent({
      level: "critical",
      event: "cron.payout_settlement_failed",
      message: "Payout settlement cron failed",
      requestId: req.headers.get("x-request-id"),
      error,
      alert: true,
    });
    return NextResponse.json({ ok: false, error: "Payout settlement failed" }, { status: 500 });
  }
}
