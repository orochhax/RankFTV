import { Resend } from "resend";

// Instanciado de forma lazy para não quebrar o build quando a variável não está definida.
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

// onboarding@resend.dev funciona sem verificar domínio próprio.
// Trocar para noreply@rankftv.com.br quando o domínio estiver verificado no Resend.
export const FROM = "RankFTV <onboarding@resend.dev>";
