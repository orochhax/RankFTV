// Cliente da API do Asaas. Todas as chamadas passam por aqui.
// Chaves via process.env — nunca hardcoded (ver .env.local).
//
// Cartão: os fluxos públicos de campeonatos usam a fatura hospedada do Asaas
// (`invoiceUrl`), sem receber número, validade ou CVV no RankFTV. Não adicione
// campos de cartão a um Client Component para esses fluxos. As funções legadas
// de cartão abaixo permanecem apenas enquanto os fluxos privados de arena são
// migrados; elas não podem registrar corpo de requisição ou resposta crua.
import "server-only"; // build quebra se isso for importado por um Client Component
import { detectarTipoChavePix } from "@/lib/pix";
import { isAmbiguousAsaasFailure } from "@/lib/asaas-errors";

const ASAAS_TIMEOUT_MS = 15_000;

function resolveAsaasApiKey(): string | undefined {
  if (process.env.ASAAS_API_KEY) return process.env.ASAAS_API_KEY;
  if (process.env.NODE_ENV !== "development") return undefined;

  const sandboxFallback = process.env.RANKFTV_SANDBOX_ASAAS_API_KEY_BASE64;
  if (!sandboxFallback) return undefined;
  try {
    return Buffer.from(sandboxFallback, "base64").toString("utf8") || undefined;
  } catch {
    return undefined;
  }
}

export class AsaasApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly ambiguous: boolean,
  ) {
    super(message);
    this.name = "AsaasApiError";
  }
}

function sanitizeAsaasMessage(value: unknown): string {
  const text = typeof value === "string" ? value : "Falha ao processar a operacao no Asaas.";
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{11,16}\b/g, "[dado-mascarado]")
    .slice(0, 300);
}

