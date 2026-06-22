"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";

export type ComprarState = { error?: string };

// Checkout de plateia como VISITANTE (sem conta). Um PEDIDO pode ter vários
// tipos/quantidades de ingresso — soma tudo e cobra de uma vez (Pix).
// Cria 1 linha de spectator_tickets representando o pedido. Usa admin client
// porque o comprador não tem sessão.
export async function comprarIngresso(
  _prev: ComprarState,
  formData: FormData,
): Promise<ComprarState> {
  const championshipId = formData.get("championship_id") as string;
  const nome  = ((formData.get("nome") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim();
  const cpf   = ((formData.get("cpf") as string) ?? "").replace(/\D/g, "");

  // itens = [{ ticketTypeId, qty }]
  let pedido: { ticketTypeId: string; qty: number }[] = [];
  try {
    pedido = JSON.parse((formData.get("itens") as string) || "[]");
  } catch {
    return { error: "Pedido inválido." };
  }
  pedido = pedido.filter((i) => i?.ticketTypeId && Number(i.qty) > 0);

  if (!nome)  return { error: "Informe seu nome." };
  if (!email || !email.includes("@")) return { error: "Informe um e-mail válido." };
  if (pedido.length === 0) return { error: "Escolha pelo menos um ingresso." };

  const supabase = createAdminClient();

  const [{ data: tipos }, { data: champ }] = await Promise.all([
    supabase
      .from("spectator_ticket_types")
      .select("id, nome, valor, ativo, championship_id")
      .eq("championship_id", championshipId)
      .eq("ativo", true),
    supabase
      .from("championships")
      .select("nome, status, organizador_id, is_elite")
      .eq("id", championshipId)
      .maybeSingle(),
  ]);

  if (!champ) return { error: "Campeonato não encontrado." };
  if (champ.status !== "inscricoes_abertas" && champ.status !== "em_andamento")
    return { error: "As vendas de ingresso não estão abertas." };

  const tipoMap = new Map((tipos ?? []).map((t) => [t.id, t]));

  // Monta as linhas do pedido a partir dos tipos válidos
  const linhas: { id: string; tipo_nome: string; qty: number; valor_unit: number }[] = [];
  for (const item of pedido) {
    const t = tipoMap.get(item.ticketTypeId);
    if (!t) continue;
    const qty = Math.min(20, Math.max(1, Math.floor(Number(item.qty))));
    linhas.push({ id: t.id, tipo_nome: t.nome, qty, valor_unit: Number(t.valor) });
  }
  if (linhas.length === 0) return { error: "Ingresso indisponível." };

  const totalBase  = linhas.reduce((s, l) => s + l.valor_unit * l.qty, 0);
  const quantidade = linhas.reduce((s, l) => s + l.qty, 0);
  const resumo     = linhas.map((l) => `${l.qty}x ${l.tipo_nome}`).join(", ");
  const isGratis   = totalBase === 0;
  // itens guardados sem o id interno (só o que interessa pra exibição)
  const itensJson  = linhas.map((l) => ({ tipo_nome: l.tipo_nome, qty: l.qty, valor_unit: l.valor_unit }));

  if (!isGratis && (!cpf || cpf.length !== 11))
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };

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
    .from("spectator_tickets")
    .insert({
      championship_id:  championshipId,
      ticket_type_id:   linhas.length === 1 ? linhas[0].id : null,
      tipo_nome:        resumo,
      itens:            itensJson,
      quantidade,
      comprador_nome:   nome,
      comprador_email:  email,
      comprador_cpf:    cpf || null,
      valor:            totalBase,
      status_pagamento: isGratis ? "pago" : "pendente",
      billing_type:     isGratis ? null : "PIX",
      code,
    })
    .select("id")
    .single();

  if (insErr || !ticket) return { error: "Erro ao gerar o ingresso. Tente de novo." };

  if (isGratis) {
    redirect(`/campeonatos/${championshipId}/plateia/ingresso/${ticket.id}`);
  }

  try {
    const customer = await criarOuBuscarCliente({ name: nome, email, cpfCnpj: cpf });
    // Comprador paga total + taxa Pix (8% Padrão / 7% Elite, mín. R$3,99).
    const totalComprador = calcularTotalComprador(totalBase, "pix", !!champ.is_elite);
    const cobranca = await criarCobranca({
      customerId:        customer.id,
      valorBase:         totalComprador,
      metodo:            "pix",
      descricao:         `Ingresso plateia ${champ.nome} — ${resumo}`,
      externalReference: `spec:${ticket.id}`,
    });

    await supabase
      .from("spectator_tickets")
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

  redirect(`/campeonatos/${championshipId}/plateia/ingresso/${ticket.id}`);
}
