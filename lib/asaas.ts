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

// ── Cobranças (plataforma recebe tudo, sem split) ─────────────────────────────
// A plataforma coleta o valor cheio. O repasse ao organizador é feito depois
// via transferência Pix (ver transferirPix abaixo).

export const TAXAS_PAGAMENTO = {
  pix:     { percentual: 3, billingType: "PIX"         },
  debito:  { percentual: 5, billingType: "DEBIT_CARD"  },
  credito: { percentual: 9, billingType: "CREDIT_CARD" },
} as const;

export type MetodoPagamento = keyof typeof TAXAS_PAGAMENTO;

export type CobrancaInput = {
  customerId:        string;
  valorBase:         number;   // valor da inscrição em BRL (sem taxa da plataforma)
  metodo:            MetodoPagamento;
  descricao:         string;
  externalReference: string;   // registration.id — usado pelo webhook
};

export type CobrancaCriada = {
  id:          string;
  invoiceUrl:  string;
  pixQrCode?: {
    encodedImage: string;
    payload:      string;
  };
};

export async function criarCobranca(input: CobrancaInput): Promise<CobrancaCriada> {
  const { percentual, billingType } = TAXAS_PAGAMENTO[input.metodo];
  const valorTotal = parseFloat((input.valorBase * (1 + percentual / 100)).toFixed(2));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const body: Record<string, unknown> = {
    customer:          input.customerId,
    billingType,
    value:             valorTotal,
    dueDate:           dueDateStr,
    description:       input.descricao,
    externalReference: input.externalReference,
  };

  const pagamento = await request<{ id: string; invoiceUrl: string }>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const resultado: CobrancaCriada = {
    id:        pagamento.id,
    invoiceUrl: pagamento.invoiceUrl,
  };

  if (input.metodo === "pix") {
    const qr = await request<{ encodedImage: string; payload: string }>(
      `/payments/${pagamento.id}/pixQrCode`
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
