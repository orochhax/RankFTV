// Cliente da API do Asaas. Todas as chamadas passam por aqui.
// Chaves via process.env — nunca hardcoded (ver .env.local).
import "server-only"; // build quebra se isso for importado por um Client Component
import { detectarTipoChavePix } from "@/lib/pix";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey  = process.env.ASAAS_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("ASAAS_BASE_URL ou ASAAS_API_KEY não configurados no .env.local");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Asaas ${res.status} em ${path}: ${body}`);
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
  const busca = await request<{ data: Array<{ id: string }> }>(
    `/customers?cpfCnpj=${input.cpfCnpj}`
  );
  if (busca.data.length > 0) return { id: busca.data[0].id };

  return request<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name:     input.name,
      email:    input.email,
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

  const pagamento = await request<{ id: string; invoiceUrl: string }>("/payments", {
    method: "POST",
    body:   JSON.stringify(body),
  });

  const resultado: CobrancaCriada = { id: pagamento.id, invoiceUrl: pagamento.invoiceUrl };

  if (input.metodo === "pix") {
    const qr = await request<{ encodedImage: string; payload: string }>(
      `/payments/${pagamento.id}/pixQrCode`,
    );
    resultado.pixQrCode = qr;
  }

  return resultado;
}

// ── Reembolso de pagamento ────────────────────────────────────────────────────
// Estorna a cobrança no Asaas. O webhook PAYMENT_REFUNDED dispara em seguida e
// atualiza o status da inscrição no banco.

export async function reembolsarPagamento(
  asaasPaymentId: string,
  valorParcial?: number,   // omitir = reembolso total; informar = reembolso parcial
): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/payments/${asaasPaymentId}/refund`, {
    method: "POST",
    body: valorParcial != null
      ? JSON.stringify({ value: parseFloat(valorParcial.toFixed(2)) })
      : undefined,
  });
}

// ── Transferência Pix ao organizador ─────────────────────────────────────────
// Chamada após confirmação de pagamento (Pix/débito: imediato; crédito: D+32).

export async function transferirPix(input: {
  valor:     number;
  chavePix:  string;
  descricao: string;
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
    }),
  });
}
