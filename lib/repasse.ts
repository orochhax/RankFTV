import type { SupabaseClient } from "@supabase/supabase-js";
import { transferirPix } from "./asaas";

// Lógica de repasse compartilhada entre o webhook (Pix imediato) e o cron de
// liquidação diferida (cartão D+3/D+32). O chamador é responsável por já ter
// "reivindicado" a inscrição (repasse_status='processando') de forma atômica
// antes de chamar isto — é o que garante idempotência (sem repasse em dobro).

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
