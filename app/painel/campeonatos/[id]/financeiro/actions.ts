"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRECO_ELITE } from "@/lib/elite";
import { registrarAuditoria } from "@/lib/audit";
import { compararTitularidadePix } from "@/lib/pix";
import { consultarCpfCnpjTitularPix, consultarCobranca } from "@/lib/asaas";
import {
  confirmarInscricaoPaga, estornarInscricao,
  confirmarAthleteTicketPago, estornarAthleteTicket,
} from "@/lib/pagamento-inscricao";

const STATUS_CONFIRMADO = new Set(["CONFIRMED", "RECEIVED"]);
const STATUS_ESTORNADO  = new Set(["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"]);

export type ReconciliarResultado = { ok: boolean; message: string };

/**
 * Reconcilia uma inscrição travada em "pendente" contra o status real da
 * cobrança no Asaas — pro caso do webhook nunca ter chegado (rede, deploy
 * fora do ar no momento, etc). Nunca edita status_pagamento na mão: só muda
 * de acordo com o que o Asaas responde, e reusa a mesma lógica de
 * ativação/repasse do webhook (lib/pagamento-inscricao.ts), pra não existir
 * dois caminhos divergentes pra "inscrição confirmada".
 */
export async function reconciliarInscricao(
  champId: string,
  registrationId: string,
): Promise<ReconciliarResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const admin = createAdminClient();
  const { data: reg } = await admin
    .from("registrations")
    .select("id, championship_id, status_pagamento, asaas_payment_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (!reg || reg.championship_id !== champId) return { ok: false, message: "Inscrição não encontrada." };
  if (!reg.asaas_payment_id) return { ok: false, message: "Essa inscrição não tem cobrança gerada no Asaas." };
  if (reg.status_pagamento !== "pendente") return { ok: false, message: "Essa inscrição já não está pendente." };

  let cobranca;
  try {
    cobranca = await consultarCobranca(reg.asaas_payment_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, message: `Erro ao consultar o Asaas: ${msg}` };
  }

  if (STATUS_CONFIRMADO.has(cobranca.status)) {
    const resultado = await confirmarInscricaoPaga(admin, registrationId, {
      id: cobranca.id,
      billingType: cobranca.billingType,
    });
    revalidatePath(`/painel/campeonatos/${champId}`);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    revalidatePath(`/painel/campeonatos/${champId}/inscricoes`);
    return resultado.ok
      ? { ok: true, message: "Pagamento confirmado no Asaas — inscrição atualizada." }
      : { ok: false, message: `Encontrado como pago no Asaas, mas falhou ao atualizar: ${resultado.error}` };
  }

  if (STATUS_ESTORNADO.has(cobranca.status)) {
    const resultado = await estornarInscricao(admin, registrationId);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return resultado.ok
      ? { ok: true, message: "Cobrança estornada/reembolsada no Asaas — inscrição atualizada." }
      : { ok: false, message: `Falhou ao estornar: ${resultado.error}` };
  }

  return { ok: false, message: `Ainda pendente no Asaas (status: ${cobranca.status}).` };
}

// Mesma reconciliação, pro checkout de visitante (athlete_tickets, botão
// "Sou atleta" -> /comprar) — hoje é o fluxo realmente usado no app.
export async function reconciliarIngressoAtleta(
  champId: string,
  ticketId: string,
): Promise<ReconciliarResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { data: champ } = await supabase
    .from("championships")
    .select("organizador_id")
    .eq("id", champId)
    .single();
  if (!champ || champ.organizador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, status_pagamento, asaas_payment_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket || ticket.championship_id !== champId) return { ok: false, message: "Ingresso não encontrado." };
  if (!ticket.asaas_payment_id) return { ok: false, message: "Esse ingresso não tem cobrança gerada no Asaas." };
  if (ticket.status_pagamento !== "pendente") return { ok: false, message: "Esse ingresso já não está pendente." };

  let cobranca;
  try {
    cobranca = await consultarCobranca(ticket.asaas_payment_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, message: `Erro ao consultar o Asaas: ${msg}` };
  }

  if (STATUS_CONFIRMADO.has(cobranca.status)) {
    const resultado = await confirmarAthleteTicketPago(admin, ticketId, {
      id: cobranca.id,
      billingType: cobranca.billingType,
    });
    revalidatePath(`/painel/campeonatos/${champId}`);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    revalidatePath(`/painel/campeonatos/${champId}/inscricoes`);
    return resultado.ok
      ? { ok: true, message: "Pagamento confirmado no Asaas — ingresso atualizado." }
      : { ok: false, message: `Encontrado como pago no Asaas, mas falhou ao atualizar: ${resultado.error}` };
  }

  if (STATUS_ESTORNADO.has(cobranca.status)) {
    const resultado = await estornarAthleteTicket(admin, ticketId);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return resultado.ok
      ? { ok: true, message: "Cobrança estornada/reembolsada no Asaas — ingresso atualizado." }
      : { ok: false, message: `Falhou ao estornar: ${resultado.error}` };
  }

  return { ok: false, message: `Ainda pendente no Asaas (status: ${cobranca.status}).` };
}

