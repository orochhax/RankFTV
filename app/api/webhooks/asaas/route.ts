import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarRepasse, executarRepasseEspectador, executarRepasseAtletaTicket } from "@/lib/repasse";
import { enviarConviteDupla } from "@/lib/email/send";
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

    await supabase
      .from("athlete_tickets")
      .update({
        status_pagamento: novoStatus,
        ...(novoStatus === "pago" ? { billing_type: payment.billingType } : {}),
      })
      .eq("id", ticketId);

    if (novoStatus === "estornado") {
      await supabase.from("athlete_tickets").update({ repasse_status: "estornado" }).eq("id", ticketId);
      return NextResponse.json({ ok: true, tipo: "atleta_ticket", status: novoStatus });
    }

    // Pago → repasse integral pra chave Pix do organizador
    const { data: athTicket } = await supabase
      .from("athlete_tickets")
      .select("id, championship_id, valor")
      .eq("id", ticketId)
      .single();

    if (athTicket) {
      const { data: champAth } = await supabase
        .from("championships")
        .select("nome, organizador_id")
        .eq("id", athTicket.championship_id)
        .single();

      if (champAth) {
        const { data: orgAth } = await supabase
          .from("organizer_accounts")
          .select("chave_pix, chave_pix_atualizada_em")
          .eq("user_id", champAth.organizador_id)
          .single();
        const chavePix = orgAth?.chave_pix as string | undefined;
        const valor    = Number(athTicket.valor ?? 0);

        if (chavePix && valor > 0) {
          const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;
          if (dias === 0) {
            const { data: claimed } = await supabase
              .from("athlete_tickets")
              .update({ repasse_status: "processando" })
              .eq("id", ticketId)
              .eq("repasse_status", "pendente")
              .select("id");
            if (claimed && claimed.length > 0) {
              await executarRepasseAtletaTicket(
                supabase,
                { ticketId, champNome: champAth.nome, chavePix, chavePixAtualizadaEm: orgAth?.chave_pix_atualizada_em ?? null, valor },
                "pendente",
              );
            }
          } else {
            const dataRepasse = new Date();
            dataRepasse.setDate(dataRepasse.getDate() + dias);
            await supabase
              .from("athlete_tickets")
              .update({ repasse_status: "aguardando_liquidacao", repasse_data_prevista: dataRepasse.toISOString() })
              .eq("id", ticketId)
              .eq("repasse_status", "pendente");
          }
        }
      }
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

    // Busca dados do campeonato (organizador + taxa da plataforma + plano Elite)
    const { data: champ } = await supabase
      .from("championships")
      .select("nome, organizador_id, taxa_plataforma, is_elite, premium_fee_pendente")
      .eq("id", reg.championship_id)
      .single();

    // Ativa a dupla e busca atletas
    const { data: team } = await supabase
      .from("teams")
      .select("atleta1_id, atleta2_id, status")
      .eq("id", reg.team_id)
      .single();

    if (team) {
      // aguardandoPagamento: parceiro já definido mas convite SÓ agora é enviado
      //   (inscrição paga — o convite foi segurado até o pagamento ser confirmado).
      // parceiroPendente: convite já foi enviado mas parceiro ainda não aceitou.
      const aguardandoPagamento = !!team.atleta2_id && team.status === "aguardando_pagamento";
      const parceiroPendente    = !!team.atleta2_id && team.status === "convite_pendente";

      if (aguardandoPagamento) {
        // Pagamento OK → agora sim manda o convite e muda status para convite_pendente
        await supabase
          .from("teams")
          .update({ status: "convite_pendente" })
          .eq("id", reg.team_id);

        // Busca dados necessários para o e-mail de convite
        const [{ data: a1Prof }, { data: a2Prof }, { data: catRow }] = await Promise.all([
          supabase.from("profiles").select("nome, username").eq("id", team.atleta1_id).single(),
          supabase.from("profiles").select("nome").eq("id", team.atleta2_id!).single(),
          reg.category_id
            ? supabase.from("championship_categories").select("nome").eq("id", reg.category_id).single()
            : Promise.resolve({ data: null }),
        ]);
        const { data: a2Auth } = await supabase.auth.admin.getUserById(team.atleta2_id!);
        const atleta2Email = a2Auth?.user?.email ?? null;

        if (atleta2Email && a1Prof && a2Prof && champ) {
          await enviarConviteDupla({
            emailConvidado:  atleta2Email,
            nomeConvidado:   a2Prof.nome,
            nomeAtleta1:     a1Prof.nome,
            usernameAtleta1: a1Prof.username ?? "",
            nomeCampeonato:  champ.nome,
            nomeCategoria:   catRow?.nome ?? "",
          });
        }
      } else if (!parceiroPendente) {
        // Sem parceiro pendente → confirma a dupla imediatamente
        await supabase
          .from("teams")
          .update({ status: "confirmado" })
          .eq("id", reg.team_id);
      }

      // Credencial só para atleta1 enquanto parceiro não aceitou (aguardando ou pendente);
      // quando não há parceiro, gera para todos agora.
      const atletasParaCredencial = (aguardandoPagamento || parceiroPendente)
        ? [team.atleta1_id]
        : [team.atleta1_id, team.atleta2_id].filter(Boolean) as string[];
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
      const orgAccountRes = await supabase
        .from("organizer_accounts")
        .select("chave_pix, chave_pix_atualizada_em")
        .eq("user_id", champ.organizador_id)
        .single();

      const chavePix = orgAccountRes.data?.chave_pix as string | undefined;
      const isElite  = !!champ.is_elite;

      // A taxa é paga pelo comprador (somada na cobrança) → o organizador recebe
      // o VALOR CHEIO do ingresso. A dívida Elite (R$178) ainda é abatida daqui.
      const repasseBase = Number(reg.valor ?? 0);

      if (chavePix && repasseBase > 0) {
        const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;

        if (dias === 0) {
          // Trava de idempotência: marca 'processando' SÓ se ainda estiver
          // 'pendente'. Como é um UPDATE condicional atômico, um webhook
          // duplicado (ou PAYMENT_CONFIRMED + PAYMENT_RECEIVED) não consegue
          // reivindicar de novo → evita repasse em dobro.
          const { data: claimed } = await supabase
            .from("registrations")
            .update({ repasse_status: "processando" })
            .eq("id", registrationId)
            .eq("repasse_status", "pendente")
            .select("id");

          if (claimed && claimed.length > 0) {
            await executarRepasse(
              supabase,
              {
                registrationId,
                championshipId: reg.championship_id,
                champNome:      champ.nome,
                isElite,
                feePendente:    Number(champ.premium_fee_pendente ?? 0),
                chavePix,
                chavePixAtualizadaEm: orgAccountRes.data?.chave_pix_atualizada_em ?? null,
                repasseBase,
              },
              "pendente",
            );
          }
          // Se não reivindicou (0 linhas), já foi repassado/está processando → não faz nada.
        } else {
          // Crédito/débito: liquidação diferida (D+3/D+32). O repasse e o
          // abatimento da dívida Elite acontecem quando a transferência
          // diferida for executada (job futuro). Até lá a dívida segue
          // pendente e é abatida nos próximos repasses Pix.
          const dataRepasse = new Date();
          dataRepasse.setDate(dataRepasse.getDate() + dias);

          // Idempotente: agenda só se ainda estiver pendente.
          await supabase
            .from("registrations")
            .update({
              repasse_status:        "aguardando_liquidacao",
              repasse_data_prevista: dataRepasse.toISOString(),
            })
            .eq("id", registrationId)
            .eq("repasse_status", "pendente");
        }
      }
    }
  }

  // 4. Estorno
  if (novoStatus === "estornado") {
    // Se esta inscrição tinha abatido parte da dívida Elite, devolve à dívida
    // (o dinheiro que pagou os R$178 veio dessa inscrição, agora estornada).
    const { data: regEst } = await supabase
      .from("registrations")
      .select("championship_id, elite_fee_coletada")
      .eq("id", registrationId)
      .single();

    if (regEst && Number(regEst.elite_fee_coletada ?? 0) > 0) {
      await supabase.rpc("release_elite_fee", {
        p_champ_id: regEst.championship_id,
        p_amount:   Number(regEst.elite_fee_coletada),
      });
    }

    await supabase
      .from("registrations")
      .update({ repasse_status: "estornado", elite_fee_coletada: 0 })
      .eq("id", registrationId);
  }

  return NextResponse.json({ ok: true, status: novoStatus });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] ERRO FATAL:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
