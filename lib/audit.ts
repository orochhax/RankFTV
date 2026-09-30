import { createAdminClient } from "@/lib/supabase/admin";
import { reportOperationalEvent } from "@/lib/observability";

/**
 * Registra uma mudança sensível em security_audit_log (chave Pix, gênero
 * pós-uso competitivo, campos financeiros/administrativos). Nunca lança —
 * falha de auditoria não pode derrubar a ação principal, só fica sem
 * registro (melhor logar o erro do que quebrar o fluxo do usuário).
 */
export async function registrarAuditoria(input: {
  actorId: string | null;
  acao: string;
  alvoTabela?: string;
  alvoId?: string;
  detalhes?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("security_audit_log").insert({
      actor_id:    input.actorId,
      acao:        input.acao,
      alvo_tabela: input.alvoTabela ?? null,
      alvo_id:     input.alvoId ?? null,
      detalhes:    input.detalhes ?? null,
    });
    if (error) throw error;
    return true;
  } catch (err) {
    await reportOperationalEvent({
      level: "error",
      event: "security_audit.persistence_failed",
      message: "Security audit event could not be persisted",
      context: { action: input.acao },
      error: err,
      alert: true,
    });
    return false;
  }
}
