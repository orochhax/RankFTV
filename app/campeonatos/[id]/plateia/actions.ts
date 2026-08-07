"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarOuBuscarCliente } from "@/lib/asaas";
import { buscarCupomValido } from "@/lib/cupons";
import { createIdempotentCharge } from "@/lib/payment-flows";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calcularDesconto, calcularTotalComprador } from "@/lib/taxas";
import { gerarTicketAccessToken } from "@/lib/ticket-access";
import { resolverPrecos } from "@/lib/lotes";

export type ComprarState = { error?: string };

type RequestedItem = { ticketTypeId: string; qty: number };
type CreatedOrder = {
  ticket_id: string;
  valor: number | string;
  quantidade: number;
  resumo: string;
};

function spectatorOrderError(message: string): string {
  if (message.includes("spectator_sales_closed")) return "As vendas de ingresso nao estao abertas.";
  if (message.includes("spectator_ticket_type_sold_out")) return "Um dos ingressos acabou de esgotar.";
  if (message.includes("spectator_pricing_tier")) return "O lote selecionado acabou de esgotar. Atualize a pagina.";
  if (message.includes("spectator_coupon_unavailable")) return "Esse cupom nao esta mais disponivel.";
  if (message.includes("spectator_cpf_required")) return "Informe um CPF valido para concluir o pagamento.";
  if (message.includes("spectator_payout_unavailable")) return "O organizador ainda nao ativou o recebimento.";
  if (message.includes("spectator_quantity_invalid")) return "A quantidade escolhida nao e valida.";
  return "Nao foi possivel reservar os ingressos. Atualize a pagina e tente novamente.";
}

async function releaseOrder(ticketId: string) {
  await createAdminClient().rpc("release_spectator_ticket_order", {
    p_ticket_id: ticketId,
    p_target_status: "expirado",
  });
}

