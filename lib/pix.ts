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

/** Janela de retenção de repasse depois de qualquer troca de chave Pix — não
 *  existe verificação de titularidade automática pela API do Asaas (ver
 *  AUDITORIA-PRODUCAO.md), então o repasse fica retido por esse período pra
 *  dar tempo do dono real notar uma troca que não fez. */
export const PIX_COOLDOWN_HORAS = 48;

/** true enquanto a chave Pix estiver "recente demais" pra liberar repasse. */
export function pixKeyEmCooldown(atualizadaEm: string | null, agora: Date = new Date()): boolean {
  if (!atualizadaEm) return false;
  const decorridoMs = agora.getTime() - new Date(atualizadaEm).getTime();
  return decorridoMs < PIX_COOLDOWN_HORAS * 60 * 60 * 1000;
}

/**
 * Compara o CPF/CNPJ devolvido pela consulta de titularidade da Asaas
 * (lib/asaas.ts consultarCpfCnpjTitularPix) com o CPF/CNPJ que já temos
 * cadastrado pro dono da conta. Nunca afirma incompatibilidade a partir de
 * dado mascarado ou incompleto — só quando os dois lados têm todos os
 * dígitos, é seguro dizer que bate ou não bate.
 */
export type ComparacaoTitularidade = "confere" | "nao_confere" | "nao_verificavel";

export function compararTitularidadePix(
  cpfCnpjRetornado: string | null,
  cpfCnpjConhecido: string | null,
): ComparacaoTitularidade {
  if (!cpfCnpjRetornado || !cpfCnpjConhecido) return "nao_verificavel";
  const digitsRetornado = cpfCnpjRetornado.replace(/\D/g, "");
  const digitsConhecido = cpfCnpjConhecido.replace(/\D/g, "");
  // Resposta mascarada ("****.202.745-**") tem menos dígitos que um CPF (11)
  // ou CNPJ (14) completo — não dá pra comparar com segurança.
  if (digitsRetornado.length !== 11 && digitsRetornado.length !== 14) return "nao_verificavel";
  if (digitsConhecido.length !== 11 && digitsConhecido.length !== 14) return "nao_verificavel";
  return digitsRetornado === digitsConhecido ? "confere" : "nao_confere";
}
