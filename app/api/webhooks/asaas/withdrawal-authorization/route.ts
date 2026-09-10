import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consultarTransferencia, listarEstornosCobranca } from "@/lib/asaas";
import {
  hasUniqueAuthorizableProviderRefund,
  parseWithdrawalAuthorization,
  sameMoney,
  type TransferAuthorizationPayload,
  withdrawalRecipientDigest,
} from "@/lib/asaas-withdrawal-authorization";
import { reportOperationalEvent } from "@/lib/observability";
import { createAdminClient } from "@/lib/supabase/admin";

type RefundFlow = "registration" | "athlete_ticket" | "spectator_ticket";

function secureTokenEquals(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function refused(reason: string) {
  return NextResponse.json({ status: "REFUSED", refuseReason: reason });
}

async function activeDomainRecord(flow: RefundFlow, recordId: string, paymentId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (flow === "athlete_ticket") {
    const [{ data: ticket }, { count }] = await Promise.all([
      admin.from("athlete_tickets").select("status_pagamento, asaas_payment_id, checked_in")
        .eq("id", recordId).maybeSingle(),
      admin.from("athlete_ticket_credentials").select("id", { count: "exact", head: true })
        .eq("athlete_ticket_id", recordId).eq("checked_in", true),
    ]);
    return ticket?.status_pagamento === "pago" && ticket.asaas_payment_id === paymentId
      && !ticket.checked_in && count === 0;
  }
  if (flow === "spectator_ticket") {
    const { data: ticket } = await admin.from("spectator_tickets")
      .select("status_pagamento, asaas_payment_id, checked_in")
      .eq("id", recordId).maybeSingle();
    return ticket?.status_pagamento === "pago" && ticket.asaas_payment_id === paymentId && !ticket.checked_in;
  }
  const [{ data: registration }, { count }] = await Promise.all([
    admin.from("registrations").select("status_pagamento, asaas_payment_id")
      .eq("id", recordId).maybeSingle(),
    admin.from("credentials").select("id", { count: "exact", head: true })
      .eq("registration_id", recordId).eq("checked_in", true),
  ]);
  return registration?.status_pagamento === "pago" && registration.asaas_payment_id === paymentId && count === 0;
}

async function audit(decision: "approved" | "refused", refundId: string, paymentId: string, reason: string) {
  await reportOperationalEvent({
    level: decision === "approved" ? "info" : "warn",
    event: `asaas.withdrawal_authorization.${decision}`,
    message: reason,
    context: { refundId, paymentId },
    alert: decision === "refused",
  });
}

async function authorizeTransfer(body: TransferAuthorizationPayload) {
  const transfer = body.transfer;
  const admin = createAdminClient();
  const provider = await consultarTransferencia(transfer.id);
  const providerPixKey = provider.pixAddressKey ?? provider.bankAccount?.pixAddressKey ?? undefined;
  const recipientHashSecret = process.env.PAYMENT_FINGERPRINT_SECRET;
  const { data: operations, error } = await admin.from("financial_operations")
    .select("id, amount, external_reference, metadata")
    .eq("operation_type", "transfer").eq("provider_id", transfer.id)
    .in("status", ["processing", "provider_created", "ambiguous"])
    .order("created_at", { ascending: false }).limit(2);
  const operation = operations?.length === 1 ? operations[0] : null;
  const metadata = operation?.metadata as Record<string, unknown> | null | undefined;
  const expectedDigest = typeof metadata?.recipientDigest === "string" ? metadata.recipientDigest : null;
  const receivedPixKey = providerPixKey ?? transfer.pixAddressKey;
  const valid = !error && operation
    && provider.id === transfer.id && provider.status === "PENDING"
    && provider.operationType === "PIX"
    && sameMoney(provider.value, transfer.value) && sameMoney(operation.amount, transfer.value)
    && provider.externalReference === operation.external_reference
    && (!transfer.externalReference || transfer.externalReference === operation.external_reference)
    && !!receivedPixKey && !!expectedDigest && !!recipientHashSecret
    && withdrawalRecipientDigest(receivedPixKey, recipientHashSecret) === expectedDigest
    && (!providerPixKey || !transfer.pixAddressKey
      || withdrawalRecipientDigest(providerPixKey, recipientHashSecret)
        === withdrawalRecipientDigest(transfer.pixAddressKey, recipientHashSecret))
    && (!metadata?.withdrawalAuthorizationId || metadata.withdrawalAuthorizationId === transfer.id);
  if (!valid || !operation) {
    await audit("refused", transfer.id, "transfer", "Transferencia nao confere com o ledger, valor ou favorecido");
    return refused("Transferencia nao reconhecida");
  }
  const { error: markError } = await admin.from("financial_operations").update({
    metadata: { ...metadata, withdrawalAuthorizationId: transfer.id, withdrawalAuthorizedAt: new Date().toISOString() },
  }).eq("id", operation.id).in("status", ["processing", "provider_created", "ambiguous"]);
  if (markError) throw markError;
  await audit("approved", transfer.id, "transfer", "Repasse Pix validado contra provedor, ledger, valor e favorecido");
  return NextResponse.json({ status: "APPROVED" });
}

export async function POST(req: NextRequest) {
  if (!secureTokenEquals(
    req.headers.get("asaas-access-token"),
    process.env.ASAAS_WITHDRAWAL_AUTH_TOKEN,
  )) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (!raw || raw.length > 32_000) return refused("Payload invalido");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return refused("Payload invalido"); }
  const body = parseWithdrawalAuthorization(parsed);
  if (!body) return refused("Operacao nao suportada ou invalida");

  if (body.type === "TRANSFER") {
    try {
      return await authorizeTransfer(body);
    } catch (error) {
      await reportOperationalEvent({
        level: "critical",
        event: "asaas.withdrawal_authorization.failed",
        message: "Falha fechada ao validar um repasse",
        context: { transferId: body.transfer.id },
        error,
        alert: true,
      });
      return refused("Validacao temporariamente indisponivel");
    }
  }

  const { id: refundId, payment: paymentId, value } = body.pixRefund;
  const admin = createAdminClient();
  try {
    const refunds = await listarEstornosCobranca(paymentId);
    if (!hasUniqueAuthorizableProviderRefund(refunds, { refundId, paymentId, value })) {
      await audit("refused", refundId, paymentId, "Estorno nao confere com o registro atual do Asaas");
      return refused("Estorno nao reconhecido");
    }

    const { data: operations, error: operationError } = await admin.from("financial_operations")
      .select("id, flow, record_id, amount, metadata")
      .eq("operation_type", "refund").eq("provider_id", paymentId)
      .in("status", ["processing", "provider_created", "ambiguous"])
      .order("created_at", { ascending: false }).limit(2);
    if (operationError || operations?.length !== 1) {
      await audit("refused", refundId, paymentId, "Operacao financeira pendente nao encontrada de forma univoca");
      return refused("Operacao nao encontrada");
    }

    const operation = operations[0];
    if (!(["registration", "athlete_ticket", "spectator_ticket"] as string[]).includes(operation.flow)) {
      await audit("refused", refundId, paymentId, "Fluxo financeiro nao autorizado");
      return refused("Fluxo nao autorizado");
    }
    const metadata = operation.metadata as Record<string, unknown> | null;
    if (metadata?.originalPaymentId !== paymentId
      || metadata?.withdrawalAuthorizationId && metadata.withdrawalAuthorizationId !== refundId) {
      await audit("refused", refundId, paymentId, "Identificadores financeiros divergentes");
      return refused("Identificadores divergentes");
    }

    const { data: paymentOperation } = await admin.from("financial_operations")
      .select("amount").eq("flow", operation.flow).eq("record_id", operation.record_id)
      .eq("operation_type", "payment").eq("provider_id", paymentId).eq("status", "confirmed")
      .maybeSingle();
    const expectedAmount = operation.amount == null ? Number(paymentOperation?.amount) : Number(operation.amount);
    if (!sameMoney(expectedAmount, value)
      || !await activeDomainRecord(operation.flow as RefundFlow, operation.record_id, paymentId)) {
      await audit("refused", refundId, paymentId, "Valor, cobranca ou estado do ingresso nao confere");
      return refused("Operacao nao atende aos controles do RankFTV");
    }

    const { error: markError } = await admin.from("financial_operations").update({
      metadata: { ...metadata, withdrawalAuthorizationId: refundId, withdrawalAuthorizedAt: new Date().toISOString() },
    }).eq("id", operation.id).in("status", ["processing", "provider_created", "ambiguous"]);
    if (markError) throw markError;

    await audit("approved", refundId, paymentId, "Estorno Pix validado contra provedor, ledger e ingresso");
    return NextResponse.json({ status: "APPROVED" });
  } catch (error) {
    await reportOperationalEvent({
      level: "critical",
      event: "asaas.withdrawal_authorization.failed",
      message: "Falha fechada ao validar uma operacao de saida",
      context: { refundId, paymentId },
      error,
      alert: true,
    });
    return refused("Validacao temporariamente indisponivel");
  }
}