// Guest checkout. Inventory, tiers, coupon and normalized lines are committed
// by one database transaction. A provider timeout never releases that stock:
// the financial operation stays available for automatic reconciliation.
export async function comprarIngresso(
  _prev: ComprarState,
  formData: FormData,
): Promise<ComprarState> {
  const championshipId = String(formData.get("championship_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "");
  const cupomCodigo = String(formData.get("cupom_codigo") ?? "").trim();

  let requested: RequestedItem[];
  try {
    const parsed = JSON.parse(String(formData.get("itens") ?? "[]")) as RequestedItem[];
    requested = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { error: "Pedido invalido." };
  }

  if (!nome) return { error: "Informe seu nome." };
  if (!email.includes("@")) return { error: "Informe um e-mail valido." };

  const quantities = new Map<string, number>();
  for (const item of requested) {
    if (!item?.ticketTypeId) continue;
    const qty = Math.floor(Number(item.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    quantities.set(item.ticketTypeId, (quantities.get(item.ticketTypeId) ?? 0) + qty);
  }
  if (quantities.size === 0) return { error: "Escolha pelo menos um ingresso." };
  if ([...quantities.values()].some((qty) => qty > 20)) {
    return { error: "O limite e de 20 ingressos por tipo em cada pedido." };
  }

  const ip = getClientIp(await headers());
  const [okIp, okEmail] = await Promise.all([
    checkRateLimit(`plateia:ip:${ip}`, 8, 600),
    checkRateLimit(`plateia:email:${email}`, 5, 600),
  ]);
  if (!okIp || !okEmail) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const sessionClient = await createClient();
  const { data: { user: buyerUser } } = await sessionClient.auth.getUser();
  const admin = createAdminClient();

  const [{ data: champ }, { data: types }] = await Promise.all([
    admin
      .from("championships")
      .select("nome, status, organizador_id, is_elite")
      .eq("id", championshipId)
      .maybeSingle(),
    admin
      .from("spectator_ticket_types")
      .select("id, nome, valor")
      .eq("championship_id", championshipId)
      .eq("ativo", true)
      .in("id", [...quantities.keys()]),
  ]);

  if (!champ) return { error: "Campeonato nao encontrado." };
  if (!new Set(["inscricoes_abertas", "em_andamento"]).has(champ.status)) {
    return { error: "As vendas de ingresso nao estao abertas." };
  }
  if ((types?.length ?? 0) !== quantities.size) return { error: "Ingresso indisponivel." };

  // This preview only improves validation feedback. The RPC below resolves
  // prices and claims inventory again under row locks and is authoritative.
  const baseValues = Object.fromEntries((types ?? []).map((type) => [type.id, Number(type.valor)]));
  const previewPrices = await resolverPrecos("ticket_type", [...quantities.keys()], baseValues);
  const previewBase = [...quantities.entries()].reduce(
    (total, [typeId, qty]) => total + previewPrices[typeId].valor * qty,
    0,
  );
  let previewFinal = previewBase;
  if (cupomCodigo) {
    const result = await buscarCupomValido(championshipId, cupomCodigo, "plateia");
    if (!result.cupom) return { error: result.error ?? "Cupom invalido." };
    previewFinal -= calcularDesconto(previewBase, result.cupom.tipoDesconto, result.cupom.valorDesconto);
  }
  if (previewFinal > 0 && cpf.length !== 11) {
    return { error: "CPF obrigatorio (somente numeros, 11 digitos)." };
  }

  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  const accessToken = gerarTicketAccessToken();
  const rpcItems = [...quantities.entries()].map(([ticketTypeId, qty]) => ({ ticketTypeId, qty }));
  const { data: created, error: createError } = await admin.rpc("create_spectator_ticket_order", {
    p_championship_id: championshipId,
    p_items: rpcItems,
    p_comprador_nome: nome,
    p_comprador_email: email,
    p_comprador_cpf: cpf || null,
    p_coupon_code: cupomCodigo || null,
    p_code: code,
    p_access_token: accessToken,
    p_user_id: buyerUser?.id ?? null,
  });

  const order = (Array.isArray(created) ? created[0] : created) as CreatedOrder | null;
  if (createError || !order) return { error: spectatorOrderError(createError?.message ?? "") };

  const orderValue = Number(order.valor);
  if (orderValue <= 0) {
    redirect(`/campeonatos/${championshipId}/plateia/ingresso/${order.ticket_id}?token=${accessToken}`);
  }

  let customerId: string;
  try {
    customerId = (await criarOuBuscarCliente({ name: nome, email, cpfCnpj: cpf })).id;
  } catch {
    await releaseOrder(order.ticket_id);
    return { error: "Nao foi possivel preparar o pagamento. Tente novamente." };
  }

  const totalBuyer = calcularTotalComprador(orderValue, "pix", Boolean(champ.is_elite));
  const payment = await createIdempotentCharge({
    flow: "spectator_ticket",
    recordId: order.ticket_id,
    externalReference: `spec:${order.ticket_id}`,
    amount: totalBuyer,
    customerId,
    method: "pix",
    description: `Ingresso plateia ${champ.nome} - ${order.resumo}`,
    actorId: buyerUser?.id ?? null,
    metadata: { championshipId },
  });

  if (!payment.ok) {
    if (!payment.ambiguous && !payment.inProgress) {
      await releaseOrder(order.ticket_id);
      return { error: payment.error };
    }
    redirect(`/campeonatos/${championshipId}/plateia/ingresso/${order.ticket_id}?token=${accessToken}&processando=1`);
  }

  await admin
    .from("spectator_tickets")
    .update({
      asaas_payment_id: payment.provider.id,
      pix_copy_paste: payment.provider.pixQrCode?.payload ?? null,
      pix_qr_code_base64: payment.provider.pixQrCode?.encodedImage ?? null,
      invoice_url: payment.provider.invoiceUrl ?? null,
    })
    .eq("id", order.ticket_id)
    .is("asaas_payment_id", null);

  redirect(`/campeonatos/${championshipId}/plateia/ingresso/${order.ticket_id}?token=${accessToken}`);
}
