// Utilidade pura (sem segredo, sem chamada de rede) — pode ser importada por
// Client Components. Fica separada de lib/asaas.ts pra esse arquivo nunca
// puxar a chave da API do Asaas pro bundle do navegador.

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
