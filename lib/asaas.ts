// Cliente da API do Asaas. Todas as chamadas passam por aqui.
// Chaves via process.env — nunca hardcoded (ver .env.local).

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

// ── Taxas da plataforma ───────────────────────────────────────────────────────
// O ATLETA sempre paga apenas o valor da inscrição.
// A taxa da plataforma é descontada do repasse ao organizador (invisível pro atleta).
//
// Única exceção: crédito 7–12x tem taxa extra de 0,5% cobrada do atleta
// (parcelamento longo fica por conta de quem escolheu, não do organizador).
//
// Taxas plataforma → organizador:
//   Pix:     R$3,99 fixo  (Asaas custa R$1,99 → plataforma líquida R$2,00)
//   Débito:  5,89% + R$0,35  (Asaas 1,89% + R$0,35 → líquido 4,00%)
//   Crédito: 7,49% + R$0,49  (Asaas 2,99–3,49% + R$0,49 → líquido 4,00–4,50%)

export type MetodoPagamento = "pix" | "debito" | "credito";

/**
 * Valor que o atleta paga no gateway.
 * Para PIX, débito e crédito 1–6x: igual ao valor da inscrição.
 * Para crédito 7–12x: inscrição + 0,5% (taxa de parcelamento longo).
 */
export function calcularValorAtleta(
  valorBase: number,
  metodo:    MetodoPagamento,
  parcelas = 1,
): number {
  if (metodo === "credito" && parcelas > 6) {
    return parseFloat((valorBase * 1.005).toFixed(2));
  }
  return parseFloat(valorBase.toFixed(2));
}

/**
 * Valor líquido que o organizador recebe após desconto da taxa da plataforma.
 * (Usado na hora de calcular o repasse via Pix — ver webhook/financeiro.)
 */
export function calcularRepasseOrganizador(
  valorBase: number,
  metodo:    MetodoPagamento,
): number {
  if (metodo === "pix")    return parseFloat((valorBase - 3.99).toFixed(2));
  if (metodo === "debito") return parseFloat((valorBase * (1 - 0.0589) - 0.35).toFixed(2));
  return parseFloat((valorBase * (1 - 0.0749) - 0.49).toFixed(2));
}

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

  const valorTotal = calcularValorAtleta(input.valorBase, input.metodo);

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

// ── Transferência Pix ao organizador ─────────────────────────────────────────
// Chamada após confirmação de pagamento (Pix/débito: imediato; crédito: D+32).

export type TipoChavePix = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";

/** Detecta automaticamente o tipo da chave Pix a partir do valor. */
export function detectarTipoChavePix(chave: string): TipoChavePix {
  const digits = chave.replace(/\D/g, "");
  if (chave.includes("@"))     return "EMAIL";
  if (digits.length === 11)    return "CPF";
  if (digits.length === 14)    return "CNPJ";
  if (/^\+?\d{10,13}$/.test(chave)) return "PHONE";
  return "EVP"; // chave aleatória (UUID)
}

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
