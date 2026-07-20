import { createAdminClient } from "@/lib/supabase/admin";

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
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_audit_log").insert({
      actor_id:    input.actorId,
      acao:        input.acao,
      alvo_tabela: input.alvoTabela ?? null,
      alvo_id:     input.alvoId ?? null,
      detalhes:    input.detalhes ?? null,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", input.acao, err);
  }
}
