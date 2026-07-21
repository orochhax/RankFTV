import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executarRepasse } from "@/lib/repasse";
import { enviarConviteDupla } from "@/lib/email/send";

// Confirmação/estorno de inscrição de campeonato (tabela `registrations`) —
// extraído do webhook do Asaas (app/api/webhooks/asaas/route.ts) pra ser
// reutilizado também pela reconciliação manual
// (app/painel/campeonatos/[id]/financeiro/actions.ts#reconciliarInscricao):
// os dois caminhos precisam ativar dupla/credencial/repasse exatamente da
// mesma forma, senão reconciliar por um caminho e não pelo outro cria
// inconsistência nova em vez de corrigir a antiga. Idempotente nos dois
// sentidos — chamar de novo pra uma inscrição já paga/estornada não duplica
// nada (credencial checa existência, repasse reivindica atomicamente por
// repasse_status='pendente', mudança de status de time é guardada pelo
// status atual).

const DIAS_LIQUIDACAO: Record<string, number> = {
  PIX:         0,
  DEBIT_CARD:  3,
  CREDIT_CARD: 32,
};

export type PagamentoInfo = {
  id: string;
  billingType: string;
};

export type ConfirmarInscricaoResultado =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Marca a inscrição como paga, ativa a dupla (envia convite se o parceiro
 * só podia ser convidado após o pagamento), gera credenciais e dispara o
 * repasse ao organizador. Espelha exatamente o passo 3 do webhook do Asaas.
 */
export async function confirmarInscricaoPaga(
  supabase: SupabaseClient,
  registrationId: string,
  payment: PagamentoInfo,
): Promise<ConfirmarInscricaoResultado> {
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ status_pagamento: "pago", billing_type: payment.billingType })
    .eq("id", registrationId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, team_id, championship_id, category_id")
    .eq("id", registrationId)
    .single();

  if (!reg) return { ok: true };

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id, taxa_plataforma, is_elite, premium_fee_pendente")
    .eq("id", reg.championship_id)
    .single();

  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id, status")
    .eq("id", reg.team_id)
    .single();

  if (team) {
    const aguardandoPagamento = !!team.atleta2_id && team.status === "aguardando_pagamento";
    const parceiroPendente    = !!team.atleta2_id && team.status === "convite_pendente";

    if (aguardandoPagamento) {
      await supabase
        .from("teams")
        .update({ status: "convite_pendente" })
        .eq("id", reg.team_id);

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
      await supabase
        .from("teams")
        .update({ status: "confirmado" })
        .eq("id", reg.team_id);
    }

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

  if (champ) {
    const orgAccountRes = await supabase
      .from("organizer_accounts")
      .select("chave_pix, chave_pix_atualizada_em")
      .eq("user_id", champ.organizador_id)
      .single();

    const chavePix = orgAccountRes.data?.chave_pix as string | undefined;
    const isElite  = !!champ.is_elite;
    const repasseBase = Number(reg.valor ?? 0);

    if (chavePix && repasseBase > 0) {
      const dias = DIAS_LIQUIDACAO[payment.billingType] ?? 32;

      if (dias === 0) {
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
      } else {
        const dataRepasse = new Date();
        dataRepasse.setDate(dataRepasse.getDate() + dias);

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

  return { ok: true };
}

/** Estorna a inscrição — espelha o passo 4 do webhook do Asaas. */
export async function estornarInscricao(
  supabase: SupabaseClient,
  registrationId: string,
): Promise<ConfirmarInscricaoResultado> {
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ status_pagamento: "estornado" })
    .eq("id", registrationId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

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

  return { ok: true };
}
