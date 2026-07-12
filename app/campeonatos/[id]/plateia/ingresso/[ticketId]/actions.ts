"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { reembolsarPagamento } from "@/lib/asaas";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

// ── Alterar titularidade ────────────────────────────────────────────────────
// Checkout de visitante: o link do ingresso É a credencial (sem login), então
// quem tem o link pode editar. Transferência imediata, sem confirmação extra,
// sem custo.

export type TitularidadePlateiaInput = {
  ticketId:       string;
  accessToken:    string;
  compradorNome:  string;
  compradorEmail: string;
  compradorCpf:   string;
};

export async function alterarTitularidadePlateia(
  input: TitularidadePlateiaInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(input.accessToken);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("spectator_tickets")
    .select("id, championship_id, status_pagamento")
    .eq("id", input.ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso foi cancelado — não dá pra alterar." };

  const compradorNome  = input.compradorNome.trim();
  const compradorEmail = input.compradorEmail.trim();
  const compradorCpf   = input.compradorCpf.replace(/\D/g, "");

  if (!compradorNome) return { ok: false, error: "Informe o nome." };
  if (!compradorEmail.includes("@")) return { ok: false, error: "E-mail inválido." };
  if (compradorCpf.length !== 11) return { ok: false, error: "CPF inválido (11 dígitos)." };

  const { error } = await admin
    .from("spectator_tickets")
    .update({
      comprador_nome:  compradorNome,
      comprador_email: compradorEmail,
      comprador_cpf:   compradorCpf,
    })
    .eq("id", input.ticketId)
    .eq("access_token", accessToken);

  if (error) return { ok: false, error: "Erro ao salvar. Tente de novo." };

  revalidatePath(`/campeonatos/${ticket.championship_id}/plateia/ingresso/${input.ticketId}`);
  return { ok: true };
}

// ── Cancelar ingresso ────────────────────────────────────────────────────────
// Pendente: só marca cancelado (nada foi cobrado ainda). Pago: estorna via
// Asaas com a mesma regra de 7 dias (CDC) já usada na inscrição de dupla —
// total até 7 dias da compra, parcial (sem a taxa de serviço) depois disso.
export async function cancelarIngressoPlateia(
  ticketId: string,
  accessTokenRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const accessToken = normalizarTicketAccessToken(accessTokenRaw);
  if (!accessToken) return { ok: false, error: "Link do ingresso invalido." };

  const { data: ticket } = await admin
    .from("spectator_tickets")
    .select("id, championship_id, valor, status_pagamento, asaas_payment_id, created_at")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();

  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };
  if (ticket.status_pagamento === "estornado")
    return { ok: false, error: "Esse ingresso já foi cancelado." };

  const path = `/campeonatos/${ticket.championship_id}/plateia/ingresso/${ticketId}`;

  // Ainda não pago — cancela sem mexer em pagamento nenhum.
  if (ticket.status_pagamento === "pendente") {
    await admin
      .from("spectator_tickets")
      .update({ status_pagamento: "estornado" })
      .eq("id", ticketId)
      .eq("access_token", accessToken)
      .eq("status_pagamento", "pendente");
    revalidatePath(path);
    return { ok: true };
  }

  // Pago, mas grátis ou sem cobrança real no Asaas — só marca cancelado.
  if (!ticket.asaas_payment_id || Number(ticket.valor) <= 0) {
    const { data: claimed } = await admin
      .from("spectator_tickets")
      .update({ status_pagamento: "estornado" })
      .eq("id", ticketId)
      .eq("access_token", accessToken)
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
    .from("spectator_tickets")
    .update({ status_pagamento: "estornado" })
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .eq("status_pagamento", "pago")
    .select("id");

  if (!claimed || claimed.length === 0) return { ok: false, error: "Esse cancelamento já foi solicitado." };

  try {
    await reembolsarPagamento(ticket.asaas_payment_id, valorParcial);
  } catch (err) {
    await admin.from("spectator_tickets").update({ status_pagamento: "pago" }).eq("id", ticketId).eq("access_token", accessToken);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { ok: false, error: `Erro ao processar o estorno: ${msg}` };
  }

  revalidatePath(path);
  return { ok: true };
}
