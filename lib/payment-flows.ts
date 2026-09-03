import "server-only";

import {
  buscarAssinaturaPorReferencia,
  buscarCobrancaPorReferencia,
  buscarTransferenciaPorReferencia,
  cobrarComToken,
  consultarPixQrCode,
  criarAssinaturaCartao,
  criarCobranca,
  criarCobrancaCartao,
  listarEstornosCobranca,
  reembolsarPagamento,
  transferirPix,
  type CartaoInput,
  type MetodoPagamento,
  type TitularInput,
} from "@/lib/asaas";
import {
  executeFinancialOperation,
  type FinancialExecutionResult,
  type FinancialFlow,
} from "@/lib/financial-operations";
import { refundProviderState, refundProviderStatus, refundStatusFromRefunds, transferProviderState } from "@/lib/payment-provider-state";
import { createAdminClient } from "@/lib/supabase/admin";

type CommonInput = {
  flow: FinancialFlow;
  recordId: string;
  externalReference: string;
  amount: number;
  actorId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PaymentProviderResult = {
  id: string;
  status?: string;
  billingType?: string;
  invoiceUrl?: string;
  pixQrCode?: { encodedImage: string; payload: string };
  paga?: boolean;
};

export async function createIdempotentCharge(input: CommonInput & {
  customerId: string;
  method: MetodoPagamento;
  description: string;
}): Promise<FinancialExecutionResult<PaymentProviderResult>> {
  return executeFinancialOperation<PaymentProviderResult>({
    flow: input.flow,
    operationType: "payment",
    recordId: input.recordId,
    externalReference: input.externalReference,
    amount: input.amount,
    billingType: input.method === "pix" ? "PIX" : input.method === "debito" ? "DEBIT_CARD" : "CREDIT_CARD",
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: input.metadata,
    lookup: async () => {
      const payment = await buscarCobrancaPorReferencia(input.externalReference);
      if (!payment) return null;
      const pixQrCode = input.method === "pix" ? await consultarPixQrCode(payment.id) : undefined;
      return { ...payment, pixQrCode };
    },
    create: () => criarCobranca({
      customerId: input.customerId,
      valorBase: input.amount,
      metodo: input.method,
      descricao: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function createIdempotentCardCharge(input: CommonInput & {
  customerId: string;
  billingType: "CREDIT_CARD" | "DEBIT_CARD";
  description: string;
  card: CartaoInput;
  holder: TitularInput;
  installments?: number;
  remoteIp?: string;
}): Promise<FinancialExecutionResult<PaymentProviderResult>> {
  return executeFinancialOperation<PaymentProviderResult>({
    flow: input.flow,
    operationType: "payment",
    recordId: input.recordId,
    externalReference: input.externalReference,
    amount: input.amount,
    billingType: input.billingType,
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: input.metadata,
    lookup: async () => buscarCobrancaPorReferencia(input.externalReference),
    create: () => criarCobrancaCartao({
      customerId: input.customerId,
      valor: input.amount,
      billingType: input.billingType,
      descricao: input.description,
      externalReference: input.externalReference,
      cartao: input.card,
      titular: input.holder,
      parcelas: input.installments,
      remoteIp: input.remoteIp,
    }),
  });
}

export async function createIdempotentStoredCardCharge(input: CommonInput & {
  customerId: string;
  creditCardToken: string;
  description: string;
}): Promise<FinancialExecutionResult<PaymentProviderResult>> {
  return executeFinancialOperation<PaymentProviderResult>({
    flow: input.flow,
    operationType: "payment",
    recordId: input.recordId,
    externalReference: input.externalReference,
    amount: input.amount,
    billingType: "CREDIT_CARD",
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: input.metadata,
    lookup: async () => buscarCobrancaPorReferencia(input.externalReference),
    create: () => cobrarComToken({
      customerId: input.customerId,
      creditCardToken: input.creditCardToken,
      valorBase: input.amount,
      descricao: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function createIdempotentSubscription(input: CommonInput & {
  customerId: string;
  nextDueDate: string;
  description: string;
  card: CartaoInput;
  holder: TitularInput;
}): Promise<FinancialExecutionResult<{ id: string; status?: string }>> {
  return executeFinancialOperation({
    flow: input.flow,
    operationType: "subscription",
    recordId: input.recordId,
    externalReference: input.externalReference,
    amount: input.amount,
    billingType: "CREDIT_CARD",
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: input.metadata,
    lookup: async () => buscarAssinaturaPorReferencia(input.externalReference),
    create: () => criarAssinaturaCartao({
      customerId: input.customerId,
      valor: input.amount,
      nextDueDate: input.nextDueDate,
      descricao: input.description,
      externalReference: input.externalReference,
      cartao: input.card,
      titular: input.holder,
    }),
  });
}

export async function refundIdempotently(input: {
  flow: FinancialFlow;
  recordId: string;
  originalPaymentId: string;
  amount?: number;
  actorId?: string | null;
  correlationId?: string | null;
}): Promise<FinancialExecutionResult<{ id: string; status: string }>> {
  const externalReference = `refund:${input.flow}:${input.recordId}`;
  const result = await executeFinancialOperation({
    flow: input.flow,
    operationType: "refund",
    recordId: input.recordId,
    externalReference,
    amount: input.amount,
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: { originalPaymentId: input.originalPaymentId.slice(0, 80) },
    lookup: async () => {
      const refunds = await listarEstornosCobranca(input.originalPaymentId);
      const refundStatus = refundStatusFromRefunds(refunds);
      const providerStatus = refundProviderStatus(refunds);
      return refundStatus
        ? { id: input.originalPaymentId, status: providerStatus! }
        : null;
    },
    create: async () => {
      const payment = await reembolsarPagamento(input.originalPaymentId, input.amount);
      const refunds = await listarEstornosCobranca(input.originalPaymentId);
      const providerStatus = refundProviderStatus(refunds);
      return {
        id: payment.id,
        status: providerStatus ?? payment.status,
      };
    },
    completedStatus: (provider) => {
      const state = refundProviderState(provider.status);
      if (state === "confirmed") return "refunded";
      if (state === "failed") return "cancelled";
      return "provider_created";
    },
  });
  if (result.ok && refundProviderState(result.provider.status) === "failed") {
    return {
      ok: false,
      operationId: result.operationId,
      inProgress: false,
      ambiguous: false,
      error: "O reembolso nÃ£o foi concluÃ­do automaticamente. Procure o suporte.",
    };
  }
  if (result.ok && refundProviderState(result.provider.status) === "pending") {
    return {
      ok: false,
      operationId: result.operationId,
      inProgress: true,
      ambiguous: true,
      error: "O estorno foi solicitado e aguarda confirmacao do provedor.",
    };
  }
  return result;
}

export async function transferIdempotently(input: CommonInput & {
  pixKey: string;
  description: string;
}): Promise<FinancialExecutionResult<{ id: string; status: string; externalReference?: string }>> {
  const { data: resolvedReference, error: referenceError } = await createAdminClient().rpc(
    "financial_resolve_transfer_reference",
    {
      p_flow: input.flow,
      p_record_id: input.recordId,
      p_base_reference: input.externalReference,
    },
  );
  if (referenceError || typeof resolvedReference !== "string" || !resolvedReference) {
    return {
      ok: false,
      operationId: "",
      inProgress: false,
      ambiguous: true,
      error: "A protecao do repasse esta indisponivel. Nenhuma nova transferencia foi criada.",
    };
  }

  const externalReference = resolvedReference;
  const result = await executeFinancialOperation({
    flow: input.flow,
    operationType: "transfer",
    recordId: input.recordId,
    externalReference,
    amount: input.amount,
    actorId: input.actorId,
    correlationId: input.correlationId,
    metadata: { ...input.metadata, baseExternalReference: input.externalReference },
    lookup: () => buscarTransferenciaPorReferencia(externalReference),
    retryUncertainOperation: false,
    create: () => transferirPix({
      valor: input.amount,
      chavePix: input.pixKey,
      descricao: input.description,
      externalReference,
    }),
    completedStatus: (provider) => {
      if (provider.status === "DONE") return "confirmed";
      if (["FAILED", "CANCELLED", "REJECTED"].includes(provider.status)) return "cancelled";
      return "provider_created";
    },
  });
  if (result.ok && transferProviderState(result.provider.status) === "failed") {
    return {
      ok: false,
      operationId: result.operationId,
      inProgress: false,
      ambiguous: false,
      error: "A transferencia foi recusada pelo provedor.",
    };
  }
  if (result.ok && transferProviderState(result.provider.status) === "pending") {
    return {
      ok: false,
      operationId: result.operationId,
      inProgress: true,
      ambiguous: false,
      error: "A transferencia foi criada e aguarda confirmacao do provedor.",
    };
  }
  return result;
}
