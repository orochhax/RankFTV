import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { transferIdempotently } from "@/lib/payment-flows";
import { reportOperationalEvent } from "@/lib/observability";

export type ArenaPayoutTable =
  | "student_charges"
  | "arena_rentals"
  | "arena_daily_passes"
  | "arena_attendance";

export async function executeArenaPayout(input: {
  supabase: SupabaseClient;
  table: ArenaPayoutTable;
  recordId: string;
  amount: number;
  pixKey: string;
  description: string;
  revertStatus: "pendente" | "aguardando_liquidacao";
}): Promise<{ ok: boolean; pendingReconciliation?: boolean; error?: string }> {
  const amount = Number(input.amount.toFixed(2));
  if (amount <= 0) {
    await input.supabase.from(input.table).update({ repasse_status: "concluido" }).eq("id", input.recordId);
    return { ok: true };
  }

  const transfer = await transferIdempotently({
    flow: "payout",
    recordId: input.recordId,
    externalReference: `payout:${input.table}:${input.recordId}`,
    amount,
    pixKey: input.pixKey,
    description: input.description,
    metadata: { sourceTable: input.table },
  });

  if (!transfer.ok) {
    if (transfer.ambiguous || transfer.inProgress) {
      await input.supabase
        .from(input.table)
        .update({ repasse_status: "processando", repasse_erro: "Transferencia em reconciliacao automatica." })
        .eq("id", input.recordId);
      await reportOperationalEvent({
        level: "warn",
        event: "payout.arena_pending_reconciliation",
        message: "Arena payout has an ambiguous provider result",
        context: { sourceTable: input.table, recordId: input.recordId },
        alert: true,
      });
      return { ok: false, pendingReconciliation: true, error: transfer.error };
    }
    await input.supabase
      .from(input.table)
      .update({ repasse_status: input.revertStatus, repasse_erro: transfer.error.slice(0, 300) })
      .eq("id", input.recordId);
    await reportOperationalEvent({
      level: "error",
      event: "payout.arena_failed",
      message: "Arena payout failed",
      context: { sourceTable: input.table, recordId: input.recordId },
      error: transfer.error,
      alert: true,
    });
    return { ok: false, error: transfer.error };
  }

  await input.supabase
    .from(input.table)
    .update({
      repasse_status: "concluido",
      repasse_transfer_id: transfer.provider.id,
      repasse_erro: null,
    })
    .eq("id", input.recordId);
  return { ok: true };
}
