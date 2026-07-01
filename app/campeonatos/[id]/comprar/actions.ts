"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";

export type ComprarAtletaState = { error?: string };

export async function comprarIngressoAtleta(
  _prev: ComprarAtletaState,
  formData: FormData,
): Promise<ComprarAtletaState> {
  const championshipId = formData.get("championship_id") as string;
  const categoryId     = (formData.get("category_id") as string) || null;
  const categoriaNome  = (formData.get("categoria_nome") as string) || null;
  const valorBase      = parseFloat((formData.get("valor") as string) || "0");

  // Comprador
  const nome      = ((formData.get("comprador_nome")  as string) ?? "").trim();
  const cpf       = ((formData.get("comprador_cpf")   as string) ?? "").replace(/\D/g, "");
  const email     = ((formData.get("comprador_email") as string) ?? "").trim();
  const zap       = ((formData.get("comprador_zap")   as string) ?? "").replace(/\D/g, "") || null;
  const genero    = (formData.get("comprador_genero") as string) || null;
  const nasc      = (formData.get("comprador_nascimento") as string) || null;
  const camisa    = (formData.get("comprador_camisa") as string) || null;

  // Parceiro
  const pNome   = ((formData.get("parceiro_nome")  as string) ?? "").trim();
  const pCpf    = ((formData.get("parceiro_cpf")   as string) ?? "").replace(/\D/g, "");
  const pEmail  = ((formData.get("parceiro_email") as string) ?? "").trim() || null;
  const pZap    = ((formData.get("parceiro_zap")   as string) ?? "").replace(/\D/g, "") || null;
  const pGenero  = (formData.get("parceiro_genero") as string) || null;
  const pCamisa  = (formData.get("parceiro_camisa") as string) || null;

  if (!nome)                               return { error: "Informe seu nome completo." };
  if (!email || !email.includes("@"))      return { error: "Informe um e-mail válido." };
  if (!cpf || cpf.length !== 11)           return { error: "CPF inválido (somente números, 11 dígitos)." };
  if (!pNome)                              return { error: "Informe o nome do parceiro." };
  if (!pCpf || pCpf.length !== 11)        return { error: "CPF do parceiro inválido (11 dígitos)." };
  if (cpf === pCpf)                        return { error: "O CPF do parceiro não pode ser igual ao seu." };
  if (!categoryId)                         return { error: "Selecione uma categoria." };

  const supabase = createAdminClient();

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, status, organizador_id, is_elite")
    .eq("id", championshipId)
    .maybeSingle();

  if (!champ) return { error: "Campeonato não encontrado." };
  if (champ.status !== "inscricoes_abertas" && champ.status !== "em_andamento")
    return { error: "As inscrições não estão abertas." };

  const isGratis = valorBase <= 0;

  if (!isGratis) {
    const { data: org } = await supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .maybeSingle();
    if (!org?.chave_pix)
      return { error: "O organizador ainda não ativou o recebimento. Tente mais tarde." };
  }

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();

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
      valor:                valorBase,
      status_pagamento:     isGratis ? "pago" : "pendente",
      billing_type:         isGratis ? null : "PIX",
      code,
    })
    .select("id")
    .single();

  if (insErr || !ticket) return { error: "Erro ao gerar o ingresso. Tente novamente." };

  if (isGratis) {
    redirect(`/campeonatos/${championshipId}/comprar/ingresso/${ticket.id}`);
  }

  try {
    const customer      = await criarOuBuscarCliente({ name: nome, email, cpfCnpj: cpf });
    const totalComprador = calcularTotalComprador(valorBase, "pix", !!champ.is_elite);
    const cobranca      = await criarCobranca({
      customerId:        customer.id,
      valorBase:         totalComprador,
      metodo:            "pix",
      descricao:         `Ingresso atleta ${champ.nome} — ${categoriaNome ?? "dupla"} (${nome} + ${pNome})`,
      externalReference: `athl:${ticket.id}`,
    });

    await supabase
      .from("athlete_tickets")
      .update({
        asaas_payment_id:   cobranca.id,
        pix_copy_paste:     cobranca.pixQrCode?.payload ?? null,
        pix_qr_code_base64: cobranca.pixQrCode?.encodedImage ?? null,
        invoice_url:        cobranca.invoiceUrl ?? null,
      })
      .eq("id", ticket.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao gerar o Pix: ${msg}` };
  }

  redirect(`/campeonatos/${championshipId}/comprar/ingresso/${ticket.id}`);
}
