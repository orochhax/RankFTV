import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AsaasApiError } from "@/lib/asaas";
import { mustReconcileWithoutCreating } from "@/lib/payment-provider-state";

export type FinancialFlow =
  | "registration"
  | "athlete_ticket"
  | "spectator_ticket"
  | "arena_subscription"
  | "arena_rental"
  | "arena_daily_pass"
  | "arena_class"
  | "arena_monthly_charge"
  | "payout";

export type FinancialOperationType = "payment" | "subscription" | "refund" | "transfer";

type BeginResult = {
  id: string;
  status: string;
  providerId: string | null;
  providerStatus: string | null;
  previousStatus: string;
  shouldExecute: boolean;
  attemptCount: number;
};

export type ProviderRecord = {
  id: string;
  status?: string;
};

export type FinancialExecutionResult<T extends ProviderRecord> =
  | { ok: true; operationId: string; provider: T; recovered: boolean }
  | { ok: false; operationId: string; inProgress: boolean; ambiguous: boolean; error: string };

const TERMINAL_PROVIDER_STATUSES = new Set([
  "CONFIRMED",
  "RECEIVED",
  "AUTHORIZED",
  "REFUNDED",
  "REFUND_REQUESTED",
]);

const SENSITIVE_METADATA_KEYS = /card|cartao|number|numero|cvv|ccv|cpf|cnpj|email|phone|telefone|token|secret|password|senha/i;

export function sanitizeFinancialMetadata(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !SENSITIVE_METADATA_KEYS.test(key))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
  );
}

function publicFinancialError(error: unknown): { message: string; code: string; ambiguous: boolean } {
  if (error instanceof AsaasApiError) {
    return { message: error.message, code: error.code, ambiguous: error.ambiguous };
  }
  return {
    message: "Nao foi possivel concluir a operacao financeira.",
    code: "unexpected_error",
    ambiguous: true,
  };
}

function operationStatus(providerStatus: string | undefined): string {
  return providerStatus && TERMINAL_PROVIDER_STATUSES.has(providerStatus) ? "confirmed" : "provider_created";
}

export async function executeFinancialOperation<T extends ProviderRecord>(input: {
  flow: FinancialFlow;
  operationType: FinancialOperationType;
  recordId: string;
  externalReference: string;
  amount?: number;
  billingType?: string;
  actorId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
  lookup: () => Promise<T | null>;
  create: () => Promise<T>;
  completedStatus?: (provider: T) => "provider_created" | "confirmed" | "refunded" | "cancelled";
  retryUncertainOperation?: boolean;
}): Promise<FinancialExecutionResult<T>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("financial_begin_operation", {
    p_flow: input.flow,
    p_operation_type: input.operationType,
    p_record_id: input.recordId,
    p_external_reference: input.externalReference,
    p_amount: input.amount ?? null,
    p_billing_type: input.billingType ?? null,
    p_actor_id: input.actorId ?? null,
    p_correlation_id: input.correlationId ?? null,
    p_metadata: sanitizeFinancialMetadata(input.metadata),
    p_lease_seconds: 120,
  });

  if (error || !data) {
    return {
      ok: false,
      operationId: "",
      inProgress: false,
      ambiguous: true,
      error: "A protecao contra cobranca duplicada esta indisponivel. Tente novamente em instantes.",
    };
  }

  const operation = data as unknown as BeginResult;

  const finish = async (provider: T, recovered: boolean): Promise<FinancialExecutionResult<T>> => {
    const { error: completeError } = await admin.rpc("financial_complete_operation", {
      p_operation_id: operation.id,
      p_provider_id: provider.id,
      p_provider_status: provider.status ?? null,
      p_status: input.completedStatus?.(provider) ?? operationStatus(provider.status),
    });
    if (completeError) {
      await admin.rpc("financial_fail_operation", {
        p_operation_id: operation.id,
        p_ambiguous: true,
        p_error_code: "persistence_error",
        p_error_message: "O provedor respondeu, mas o resultado aguarda reconciliacao.",
        p_retry_seconds: 30,
      });
      return {
        ok: false,
        operationId: operation.id,
        inProgress: false,
        ambiguous: true,
        error: "Pagamento recebido para processamento. A confirmacao sera atualizada automaticamente.",
      };
    }
    return { ok: true, operationId: operation.id, provider, recovered };
  };

  try {
    // Every retry checks the provider first. This is the key protection for a
    // request that timed out after Asaas accepted it.
    const existing = await input.lookup();
    if (existing) return finish(existing, true);

    if (mustReconcileWithoutCreating({
      shouldExecute: operation.shouldExecute,
      previousStatus: operation.previousStatus,
      retryUncertainOperation: input.retryUncertainOperation,
    })) {
      await admin.rpc("financial_fail_operation", {
        p_operation_id: operation.id,
        p_ambiguous: true,
        p_error_code: "manual_reconciliation_required",
        p_error_message: "A operacao incerta nao foi localizada sem garantia de busca exata.",
        p_retry_seconds: 600,
      });
      return {
        ok: false,
        operationId: operation.id,
        inProgress: true,
        ambiguous: true,
        error: "A transferencia continua em conciliacao e nao sera repetida automaticamente.",
      };
    }

    if (!operation.shouldExecute) {
      return {
        ok: false,
        operationId: operation.id,
        inProgress: true,
        ambiguous: operation.status === "ambiguous",
        error: "Esta cobranca ja esta sendo processada. O status sera atualizado automaticamente.",
      };
    }

    return finish(await input.create(), false);
  } catch (err) {
    const safe = publicFinancialError(err);
    const operationWasAlreadyProtected = !operation.shouldExecute
      && ["provider_created", "confirmed", "refunded", "cancelled"].includes(operation.status);
    if (operationWasAlreadyProtected) {
      return {
        ok: false,
        operationId: operation.id,
        inProgress: true,
        ambiguous: true,
        error: "A operacao ja foi registrada e o status sera atualizado automaticamente.",
      };
    }
    await admin.rpc("financial_fail_operation", {
      p_operation_id: operation.id,
      p_ambiguous: safe.ambiguous,
      p_error_code: safe.code,
      p_error_message: safe.message,
      p_retry_seconds: 60,
    });
    return {
      ok: false,
      operationId: operation.id,
      inProgress: false,
      ambiguous: safe.ambiguous,
      error: safe.ambiguous
        ? "Nao foi possivel confirmar a resposta do pagamento. Nao tente criar outro pedido; vamos reconciliar automaticamente."
        : safe.message,
    };
  }
}

export function financialProviderStatusToWebhookEvent(status: string | undefined): string | null {
  if (!status) return null;
  if (["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(status)) return "PAYMENT_CONFIRMED";
  if (["REFUNDED", "REFUND_REQUESTED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE"].includes(status)) {
    return "PAYMENT_REFUNDED";
  }
  return null;
}
