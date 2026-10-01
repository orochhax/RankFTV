"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRECO_ELITE } from "@/lib/elite";
import { registrarAuditoria } from "@/lib/audit";
import { compararTitularidadePix, pixKeyEmCooldown } from "@/lib/pix";
import { AsaasApiError, consultarCpfCnpjTitularPix, consultarCobranca, simularAntecipacaoPagamento, solicitarAntecipacaoPagamento } from "@/lib/asaas";
import { transferIdempotently } from "@/lib/payment-flows";
import {
  confirmarInscricaoPaga, estornarInscricao,
  confirmarAthleteTicketPago, estornarAthleteTicket,
} from "@/lib/pagamento-inscricao";

const STATUS_CONFIRMADO = new Set(["CONFIRMED", "RECEIVED"]);
const STATUS_ESTORNADO  = new Set(["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"]);

export type ReconciliarResultado = { ok: boolean; message: string };

export type SolicitarSaqueResultado = {
  ok: boolean;
  message: string;
  pending?: boolean;
};

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
  if (!reg.asaas_payment_id) return { ok: false, message: "Essa inscrição não tem cobrança gerada no processador de pagamentos." };
  if (reg.status_pagamento !== "pendente") return { ok: false, message: "Essa inscrição já não está pendente." };

  let cobranca;
  try {
    cobranca = await consultarCobranca(reg.asaas_payment_id);
  } catch {
    return { ok: false, message: "Não foi possível consultar o processador de pagamentos agora." };
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
      ? { ok: true, message: "Pagamento confirmado — inscrição atualizada." }
      : { ok: false, message: `Pagamento confirmado pelo processador, mas a inscrição não pôde ser atualizada: ${resultado.error}` };
  }

  if (STATUS_ESTORNADO.has(cobranca.status)) {
    const resultado = await estornarInscricao(admin, registrationId);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return resultado.ok
      ? { ok: true, message: "Cobrança estornada/reembolsada — inscrição atualizada." }
      : { ok: false, message: `Falhou ao estornar: ${resultado.error}` };
  }

  return { ok: false, message: "A cobrança continua pendente no processador de pagamentos." };
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
  if (!ticket.asaas_payment_id) return { ok: false, message: "Esse ingresso não tem cobrança gerada no processador de pagamentos." };
  if (ticket.status_pagamento !== "pendente") return { ok: false, message: "Esse ingresso já não está pendente." };

  let cobranca;
  try {
    cobranca = await consultarCobranca(ticket.asaas_payment_id);
  } catch {
    return { ok: false, message: "Não foi possível consultar o processador de pagamentos agora." };
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
      ? { ok: true, message: "Pagamento confirmado — ingresso atualizado." }
      : { ok: false, message: `Pagamento confirmado pelo processador, mas o ingresso não pôde ser atualizado: ${resultado.error}` };
  }

  if (STATUS_ESTORNADO.has(cobranca.status)) {
    const resultado = await estornarAthleteTicket(admin, ticketId);
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return resultado.ok
      ? { ok: true, message: "Cobrança estornada/reembolsada — ingresso atualizado." }
      : { ok: false, message: `Falhou ao estornar: ${resultado.error}` };
  }

  return { ok: false, message: "A cobrança continua pendente no processador de pagamentos." };
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

  // A ação já autenticou o usuário e só permite alterar a própria conta. A
  // gravação administrativa é feita exclusivamente no servidor para atravessar
  // a proteção que bloqueia UPDATE direto do navegador e carimbar o cooldown.
  const admin = createAdminClient();
  const { data: contaAtualizada, error } = await admin
    .from("organizer_accounts")
    .update({
      chave_pix: chaveClean,
      chave_pix_atualizada_em: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();
  if (error || !contaAtualizada) return { ok: false, error: "Erro ao salvar chave Pix." };

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

  if (error) {
    return {
      ok: false,
      error: "Não foi possível ativar o Plano Elite agora. Nenhuma cobrança foi criada.",
    };
  }

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
      error: "O Plano Elite não pôde ser cancelado. Ele pode já ter começado a ser cobrado ou estar temporariamente indisponível.",
    };
  }

  revalidatePath(`/painel/campeonatos/${champId}`, "layout");
  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  revalidatePath(`/painel/campeonatos/${champId}/publicar`);
  return { ok: true };
}

