import { NextRequest, NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarRepasseEspectador } from "@/lib/repasse";
import {
  confirmarInscricaoPaga, estornarInscricao,
  confirmarAthleteTicketPago, estornarAthleteTicket,
} from "@/lib/pagamento-inscricao";
import { addMonthsISO } from "@/lib/arena-dates";
import { pixKeyEmCooldown } from "@/lib/pix";
import { executeArenaPayout } from "@/lib/arena-payout";
import { reportOperationalEvent } from "@/lib/observability";
import {
  ASAAS_CONFIRMED_EVENTS,
  ASAAS_REFUNDED_EVENTS,
  asaasEventDomainStatus,
  asaasEventRank,
  asaasWebhookEventId,
  isValidAsaasWebhookPayload,
  type AsaasWebhookPayload,
} from "@/lib/asaas-webhook-core";


const DIAS_LIQUIDACAO: Record<string, number> = {
  PIX:         0,
  DEBIT_CARD:  3,
  CREDIT_CARD: 32,
};

async function handleAsaasWebhook(req: NextRequest) {
  try {
  // 1. Autentica o webhook
  const token = req.headers.get("asaas-access-token");
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AsaasWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, payment } = body;

  if (!ASAAS_CONFIRMED_EVENTS.has(event) && !ASAAS_REFUNDED_EVENTS.has(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const registrationId = payment.externalReference;
  if (!registrationId) {
    return NextResponse.json({ error: "externalReference ausente" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const novoStatus = asaasEventDomainStatus(event) ?? "estornado";

  async function paymentBelongsToRecord(table: string, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(table)
      .select("asaas_payment_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data || data.asaas_payment_id !== payment.id) {
      await reportOperationalEvent({
        level: "error",
        event: "webhook.payment_ownership_mismatch",
        message: "Provider payment does not belong to the referenced record",
        context: { paymentId: payment.id, sourceTable: table, recordId: id },
        alert: true,
      });
      return false;
    }
    return true;
  }

  async function processarRepasseArena(
    table: "student_charges" | "arena_rentals" | "arena_daily_passes" | "arena_attendance",
    id: string,
    valor: number,
    chavePix: string | undefined,
    descricao: string,
    chavePixAtualizadaEm?: string | null,
  ) {
    if (!chavePix || valor <= 0) return;
    if (pixKeyEmCooldown(chavePixAtualizadaEm ?? null)) {
      await supabase
        .from(table)
        .update({ repasse_erro: "Chave Pix da arena alterada recentemente — repasse retido em segurança." })
        .eq("id", id)
        .eq("repasse_status", "pendente");
      return;
    }
    const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;

    if (dias > 0) {
      const dataRepasse = new Date();
      dataRepasse.setDate(dataRepasse.getDate() + dias);
      await supabase
        .from(table)
        .update({
          repasse_status: "aguardando_liquidacao",
          repasse_data_prevista: dataRepasse.toISOString(),
        })
        .eq("id", id)
        .eq("repasse_status", "pendente");
      return;
    }

    const { data: claimed } = await supabase
      .from(table)
      .update({ repasse_status: "processando" })
      .eq("id", id)
      .eq("repasse_status", "pendente")
      .select("id");
    if (!claimed || claimed.length === 0) return;

    await executeArenaPayout({
      supabase,
      table,
      recordId: id,
      amount: valor,
      pixKey: chavePix,
      description: descricao,
      revertStatus: "pendente",
    });
  }

  // ── Mensalidade de ARENA (externalReference "arena_student:<studentId>") ──
  if (registrationId.startsWith("arena_student:")) {
    const studentId = registrationId.slice("arena_student:".length);
    const { data: student } = await supabase
      .from("arena_students")
      .select("id, arena_id, user_id, valor_mensalidade, asaas_subscription_id")
      .eq("id", studentId)
      .maybeSingle();
    if (!student || !payment.subscription || student.asaas_subscription_id !== payment.subscription) {
      return NextResponse.json({ error: "Assinatura nao confere" }, { status: 409 });
    }

    if (ASAAS_CONFIRMED_EVENTS.has(event)) {
      // access_until = até quando esse pagamento cobre o uso — a próxima
      // cobrança do ciclo mensal (payment.dueDate + 1 mês). Sempre estende,
      // mesmo se a assinatura já tiver sido cancelada nesse meio-tempo (o
      // pagamento em si já foi feito, o período correspondente é do aluno).
      const acessoAte = payment.dueDate ? addMonthsISO(payment.dueDate, 1) : null;
      await supabase
        .from("arena_students")
        .update({
          status: "ativo",
          ...(acessoAte ? { access_until: acessoAte } : {}),
        })
        .eq("id", studentId);

      const now = new Date();
      const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const { data: charge } = await supabase
        .from("student_charges")
        .upsert(
          {
            arena_id:         student.arena_id,
            arena_student_id: studentId,
            user_id:          student.user_id,
            competencia,
            valor:            Number(student.valor_mensalidade ?? 0),
            status_pagamento: "pago",
            asaas_payment_id: payment.id,
            pago_em:          now.toISOString(),
          },
          { onConflict: "arena_student_id,competencia" },
        )
        .select("id")
        .single();

      const { data: arenaAccount } = await supabase
        .from("arena_accounts")
        .select("chave_pix, chave_pix_atualizada_em")
        .eq("arena_id", student.arena_id)
        .maybeSingle();

      const chavePix  = arenaAccount?.chave_pix as string | undefined;
      const valorBase = Number(student.valor_mensalidade ?? 0);
      if (charge) {
        await processarRepasseArena(
          "student_charges",
          charge.id,
          valorBase,
          chavePix,
          `Mensalidade arena ${competencia}`,
          arenaAccount?.chave_pix_atualizada_em ?? null,
        );
      }
    }

    if (ASAAS_REFUNDED_EVENTS.has(event)) {
      // Pagamento estornado: o período que ele cobria deixa de valer — não
      // é só "status pendente", o acesso pago também precisa ser revertido,
      // senão o aluno continua com crédito de um período que foi devolvido.
      await supabase.from("arena_students").update({ status: "pendente", access_until: null }).eq("id", studentId);
      await supabase
        .from("student_charges")
        .update({ status_pagamento: "estornado", repasse_status: "estornado" })
        .eq("asaas_payment_id", payment.id);
    }

    return NextResponse.json({ ok: true, tipo: "arena_student" });
  }

  // Mensalidade Pix emitida manualmente pelo painel da arena.
  if (registrationId.startsWith("mens:")) {
    const chargeId = registrationId.slice("mens:".length);
    if (!(await paymentBelongsToRecord("student_charges", chargeId))) {
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });
    }

    if (ASAAS_CONFIRMED_EVENTS.has(event)) {
      const { data: charge } = await supabase
        .from("student_charges")
        .update({ status_pagamento: "pago", pago_em: new Date().toISOString() })
        .eq("id", chargeId)
        .select("id, arena_id, valor")
        .single();

      if (charge) {
        const { data: account } = await supabase
          .from("arena_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("arena_id", charge.arena_id)
          .maybeSingle();
        await processarRepasseArena(
          "student_charges",
          charge.id,
          Number(charge.valor ?? 0),
          account?.chave_pix as string | undefined,
          `Mensalidade arena ${charge.id}`,
          account?.chave_pix_atualizada_em ?? null,
        );
      }
    } else {
      await supabase
        .from("student_charges")
        .update({ status_pagamento: "estornado", repasse_status: "estornado" })
        .eq("id", chargeId);
    }

    return NextResponse.json({ ok: true, tipo: "mensalidade_arena" });
  }

  // ── Aluguel de ARENA (externalReference "arena_rental:<rentalId>") ──
  if (registrationId.startsWith("arena_rental:")) {
    const rentalId = registrationId.slice("arena_rental:".length);
    if (!(await paymentBelongsToRecord("arena_rentals", rentalId)))
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

    if (ASAAS_CONFIRMED_EVENTS.has(event)) {
      await supabase
        .from("arena_rentals")
        .update({ status_pagamento: "pago", billing_type: payment.billingType })
        .eq("id", rentalId);

      const { data: rental } = await supabase
        .from("arena_rentals")
        .select("arena_id, valor")
        .eq("id", rentalId)
        .single();

      if (rental) {
        const { data: arenaAccount } = await supabase
          .from("arena_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("arena_id", rental.arena_id)
          .maybeSingle();

        const chavePix  = arenaAccount?.chave_pix as string | undefined;
        const valorBase = Number(rental.valor ?? 0);
        await processarRepasseArena(
          "arena_rentals",
          rentalId,
          valorBase,
          chavePix,
          `Aluguel quadra ${rentalId}`,
          arenaAccount?.chave_pix_atualizada_em ?? null,
        );
      }
    }

    if (ASAAS_REFUNDED_EVENTS.has(event)) {
      await supabase
        .from("arena_rentals")
        .update({ status_pagamento: "estornado", repasse_status: "estornado" })
        .eq("id", rentalId);
    }

    return NextResponse.json({ ok: true, tipo: "arena_rental" });
  }

  // ── Diária de ALUNO (externalReference "arena_daily:<passId>") ──
  if (registrationId.startsWith("arena_daily:")) {
    const passId = registrationId.slice("arena_daily:".length);
    if (!(await paymentBelongsToRecord("arena_daily_passes", passId)))
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

    if (ASAAS_CONFIRMED_EVENTS.has(event)) {
      await supabase
        .from("arena_daily_passes")
        .update({ status_pagamento: "pago", billing_type: payment.billingType })
        .eq("id", passId);

      const { data: passe } = await supabase
        .from("arena_daily_passes")
        .select("arena_id, valor")
        .eq("id", passId)
        .single();

      if (passe) {
        const { data: arenaAccount } = await supabase
          .from("arena_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("arena_id", passe.arena_id)
          .maybeSingle();

        const chavePix  = arenaAccount?.chave_pix as string | undefined;
        const valorBase = Number(passe.valor ?? 0);
        await processarRepasseArena(
          "arena_daily_passes",
          passId,
          valorBase,
          chavePix,
          `Diaria arena ${passId}`,
          arenaAccount?.chave_pix_atualizada_em ?? null,
        );
      }
    }

    if (ASAAS_REFUNDED_EVENTS.has(event)) {
      await supabase
        .from("arena_daily_passes")
        .update({ status_pagamento: "estornado", repasse_status: "estornado" })
        .eq("id", passId);
    }

    return NextResponse.json({ ok: true, tipo: "arena_daily" });
  }

  // ── Aula avulsa (externalReference "arena_class_charge:<attendanceId>") ──
  // A cobrança já foi criada e resolvida de forma síncrona em
  // processarCobrancaAvulsa (app/arena/actions.ts) — este handler é a
  // confirmação/estorno assíncrona que o Asaas manda depois, mantendo o
  // status final consistente mesmo se a resposta síncrona tiver falhado
  // (timeout de rede, etc.) e disparando o repasse pro dono da arena.
  if (registrationId.startsWith("arena_class_charge:")) {
    const attendanceId = registrationId.slice("arena_class_charge:".length);
    if (!(await paymentBelongsToRecord("arena_attendance", attendanceId)))
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

    if (ASAAS_CONFIRMED_EVENTS.has(event)) {
      await supabase
        .from("arena_attendance")
        .update({ pagamento_status: "pago", charged_at: new Date().toISOString(), repasse_status: "pendente" })
        .eq("id", attendanceId)
        .neq("pagamento_status", "pago");

      const { data: presenca } = await supabase
        .from("arena_attendance")
        .select("arena_id, valor_avulso")
        .eq("id", attendanceId)
        .single();

      if (presenca) {
        const { data: arenaAccount } = await supabase
          .from("arena_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("arena_id", presenca.arena_id)
          .maybeSingle();

        const chavePix  = arenaAccount?.chave_pix as string | undefined;
        const valorBase = Number(presenca.valor_avulso ?? 0);
        await processarRepasseArena(
          "arena_attendance",
          attendanceId,
          valorBase,
          chavePix,
          `Aula avulsa ${attendanceId}`,
          arenaAccount?.chave_pix_atualizada_em ?? null,
        );
      }
    }

    if (ASAAS_REFUNDED_EVENTS.has(event)) {
      await supabase
        .from("arena_attendance")
        .update({ pagamento_status: "estornado", repasse_status: "estornado" })
        .eq("id", attendanceId);
    }

    return NextResponse.json({ ok: true, tipo: "arena_class_charge" });
  }

  // ── Ingresso de ATLETA avulso (externalReference "athl:<ticketId>") ──
  // Checkout de visitante (sem login), tabela athlete_tickets. Igual ao de
  // plateia: repasse integral, sem taxa/dívida Elite.
  if (registrationId.startsWith("athl:")) {
    const ticketId = registrationId.slice(5);
    if (!(await paymentBelongsToRecord("athlete_tickets", ticketId)))
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

    const resultado = novoStatus === "pago"
      ? await confirmarAthleteTicketPago(supabase, ticketId, { id: payment.id, billingType: payment.billingType })
      : await estornarAthleteTicket(supabase, ticketId);

    if (!resultado.ok) {
      await reportOperationalEvent({
        level: "error",
        event: "webhook.athlete_ticket_failed",
        message: "Athlete ticket webhook processing failed",
        context: { recordId: ticketId },
        error: resultado.error,
        alert: true,
      });
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tipo: "atleta_ticket", status: novoStatus });
  }

  // ── Ingresso de PLATEIA (externalReference "spec:<ticketId>") ──
  // Caminho separado do de atleta: repasse integral (sem taxa por enquanto).
  if (registrationId.startsWith("spec:")) {
    const ticketId = registrationId.slice(5);
    if (!(await paymentBelongsToRecord("spectator_tickets", ticketId)))
      return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

    await supabase
      .from("spectator_tickets")
      .update({
        status_pagamento: novoStatus,
        ...(novoStatus === "pago" ? { billing_type: payment.billingType } : {}),
      })
      .eq("id", ticketId);

    if (novoStatus === "estornado") {
      const { error: releaseError } = await supabase.rpc("release_spectator_ticket_order", {
        p_ticket_id: ticketId,
        p_target_status: "estornado",
      });
      if (releaseError) {
        return NextResponse.json({ error: "Falha ao liberar inventario do pedido" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, tipo: "espectador", status: novoStatus });
    }

    // Pago → repasse integral pra chave Pix do organizador
    const { data: ticket } = await supabase
      .from("spectator_tickets")
      .select("id, championship_id, valor")
      .eq("id", ticketId)
      .single();

    if (ticket) {
      const { data: champ } = await supabase
        .from("championships")
        .select("nome, organizador_id")
        .eq("id", ticket.championship_id)
        .single();

      if (champ) {
        const { data: org } = await supabase
          .from("organizer_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("user_id", champ.organizador_id)
          .single();
        const chavePix = org?.chave_pix as string | undefined;
        const valor    = Number(ticket.valor ?? 0);

        if (chavePix && valor > 0) {
          const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;
          if (dias === 0) {
            const { data: claimed } = await supabase
              .from("spectator_tickets")
              .update({ repasse_status: "processando" })
              .eq("id", ticketId)
              .eq("repasse_status", "pendente")
              .select("id");
            if (claimed && claimed.length > 0) {
              await executarRepasseEspectador(
                supabase,
                { ticketId, champNome: champ.nome, chavePix, chavePixAtualizadaEm: org?.chave_pix_atualizada_em ?? null, valor },
                "pendente",
              );
            }
          } else {
            const dataRepasse = new Date();
            dataRepasse.setDate(dataRepasse.getDate() + dias);
            await supabase
              .from("spectator_tickets")
              .update({ repasse_status: "aguardando_liquidacao", repasse_data_prevista: dataRepasse.toISOString() })
              .eq("id", ticketId)
              .eq("repasse_status", "pendente");
          }
        }
      }
    }

    return NextResponse.json({ ok: true, tipo: "espectador", status: novoStatus });
  }

  if (!(await paymentBelongsToRecord("registrations", registrationId)))
    return NextResponse.json({ error: "Pagamento nao confere" }, { status: 409 });

  // 2/3/4. Atualiza status, ativa dupla/credenciais/repasse (pago) ou reverte
  // (estornado) — lógica compartilhada com a reconciliação manual do painel
  // (app/painel/campeonatos/[id]/financeiro/actions.ts#reconciliarInscricao)
  // em lib/pagamento-inscricao.ts, pros dois caminhos nunca divergirem.
  const resultado = novoStatus === "pago"
    ? await confirmarInscricaoPaga(supabase, registrationId, { id: payment.id, billingType: payment.billingType })
    : await estornarInscricao(supabase, registrationId);

  if (!resultado.ok) {
    await reportOperationalEvent({
      level: "error",
      event: "webhook.registration_failed",
      message: "Registration webhook processing failed",
      context: { recordId: registrationId },
      error: resultado.error,
      alert: true,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: novoStatus });
  } catch (err) {
    await reportOperationalEvent({
      level: "critical",
      event: "webhook.unhandled_processing_error",
      message: "Unhandled Asaas webhook processing error",
      error: err,
      alert: true,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

function secureTokenEquals(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  if (!secureTokenEquals(req.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.text();
  if (!raw || raw.length > 128_000) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let body: AsaasWebhookPayload;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAsaasWebhookPayload(parsed)) throw new Error("invalid_schema");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rank = asaasEventRank(body.event);
  if (rank == null || asaasEventDomainStatus(body.event) == null) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const correlationId = (
    req.headers.get("x-request-id")
    ?? req.headers.get("x-correlation-id")
    ?? randomUUID()
  ).slice(0, 120);
  const eventId = asaasWebhookEventId(body);
  const sourceHeader = req.headers.get("x-rankftv-event-source");
  const source = sourceHeader === "reconciliation" || sourceHeader === "fixture" ? sourceHeader : "webhook";
  const admin = createAdminClient();
  const { data: claim, error: claimError } = await admin.rpc("claim_asaas_webhook_event", {
    p_event_id: eventId,
    p_payment_id: body.payment.id,
    p_event_type: body.event,
    p_event_rank: rank,
    p_external_reference: body.payment.externalReference ?? null,
    p_source: source,
    p_correlation_id: correlationId,
    p_provider_created_at: body.dateCreated ?? null,
  });

  if (claimError || !claim) {
    await reportOperationalEvent({
      level: "critical",
      event: "webhook.ledger_unavailable",
      message: "Asaas webhook ledger is unavailable",
      requestId: correlationId,
      context: { eventId, paymentId: body.payment.id, eventType: body.event },
      error: claimError,
      alert: true,
    });
    return NextResponse.json({ error: "Webhook ledger unavailable" }, { status: 503 });
  }

  const claimed = claim as unknown as { shouldProcess?: boolean; reason?: string };
  if (!claimed.shouldProcess) {
    return NextResponse.json({ ok: true, ignored: true, reason: claimed.reason ?? "duplicate" });
  }

  const forwarded = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: raw,
  });
  let response: NextResponse;
  try {
    response = await handleAsaasWebhook(forwarded);
  } catch (error) {
    await admin.rpc("complete_asaas_webhook_event", {
      p_event_id: eventId,
      p_success: false,
      p_error: "unhandled_processing_error",
    });
    await reportOperationalEvent({
      level: "critical",
      event: "webhook.dispatch_failed",
      message: "Claimed Asaas webhook could not be dispatched",
      requestId: correlationId,
      context: { eventId, paymentId: body.payment.id, eventType: body.event },
      error,
      alert: true,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  const success = response.status < 400;
  await admin.rpc("complete_asaas_webhook_event", {
    p_event_id: eventId,
    p_success: success,
    p_error: success ? null : `http_${response.status}`,
  });
  return response;
}
