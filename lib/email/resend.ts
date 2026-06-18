import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// onboarding@resend.dev funciona sem verificar domínio próprio.
// Trocar para noreply@rankftv.com.br quando o domínio estiver verificado no Resend.
export const FROM = "RankFTV <onboarding@resend.dev>";
