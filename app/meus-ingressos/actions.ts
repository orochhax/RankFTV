"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verificarCodigoRecuperacao } from "@/lib/ticket-recovery";

export type VincularState = { error?: string; ok?: boolean; vinculados?: number };

// Vincula compras antigas (sem user_id, feitas como visitante antes desta
// correção) à conta logada — só depois do mesmo código de 6 dígitos que a
// recuperação pública de ingresso já usa (prova posse do e-mail/CPF
// informado). Nunca vincula só porque o e-mail da conta parece com o da
// compra: o vínculo exige o código, e só afeta linhas com user_id ainda
// nulo (não sequestra um ingresso que outra conta já vinculou antes).
export async function vincularComprasAntigas(
  _prev: VincularState,
  formData: FormData,
): Promise<VincularState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Você precisa estar logado." };

  const cpf    = ((formData.get("cpf") as string) ?? "").replace(/\D/g, "");
  const email  = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const codigo = ((formData.get("codigo") as string) ?? "").trim();

  if (cpf.length !== 11 || !email.includes("@") || !/^\d{6}$/.test(codigo)) {
    return { error: "Confira o CPF, o e-mail e o código de 6 dígitos." };
  }

  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(`vincular-ingresso:ip:${ip}`, 10, 600);
  if (!allowed) return { error: "Muitas tentativas. Aguarde um minuto e tente de novo." };

  const codigoValido = await verificarCodigoRecuperacao(cpf, email, codigo);
  if (!codigoValido) return { error: "Código inválido ou expirado." };

  const admin = createAdminClient();
  const [r1, r2, r3] = await Promise.all([
    admin.from("athlete_tickets")
      .update({ user_id: user.id })
      .eq("comprador_cpf", cpf).eq("comprador_email", email).is("user_id", null)
      .select("id"),
    admin.from("athlete_tickets")
      .update({ parceiro_user_id: user.id })
      .eq("parceiro_cpf", cpf).eq("parceiro_email", email).is("parceiro_user_id", null)
      .select("id"),
    admin.from("spectator_tickets")
      .update({ user_id: user.id })
      .eq("comprador_cpf", cpf).eq("comprador_email", email).is("user_id", null)
      .select("id"),
  ]);

  const vinculados = (r1.data?.length ?? 0) + (r2.data?.length ?? 0) + (r3.data?.length ?? 0);

  revalidatePath("/meus-ingressos");
  return { ok: true, vinculados };
}
