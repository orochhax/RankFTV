"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca, type MetodoPagamento } from "@/lib/asaas";
import { calcularTotalComprador, calcularDesconto } from "@/lib/taxas";
import { buscarCupomValido, type CupomValido } from "@/lib/cupons";
import { resolverPrecos, resolverEClaimarLote } from "@/lib/lotes";
import { enviarConviteDupla, enviarInscricaoConfirmada } from "@/lib/email/send";
import { checarElegibilidadeCategoria, resolverCpfInscricao, podeConvidarComoParceiro } from "@/lib/inscricao-elegibilidade";

export type InscreverState = { error?: string };

export async function inscreverDupla(
  _prev: InscreverState,
  formData: FormData
): Promise<InscreverState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const privileged = createAdminClient();

  const championshipId   = formData.get("championship_id") as string;
  const categoryId       = formData.get("category_id") as string;
  const parceiroUsername = ((formData.get("parceiro_username") as string) ?? "").trim().replace(/^@/, "");
  const cpfInput         = ((formData.get("cpf") as string) ?? "").replace(/\D/g, "");
  const metodo           = ((formData.get("metodo_pagamento") as string) ?? "pix") as MetodoPagamento;
  const ratingDupla      = parseInt(formData.get("rating_dupla") as string) || 0;
  const sandbaggingFlag  = formData.get("sandbagging") === "1";
  const tamanhoCamisa    = ((formData.get("tamanho_camisa") as string) ?? "").trim();
  const cupomCodigo      = ((formData.get("cupom_codigo") as string) ?? "").trim();

  if (!tamanhoCamisa) return { error: "Selecione o tamanho da camisa." };

  // ── Carrega perfil, campeonato e categoria em paralelo ────────
  // category_id é filtrado por championship_id aqui (defesa em profundidade
  // além da FK composta no banco — ver harden-championship-registration-
  // security.sql): sem isso, um category_id de outro campeonato (ex: mais
  // barato ou gratuito) passava direto.
  const [{ data: profile }, { data: priv }, { data: champ }, { data: cat }] = await Promise.all([
    supabase.from("profiles").select("nome, username, rating, genero").eq("id", user.id).single(),
    supabase.from("profiles_private").select("cpf").eq("user_id", user.id).maybeSingle(),
    supabase.from("championships").select("id, nome, taxa_plataforma, organizador_id, status, inscricoes_fim, is_elite, usa_motor_categoria").eq("id", championshipId).single(),
    supabase.from("championship_categories")
      .select("id, nome, valor_inscricao, genero, corte_rating_min, corte_rating_max")
      .eq("id", categoryId)
      .eq("championship_id", championshipId)
      .single(),
  ]);

  const cpfSalvo = priv?.cpf ?? "";

  if (!profile) return { error: "Perfil não encontrado." };
  if (!champ)   return { error: "Campeonato não encontrado." };
  if (!cat)     return { error: "Categoria não encontrada." };
  if (champ.status !== "inscricoes_abertas")
    return { error: "As inscrições não estão abertas para este campeonato." };

  // ── Elegibilidade de gênero e rating — sempre a partir do perfil salvo,
  // nunca de valor que o navegador manda (não existe campo de gênero/rating
  // no FormData desta ação, mas isso vale mesmo se um dia adicionarem).
  const elegibilidade = checarElegibilidadeCategoria(
    { genero: profile.genero, rating: profile.rating },
    { genero: cat.genero, corteRatingMin: cat.corte_rating_min, corteRatingMax: cat.corte_rating_max },
    champ.usa_motor_categoria ?? true,
  );
  if (!elegibilidade.ok) return { error: elegibilidade.error };

  const hoje = new Date().toISOString().split("T")[0];
  if (champ.inscricoes_fim && champ.inscricoes_fim < hoje)
    return { error: "O prazo de inscrições encerrou." };

  // ── Verifica se já está inscrito ──────────────────────────────
  const { data: inscricaoExistente } = await supabase
    .from("teams")
    .select("id")
    .eq("championship_id", championshipId)
    .neq("status", "cancelado")
    .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (inscricaoExistente) {
    return { error: "Você já está inscrito neste campeonato." };
  }

  const valorBaseCategoria = Number(cat.valor_inscricao);

  // ── Cupom de desconto (opcional) — só valida aqui (preview), sem
  // reivindicar. A reivindicação atômica (lote + cupom) só acontece logo
  // antes de criar a dupla, depois de todas as outras validações passarem
  // — senão um erro posterior (CPF inválido, organizador sem chave Pix,
  // parceiro não encontrado) "queimaria" o cupom/lote sem gerar inscrição.
  let cupomPreview: CupomValido | undefined;
  if (cupomCodigo) {
    const { cupom, error: cupomErro } = await buscarCupomValido(championshipId, cupomCodigo, "atleta");
    if (cupomErro || !cupom) return { error: cupomErro ?? "Cupom inválido." };
    cupomPreview = cupom;
  }

  // Preço estimado (lote vigente + cupom) só pra decidir se CPF/chave Pix
  // são obrigatórios agora — o valor definitivo é travado no claim atômico.
  const precoPreview = await resolverPrecos("category", [categoryId], { [categoryId]: valorBaseCategoria });
  const valorLotePreview = precoPreview[categoryId].valor;
  const descontoPreview = cupomPreview
    ? calcularDesconto(valorLotePreview, cupomPreview.tipoDesconto, cupomPreview.valorDesconto)
    : 0;
  const isGratisPreview = Math.max(0, valorLotePreview - descontoPreview) === 0;

  const cpf = resolverCpfInscricao(cpfSalvo, cpfInput);

  // CPF só é obrigatório para inscrições pagas (Asaas exige)
  if (!isGratisPreview && (!cpf || cpf.length !== 11)) {
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };
  }

  // Chave Pix do organizador só é necessária para inscrições pagas
  // Usa admin client pois o atleta não pode ler a conta do organizador via RLS
  if (!isGratisPreview) {
    const admin = createAdminClient();
    const { data: orgAccount } = await admin
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .maybeSingle();
    if (!orgAccount?.chave_pix)
      return { error: "O organizador ainda não ativou o recebimento de pagamentos. Tente mais tarde." };
  }

  // ── Parceiro (opcional) ───────────────────────────────────────
  // profiles não tem e-mail (fica em auth.users); busca só id/nome aqui e o
  // e-mail (pro convite) via admin client logo abaixo.
  let atleta2Id: string | null = null;
  let parceiroDados: { id: string; nome: string; email?: string } | null = null;
  if (parceiroUsername) {
    const { data: parceiro } = await supabase
      .from("profiles")
      .select("id, nome")
      .eq("username", parceiroUsername)
      .single();
    if (!parceiro)
      return { error: `Usuário @${parceiroUsername} não encontrado.` };
    const podeConvidar = podeConvidarComoParceiro(parceiro.id, user.id);
    if (!podeConvidar.ok) return { error: podeConvidar.error };
    atleta2Id = parceiro.id;

    const admin = createAdminClient();
    const { data: authData } = await admin.auth.admin.getUserById(parceiro.id);
    parceiroDados = { id: parceiro.id, nome: parceiro.nome, email: authData?.user?.email ?? undefined };
  }

  // ── Salva tamanho de camisa (público) e CPF (privado) ────────
  await supabase.from("profiles").update({ tamanho_camisa: tamanhoCamisa }).eq("id", user.id);
  if (!cpfSalvo && cpf) {
    await supabase
      .from("profiles_private")
      .upsert({ user_id: user.id, cpf }, { onConflict: "user_id" });
  }

  // ── Reivindica lote + cupom (atômico) — última validação antes de criar
  // qualquer coisa. Ordem: lote primeiro (define o valor base real),
  // cupom depois (desconta em cima do valor do lote já travado).
  const claimLote = await resolverEClaimarLote("category", categoryId, valorBaseCategoria, 1);
  if (!claimLote.ok) return { error: claimLote.error };
  let valorInscricao = claimLote.valor;
  const loteId = claimLote.loteId;

  let cupomId: string | null = null;
  if (cupomPreview) {
    const desconto = calcularDesconto(valorInscricao, cupomPreview.tipoDesconto, cupomPreview.valorDesconto);
    valorInscricao = Math.round((valorInscricao - desconto) * 100) / 100;
    const { data: claimed } = await privileged.rpc("claim_coupon_use", { p_coupon_id: cupomPreview.id });
    if (!claimed) {
      if (loteId) await privileged.rpc("release_pricing_tier", { p_tier_id: loteId, p_qty: 1 });
      return { error: "Esse cupom acabou de esgotar. Tente novamente sem ele." };
    }
    cupomId = cupomPreview.id;
  }

  const isGratis = valorInscricao === 0;

  // Gratuito sem parceiro → confirma direto.
  // Gratuito com parceiro → convite_pendente (não precisa de pagamento).
  // Pago sem parceiro   → convite_pendente (aguardando só pagamento).
  // Pago com parceiro   → aguardando_pagamento (convite SÓ enviado após pagamento confirmado).
  const teamStatus = isGratis
    ? (atleta2Id ? "convite_pendente" : "confirmado")
    : (atleta2Id ? "aguardando_pagamento" : "convite_pendente");

  async function liberarReivindicacoes() {
    if (cupomId) await privileged.rpc("release_coupon_use", { p_coupon_id: cupomId });
    if (loteId)  await privileged.rpc("release_pricing_tier", { p_tier_id: loteId, p_qty: 1 });
  }

  // ── Cria dupla ────────────────────────────────────────────────
  const admin = createAdminClient();
  const { data: team, error: teamError } = await admin
    .from("teams")
    .insert({
      championship_id:   championshipId,
      category_id:       categoryId,
      atleta1_id:        user.id,
      atleta2_id:        atleta2Id,
      parceiro_username: parceiroUsername || null,
      status:            teamStatus,
      sandbagging_flag:  sandbaggingFlag,
      rating_dupla:      ratingDupla || null,
    })
    .select("id")
    .single();
  if (teamError || !team) {
    await liberarReivindicacoes();
    // 23505 (unique_violation) no índice teams_one_active_per_atleta1 =
    // clique duplo/retry criou uma segunda tentativa concorrente pra mesma
    // pessoa neste campeonato — a primeira já passou. Nunca chega a chamar
    // o Asaas nesta segunda tentativa.
    if (teamError?.code === "23505") {
      return { error: "Você já está inscrito neste campeonato." };
    }
    return { error: "Erro ao criar dupla." };
  }

  // ── Cria inscrição ────────────────────────────────────────────
  const BILLING_TYPE: Record<string, string> = { pix: "PIX", credito: "CREDIT_CARD", debito: "DEBIT_CARD" };

  const { data: reg, error: regError } = await admin
    .from("registrations")
    .insert({
      team_id:          team.id,
      championship_id:  championshipId,
      category_id:      categoryId,
      valor:            valorInscricao,
      cupom_id:         cupomId,
      lote_id:          loteId,
      status_pagamento: isGratis ? "pago" : "pendente",
      billing_type:     isGratis ? null : (BILLING_TYPE[metodo] ?? null),
    })
    .select("id")
    .single();
  if (regError || !reg) {
    await liberarReivindicacoes();
    return { error: "Erro ao criar inscrição." };
  }

  // ── Inscrição gratuita sem parceiro: credencial imediata ──────
  if (isGratis && !atleta2Id) {
    await createAdminClient().from("credentials").insert({
      user_id:         user.id,
      championship_id: championshipId,
      role:            "atleta",
      qr_token:        crypto.randomUUID(),
      checked_in:      false,
    });
    // E-mail de confirmação para o atleta1
    if (user.email) {
      await enviarInscricaoConfirmada({
        emailAtleta:    user.email,
        nomeAtleta:     profile.nome,
        nomeCampeonato: champ.nome,
        nomeCategoria:  cat.nome,
        championshipId,
      });
    }
    redirect(`/minhas-inscricoes/${championshipId}`);
  }

  // ── Inscrição gratuita COM parceiro: envia convite e redireciona ─
  if (isGratis && atleta2Id) {
    if (parceiroDados?.email) {
      await enviarConviteDupla({
        emailConvidado:  parceiroDados.email,
        nomeConvidado:   parceiroDados.nome,
        nomeAtleta1:     profile.nome,
        usernameAtleta1: profile.username ?? "",
        nomeCampeonato:  champ.nome,
        nomeCategoria:   cat.nome,
      });
    }
    redirect(`/minhas-inscricoes/${championshipId}`);
  }

  // ── Inscrição paga: cria cobrança no Asaas ────────────────────
  // (convite para o parceiro é enviado APÓS pagamento confirmado, via webhook)
  try {
    const customer = await criarOuBuscarCliente({
      name:     profile.nome,
      email:    user.email!,
      cpfCnpj: cpf,
    });

    // O comprador paga valor + taxa (a taxa fica com a plataforma).
    const totalComprador = calcularTotalComprador(valorInscricao, metodo, !!champ.is_elite);

    const cobranca = await criarCobranca({
      customerId:        customer.id,
      valorBase:         totalComprador,
      metodo,
      descricao:         `Inscrição ${champ.nome} — ${cat.nome}`,
      externalReference: reg.id,
    });

    await createAdminClient()
      .from("registrations")
      .update({
        asaas_payment_id:   cobranca.id,
        pix_copy_paste:     cobranca.pixQrCode?.payload ?? null,
        pix_qr_code_base64: cobranca.pixQrCode?.encodedImage ?? null,
        invoice_url:        cobranca.invoiceUrl ?? null,
      })
      .eq("id", reg.id);
  } catch (err) {
    await liberarReivindicacoes();
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao gerar Pix: ${msg}` };
  }

  redirect(`/campeonatos/${championshipId}/pagamento/${reg.id}`);
}
