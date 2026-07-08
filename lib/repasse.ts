import type { SupabaseClient } from "@supabase/supabase-js";
import { transferirPix } from "./asaas";

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
  ctx: { ticketId: string; champNome: string; chavePix: string; valor: number },
  revertStatus: "pendente" | "aguardando_liquidacao",
): Promise<{ ok: boolean; transferId?: string | null; error?: string }> {
  const valor = parseFloat(Number(ctx.valor).toFixed(2));
  try {
    let transferId: string | null = null;
    if (valor > 0) {
      const t = await transferirPix({
        valor,
        chavePix:  ctx.chavePix,
        descricao: `Repasse plateia RankFTV — ${ctx.champNome}`,
      });
      transferId = t.id;
    }
    await supabase
      .from("spectator_tickets")
      .update({ repasse_status: "repassado", repasse_transfer_id: transferId, repasse_erro: null })
      .eq("id", ctx.ticketId);
    return { ok: true, transferId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[repasse-plateia] Erro ao transferir Pix:", msg);
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
  ctx: { ticketId: string; champNome: string; chavePix: string; valor: number },
  revertStatus: "pendente" | "aguardando_liquidacao",
): Promise<{ ok: boolean; transferId?: string | null; error?: string }> {
  const valor = parseFloat(Number(ctx.valor).toFixed(2));
  try {
    let transferId: string | null = null;
    if (valor > 0) {
      const t = await transferirPix({
        valor,
        chavePix:  ctx.chavePix,
        descricao: `Repasse ingresso atleta RankFTV — ${ctx.champNome}`,
      });
      transferId = t.id;
    }
    await supabase
      .from("athlete_tickets")
      .update({ repasse_status: "repassado", repasse_transfer_id: transferId, repasse_erro: null })
      .eq("id", ctx.ticketId);
    return { ok: true, transferId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[repasse-atleta-ticket] Erro ao transferir Pix:", msg);
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
  // Abate a dívida de ativação Elite (R$178), se houver. claim_elite_fee é
  // atômico (FOR UPDATE) → duas inscrições simultâneas não descontam em dobro.
  let descontoElite = 0;
  if (ctx.isElite && ctx.feePendente > 0) {
    const { data: deduzido, error: feeErr } = await supabase.rpc("claim_elite_fee", {
      p_champ_id: ctx.championshipId,
      p_max:      ctx.repasseBase,
    });
    if (!feeErr) descontoElite = Number(deduzido ?? 0);
  }

  const repasseFinal = parseFloat((ctx.repasseBase - descontoElite).toFixed(2));

  try {
    // Se o repasse inteiro foi pra quitar os R$178, não há transferência.
    let transferId: string | null = null;
    if (repasseFinal > 0) {
      const transferencia = await transferirPix({
        valor:     repasseFinal,
        chavePix:  ctx.chavePix,
        descricao: `Repasse RankFTV — ${ctx.champNome}`,
      });
      transferId = transferencia.id;
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
    console.error("[repasse] Erro ao transferir Pix:", msg);
    // Devolve a dívida Elite abatida e volta a inscrição pra nova tentativa.
    if (descontoElite > 0) {
      await supabase.rpc("release_elite_fee", {
        p_champ_id: ctx.championshipId,
        p_amount:   descontoElite,
      });
    }
    await supabase
      .from("registrations")
      .update({ repasse_status: revertStatus, repasse_erro: msg.slice(0, 300), elite_fee_coletada: 0 })
      .eq("id", ctx.registrationId);

    return { ok: false, error: msg };
  }
}
