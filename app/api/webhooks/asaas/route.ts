import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarRepasseEspectador } from "@/lib/repasse";
import {
  confirmarInscricaoPaga, estornarInscricao,
  confirmarAthleteTicketPago, estornarAthleteTicket,
} from "@/lib/pagamento-inscricao";
import { addMonthsISO } from "@/lib/arena-dates";
import { pixKeyEmCooldown } from "@/lib/pix";

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
  subscription?: string;
  dueDate?: string;
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

  async function paymentBelongsToRecord(table: string, id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(table)
      .select("asaas_payment_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !data || data.asaas_payment_id !== payment.id) {
      console.error(`[webhook] Pagamento ${payment.id} nao pertence a ${table}:${id}`);
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

    try {
      const { transferirPix } = await import("@/lib/asaas");
      const transferencia = await transferirPix({ valor, chavePix, descricao });
      await supabase
        .from(table)
        .update({
          repasse_status: "concluido",
          repasse_transfer_id: transferencia.id,
          repasse_erro: null,
        })
        .eq("id", id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from(table)
        .update({ repasse_status: "pendente", repasse_erro: msg.slice(0, 300) })
        .eq("id", id)
        .eq("repasse_status", "processando");
      console.error(`[webhook] Falha no repasse ${table}:${id}:`, msg);
    }
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

    if (EVENTOS_CONFIRMADO.has(event)) {
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

    if (EVENTOS_ESTORNADO.has(event)) {
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

    if (EVENTOS_CONFIRMADO.has(event)) {
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

    if (EVENTOS_CONFIRMADO.has(event)) {
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

    if (EVENTOS_ESTORNADO.has(event)) {
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

    if (EVENTOS_CONFIRMADO.has(event)) {
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

    if (EVENTOS_ESTORNADO.has(event)) {
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

    if (EVENTOS_CONFIRMADO.has(event)) {
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

    if (EVENTOS_ESTORNADO.has(event)) {
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
      console.error("[webhook] Erro ao processar ingresso de atleta:", resultado.error);
      return NextResponse.json({ error: resultado.error }, { status: 500 });
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
      await supabase.from("spectator_tickets").update({ repasse_status: "estornado" }).eq("id", ticketId);
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
    console.error("[webhook] Erro ao processar inscrição:", resultado.error);
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: novoStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] ERRO FATAL:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
