import "server-only"; // build quebra se isso for importado por um Client Component
import { Resend } from "resend";

// Instanciado de forma lazy para não quebrar o build quando a variável não está definida.
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

// O fallback e apenas para desenvolvimento. Em producao, configure
// RESEND_FROM_EMAIL com um remetente de dominio verificado.
export const FROM = process.env.RESEND_FROM_EMAIL ?? "RankFTV <onboarding@resend.dev>";
