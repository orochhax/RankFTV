// Cliente da API do Asaas. Todas as chamadas passam por aqui.
// Chaves via process.env — nunca hardcoded (ver .env.local).
//
// Cartão: a documentação oficial da Asaas (docs.asaas.com) não oferece SDK
// de tokenização client-side (tipo Stripe.js/Elements) — só backend-to-
// backend (o que este arquivo faz) ou checkout hospedado (redirect pra fora
// do site, fora de escopo desta rodada por decisão de produto). A própria
// Asaas trata o modelo backend-to-backend como compatível com PCI contanto
// que a conexão seja HTTPS (garantido em produção). Dado isso: número e CVV
// nunca são persistidos no Supabase (só token/bandeira/últimos 4 dígitos —
// ver harden-card-token-security.sql, que também tira SELECT do token
// reutilizável de "authenticated") e nenhum destes arquivos loga o corpo da
// requisição nem a resposta crua do Asaas em erro — só a descrição
// estruturada do erro (json.errors[0].description), que a própria Asaas
// projeta pra mostrar ao usuário final.
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

// ── Cartão salvo (tokenização) ────────────────────────────────────────────────
// Registra o cartão no Asaas sem criar cobrança nenhuma — usado pra "cadastrar
// ou trocar o cartão padrão" fora de um checkout. O token devolvido é opaco:
// só serve pra cobrar de novo através da própria API do Asaas. Número
// completo e CVV vão só nesta chamada, direto pro Asaas, e nunca são
// persistidos no Supabase — só o token, a bandeira e os 4 últimos dígitos.
export type CartaoInput = {
  holderName:  string;
  number:      string;
  expiryMonth: string;
  expiryYear:  string;
  ccv:         string;
};

export type TitularInput = {
  name:          string;
  email:         string;
  cpfCnpj:       string;
  postalCode:    string;
  addressNumber: string;
};

export type CartaoTokenizado = {
  creditCardToken:  string;
  creditCardNumber: string; // 4 últimos dígitos
  creditCardBrand:  string;
};

export async function tokenizarCartao(input: {
  customerId: string;
  cartao:     CartaoInput;
  titular:    TitularInput;
}): Promise<CartaoTokenizado> {
  return request<CartaoTokenizado>("/creditCard/tokenize", {
    method: "POST",
    body: JSON.stringify({
      customer:      input.customerId,
      creditCard:    {
        holderName:  input.cartao.holderName.toUpperCase(),
        number:      input.cartao.number,
        expiryMonth: input.cartao.expiryMonth,
        expiryYear:  input.cartao.expiryYear,
        ccv:         input.cartao.ccv,
      },
      creditCardHolderInfo: input.titular,
    }),
  });
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

// Cobrar com um token já registrado NÃO reenvia creditCardHolderInfo — os
// dados antifraude do titular já foram enviados uma vez, na tokenização
// (tokenizarCartao), e ficam associados ao token no Asaas.
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
): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/payments/${asaasPaymentId}/refund`, {
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
};

export async function consultarCobranca(asaasPaymentId: string): Promise<StatusCobranca> {
  return request<StatusCobranca>(`/payments/${asaasPaymentId}`);
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
