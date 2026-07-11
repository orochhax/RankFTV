"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarOuBuscarCliente, reembolsarPagamento } from "@/lib/asaas";
import { calcularTotalComprador } from "@/lib/taxas";

export type CardPaymentInput = {
  ticketId:    string;
  tipo:        "credito" | "debito";
  numero:      string;
  nomeTitular: string;
  mesValidade: string;
  anoValidade: string;
  cvv:         string;
  parcelas:    number;
};

export type CardPaymentResult =
  | { ok: true;  pago: boolean }
  | { ok: false; error: string };

// Pagamento com cartão pro ingresso de atleta avulso (checkout de
// visitante — sem sessão). Os dados do pagador (nome/cpf/e-mail) já foram
// digitados na hora da compra e ficam salvos no próprio ticket; não
// pedimos de novo aqui, só os dados do cartão.
export async function pagarIngressoAtletaComCartao(
  input: CardPaymentInput,
): Promise<CardPaymentResult> {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, comprador_nome, comprador_cpf, comprador_email, valor, status_pagamento")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "pago") return { ok: true, pago: true };

  const { data: champ } = await admin
    .from("championships")
    .select("nome, is_elite")
    .eq("id", ticket.championship_id)
    .single();

  let customer: { id: string };
  try {
    customer = await criarOuBuscarCliente({
      name:    ticket.comprador_nome,
      email:   ticket.comprador_email,
      cpfCnpj: ticket.comprador_cpf,
    });
  } catch {
    return { ok: false, error: "Erro ao registrar dados do pagador." };
  }

  const billingType = input.tipo === "credito" ? "CREDIT_CARD" : "DEBIT_CARD";
  const valorBase    = Number(ticket.valor);
  // Comprador paga valor + taxa de cartão (10% Padrão / 9% Elite, mín. R$3,99).
  const valorTotal   = calcularTotalComprador(valorBase, input.tipo, !!champ?.is_elite);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const cardData = {
    holderName:  input.nomeTitular.toUpperCase(),
    number:      input.numero.replace(/\s/g, ""),
    expiryMonth: input.mesValidade,
    expiryYear:  input.anoValidade,
    ccv:         input.cvv,
  };

  const holderInfo = {
    name:          ticket.comprador_nome,
    email:         ticket.comprador_email,
    cpfCnpj:       ticket.comprador_cpf,
    postalCode:    "00000000",
    addressNumber: "0",
  };

  const body: Record<string, unknown> = {
    customer:          customer.id,
    billingType,
    value:             valorTotal,
    dueDate:           dueDate.toISOString().split("T")[0],
    description:       `Ingresso atleta ${champ?.nome ?? "Campeonato"}`,
    externalReference: `athl:${ticket.id}`,
    creditCard:        cardData,
    creditCardHolderInfo: holderInfo,
  };

  if (input.tipo === "credito" && input.parcelas > 1) {
    body.installmentCount = input.parcelas;
    body.installmentValue = parseFloat((valorTotal / input.parcelas).toFixed(2));
  }

  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return { ok: false, error: "Configuração de pagamento indisponível." };

  try {
    const res = await fetch(`${baseUrl}/payments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "access_token": apiKey },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = "Erro ao processar o cartão.";
      try {
        const json = JSON.parse(text) as { errors?: { description: string }[] };
        if (json.errors?.[0]?.description) msg = json.errors[0].description;
      } catch { /* usa msg padrão */ }
      return { ok: false, error: msg };
    }

    const pagamento = await res.json() as { id: string; status: string; invoiceUrl?: string };
    const pago = ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status);

    await admin.from("athlete_tickets").update({
      asaas_payment_id: pagamento.id,
      status_pagamento: pago ? "pago" : "pendente",
      invoice_url:      pagamento.invoiceUrl ?? null,
      billing_type:     billingType,
    }).eq("id", input.ticketId);

    return { ok: true, pago };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar pagamento.";
    return { ok: false, error: msg };
  }
}

// ── Alterar titularidade ────────────────────────────────────────────────────
// Checkout de visitante: o link do ingresso É a credencial (sem login), então
// quem tem o link pode editar. Transferência imediata, sem confirmação extra,
// sem custo — troca os dados dos dois atletas da dupla.

export type TitularidadeAtletaInput = {
  ticketId:       string;
  compradorNome:  string;
  compradorCpf:   string;
  compradorEmail: string;
  compradorZap:   string;
  compradorGenero: string;
  parceiroNome:   string;
  parceiroCpf:    string;
  parceiroEmail:  string;
  parceiroZap:    string;
  parceiroGenero: string;
};

export async function alterarTitularidadeAtleta(
  input: TitularidadeAtletaInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, category_id, status_pagamento")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso foi cancelado — não dá pra alterar." };

  const compradorNome   = input.compradorNome.trim();
  const compradorCpf    = input.compradorCpf.replace(/\D/g, "");
  const compradorEmail  = input.compradorEmail.trim();
  const compradorZap    = input.compradorZap.replace(/\D/g, "");
  const compradorGenero = input.compradorGenero;
  const parceiroNome    = input.parceiroNome.trim();
  const parceiroCpf     = input.parceiroCpf.replace(/\D/g, "");
  const parceiroEmail   = input.parceiroEmail.trim();
  const parceiroZap     = input.parceiroZap.replace(/\D/g, "");
  const parceiroGenero  = input.parceiroGenero;

  if (!compradorNome)  return { ok: false, error: "Informe o nome do atleta 1." };
  if (compradorCpf.length !== 11) return { ok: false, error: "CPF do atleta 1 inválido (11 dígitos)." };
  if (!compradorEmail.includes("@")) return { ok: false, error: "E-mail do atleta 1 inválido." };
  if (!compradorZap) return { ok: false, error: "Informe o WhatsApp do atleta 1." };
  if (compradorGenero !== "masculino" && compradorGenero !== "feminino")
    return { ok: false, error: "Informe o gênero do atleta 1." };
  if (!parceiroNome)  return { ok: false, error: "Informe o nome do atleta 2." };
  if (parceiroCpf.length !== 11) return { ok: false, error: "CPF do atleta 2 inválido (11 dígitos)." };
  if (!parceiroEmail.includes("@")) return { ok: false, error: "E-mail do atleta 2 inválido." };
  if (!parceiroZap) return { ok: false, error: "Informe o WhatsApp do atleta 2." };
  if (parceiroGenero !== "masculino" && parceiroGenero !== "feminino")
    return { ok: false, error: "Informe o gênero do atleta 2." };

  // Categoria restrita a um gênero (não mista) — os dois atletas precisam bater com ela.
  if (ticket.category_id) {
    const { data: categoria } = await admin
      .from("championship_categories")
      .select("genero")
      .eq("id", ticket.category_id)
      .maybeSingle();

    if (categoria && categoria.genero !== "mista") {
      const generoLabel = categoria.genero === "feminino" ? "feminina" : "masculina";
      if (compradorGenero !== categoria.genero || parceiroGenero !== categoria.genero) {
        return { ok: false, error: `Essa categoria é apenas ${generoLabel} — os dois atletas precisam ser do gênero ${generoLabel}.` };
      }
    }
  }

  const { error } = await admin
    .from("athlete_tickets")
    .update({
      comprador_nome:   compradorNome,
      comprador_cpf:    compradorCpf,
      comprador_email:  compradorEmail,
      comprador_zap:    compradorZap,
      comprador_genero: compradorGenero,
      parceiro_nome:    parceiroNome,
      parceiro_cpf:     parceiroCpf,
      parceiro_email:   parceiroEmail,
      parceiro_zap:     parceiroZap,
      parceiro_genero:  parceiroGenero,
    })
    .eq("id", input.ticketId);

  if (error) return { ok: false, error: "Erro ao salvar. Tente de novo." };

  revalidatePath(`/campeonatos/${ticket.championship_id}/comprar/ingresso/${input.ticketId}`);
  return { ok: true };
}

// ── Cancelar ingresso ────────────────────────────────────────────────────────
// Pendente: só marca cancelado (nada foi cobrado ainda). Pago: estorna via
// Asaas com a mesma regra de 7 dias (CDC) já usada na inscrição de dupla —
// total até 7 dias da compra, parcial (sem a taxa de serviço) depois disso.
export async function cancelarIngressoAtleta(
  ticketId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("athlete_tickets")
    .select("id, championship_id, valor, status_pagamento, asaas_payment_id, created_at")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso já foi cancelado." };

  const path = `/campeonatos/${ticket.championship_id}/comprar/ingresso/${ticketId}`;

  // Ainda não pago — cancela sem mexer em pagamento nenhum.
  if (ticket.status_pagamento === "pendente") {
    await admin
      .from("athlete_tickets")
      .update({ status_pagamento: "estornado" })
      .eq("id", ticketId)
      .eq("status_pagamento", "pendente");
    revalidatePath(path);
    return { ok: true };
  }

  // Pago, mas grátis ou sem cobrança real no Asaas — só marca cancelado.
  if (!ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const { data: claimed } = await admin
      .from("athlete_tickets")
      .update({ status_pagamento: "estornado" })
      .eq("id", ticketId)
      .eq("status_pagamento", "pago")
      .select("id");
    if (!claimed || claimed.length === 0) return { ok: false, error: "Esse cancelamento já foi solicitado." };
    revalidatePath(path);
    return { ok: true };
  }

  // Pago de verdade — estorna via Asaas.
  const diasDesdeCompra = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const dentroDoPrazo   = diasDesdeCompra <= 7;
  const valorParcial    = dentroDoPrazo ? undefined : Number(ticket.valor);

  // Trava de idempotência: reivindica o cancelamento antes de chamar o Asaas.
  const { data: claimed } = await admin
    .from("athlete_tickets")
    .update({ status_pagamento: "estornado" })
    .eq("id", ticketId)
    .eq("status_pagamento", "pago")
    .select("id");

  if (!claimed || claimed.length === 0) return { ok: false, error: "Esse cancelamento já foi solicitado." };

  try {
    await reembolsarPagamento(ticket.asaas_payment_id, valorParcial);
  } catch (err) {
    await admin.from("athlete_tickets").update({ status_pagamento: "pago" }).eq("id", ticketId);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Erro ao processar o estorno: ${msg}` };
  }

  revalidatePath(path);
  return { ok: true };
}
