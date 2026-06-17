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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const championshipId    = formData.get("championship_id") as string;
  const categoryId        = formData.get("category_id") as string;
  const parceiroUsername  = ((formData.get("parceiro_username") as string) ?? "").trim().replace(/^@/, "");
  const cpfInput          = ((formData.get("cpf") as string) ?? "").replace(/\D/g, "");
  const metodo            = ((formData.get("metodo_pagamento") as string) ?? "pix") as MetodoPagamento;
  const ratingDupla       = parseInt(formData.get("rating_dupla") as string) || 0;
  const sandbaggingFlag   = formData.get("sandbagging") === "1";

  // ── Carrega perfil ────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cpf")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Perfil não encontrado." };

  const cpf = cpfInput || profile.cpf || "";
  if (!cpf || cpf.length !== 11) {
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };
  }

  // ── Carrega campeonato ────────────────────────────────────────
  const { data: champ } = await supabase
    .from("championships")
    .select("id, nome, taxa_plataforma, organizador_id, status")
    .eq("id", championshipId)
    .single();
  if (!champ) return { error: "Campeonato não encontrado." };
  if (champ.status !== "inscricoes_abertas")
    return { error: "As inscrições não estão abertas para este campeonato." };

  // ── Carrega categoria ─────────────────────────────────────────
  const { data: cat } = await supabase
    .from("championship_categories")
    .select("id, nome, valor_inscricao")
    .eq("id", categoryId)
    .single();
  if (!cat) return { error: "Categoria não encontrada." };

  // ── Chave Pix do organizador ──────────────────────────────────
  const { data: orgAccount } = await supabase
    .from("organizer_accounts")
    .select("chave_pix")
    .eq("user_id", champ.organizador_id)
    .single();
  if (!orgAccount?.chave_pix)
    return { error: "O organizador ainda não ativou o recebimento de pagamentos." };

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

  // ── Salva CPF no perfil se ainda não estava ───────────────────
  if (!profile.cpf) {
    await supabase.from("profiles").update({ cpf }).eq("id", user.id);
  }

  // ── Cria dupla ────────────────────────────────────────────────
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      championship_id:   championshipId,
      category_id:       categoryId,
      atleta1_id:        user.id,
      atleta2_id:        atleta2Id,
      parceiro_username: parceiroUsername || null,
      status:            "convite_pendente",
      sandbagging_flag:  sandbaggingFlag,
      rating_dupla:      ratingDupla || null,
    })
    .select("id")
    .single();
  if (teamError || !team) return { error: "Erro ao criar dupla." };

  // ── Cria inscrição (ainda sem pagamento) ──────────────────────
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .insert({
      team_id:         team.id,
      championship_id: championshipId,
      category_id:     categoryId,
      valor:           cat.valor_inscricao,
      status_pagamento: "pendente",
    })
    .select("id")
    .single();
  if (regError || !reg) return { error: "Erro ao criar inscrição." };

  // ── Cria cliente e cobrança Pix no Asaas ─────────────────────
  try {
    const customer = await criarOuBuscarCliente({
      name:     profile.nome,
      email:    user.email!,
      cpfCnpj: cpf,
    });

    const cobranca = await criarCobranca({
      customerId:        customer.id,
      valorBase:         Number(cat.valor_inscricao),
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
