import "server-only"; // build quebra se isso for importado por um Client Component
import { Resend } from "resend";

export function resolveResendApiKey(): string | undefined {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  if (process.env.NODE_ENV !== "development") return undefined;

  const sandboxFallback = process.env.RANKFTV_SANDBOX_RESEND_API_KEY_BASE64;
  if (!sandboxFallback) return undefined;
  try {
    return Buffer.from(sandboxFallback, "base64").toString("utf8") || undefined;
  } catch {
    return undefined;
  }
}

// Instanciado de forma lazy para não quebrar o build quando a variável não está definida.
export function getResend(): Resend {
  const key = resolveResendApiKey();
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

// O fallback e apenas para desenvolvimento. Em producao, configure
// RESEND_FROM_EMAIL com um remetente de dominio verificado.
export const FROM = process.env.RESEND_FROM_EMAIL ?? "RankFTV <onboarding@resend.dev>";