/**
 * Troca a chave Pix de recebimento do organizador.
 *
 * Trocar uma chave EXISTENTE (não o primeiro cadastro) exige confirmar a
 * senha atual — reautenticação recente contra sequestro de sessão — e fica
 * auditada em security_audit_log. Antes de gravar, consulta a titularidade
 * da chave na API oficial da Asaas (GET /pix/addressKeys/external) e
 * compara com o CPF/CNPJ já cadastrado do organizador: só bloqueia quando a
 * resposta é inequívoca (CPF/CNPJ completo, não mascarado) e não bate — dado
 * ambíguo/mascarado (comum em sandbox) não bloqueia, só fica sem essa camada
 * extra. A RPC atualizar_chave_pix_organizador também carimba
 * chave_pix_atualizada_em, que segura qualquer repasse por
 * PIX_COOLDOWN_HORAS (lib/pix.ts) — a proteção de fato pra quando a
 * titularidade não dá pra confirmar.
 */
export async function salvarChavePix(
  chave: string,
  senha?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const chaveClean = chave.trim();
  if (!chaveClean) return { ok: false, error: "Informe a chave Pix." };

  const { data: contaAtual } = await supabase
    .from("organizer_accounts")
    .select("chave_pix, cpf_cnpj")
    .eq("user_id", user.id)
    .maybeSingle();
  const trocandoChaveExistente = !!contaAtual?.chave_pix;

  if (trocandoChaveExistente) {
    if (!senha) return { ok: false, error: "Confirme sua senha pra trocar a chave Pix." };
    if (!user.email) return { ok: false, error: "Conta sem e-mail — não é possível reautenticar." };
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: senha });
    if (authError) {
      await registrarAuditoria({
        actorId: user.id,
        acao: "chave_pix_troca_senha_invalida",
        alvoTabela: "organizer_accounts",
        alvoId: user.id,
      });
      return { ok: false, error: "Senha incorreta." };
    }
  }

  const cpfCnpjTitular = await consultarCpfCnpjTitularPix(chaveClean);
  const titularidade = compararTitularidadePix(cpfCnpjTitular, contaAtual?.cpf_cnpj ?? null);
  if (titularidade === "nao_confere") {
    await registrarAuditoria({
      actorId: user.id,
      acao: "chave_pix_titularidade_nao_confere",
      alvoTabela: "organizer_accounts",
      alvoId: user.id,
    });
    return {
      ok: false,
      error: "Essa chave Pix está cadastrada em nome de outra pessoa/CNPJ. Use uma chave no seu próprio nome.",
    };
  }

  const { error } = await supabase.rpc("atualizar_chave_pix_organizador", { p_chave: chaveClean });
  if (error) return { ok: false, error: "Erro ao salvar chave Pix." };

  await registrarAuditoria({
    actorId: user.id,
    acao: trocandoChaveExistente ? "chave_pix_alterada" : "chave_pix_cadastrada",
    alvoTabela: "organizer_accounts",
    alvoId: user.id,
    detalhes: { titularidadeVerificada: titularidade },
  });

  revalidatePath("/painel/campeonatos", "layout");
  return { ok: true };
}

/**
 * Marca o campeonato como Elite (taxas reduzidas por transação).
 *
 * Não cobra nada na hora: cria a dívida de ativação (premium_fee_pendente),
 * que o webhook abate dos repasses das próximas inscrições pagas.
 * Só permitido enquanto dá pra receber inscrições (rascunho ou abertas).
 */
export async function tornarCampeonatoElite(
  champId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // is_elite/premium_fee_pendente são protegidos por trigger contra escrita
  // direta do client (ver harden-championship-financial-fields.sql) — a RPC
  // reaplica a mesma checagem de dono e regra de negócio, mas grava como
  // service_role.
  const { error } = await supabase.rpc("ativar_championship_elite", {
    p_champ_id: champId,
    p_preco_elite: PRECO_ELITE,
  });

  if (error) return { ok: false, error: error.message || "Erro ao ativar o Elite." };

  revalidatePath(`/painel/campeonatos/${champId}`, "layout");
  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  revalidatePath(`/painel/campeonatos/${champId}/publicar`);
  return { ok: true };
}

/**
 * Cancela o Plano Elite, voltando ao Plano Padrão.
 *
 * Regra (ver Termos, seção 13): só dá pra cancelar enquanto NENHUM valor da
 * adesão tiver sido descontado. A partir do primeiro abatimento, a adesão é
 * definitiva. O UPDATE é condicional/atômico: só desativa se a dívida ainda
 * estiver cheia (premium_fee_pendente >= PRECO_ELITE). Se um repasse abateu
 * qualquer valor entre a checagem e aqui, o WHERE não casa → 0 linhas, e
 * devolvemos erro (evita corrida com o webhook de pagamento).
 */
export async function cancelarCampeonatoElite(
  champId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error } = await supabase.rpc("cancelar_championship_elite", {
    p_champ_id: champId,
    p_preco_elite: PRECO_ELITE,
  });

  if (error) {
    return {
      ok: false,
      error: error.message || "O Plano Elite já começou a ser cobrado e não pode mais ser cancelado.",
    };
  }

  revalidatePath(`/painel/campeonatos/${champId}`, "layout");
  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  revalidatePath(`/painel/campeonatos/${champId}/publicar`);
  return { ok: true };
}
