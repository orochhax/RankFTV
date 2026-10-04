import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pixKeyEmCooldown } from "@/lib/pix";
import { executeArenaPayout } from "@/lib/arena-payout";
import { reportOperationalEvent } from "@/lib/observability";
import { isCronAuthorized } from "@/lib/cron-auth";
import { buscarAntecipacaoPorPagamento, consultarAntecipacao } from "@/lib/asaas";

export const dynamic = "force-dynamic";

// Job legado: para campeonatos somente promove recebiveis para carteira;
// nunca transfere pagamentos de campeonato. Repasses de arena continuam ativos.

async function runSettlement(req: NextRequest) {
  // Auth: a Vercel envia Authorization: Bearer ${CRON_SECRET} nas chamadas de cron.
  if (!isCronAuthorized(req.headers)) {
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

  // Campeonatos usam carteira sob demanda: o cron apenas promove valores
  // vencidos para "disponivel". Transferencia so nasce da solicitacao autenticada.
  const championshipSources = ["registrations", "athlete_tickets", "spectator_tickets"] as const;
  let repassados = 0;
  let pulados = 0;
  let vencidosTotal = 0;
  for (const table of championshipSources) {
    const { data: promoted, error: promotionError } = await supabase
      .from(table)
      .update({ repasse_status: "disponivel", repasse_erro: null })
      .eq("status_pagamento", "pago")
      .eq("repasse_status", "aguardando_liquidacao")
      .lte("repasse_data_prevista", agora)
      .select("id")
      .limit(200);
    if (promotionError) throw new Error(
      `${table}_wallet_promotion_${promotionError.code ?? "failed"}`,
    );
    vencidosTotal += promoted?.length ?? 0;
  }

  const { data: pendingAnticipations, error: anticipationQueryError } = await supabase
    .from("organizer_anticipations")
    .select("id,payment_id,provider_anticipation_id")
    .in("status", ["submitting", "provider_pending"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (anticipationQueryError) throw new Error(`anticipation_query_${anticipationQueryError.code ?? "failed"}`);
  for (const item of pendingAnticipations ?? []) {
    try {
      const provider = item.provider_anticipation_id
        ? await consultarAntecipacao(item.provider_anticipation_id)
        : await buscarAntecipacaoPorPagamento(item.payment_id);
      if (!provider) continue;
      const providerStatus = provider.status ?? "PENDING";
      const finalStatus = providerStatus === "CREDITED"
        ? "credited"
        : ["DENIED", "CANCELLED", "OVERDUE"].includes(providerStatus) ? "failed" : "provider_pending";
      await supabase.rpc("update_organizer_anticipation", {
        p_anticipation_id: item.id,
        p_status: finalStatus,
        p_provider_id: provider.id ?? item.provider_anticipation_id,
        p_provider_status: providerStatus,
        p_error_code: finalStatus === "failed" ? `provider_${providerStatus.toLowerCase()}` : null,
        p_actual_fee: finalStatus === "credited" ? provider.fee ?? null : null,
        p_actual_net_value: finalStatus === "credited" ? provider.netValue ?? null : null,
      });
    } catch {
      // Indisponibilidade temporaria mantem a reserva e sera tentada de novo.
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
