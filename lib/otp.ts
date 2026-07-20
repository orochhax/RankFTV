import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Código numérico de 6 dígitos — fácil de digitar/ler no e-mail. */
export function gerarCodigoOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCodigoOtp(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}

/** Comparação em tempo constante — evita side-channel por diferença de tempo. */
export function compararHashOtp(codigo: string, hashEsperado: string): boolean {
  const hashInformado = hashCodigoOtp(codigo);
  const a = Buffer.from(hashInformado, "hex");
  const b = Buffer.from(hashEsperado, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
