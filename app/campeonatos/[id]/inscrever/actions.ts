"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarOuBuscarCliente, criarCobranca, type MetodoPagamento } from "@/lib/asaas";

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
  const [{ data: profile }, { data: champ }, { data: cat }] = await Promise.all([
    supabase.from("profiles").select("nome, cpf").eq("id", user.id).single(),
    supabase.from("championships").select("id, nome, taxa_plataforma, organizador_id, status").eq("id", championshipId).single(),
    supabase.from("championship_categories").select("id, nome, valor_inscricao").eq("id", categoryId).single(),
  ]);

  if (!profile) return { error: "Perfil não encontrado." };
  if (!champ)   return { error: "Campeonato não encontrado." };
  if (!cat)     return { error: "Categoria não encontrada." };
  if (champ.status !== "inscricoes_abertas")
    return { error: "As inscrições não estão abertas para este campeonato." };

  // ── Verifica se já está inscrito ──────────────────────────────
  const { data: inscricaoExistente } = await supabase
    .from("teams")
    .select("id")
    .eq("championship_id", championshipId)
    .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (inscricaoExistente) {
    return { error: "Você já está inscrito neste campeonato." };
  }

  const valorInscricao = Number(cat.valor_inscricao);
  const isGratis       = valorInscricao === 0;

  const cpf = cpfInput || profile.cpf || "";

  // CPF só é obrigatório para inscrições pagas (Asaas exige)
  if (!isGratis && (!cpf || cpf.length !== 11)) {
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };
  }

  // Chave Pix do organizador só é necessária para inscrições pagas
  if (!isGratis) {
    const { data: orgAccount } = await supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .single();
    if (!orgAccount?.chave_pix)
      return { error: "O organizador ainda não ativou o recebimento de pagamentos." };
  }

  // ── Parceiro (opcional) ───────────────────────────────────────
  let atleta2Id: string | null = null;
  if (parceiroUsername) {
    const { data: parceiro } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parceiroUsername)
      .single();
    if (!parceiro)
      return { error: `Usuário @${parceiroUsername} não encontrado.` };
    atleta2Id = parceiro.id;
  }

  // ── Salva CPF e tamanho de camisa no perfil ──────────────────
  const profileUpdates: Record<string, string> = { tamanho_camisa: tamanhoCamisa };
  if (!profile.cpf && cpf) profileUpdates.cpf = cpf;
  await supabase.from("profiles").update(profileUpdates).eq("id", user.id);

  // ── Cria dupla ────────────────────────────────────────────────
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      championship_id:   championshipId,
      category_id:       categoryId,
      atleta1_id:        user.id,
      atleta2_id:        atleta2Id,
      parceiro_username: parceiroUsername || null,
      status:            isGratis ? "confirmado" : "convite_pendente",
      sandbagging_flag:  sandbaggingFlag,
      rating_dupla:      ratingDupla || null,
    })
    .select("id")
    .single();
  if (teamError || !team) return { error: "Erro ao criar dupla." };

  // ── Cria inscrição ────────────────────────────────────────────
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert({
      team_id:          team.id,
      championship_id:  championshipId,
      category_id:      categoryId,
      valor:            valorInscricao,
      status_pagamento: isGratis ? "pago" : "pendente",
    })
    .select("id")
    .single();
  if (regError || !reg) return { error: "Erro ao criar inscrição." };

  // ── Inscrição gratuita: gera credencial e redireciona ─────────
  if (isGratis) {
    await supabase.from("credentials").insert({
      user_id:         user.id,
      championship_id: championshipId,
      role:            "atleta",
      qr_token:        crypto.randomUUID(),
      checked_in:      false,
    });
    redirect(`/minhas-inscricoes/${championshipId}`);
  }

  // ── Inscrição paga: cria cobrança no Asaas ────────────────────
  try {
    const customer = await criarOuBuscarCliente({
      name:     profile.nome,
      email:    user.email!,
      cpfCnpj: cpf,
    });

    const cobranca = await criarCobranca({
      customerId:        customer.id,
      valorBase:         valorInscricao,
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
