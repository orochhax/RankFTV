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

// ── Subcontas (Asaas Connect) ─────────────────────────────────────────────
// Cria uma subconta para o organizador. O Asaas devolve um `walletId` que
// identificamos nos splits de pagamento. Esse ID é salvo em
// organizer_accounts.asaas_wallet_id.

export type CriarSubcontaInput = {
  name: string;
  email: string;
  cpfCnpj: string;    // só dígitos: "12345678901" ou "12345678000100"
  mobilePhone: string; // só dígitos, com DDD: "11999998888"
  birthDate?: string;  // YYYY-MM-DD — obrigatório para CPF (pessoa física)
};

export type SubcontaCriada = {
  id: string;         // asaas_account_id
  walletId: string;   // asaas_wallet_id — usar nos splits
  name: string;
  email: string;
};

export async function criarSubconta(
  input: CriarSubcontaInput
): Promise<SubcontaCriada> {
  const personType = input.cpfCnpj.replace(/\D/g, "").length === 11
    ? "FISICA"
    : "JURIDICA";

  return request<SubcontaCriada>("/accounts", {
    method: "POST",
    body: JSON.stringify({ ...input, personType }),
  });
}

// ── Clientes (pagadores) ──────────────────────────────────────────────────
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
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj,
    }),
  });
}

// ── Cobranças Pix com split ───────────────────────────────────────────────
// Cria um Pix no Asaas com split automático entre plataforma e organizador.
// Devolve o id do pagamento + QR code (imagem base64 e código copia-e-cola).

// Taxas cobradas ao atleta por método (em cima do valor base da inscrição).
// A plataforma repassa o valor base ao organizador via split e fica com a taxa.
export const TAXAS_PAGAMENTO = {
  pix:     { percentual: 3,  billingType: "PIX"         },
  debito:  { percentual: 5,  billingType: "DEBIT_CARD"  },
  credito: { percentual: 9,  billingType: "CREDIT_CARD" },
} as const;

export type MetodoPagamento = keyof typeof TAXAS_PAGAMENTO;

export type CobrancaInput = {
  customerId: string;
  valorBase: number;        // valor da inscrição em BRL (sem taxa)
  metodo: MetodoPagamento;
  descricao: string;
  externalReference: string; // registration.id — usado pelo webhook
  organizadorWalletId: string;
};

export type CobrancaCriada = {
  id: string;
  invoiceUrl: string;       // link de pagamento (cartão)
  pixQrCode?: {
    encodedImage: string;   // base64 PNG do QR
    payload: string;        // código copia-e-cola
  };
};

export async function criarCobranca(
  input: CobrancaInput
): Promise<CobrancaCriada> {
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
    // O organizador recebe exatamente o valor base (sem a taxa da plataforma).
    split: [
      {
        walletId:   input.organizadorWalletId,
        fixedValue: input.valorBase,
      },
    ],
  };

  // Crédito: 6x sem juros
  if (input.metodo === "credito") {
    body.installmentCount = 6;
    body.installmentValue = parseFloat((valorTotal / 6).toFixed(2));
  }

  const pagamento = await request<{ id: string; invoiceUrl: string }>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const resultado: CobrancaCriada = {
    id:         pagamento.id,
    invoiceUrl: pagamento.invoiceUrl,
  };

  // Pix: busca QR code separado
  if (input.metodo === "pix") {
    const qr = await request<{ encodedImage: string; payload: string }>(
      `/payments/${pagamento.id}/pixQrCode`
    );
    resultado.pixQrCode = qr;
  }

  return resultado;
}
