"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/lib/audit";

/**
 * Exportação de dados (LGPD, art. 18) — reúne os principais dados vinculados
 * à conta do próprio usuário autenticado. Não é necessariamente exaustiva de
 * toda tabela do schema (ver AUDITORIA-PRODUCAO.md), mas cobre perfil,
 * dados privados, inscrições/duplas, vínculos de arena e histórico de
 * rating — os dados pessoais de maior volume/sensibilidade.
 */
export async function exportarMeusDados(): Promise<
  { ok: true; dados: Record<string, unknown> } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const [
    { data: profile },
    { data: priv },
    { data: teams },
    { data: registrations },
    { data: arenaStudent },
    { data: ratingHistory },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("profiles_private").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("teams").select("*").or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`),
    supabase.from("registrations").select("id, championship_id, category_id, valor, status_pagamento, created_at")
      .in("team_id", (await supabase.from("teams").select("id").or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)).data?.map((t) => t.id) ?? []),
    supabase.from("arena_students").select("*").eq("user_id", user.id),
    supabase.from("rating_history").select("*").eq("atleta_id", user.id),
  ]);

  await registrarAuditoria({
    actorId: user.id,
    acao: "dados_exportados",
    alvoTabela: "profiles",
    alvoId: user.id,
  });

  return {
    ok: true,
    dados: {
      exportado_em: new Date().toISOString(),
      conta: { id: user.id, email: user.email },
      perfil: profile ?? null,
      dados_privados: priv ?? null,
      duplas: teams ?? [],
      inscricoes: registrations ?? [],
      vinculos_arena: arenaStudent ?? [],
      historico_rating: ratingHistory ?? [],
    },
  };
}

/**
 * Solicitação de exclusão de conta (LGPD, art. 18, VI). Não apaga
 * automaticamente — registro financeiro (inscrição paga, repasse) tem
 * retenção legal obrigatória (fiscal/contábil) que uma exclusão instantânea
 * não pode simplesmente ignorar. Fica registrado em security_audit_log pra
 * follow-up manual, que é o processo real hoje (não existe pipeline
 * automático de expurgo seletivo respeitando retenção financeira — ver
 * AUDITORIA-PRODUCAO.md).
 */
export async function solicitarExclusaoConta(motivo?: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  await registrarAuditoria({
    actorId: user.id,
    acao: "exclusao_conta_solicitada",
    alvoTabela: "profiles",
    alvoId: user.id,
    detalhes: { email: user.email, motivo: motivo?.slice(0, 500) ?? null },
  });

  // Notifica o admin — reaproveita o mesmo mecanismo de notificação interna
  // já usado pelo resto da plataforma (in-app), pro pedido não ficar visível
  // só nos logs de auditoria.
  const admin = createAdminClient();
  const { data: adminProfile } = await admin.from("profiles").select("id").eq("role", "ceo").limit(1).maybeSingle();
  if (adminProfile) {
    await admin.from("notifications").insert({
      user_id: adminProfile.id,
      tipo: "exclusao_conta_solicitada",
      titulo: "Pedido de exclusão de conta",
      mensagem: `Usuário ${user.email} (${user.id}) solicitou exclusão da conta.`,
    });
  }

  return { ok: true };
}
