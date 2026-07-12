"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, criarCobranca } from "@/lib/asaas";
import { calcularTotalComprador, calcularDesconto } from "@/lib/taxas";
import { buscarCupomValido } from "@/lib/cupons";
import { resolverPrecos, resolverEClaimarLote } from "@/lib/lotes";
import { gerarTicketAccessToken } from "@/lib/ticket-access";

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
  const cupomCodigo = ((formData.get("cupom_codigo") as string) ?? "").trim();

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

  // Monta as linhas do pedido a partir dos tipos válidos (preço "de tabela",
  // ainda sem lote resolvido)
  const linhasBase: { id: string; tipo_nome: string; qty: number; valorBase: number }[] = [];
  for (const item of pedido) {
    const t = tipoMap.get(item.ticketTypeId);
    if (!t) continue;
    const qty = Math.min(20, Math.max(1, Math.floor(Number(item.qty))));
    linhasBase.push({ id: t.id, tipo_nome: t.nome, qty, valorBase: Number(t.valor) });
  }
  if (linhasBase.length === 0) return { error: "Ingresso indisponível." };

  // ── Cupom de desconto (opcional) — só valida aqui (preview), sem
  // reivindicar ainda.
  let cupomPreview: Awaited<ReturnType<typeof buscarCupomValido>>["cupom"];
  if (cupomCodigo) {
    const { cupom, error: cupomErro } = await buscarCupomValido(championshipId, cupomCodigo, "plateia");
    if (cupomErro || !cupom) return { error: cupomErro ?? "Cupom inválido." };
    cupomPreview = cupom;
  }

  // Preço estimado (lote vigente de cada tipo + cupom) só pra decidir se
  // CPF/chave Pix são obrigatórios agora. O valor definitivo é travado nos
  // claims atômicos logo abaixo.
  const precoPreview = await resolverPrecos(
    "ticket_type",
    linhasBase.map((l) => l.id),
    Object.fromEntries(linhasBase.map((l) => [l.id, l.valorBase])),
  );
  const totalBasePreview = linhasBase.reduce((s, l) => s + precoPreview[l.id].valor * l.qty, 0);
  const descontoPreview = cupomPreview
    ? calcularDesconto(totalBasePreview, cupomPreview.tipoDesconto, cupomPreview.valorDesconto)
    : 0;
  const isGratisPreview = Math.max(0, totalBasePreview - descontoPreview) === 0;

  if (!isGratisPreview && (!cpf || cpf.length !== 11))
    return { error: "CPF obrigatório (somente números, 11 dígitos)." };

  if (!isGratisPreview) {
    const { data: org } = await supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", champ.organizador_id)
      .maybeSingle();
    if (!org?.chave_pix)
      return { error: "O organizador ainda não ativou o recebimento. Tente mais tarde." };
  }

  // ── Reivindica o lote de CADA linha do carrinho (atômico). Se alguma
  // linha falhar (esgotou entre o preview e agora), desfaz as anteriores.
  const lotesClaimed: { loteId: string; qty: number }[] = [];
  const linhas: { id: string; tipo_nome: string; qty: number; valor_unit: number; lote_nome: string | null }[] = [];

  for (const l of linhasBase) {
    const claim = await resolverEClaimarLote("ticket_type", l.id, l.valorBase, l.qty);
    if (!claim.ok) {
      for (const c of lotesClaimed) await supabase.rpc("release_pricing_tier", { p_tier_id: c.loteId, p_qty: c.qty });
      return { error: `${l.tipo_nome}: ${claim.error}` };
    }
    if (claim.loteId) lotesClaimed.push({ loteId: claim.loteId, qty: l.qty });
    linhas.push({
      id: l.id,
      tipo_nome: l.tipo_nome,
      qty: l.qty,
      valor_unit: claim.valor,
      lote_nome: precoPreview[l.id].loteNome,
    });
  }

  async function liberarLotes() {
    for (const c of lotesClaimed) await supabase.rpc("release_pricing_tier", { p_tier_id: c.loteId, p_qty: c.qty });
  }

  const totalBase  = linhas.reduce((s, l) => s + l.valor_unit * l.qty, 0);
  const quantidade = linhas.reduce((s, l) => s + l.qty, 0);
  const resumo     = linhas.map((l) => `${l.qty}x ${l.tipo_nome}`).join(", ");
  // itens guardados sem o id interno (só o que interessa pra exibição)
  const itensJson  = linhas.map((l) => ({
    tipo_nome: l.tipo_nome, qty: l.qty, valor_unit: l.valor_unit, lote_nome: l.lote_nome,
  }));

  // ── Reivindica o cupom (atômico) sobre o total já com lote ─────
  let cupomId: string | null = null;
  let valorFinal = totalBase;
  if (cupomPreview) {
    const desconto = calcularDesconto(totalBase, cupomPreview.tipoDesconto, cupomPreview.valorDesconto);
    valorFinal = Math.round((totalBase - desconto) * 100) / 100;
    const { data: claimed } = await supabase.rpc("claim_coupon_use", { p_coupon_id: cupomPreview.id });
    if (!claimed) {
      await liberarLotes();
      return { error: "Esse cupom acabou de esgotar. Tente novamente sem ele." };
    }
    cupomId = cupomPreview.id;
  }

  const isGratis = valorFinal <= 0;

  // A checagem de CPF/chave Pix já foi feita com o preview — se o valor
  // definitivo virou grátis (ex.: cupom de 100%), ok seguir sem CPF; se
  // continuou pago, o CPF já foi validado acima.

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const accessToken = gerarTicketAccessToken();

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
      valor:            valorFinal,
      cupom_id:         cupomId,
      status_pagamento: isGratis ? "pago" : "pendente",
      billing_type:     isGratis ? null : "PIX",
      code,
      access_token:     accessToken,
    })
    .select("id")
    .single();

  if (insErr || !ticket) {
    if (cupomId) await supabase.rpc("release_coupon_use", { p_coupon_id: cupomId });
    await liberarLotes();
    return { error: "Erro ao gerar o ingresso. Tente de novo." };
  }

  if (isGratis) {
    redirect(`/campeonatos/${championshipId}/plateia/ingresso/${ticket.id}?token=${accessToken}`);
  }

  try {
    const customer = await criarOuBuscarCliente({ name: nome, email, cpfCnpj: cpf });
    // Comprador paga total (já com desconto) + taxa Pix (8% Padrão / 7% Elite, mín. R$3,99).
    const totalComprador = calcularTotalComprador(valorFinal, "pix", !!champ.is_elite);
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
    if (cupomId) await supabase.rpc("release_coupon_use", { p_coupon_id: cupomId });
    await liberarLotes();
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { error: `Erro ao gerar o Pix: ${msg}` };
  }

  redirect(`/campeonatos/${championshipId}/plateia/ingresso/${ticket.id}?token=${accessToken}`);
}