export async function solicitarSaqueOrganizador(
  champId: string,
  amountInput: number,
  idempotencyKey: string,
): Promise<SolicitarSaqueResultado> {
  const amount = Math.round(Number(amountInput) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 10_000_000) {
    return { ok: false, message: "Informe um valor válido para o saque." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { ok: false, message: "Identificador de segurança inválido. Atualize a página." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const [{ data: champ }, { data: account }] = await Promise.all([
    supabase.from("championships").select("organizador_id,nome").eq("id", champId).maybeSingle(),
    supabase.from("organizer_accounts").select("chave_pix,chave_pix_atualizada_em").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!champ || champ.organizador_id !== user.id) return { ok: false, message: "Sem permissão." };
  if (!account?.chave_pix) return { ok: false, message: "Cadastre sua chave Pix antes de solicitar o saque." };
  if (pixKeyEmCooldown(account.chave_pix_atualizada_em ?? null)) {
    return { ok: false, message: "A chave Pix foi alterada recentemente. Por segurança, aguarde 48 horas." };
  }

  const { data: reservation, error: reserveError } = await supabase.rpc("reserve_organizer_withdrawal", {
    p_championship_id: champId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (reserveError || !reservation || typeof reservation !== "object") {
    const insufficient = reserveError?.message?.includes("WALLET_INSUFFICIENT_AVAILABLE_BALANCE");
    return {
      ok: false,
      message: insufficient ? "O valor excede o saldo disponível." : "Não foi possível reservar esse saque.",
    };
  }

  const reservedWithdrawal = reservation as { id?: unknown; status?: unknown };
  const withdrawalId = String(reservedWithdrawal.id ?? "");
  if (!withdrawalId) return { ok: false, message: "A reserva do saque não pôde ser confirmada." };
  const reservationStatus = String(reservedWithdrawal.status ?? "reserved");
  if (reservationStatus !== "reserved") {
    return reservationStatus === "paid"
      ? { ok: true, message: "Esse saque já foi concluído." }
      : { ok: true, pending: true, message: "Esse saque já está em processamento e continua reservado." };
  }
  const admin = createAdminClient();
  const { error: beginError } = await admin.rpc("begin_organizer_withdrawal_submission", {
    p_withdrawal_id: withdrawalId,
  });
  if (beginError) {
    await admin.rpc("update_organizer_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_status: "failed",
      p_error_code: "receivable_unavailable",
    });
    return { ok: false, message: "O saldo mudou durante a solicitação. Tente novamente." };
  }

  const result = await transferIdempotently({
    flow: "payout",
    recordId: withdrawalId,
    externalReference: `organizer-withdrawal:${withdrawalId}`,
    amount,
    pixKey: account.chave_pix,
    description: `Saque RankFTV — ${champ.nome}`.slice(0, 100),
    actorId: user.id,
    metadata: { sourceTable: "organizer_withdrawals", championshipId: champId },
  });

  if (result.ok) {
    await admin.rpc("update_organizer_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_status: "paid",
      p_provider_transfer_id: result.provider.id,
      p_provider_status: result.provider.status,
    });
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return { ok: true, message: "Saque enviado para sua chave Pix." };
  }

  if (result.ambiguous || result.inProgress) {
    await admin.rpc("update_organizer_withdrawal", {
      p_withdrawal_id: withdrawalId,
      p_status: "provider_pending",
      p_error_code: result.ambiguous ? "provider_response_ambiguous" : "provider_pending",
    });
    revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
    return {
      ok: true,
      pending: true,
      message: "Solicitação recebida. O valor permanece reservado até a confirmação do processador.",
    };
  }

  await admin.rpc("update_organizer_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_status: "failed",
    p_error_code: "provider_rejected",
  });
  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  return { ok: false, message: result.error };
}

export async function solicitarAntecipacoesOrganizador(
  champId: string,
  receivableIds: string[],
  expectedFee: number,
): Promise<SolicitarSaqueResultado> {
  const ids = [...new Set(receivableIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20);
  if (ids.length === 0) return { ok: false, message: "Selecione ao menos uma venda para antecipar." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };
  const { data: champ } = await supabase.from("championships").select("organizador_id").eq("id", champId).maybeSingle();
  if (!champ || champ.organizador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const admin = createAdminClient();
  const { data: eligibleRows } = await admin.from("organizer_receivables")
    .select("id,payment_id")
    .eq("organizer_id", user.id).eq("championship_id", champId).eq("status", "active")
    .eq("billing_type", "CREDIT_CARD").gt("available_at", new Date().toISOString()).in("id", ids);
  if (!eligibleRows || eligibleRows.length !== ids.length) {
    return { ok: false, message: "Uma das vendas não está disponível para antecipação." };
  }
  const quotes = new Map<string, Awaited<ReturnType<typeof simularAntecipacaoPagamento>>>();
  try {
    for (const row of eligibleRows) {
      if (!row.payment_id) throw new Error("payment_missing");
      quotes.set(row.id, await simularAntecipacaoPagamento(row.payment_id));
    }
  } catch {
    return { ok: false, message: "Não foi possível confirmar a taxa de antecipação agora." };
  }
  const currentFee = Math.round([...quotes.values()].reduce((sum, quote) => sum + Number(quote.fee ?? 0), 0) * 100) / 100;
  if (!Number.isFinite(expectedFee) || Math.abs(currentFee - expectedFee) > 0.009) {
    return { ok: false, message: "A taxa mudou desde a simulação. Calcule novamente antes de confirmar." };
  }
  let requested = 0;
  let documents = 0;
  let failed = 0;
  for (const receivableId of ids) {
    const { data: reservation, error: reserveError } = await supabase.rpc("reserve_organizer_anticipation", {
      p_receivable_id: receivableId,
    });
    if (reserveError || !reservation || typeof reservation !== "object") { failed++; continue; }
    const reserved = reservation as { id?: unknown; paymentId?: unknown };
    const anticipationId = String(reserved.id ?? "");
    const paymentId = String(reserved.paymentId ?? "");
    if (!anticipationId || !paymentId) { failed++; continue; }

    try {
      const quote = quotes.get(receivableId);
      if (!quote) throw new Error("quote_missing");
      if (quote.isDocumentationRequired) {
        await admin.rpc("update_organizer_anticipation", {
          p_anticipation_id: anticipationId,
          p_status: "documentation_required",
          p_quoted_fee: quote.fee,
          p_quoted_net_value: quote.netValue,
          p_error_code: "documentation_required",
        });
        documents++;
        continue;
      }

      const anticipation = await solicitarAntecipacaoPagamento(paymentId);
      const providerStatus = anticipation.status ?? "PENDING";
      await admin.rpc("update_organizer_anticipation", {
        p_anticipation_id: anticipationId,
        p_status: providerStatus === "CREDITED" ? "credited" : "provider_pending",
        p_quoted_fee: quote.fee,
        p_quoted_net_value: quote.netValue,
        p_provider_id: anticipation.id ?? null,
        p_provider_status: providerStatus,
      });
      requested++;
    } catch (error) {
      const ambiguous = error instanceof AsaasApiError && error.ambiguous;
      await admin.rpc("update_organizer_anticipation", {
        p_anticipation_id: anticipationId,
        p_status: ambiguous ? "provider_pending" : "failed",
        p_error_code: ambiguous ? "provider_response_ambiguous" : "provider_rejected",
      });
      if (ambiguous) requested++; else failed++;
    }
  }

  revalidatePath(`/painel/campeonatos/${champId}/financeiro`);
  const parts = [
    requested > 0 ? `${requested} solicitação(ões) enviada(s)` : "",
    documents > 0 ? `${documents} exige(m) documentos do processador` : "",
    failed > 0 ? `${failed} não elegível(is)` : "",
  ].filter(Boolean);
  return {
    ok: requested > 0,
    pending: requested > 0,
    message: parts.join("; ") || "Nenhuma venda pôde ser antecipada.",
  };
}

export async function simularAntecipacoesOrganizador(
  champId: string,
  receivableIds: string[],
): Promise<{ ok: boolean; message: string; fee: number; net: number; documents: number }> {
  const ids = [...new Set(receivableIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20);
  if (ids.length === 0) return { ok: false, message: "Selecione ao menos uma venda.", fee: 0, net: 0, documents: 0 };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado.", fee: 0, net: 0, documents: 0 };
  const { data: champ } = await supabase.from("championships").select("organizador_id").eq("id", champId).maybeSingle();
  if (!champ || champ.organizador_id !== user.id) return { ok: false, message: "Sem permissão.", fee: 0, net: 0, documents: 0 };
  const { data: rows } = await createAdminClient().from("organizer_receivables")
    .select("id,payment_id,net_amount")
    .eq("organizer_id", user.id).eq("championship_id", champId).eq("status", "active")
    .eq("billing_type", "CREDIT_CARD").gt("available_at", new Date().toISOString()).in("id", ids);
  if (!rows || rows.length !== ids.length) return { ok: false, message: "Uma das vendas não está disponível para antecipação.", fee: 0, net: 0, documents: 0 };
  let fee = 0; let net = 0; let documents = 0;
  try {
    for (const row of rows) {
      if (!row.payment_id) throw new Error("payment_missing");
      const quote = await simularAntecipacaoPagamento(row.payment_id);
      fee += Number(quote.fee ?? 0);
      net += Math.max(0, Number(row.net_amount) - Number(quote.fee ?? 0));
      if (quote.isDocumentationRequired) documents++;
    }
  } catch {
    return { ok: false, message: "O processador não conseguiu calcular a antecipação agora. Em ambiente de testes, essa simulação não é disponibilizada.", fee: 0, net: 0, documents: 0 };
  }
  return { ok: true, message: "Simulação calculada.", fee: Math.round(fee * 100) / 100, net: Math.round(net * 100) / 100, documents };
}