function errorDescription(body: string): string {
  try {
    const parsed = JSON.parse(body) as { errors?: Array<{ description?: string; code?: string }> };
    return sanitizeAsaasMessage(parsed.errors?.[0]?.description);
  } catch {
    return "O provedor recusou a operacao financeira.";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = resolveAsaasApiKey();

  if (!baseUrl || !apiKey) {
    throw new Error("ASAAS_BASE_URL ou ASAAS_API_KEY não configurados no .env.local");
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(ASAAS_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    throw new AsaasApiError(
      timeout ? "O Asaas demorou para responder." : "Nao foi possivel confirmar a resposta do Asaas.",
      null,
      timeout ? "timeout" : "network_error",
      true,
    );
  }

  if (!res.ok) {
    const body = await res.text();
    const ambiguous = isAmbiguousAsaasFailure(res.status);
    throw new AsaasApiError(
      errorDescription(body),
      res.status,
      `http_${res.status}`,
      ambiguous,
    );
  }

  return res.json() as Promise<T>;
}

// ── Clientes (pagadores) ──────────────────────────────────────────────────────
// Cria o cliente no Asaas ou retorna o existente se o CPF já estiver cadastrado.

export async function criarOuBuscarCliente(input: {
  name: string;
  email: string;
  cpfCnpj: string;
}): Promise<{ id: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const busca = await request<{ data: Array<{ id: string; name?: string; email?: string }> }>(
    `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}`
  );
  if (busca.data.length > 0) {
    const existing = busca.data[0];
    const updates: { name?: string; email?: string } = {};
    if ((existing.name ?? "").trim() !== name) updates.name = name;
    if ((existing.email ?? "").trim().toLowerCase() !== email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      await request(`/customers/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    }
    return { id: existing.id };
  }

  return request<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      cpfCnpj: input.cpfCnpj,
    }),
  });
}

// ── Modelo de taxa ────────────────────────────────────────────────────────────
// A taxa de serviço é PAGA PELO COMPRADOR (somada ao valor) e fica com a
// plataforma. O organizador recebe o valor cheio do ingresso. O cálculo da taxa
// mora em lib/taxas.ts; aqui a cobrança só recebe o TOTAL já somado (valor+taxa).

export type MetodoPagamento = "pix" | "debito" | "credito";

export type CobrancaInput = {
  customerId:        string;
  valorBase:         number;
  metodo:            MetodoPagamento;
  descricao:         string;
  externalReference: string;
};

export type CobrancaCriada = {
  id:         string;
  invoiceUrl: string;
  status?: string;
  billingType?: string;
  pixQrCode?: { encodedImage: string; payload: string };
};

export async function criarCobranca(input: CobrancaInput): Promise<CobrancaCriada> {
  const billingType =
    input.metodo === "pix"    ? "PIX" :
    input.metodo === "debito" ? "DEBIT_CARD" : "CREDIT_CARD";

  // input.valorBase já é o TOTAL que o comprador paga (valor + taxa).
  const valorTotal = parseFloat(Number(input.valorBase).toFixed(2));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const body: Record<string, unknown> = {
    customer:          input.customerId,
    billingType,
    value:             valorTotal,
    dueDate:           dueDate.toISOString().split("T")[0],
    description:       input.descricao,
    externalReference: input.externalReference,
  };

  const pagamento = await request<{ id: string; invoiceUrl: string; status?: string; billingType?: string }>("/payments", {
    method: "POST",
    body:   JSON.stringify(body),
  });

  const resultado: CobrancaCriada = {
    id: pagamento.id,
    invoiceUrl: pagamento.invoiceUrl,
    status: pagamento.status,
    billingType: pagamento.billingType ?? billingType,
  };

  if (input.metodo === "pix") {
    const qr = await request<{ encodedImage: string; payload: string }>(
      `/payments/${pagamento.id}/pixQrCode`,
    );
    resultado.pixQrCode = qr;
  }

  return resultado;
}

// ── Cobrança usando um cartão já tokenizado ────────────────────────────────────
// Usada pra cobrar depois — sem o comprador digitar o cartão de novo — como a
// aula avulsa cobrada só quando o professor confirma presença.

export type CobrancaComTokenInput = {
  customerId:        string;
  creditCardToken:   string;
  valorBase:         number;
  descricao:         string;
  externalReference: string;
};

export type CobrancaComTokenResultado = {
  id:     string;
  status: string;
  paga:   boolean;
};

// O token foi criado fora do RankFTV. Este caminho existe somente para
// reconciliação de registros legados; novas cobranças usam checkout hospedado.
export async function cobrarComToken(input: CobrancaComTokenInput): Promise<CobrancaComTokenResultado> {
  const valorTotal = parseFloat(Number(input.valorBase).toFixed(2));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const pagamento = await request<{ id: string; status: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer:          input.customerId,
      billingType:       "CREDIT_CARD",
      value:             valorTotal,
      dueDate:           dueDate.toISOString().split("T")[0],
      description:       input.descricao,
      externalReference: input.externalReference,
      creditCardToken:   input.creditCardToken,
    }),
  });

  return {
    id:     pagamento.id,
    status: pagamento.status,
    paga:   ["CONFIRMED", "RECEIVED", "AUTHORIZED"].includes(pagamento.status),
  };
}

// ── Cancelamento de assinatura ────────────────────────────────────────────────
// Interrompe as cobranças futuras de uma assinatura recorrente (mensalidade
// de arena) — usada quando o organizador reprecifica ou arquiva um plano:
// quem já assinou termina de usar o período pago, mas não é cobrado de novo
// sob a configuração antiga. Não afeta cobranças já emitidas/pagas.
export async function cancelarAssinatura(subscriptionId: string): Promise<void> {
  await request<unknown>(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

// ── Reembolso de pagamento ────────────────────────────────────────────────────
// Estorna a cobrança no Asaas. O webhook PAYMENT_REFUNDED dispara em seguida e
// atualiza o status da inscrição no banco.

export async function reembolsarPagamento(
  asaasPaymentId: string,
  valorParcial?: number,   // omitir = reembolso total; informar = reembolso parcial
): Promise<StatusCobranca> {
  return request<StatusCobranca>(`/payments/${asaasPaymentId}/refund`, {
    method: "POST",
    body: valorParcial != null
      ? JSON.stringify({ value: parseFloat(valorParcial.toFixed(2)) })
      : undefined,
  });
}

// ── Consulta de status de cobrança ────────────────────────────────────────────
// GET /payments/{id} — usado pela reconciliação manual (o organizador pede
// pra conferir uma inscrição travada em "pendente" contra o status real no
// Asaas, em vez de qualquer edição manual do registro no banco).

export type StatusCobranca = {
  id: string;
  status: string; // PENDING | CONFIRMED | RECEIVED | OVERDUE | REFUNDED | ...
  billingType: string;
  value: number;
  dueDate?: string;
  invoiceUrl?: string;
  externalReference?: string;
  subscription?: string;
  refunds?: StatusEstornoCobranca[];
};

export type StatusEstornoCobranca = {
  id?: string;
  payment?: string;
  status: string;
  value?: number;
  dateCreated?: string;
  transactionReceiptUrl?: string | null;
};


export async function consultarCobranca(asaasPaymentId: string): Promise<StatusCobranca> {
  return request<StatusCobranca>(`/payments/${asaasPaymentId}`);
}

// Cancela uma cobranca ainda pendente. O chamador deve consultar o estado
// imediatamente antes e, se esta chamada falhar, manter o estoque reservado
// para a conciliacao — nunca liberar uma vaga enquanto o Pix ainda puder cair.
export async function cancelarCobrancaPendente(asaasPaymentId: string): Promise<void> {
  await request<unknown>(`/payments/${asaasPaymentId}`, { method: "DELETE" });
}

// A consulta da cobrança nem sempre inclui o array de estornos. A rota
// dedicada é a fonte indicada pelo Asaas para conciliação pontual.
export async function listarEstornosCobranca(asaasPaymentId: string): Promise<StatusEstornoCobranca[]> {
  const result = await request<{ data?: StatusEstornoCobranca[] }>(
    `/payments/${asaasPaymentId}/refunds`,
  );
  return result.data ?? [];
}

export async function buscarCobrancaPorReferencia(externalReference: string): Promise<StatusCobranca | null> {
  const result = await request<{ data?: StatusCobranca[] }>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
  );
  return result.data?.[0] ?? null;
}

export async function consultarPixQrCode(asaasPaymentId: string): Promise<{ encodedImage: string; payload: string }> {
  return request<{ encodedImage: string; payload: string }>(`/payments/${asaasPaymentId}/pixQrCode`);
}

export type StatusAssinatura = {
  id: string;
  status?: string;
  externalReference?: string;
};

export async function buscarAssinaturaPorReferencia(externalReference: string): Promise<StatusAssinatura | null> {
  const result = await request<{ data?: StatusAssinatura[] }>(
    `/subscriptions?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
  );
  return result.data?.[0] ?? null;
}

// ── Consulta de titularidade de chave Pix ────────────────────────────────────
// GET /pix/addressKeys/external (docs.asaas.com/reference/consultar-chave-pix)
// — identifica o titular de uma chave antes de transferir. Rate limit
// apertado (5 req/min, token bucket pequeno) na própria Asaas: só chamar em
// eventos pontuais (troca de chave), nunca por transferência. Em sandbox o
// cpfCnpj retorna mascarado ("****.202.745-**"); nesse caso o chamador não
// consegue comparar com certeza e deve tratar como "não verificável" (nunca
// bloquear com base em dado mascarado/ambíguo — só quando a resposta é
// inequívoca).
export async function consultarCpfCnpjTitularPix(chave: string): Promise<string | null> {
  const tipo = detectarTipoChavePix(chave);
  try {
    const res = await request<{ cpfCnpj?: string }>(
      `/pix/addressKeys/external?type=${tipo}&key=${encodeURIComponent(chave)}`,
    );
    return res.cpfCnpj ?? null;
  } catch {
    return null;
  }
}

// ── Transferência Pix ao organizador ─────────────────────────────────────────
// Chamada após confirmação de pagamento (Pix/débito: imediato; crédito: D+32).

export async function transferirPix(input: {
  valor:     number;
  chavePix:  string;
  descricao: string;
  externalReference?: string;
}): Promise<{ id: string; status: string }> {
  const tipo = detectarTipoChavePix(input.chavePix);

  return request<{ id: string; status: string }>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      value:              input.valor,
      operationType:      "PIX",
      pixAddressKey:      input.chavePix,
      pixAddressKeyType:  tipo,
      description:        input.descricao,
      externalReference:  input.externalReference,
    }),
  });
}

