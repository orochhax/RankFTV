"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca, type MetodoPagamento } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";
import { enviarConviteDupla, enviarInscricaoConfirmada } from "@/lib/email/send";

export type InscreverState = { error?: string };

export async function inscreverDupla(
  _prev: InscreverState,
  formData: FormData
): Promise<InscreverState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const championshipId   = formData.get("championship_id") as string;
  const categoryId       = formData.get("category_id") as string;
  const parceiroUsername = ((formData.get("parceiro_username") as string) ?? "").trim().replace(/^@/, "");
  const cpfInput         = ((formData.get("cpf") as string) ?? "").replace(/\D/g, "");
  const metodo           = ((formData.get("metodo_pagamento") as string) ?? "pix") as MetodoPagamento;
  const ratingDupla      = parseInt(formData.get("rating_dupla") as string) || 0;
  const sandbaggingFlag  = formData.get("sandbagging") === "1";
  const tamanhoCamisa    = ((formData.get("tamanho_camisa") as string) ?? "").trim();

  if (!tamanhoCamisa) return { error: "Selecione o tamanho da camisa." };

  // ── Carrega perfil, campeonato e categoria em paralelo ────────
  const [{ data: profile }, { data: priv }, { data: champ }, { data: cat }] = await Promise.all([
    supabase.from("profiles").select("nome, username").eq("id", user.id).single(),
    supabase.from("profiles_private").select("cpf").eq("user_id", user.id).maybeSingle(),
    supabase.from("championships").select("id, nome, taxa_plataforma, organizador_id, status, inscricoes_fim, is_elite").eq("id", championshipId).single(),
    supabase.from("championship_categories").select("id, nome, valor_inscricao").eq("id", categoryId).single(),
  ]);

  const cpfSalvo = priv?.cpf ?? "";

  if (!profile) return { error: "Perfil não encontrado." };
  if (!champ)   return { error: "Campeonato não encontrado." };
  if (!cat)     return { error: "Categoria não encontrada." };
  if (champ.status !== "inscricoes_abertas")
    return { error: "As inscrições não estão abertas para este campeonato." };

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

  const valorInscricao = Number(cat.valor_inscricao);
  const isGratis       = valorInscricao === 0;

  const cpf = cpfInput || cpfSalvo || "";

  // CPF só é obrigatório para inscrições pagas (Asaas exige)
  if (!isGratis && (!cpf || cpf.length !== 11)) {
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };
  }

  // Chave Pix do organizador só é necessária para inscrições pagas
  // Usa admin client pois o atleta não pode ler a conta do organizador via RLS
  if (!isGratis) {
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

  // Se gratuito e sem parceiro → confirma direto. Com parceiro → ainda precisa do convite.
  const teamStatus = isGratis && !atleta2Id ? "confirmado" : "convite_pendente";

  // ── Cria dupla ────────────────────────────────────────────────
  const { data: team, error: teamError } = await supabase
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
  if (teamError || !team) return { error: "Erro ao criar dupla." };

  // ── Cria inscrição ────────────────────────────────────────────
  const BILLING_TYPE: Record<string, string> = { pix: "PIX", credito: "CREDIT_CARD", debito: "DEBIT_CARD" };

  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert({
      team_id:          team.id,
      championship_id:  championshipId,
      category_id:      categoryId,
      valor:            valorInscricao,
      status_pagamento: isGratis ? "pago" : "pendente",
      billing_type:     isGratis ? null : (BILLING_TYPE[metodo] ?? null),
    })
    .select("id")
    .single();
  if (regError || !reg) return { error: "Erro ao criar inscrição." };

  // ── Inscrição gratuita sem parceiro: credencial imediata ──────
  if (isGratis && !atleta2Id) {
    await supabase.from("credentials").insert({
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

  // ── Convite por e-mail para inscrições pagas com parceiro ─────
  if (atleta2Id && parceiroDados?.email) {
    await enviarConviteDupla({
      emailConvidado:  parceiroDados.email,
      nomeConvidado:   parceiroDados.nome,
      nomeAtleta1:     profile.nome,
      usernameAtleta1: profile.username ?? "",
      nomeCampeonato:  champ.nome,
      nomeCategoria:   cat.nome,
    });
  }

  // ── Inscrição paga: cria cobrança no Asaas ────────────────────
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

    await supabase
      .from("registrations")
      .update({
        asaas_payment_id:   cobranca.id,
        pix_copy_paste:     cobranca.pixQrCode?.payload ?? null,
        pix_qr_code_base64: cobranca.pixQrCode?.encodedImage ?? null,
        invoice_url:        cobranca.invoiceUrl ?? null,
      })
      .eq("id", reg.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao gerar Pix: ${msg}` };
  }

  redirect(`/campeonatos/${championshipId}/pagamento/${reg.id}`);
}
