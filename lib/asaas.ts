// Cliente da API do Asaas. Todas as chamadas passam por aqui.
// Chaves via process.env — nunca hardcoded (ver .env.local).

const BASE_URL = process.env.ASAAS_BASE_URL!;
const API_KEY  = process.env.ASAAS_API_KEY!;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "access_token": API_KEY,
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
  name: string;       // nome completo ou razão social
  email: string;
  cpfCnpj: string;   // só dígitos: "12345678901" ou "12345678000100"
  mobilePhone: string; // só dígitos, com DDD: "11999998888"
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
  // personType é derivado do tamanho: 11 dígitos = CPF (física), 14 = CNPJ (jurídica).
  const personType = input.cpfCnpj.replace(/\D/g, "").length === 11
    ? "FISICA"
    : "JURIDICA";

  return request<SubcontaCriada>("/accounts", {
    method: "POST",
    body: JSON.stringify({ ...input, personType }),
  });
}