export type StatusTransferencia = {
  id: string;
  status: string;
  value?: number;
  operationType?: string;
  externalReference?: string;
  pixAddressKey?: string;
  bankAccount?: { pixAddressKey?: string | null } | null;
};

export async function consultarTransferencia(id: string): Promise<StatusTransferencia> {
  return request<StatusTransferencia>(`/transfers/${encodeURIComponent(id)}`);
}

// The transfer list has no documented externalReference filter. Reconciliation
// scans a bounded recent window and never creates a second transfer when the
// first request had an ambiguous response.
export async function buscarTransferenciaPorReferencia(
  externalReference: string,
  since = new Date(Date.now() - 90 * 86_400_000),
): Promise<StatusTransferencia | null> {
  const limit = 100;
  for (let offset = 0; offset < 1_000; offset += limit) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      "dateCreated[ge]": since.toISOString().slice(0, 10),
    });
    const page = await request<{ data?: StatusTransferencia[]; hasMore?: boolean }>(`/transfers?${query}`);
    const found = page.data?.find((transfer) => transfer.externalReference === externalReference);
    if (found) return found;
    if (!page.hasMore || (page.data?.length ?? 0) < limit) return null;
  }
  return null;
}

export type AntecipacaoAsaas = {
  id?: string;
  status?: string;
  fee: number;
  netValue: number;
  totalValue?: number;
  value?: number;
  anticipationDate?: string;
  dueDate?: string;
  anticipationDays?: number;
  isDocumentationRequired?: boolean;
};

export async function simularAntecipacaoPagamento(paymentId: string): Promise<AntecipacaoAsaas> {
  return request<AntecipacaoAsaas>("/anticipations/simulate", {
    method: "POST",
    body: JSON.stringify({ payment: paymentId }),
  });
}

export async function solicitarAntecipacaoPagamento(paymentId: string): Promise<AntecipacaoAsaas> {
  return request<AntecipacaoAsaas>("/anticipations", {
    method: "POST",
    body: JSON.stringify({ payment: paymentId }),
  });
}

export async function consultarAntecipacao(id: string): Promise<AntecipacaoAsaas> {
  return request<AntecipacaoAsaas>(`/anticipations/${encodeURIComponent(id)}`);
}

export async function buscarAntecipacaoPorPagamento(paymentId: string): Promise<AntecipacaoAsaas | null> {
  const query = new URLSearchParams({ payment: paymentId, limit: "100", offset: "0" });
  const page = await request<{ data?: AntecipacaoAsaas[] }>(`/anticipations?${query}`);
  return page.data?.[0] ?? null;
}
