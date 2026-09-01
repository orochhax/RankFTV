"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { createIdempotentCharge } from "@/lib/payment-flows";
import { calcularTotalComprador, calcularDesconto } from "@/lib/taxas";
import { buscarCupomValido } from "@/lib/cupons";
import { resolverEClaimarLote } from "@/lib/lotes";
import { gerarTicketAccessToken } from "@/lib/ticket-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { checarElegibilidadeCategoria } from "@/lib/inscricao-elegibilidade";
import { PERGUNTAS_NIVEL, calcularRatingQuestionario, type RespostasQuestionario } from "@/lib/motor-categoria";
import { categoryLevelRecommendationEnabled } from "@/lib/release-flags";
import { reportOperationalEvent } from "@/lib/observability";
import {
  athleteTicketInitialBillingType,
  parseAthleteTicketPaymentChoice,
  shouldCreateAthleteTicketPixCharge,
} from "@/lib/athlete-ticket-payment";
import {
  isParticipantCategoryConflict,
  participantCategoryConflictMessage,
} from "@/lib/participant-registration";
import { normalizeCpf } from "@/lib/cpf";
import { isValidAthleteName } from "@/lib/athlete-display-name";
import { validaCPF } from "@/lib/validacao";
import { deliverAthleteTicketCredentials } from "@/lib/athlete-ticket-delivery";

// Lê e valida as 5 respostas do questionário de nível de UM dos atletas
// (prefixo "comprador_quiz_" ou "parceiro_quiz_" no FormData) e devolve o
// rating calculado — mesma fórmula usada em /perfil/questionario-nivel.
// Esse fluxo é de visitante (sem conta na maioria das vezes), então não há
// profiles.rating pra consultar: o rating nasce aqui e fica só nesta linha
// do ingresso, nunca sobrescrevendo o rating competitivo de uma conta real.
function calcularRatingDoFormulario(formData: FormData, prefixo: string): number | null {
  const raw: Record<string, string> = {};
  for (const p of PERGUNTAS_NIVEL) {
    const valor = formData.get(`${prefixo}${p.key}`);
    if (typeof valor !== "string" || !valor) return null;
    raw[p.key] = valor;
  }
  return calcularRatingQuestionario(raw as unknown as RespostasQuestionario);
}

export type ComprarAtletaField =
  | "comprador_nome"
  | "comprador_cpf"
  | "comprador_email"
  | "comprador_email_confirmacao"
  | "parceiro_nome"
  | "parceiro_cpf"
  | "parceiro_email"
  | "parceiro_email_confirmacao";

export type ComprarAtletaState = {
  error?: string;
  fieldErrors?: Partial<Record<ComprarAtletaField, string>>;
  validationAttempt?: number;
};

