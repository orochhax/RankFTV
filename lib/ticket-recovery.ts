import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { compararHashOtp } from "@/lib/otp";

const MAX_TENTATIVAS = 5;

// Confere o código de 6 dígitos mandado por e-mail (POST /api/meus-ingressos)
// contra ticket_recovery_codes. Compartilhado entre a consulta pública (API
// /api/meus-ingressos/verificar) e a vinculação de compra antiga à conta
// logada (app/meus-ingressos/actions.ts#vincularComprasAntigas) — os dois
// caminhos precisam da mesma prova de posse do e-mail/CPF, só o que fazem
// depois de validar o código é diferente.
export async function verificarCodigoRecuperacao(
  cpf: string,
  email: string,
  codigo: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: pendente } = await supabase
    .from("ticket_recovery_codes")
    .select("id, codigo_hash, tentativas, usado_em, expira_em")
    .eq("cpf", cpf)
    .eq("email", email)
    .is("usado_em", null)
    .gt("expira_em", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendente || pendente.tentativas >= MAX_TENTATIVAS) return false;

  if (!compararHashOtp(codigo, pendente.codigo_hash)) {
    await supabase.from("ticket_recovery_codes").update({ tentativas: pendente.tentativas + 1 }).eq("id", pendente.id);
    return false;
  }

  // Código de uso único — marca usado antes de devolver sucesso.
  await supabase.from("ticket_recovery_codes").update({ usado_em: new Date().toISOString() }).eq("id", pendente.id);
  return true;
}
