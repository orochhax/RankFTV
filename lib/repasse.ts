import type { SupabaseClient } from "@supabase/supabase-js";
import { transferIdempotently } from "./payment-flows";
import { pixKeyEmCooldown } from "./pix";
import { reportOperationalEvent } from "./observability";

const COOLDOWN_ERRO = "Chave Pix alterada recentemente — repasse retido em segurança, tenta de novo depois.";

// Lógica de repasse compartilhada entre o webhook (Pix imediato) e o cron de
// liquidação diferida (cartão D+3/D+32). O chamador é responsável por já ter
// "reivindicado" a inscrição (repasse_status='processando') de forma atômica
// antes de chamar isto — é o que garante idempotência (sem repasse em dobro).

/**
 * Repasse de ingresso de PLATEIA. Igual ao de atleta, mas mais simples:
 * sem taxa da plataforma (repassa o valor integral) e sem dívida Elite.
 * Atualiza a tabela `spectator_tickets`. O chamador já reivindicou o ticket
 * (repasse_status='processando') antes de chamar.
 */
export async function executarRepasseEspectador(
  supabase: SupabaseClient,
  ctx: { ticketId: string; champNome: string; chavePix: string; chavePixAtualizadaEm?: string | null; valor: number },
  revertStatus: "pendente" | "aguardando_liquidacao",
): Promise<{ ok: boolean; transferId?: string | null; error?: string }> {
  const valor = parseFloat(Number(ctx.valor).toFixed(2));
  if (pixKeyEmCooldown(ctx.chavePixAtualizadaEm ?? null)) {
    await supabase.from("spectator_tickets")
      .update({ repasse_status: revertStatus, repasse_erro: COOLDOWN_ERRO }).eq("id", ctx.ticketId);
    return { ok: false, error: COOLDOWN_ERRO };
  }
  try {
    let transferId: string | null = null;
    if (valor > 0) {
      const result = await transferIdempotently({
        flow: "payout",
        recordId: ctx.ticketId,
        externalReference: `payout:spectator:${ctx.ticketId}`,
        amount: valor,
        pixKey: ctx.chavePix,
        description: `Repasse plateia RankFTV - ${ctx.champNome}`,
        metadata: { sourceTable: "spectator_tickets" },
      });
      if (!result.ok) {
        if (result.ambiguous || result.inProgress) {
          await supabase.from("spectator_tickets")
            .update({ repasse_status: "processando", repasse_erro: "Transferencia em reconciliacao automatica." })
            .eq("id", ctx.ticketId);
          return { ok: false, error: result.error };
        }
        throw new Error(result.error);
      }
      transferId = result.provider.id;
    }
    await supabase
      .from("spectator_tickets")
      .update({ repasse_status: "repassado", repasse_transfer_id: transferId, repasse_erro: null })
      .eq("id", ctx.ticketId);
    return { ok: true, transferId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await reportOperationalEvent({
      level: "error",
      event: "payout.spectator_failed",
      message: "Spectator payout failed",
      error: err,
      context: { recordId: ctx.ticketId },
      alert: true,
    });
    await supabase
      .from("spectator_tickets")
      .update({ repasse_status: revertStatus, repasse_erro: msg.slice(0, 300) })
      .eq("id", ctx.ticketId);
    return { ok: false, error: msg };
  }
}

/**
 * Repasse de ingresso de ATLETA (guest checkout, tabela `athlete_tickets`).
 * Igual ao de plateia: repassa o valor integral, sem dívida Elite (esse
 * fluxo de compra avulsa não tem plano Elite). O chamador já reivindicou o
 * ticket (repasse_status='processando') antes de chamar.
 */
export async function executarRepasseAtletaTicket(
  supabase: SupabaseClient,
  ctx: { ticketId: string; champNome: string; chavePix: string; chavePixAtualizadaEm?: string | null; valor: number },
  revertStatus: "pendente" | "aguardando_liquidacao",
): Promise<{ ok: boolean; transferId?: string | null; error?: string }> {
  const valor = parseFloat(Number(ctx.valor).toFixed(2));
  if (pixKeyEmCooldown(ctx.chavePixAtualizadaEm ?? null)) {
    await supabase.from("athlete_tickets")
      .update({ repasse_status: revertStatus, repasse_erro: COOLDOWN_ERRO }).eq("id", ctx.ticketId);
    return { ok: false, error: COOLDOWN_ERRO };
  }
  try {
    let transferId: string | null = null;
    if (valor > 0) {
      const result = await transferIdempotently({
        flow: "payout",
        recordId: ctx.ticketId,
        externalReference: `payout:athlete:${ctx.ticketId}`,
        amount: valor,
        pixKey: ctx.chavePix,
        description: `Repasse ingresso atleta RankFTV - ${ctx.champNome}`,
        metadata: { sourceTable: "athlete_tickets" },
      });
      if (!result.ok) {
        if (result.ambiguous || result.inProgress) {
          await supabase.from("athlete_tickets")
            .update({ repasse_status: "processando", repasse_erro: "Transferencia em reconciliacao automatica." })
            .eq("id", ctx.ticketId);
          return { ok: false, error: result.error };
        }
        throw new Error(result.error);
      }
      transferId = result.provider.id;
    }
    await supabase
      .from("athlete_tickets")
      .update({ repasse_status: "repassado", repasse_transfer_id: transferId, repasse_erro: null })
      .eq("id", ctx.ticketId);
    return { ok: true, transferId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await reportOperationalEvent({
      level: "error",
      event: "payout.athlete_ticket_failed",
      message: "Athlete ticket payout failed",
      error: err,
      context: { recordId: ctx.ticketId },
      alert: true,
    });
    await supabase
      .from("athlete_tickets")
      .update({ repasse_status: revertStatus, repasse_erro: msg.slice(0, 300) })
      .eq("id", ctx.ticketId);
    return { ok: false, error: msg };
  }
}

export type RepasseCtx = {
  registrationId: string;
  championshipId: string;
  champNome:      string;
  isElite:        boolean;
  /** Quanto da ativação Elite (R$178) ainda falta abater. */
  feePendente:    number;
  chavePix:       string;
  chavePixAtualizadaEm?: string | null;
  /** Repasse já calculado com a taxa do plano correto (Elite ou Padrão). */
  repasseBase:    number;
};

export type RepasseResult =
  | { ok: true;  transferId: string | null; descontoElite: number }
  | { ok: false; error: string };

/**
 * Abate a dívida Elite do repasse, transfere o líquido via Pix e marca a
 * inscrição como 'repassado'. Em caso de falha, devolve a dívida abatida e
 * volta a inscrição para `revertStatus` (o status de onde o chamador a tirou).
 */
export async function executarRepasse(
  supabase: SupabaseClient,
  ctx: RepasseCtx,
  revertStatus: "pendente" | "aguardando_liquidacao",
): Promise<RepasseResult> {
  if (pixKeyEmCooldown(ctx.chavePixAtualizadaEm ?? null)) {
    await supabase.from("registrations")
      .update({ repasse_status: revertStatus, repasse_erro: COOLDOWN_ERRO }).eq("id", ctx.registrationId);
    return { ok: false, error: COOLDOWN_ERRO };
  }

  // Abate a divida Elite e registra o valor na propria inscricao na mesma
  // transacao; retries e inscricoes simultaneas nao descontam em dobro.
  let descontoElite = 0;
  if (ctx.isElite && ctx.feePendente > 0) {
    const { data: deduzido, error: feeErr } = await supabase.rpc("claim_registration_elite_fee_once", {
      p_registration_id: ctx.registrationId,
      p_max: ctx.repasseBase,
    });
    if (!feeErr) descontoElite = Number(deduzido ?? 0);
  }

  const repasseFinal = parseFloat((ctx.repasseBase - descontoElite).toFixed(2));

  try {
    // Se o repasse inteiro foi pra quitar os R$178, não há transferência.
    let transferId: string | null = null;
    if (repasseFinal > 0) {
      const result = await transferIdempotently({
        flow: "payout",
        recordId: ctx.registrationId,
        externalReference: `payout:registration:${ctx.registrationId}`,
        amount: repasseFinal,
        pixKey: ctx.chavePix,
        description: `Repasse RankFTV - ${ctx.champNome}`,
        metadata: { sourceTable: "registrations", eliteDiscount: descontoElite },
      });
      if (!result.ok) {
        if (result.ambiguous || result.inProgress) {
          await supabase.from("registrations")
            .update({
              repasse_status: "processando",
              repasse_erro: "Transferencia em reconciliacao automatica.",
              elite_fee_coletada: descontoElite,
            })
            .eq("id", ctx.registrationId);
          return { ok: false, error: result.error };
        }
        throw new Error(result.error);
      }
      transferId = result.provider.id;
    }

    await supabase
      .from("registrations")
      .update({
        repasse_status:      "repassado",
        repasse_transfer_id: transferId,
        repasse_erro:        null,
        elite_fee_coletada:  descontoElite,
      })
      .eq("id", ctx.registrationId);

    return { ok: true, transferId, descontoElite };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await reportOperationalEvent({
      level: "error",
      event: "payout.registration_failed",
      message: "Registration payout failed",
      error: err,
      context: { recordId: ctx.registrationId, championshipId: ctx.championshipId },
      alert: true,
    });
    // Devolve a dívida Elite abatida e volta a inscrição pra nova tentativa.
    if (descontoElite > 0) {
      await supabase.rpc("release_registration_elite_fee_once", {
        p_registration_id: ctx.registrationId,
      });
    }
    await supabase
      .from("registrations")
      .update({ repasse_status: revertStatus, repasse_erro: msg.slice(0, 300), elite_fee_coletada: 0 })
      .eq("id", ctx.registrationId);

    return { ok: false, error: msg };
  }
}