export async function comprarIngressoAtleta(
  previousState: ComprarAtletaState,
  formData: FormData,
): Promise<ComprarAtletaState> {
  const championshipId = formData.get("championship_id") as string;
  const categoryId     = (formData.get("category_id") as string) || null;
  const categoriaNome  = (formData.get("categoria_nome") as string) || null;
  const metodoPagamento = parseAthleteTicketPaymentChoice(formData.get("metodo_pagamento"));

  if (!metodoPagamento) return { error: "Selecione Pix ou cartão para continuar." };

  // Comprador
  const nome      = ((formData.get("comprador_nome")  as string) ?? "").trim();
  const cpf       = normalizeCpf(formData.get("comprador_cpf") as string);
  const email     = ((formData.get("comprador_email") as string) ?? "").trim().toLowerCase();
  const emailConfirmacao = ((formData.get("comprador_email_confirmacao") as string) ?? "").trim().toLowerCase();
  const zap       = ((formData.get("comprador_zap")   as string) ?? "").replace(/\D/g, "") || null;
  const genero    = (formData.get("comprador_genero") as string) || null;
  const nasc      = (formData.get("comprador_nascimento") as string) || null;
  const camisa    = (formData.get("comprador_camisa") as string) || null;

  // Parceiro
  const pNome   = ((formData.get("parceiro_nome")  as string) ?? "").trim();
  const pCpf    = normalizeCpf(formData.get("parceiro_cpf") as string);
  const pEmail  = ((formData.get("parceiro_email") as string) ?? "").trim().toLowerCase() || null;
  const pEmailConfirmacao = ((formData.get("parceiro_email_confirmacao") as string) ?? "").trim().toLowerCase();
  const pZap    = ((formData.get("parceiro_zap")   as string) ?? "").replace(/\D/g, "") || null;
  const pGenero  = (formData.get("parceiro_genero") as string) || null;
  const pCamisa  = (formData.get("parceiro_camisa") as string) || null;

  const cupomCodigo = ((formData.get("cupom_codigo") as string) ?? "").trim();

  const fieldErrors: ComprarAtletaState["fieldErrors"] = {};
  if (!isValidAthleteName(nome)) {
    fieldErrors.comprador_nome = nome
      ? "Informe o nome do atleta, não o e-mail."
      : "Informe seu nome completo.";
  }
  if (!validaCPF(cpf)) {
    fieldErrors.comprador_cpf = "CPF inválido. Confira os números informados.";
  }
  if (!email || !email.includes("@")) {
    fieldErrors.comprador_email = "Informe um e-mail válido para acessar o ingresso.";
  }
  if (!emailConfirmacao || emailConfirmacao !== email) {
    fieldErrors.comprador_email_confirmacao = "A confirmação precisa ser igual ao e-mail do atleta 1.";
  }
  if (!isValidAthleteName(pNome)) {
    fieldErrors.parceiro_nome = pNome
      ? "Informe o nome do parceiro, não o e-mail."
      : "Informe o nome do parceiro.";
  }
  if (!validaCPF(pCpf)) {
    fieldErrors.parceiro_cpf = "CPF do parceiro inválido. Confira os números informados.";
  } else if (cpf === pCpf) {
    fieldErrors.parceiro_cpf = "O CPF do parceiro não pode ser igual ao seu.";
  }
  if (!pEmail || !pEmail.includes("@")) {
    fieldErrors.parceiro_email = "Informe o e-mail do parceiro para ele acessar o próprio ingresso.";
  } else if (pEmail === email) {
    fieldErrors.parceiro_email = "Use um e-mail diferente para cada atleta receber sua própria credencial.";
  }
  if (!pEmailConfirmacao || pEmailConfirmacao !== pEmail) {
    fieldErrors.parceiro_email_confirmacao = "A confirmação precisa ser igual ao e-mail do atleta 2.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      validationAttempt: (previousState.validationAttempt ?? 0) + 1,
    };
  }

  if (!categoryId)                         return { error: "Selecione uma categoria." };

  // Checkout de visitante (sem login) — rate limit por IP e por e-mail.
  const ip = getClientIp(await headers());
  const [okIp, okEmail] = await Promise.all([
    checkRateLimit(`athl-ticket:ip:${ip}`, 8, 600),
    checkRateLimit(`athl-ticket:email:${email.toLowerCase()}`, 5, 600),
  ]);
  if (!okIp || !okEmail) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

  // Captura o vínculo com a conta quando o comprador já está logado (esse
  // checkout também aceita visitante sem sessão). Nunca resolve o e-mail
  // digitado pra um user_id — só a sessão atual do próprio comprador conta.
  const sessionClient = await createClient();
  const { data: { user: buyerUser } } = await sessionClient.auth.getUser();

  const supabase = createAdminClient();

  const [{ data: champ }, { data: cat }] = await Promise.all([
    supabase
      .from("championships")
      .select("nome, status, organizador_id, is_elite, usa_motor_categoria")
      .eq("id", championshipId)
      .maybeSingle(),
    supabase
      .from("championship_categories")
      .select("valor_inscricao, genero, corte_rating_min, corte_rating_max")
      .eq("id", categoryId)
      .eq("championship_id", championshipId)
      .maybeSingle(),
  ]);

  if (!champ) return { error: "Campeonato não encontrado." };
  if (!cat)   return { error: "Categoria não encontrada." };
  if (champ.status !== "inscricoes_abertas" && champ.status !== "em_andamento")
    return { error: "As inscrições não estão abertas." };

  // ── Gênero e nível — este é o checkout de visitante (botão "Sou atleta"
  // da página pública do campeonato). Sem conta/profile pra consultar, o
  // gênero e o rating vêm do que foi digitado/respondido aqui mesmo — mas
  // ainda assim precisam bater com a categoria escolhida, senão uma dupla
  // masculino+feminino passa direto numa categoria fechada. O rating só
  // entra na conta quando o motor de categoria está ligado (questionário
  // de 5 perguntas obrigatório pros dois atletas nesse caso).
  const motorLigado = categoryLevelRecommendationEnabled(champ.usa_motor_categoria);
  const categoriaElegibilidade = {
    genero: cat.genero as string,
    corteRatingMin: Number(cat.corte_rating_min ?? 0),
    corteRatingMax: Number(cat.corte_rating_max ?? 9999),
  };

  let compradorRating: number | null = null;
  let parceiroRating: number | null = null;
  if (motorLigado) {
    compradorRating = calcularRatingDoFormulario(formData, "comprador_quiz_");
    if (compradorRating === null)
      return { error: "Responda as 5 perguntas de nível do atleta 1 (você) antes de continuar." };
    parceiroRating = calcularRatingDoFormulario(formData, "parceiro_quiz_");
    if (parceiroRating === null)
      return { error: "Responda as 5 perguntas de nível do parceiro antes de continuar." };
  }

  const elegibilidadeComprador = checarElegibilidadeCategoria(
    { genero, rating: compradorRating },
    categoriaElegibilidade,
    motorLigado,
  );
  if (!elegibilidadeComprador.ok) return { error: `Você (atleta 1): ${elegibilidadeComprador.error}` };

  const elegibilidadeParceiro = checarElegibilidadeCategoria(
    { genero: pGenero, rating: parceiroRating },
    categoriaElegibilidade,
    motorLigado,
  );
  if (!elegibilidadeParceiro.ok) return { error: `Parceiro: ${elegibilidadeParceiro.error}` };

  // ── Cupom de desconto (opcional) — só valida aqui (preview), sem
  // reivindicar. A reivindicação de verdade (lote + cupom) só acontece
  // logo antes de criar o ticket, depois de todas as outras validações.
  let cupomPreview: Awaited<ReturnType<typeof buscarCupomValido>>["cupom"];
  if (cupomCodigo) {
    const { cupom, error: cupomErro } = await buscarCupomValido(championshipId, cupomCodigo, "atleta");
    if (cupomErro || !cupom) return { error: cupomErro ?? "Cupom inválido." };
    cupomPreview = cupom;
  }

  // Preço "de tabela" nunca é confiado do client — sempre buscado do banco
  // pelo categoryId. O valor definitivo (lote vigente) só é travado no
  // claim atômico logo abaixo.
  const valorBaseCategoria = Number(cat.valor_inscricao);

  if (valorBaseCategoria > 0) {
    const { data: org } = await supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .maybeSingle();
    if (!org?.chave_pix)
      return { error: "O organizador ainda não ativou o recebimento. Tente mais tarde." };
  }

  // ── Reivindica lote + cupom (atômico) ──────────────────────────
  const claimLote = await resolverEClaimarLote("category", categoryId, valorBaseCategoria, 1);
  if (!claimLote.ok) return { error: claimLote.error };
  let valorFinal = claimLote.valor;
  const loteId = claimLote.loteId;

  let cupomId: string | null = null;
  if (cupomPreview) {
    const desconto = calcularDesconto(valorFinal, cupomPreview.tipoDesconto, cupomPreview.valorDesconto);
    valorFinal = Math.round((valorFinal - desconto) * 100) / 100;
    const { data: claimed } = await supabase.rpc("claim_coupon_use", { p_coupon_id: cupomPreview.id });
    if (!claimed) {
      if (loteId) await supabase.rpc("release_pricing_tier", { p_tier_id: loteId, p_qty: 1 });
      return { error: "Esse cupom acabou de esgotar. Tente novamente sem ele." };
    }
    cupomId = cupomPreview.id;
  }

  const isGratis = valorFinal <= 0;

  async function liberarReivindicacoes() {
    if (cupomId) await supabase.rpc("release_coupon_use", { p_coupon_id: cupomId });
    if (loteId)  await supabase.rpc("release_pricing_tier", { p_tier_id: loteId, p_qty: 1 });
  }

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const accessToken = gerarTicketAccessToken();

  const { data: ticket, error: insErr } = await supabase
    .from("athlete_tickets")
    .insert({
      championship_id:      championshipId,
      category_id:          categoryId,
      categoria_nome:       categoriaNome,
      comprador_nome:       nome,
      comprador_cpf:        cpf,
      comprador_email:      email,
      comprador_zap:        zap,
      comprador_genero:     genero,
      comprador_nascimento: nasc || null,
      comprador_camisa:     camisa,
      parceiro_nome:        pNome,
      parceiro_cpf:         pCpf,
      parceiro_email:       pEmail,
      parceiro_zap:         pZap,
      parceiro_genero:      pGenero,
      parceiro_camisa:      pCamisa,
      valor:                valorFinal,
      cupom_id:             cupomId,
      lote_id:              loteId,
      status_pagamento:     isGratis ? "pago" : "pendente",
      billing_type:         athleteTicketInitialBillingType(metodoPagamento, isGratis),
      code,
      access_token:         accessToken,
      user_id:              buyerUser?.id ?? null,
      comprador_rating:     compradorRating,
      parceiro_rating:      parceiroRating,
    })
    .select("id")
    .single();

  if (insErr || !ticket) {
    await reportOperationalEvent({
      level: "error",
      event: "athlete_ticket.create_failed",
      message: "Athlete ticket could not be persisted",
      error: insErr,
      alert: true,
    });
    await liberarReivindicacoes();
    if (isParticipantCategoryConflict(insErr)) {
      return { error: participantCategoryConflictMessage };
    }
    return { error: "Erro ao gerar o ingresso. Tente novamente." };
  }

  if (isGratis) {
    await deliverAthleteTicketCredentials(supabase, ticket.id);
    redirect(`/campeonatos/${championshipId}/comprar/ingresso/${ticket.id}?token=${accessToken}`);
  }

  if (!shouldCreateAthleteTicketPixCharge(metodoPagamento, isGratis)) {
    redirect(`/campeonatos/${championshipId}/comprar/ingresso/${ticket.id}?token=${accessToken}`);
  }

  try {
    const customer      = await criarOuBuscarCliente({ name: nome, email, cpfCnpj: cpf });
    const totalComprador = calcularTotalComprador(valorFinal, "pix", !!champ.is_elite);
    const operacao      = await createIdempotentCharge({
      flow:              "athlete_ticket",
      recordId:          ticket.id,
      customerId:        customer.id,
      amount:            totalComprador,
      method:            "pix",
      description:       `Ingresso atleta ${champ.nome} — ${categoriaNome ?? "dupla"} (${nome} + ${pNome})`,
      externalReference: `athl:${ticket.id}`,
      actorId:            buyerUser?.id ?? null,
      metadata:           { championshipId, categoryId },
    });

    if (!operacao.ok) {
      if (!operacao.ambiguous && !operacao.inProgress) {
        await liberarReivindicacoes();
        await supabase.from("athlete_tickets").update({ status_pagamento: "expirado" }).eq("id", ticket.id);
      }
      return { error: operacao.error };
    }

    const cobranca = operacao.provider;

    await supabase
      .from("athlete_tickets")
      .update({
        asaas_payment_id:   cobranca.id,
        pix_copy_paste:     cobranca.pixQrCode?.payload ?? null,
        pix_qr_code_base64: cobranca.pixQrCode?.encodedImage ?? null,
        invoice_url:        cobranca.invoiceUrl ?? null,
      })
      .eq("id", ticket.id);
  } catch (error) {
    await reportOperationalEvent({
      level: "error",
      event: "athlete_ticket.customer_or_payment_start_failed",
      message: "Athlete payment could not be started",
      error,
      alert: true,
    });
    await supabase.rpc("release_athlete_ticket_inventory", {
      p_ticket_id: ticket.id,
      p_target_status: "expirado",
    });
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  redirect(`/campeonatos/${championshipId}/comprar/ingresso/${ticket.id}?token=${accessToken}`);
}
