import { Resend } from "resend";

// Instanciado de forma lazy para não quebrar o build quando a variável não está definida.
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  return new Resend(key);
}

// ⚠️ onboarding@resend.dev só entrega pro e-mail do dono da conta Resend —
// clientes NÃO recebem convite/ingresso/confirmação por e-mail.
// Quando verificar o domínio rankftv.com no Resend (grátis, só DNS),
// trocar para: "RankFTV <noreply@rankftv.com>"
export const FROM = "RankFTV <onboarding@resend.dev>";
