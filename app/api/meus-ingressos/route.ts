import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { gerarCodigoOtp, hashCodigoOtp } from "@/lib/otp";
import { enviarCodigoRecuperacaoIngresso } from "@/lib/email/send";

const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "no-store, private" };
const VALIDADE_MINUTOS = 10;

// Passo 1 da recuperação de ingresso: CPF + e-mail nunca mais devolvem o
// ingresso/access_token direto (CPF não é segredo no Brasil e e-mail é
// frequentemente descobrível) — em vez disso manda um código de 6 dígitos
// pro e-mail informado. Só quem tem a caixa de entrada consegue completar
// o passo 2 (/api/meus-ingressos/verificar). Resposta é sempre a mesma,
// exista ingresso ou não, pra não vazar se um CPF/e-mail tem compra.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowedIp = await checkRateLimit(`ingressos:ip:${ip}`, 10, 60);
  if (!allowedIp) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um minuto e tente de novo." },
      { status: 429, headers: PRIVATE_RESPONSE_HEADERS },
    );
  }

  let body: { cpf?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
  const cpf = (typeof body.cpf === "string" ? body.cpf : "").replace(/\D/g, "");
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();

  if (cpf.length !== 11 || !email.includes("@")) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const allowedPar = await checkRateLimit(`ingressos:par:${cpf}:${email}`, 3, 600);
  const respostaGenerica = NextResponse.json(
    { ok: true, mensagem: "Se encontrarmos ingressos com esse CPF e e-mail, enviamos um código de acesso pro e-mail informado." },
    { headers: PRIVATE_RESPONSE_HEADERS },
  );
  if (!allowedPar) return respostaGenerica; // já mandou código recente demais — não reenvia, resposta igual

  const supabase = createAdminClient();

  const [ath1, ath2, plateia] = await Promise.all([
    supabase.from("athlete_tickets").select("id", { count: "exact", head: true }).eq("comprador_cpf", cpf).eq("comprador_email", email),
    supabase.from("athlete_tickets").select("id", { count: "exact", head: true }).eq("parceiro_cpf", cpf).eq("parceiro_email", email),
    supabase.from("spectator_tickets").select("id", { count: "exact", head: true }).eq("comprador_cpf", cpf).eq("comprador_email", email),
  ]);
  const temIngresso = (ath1.count ?? 0) > 0 || (ath2.count ?? 0) > 0 || (plateia.count ?? 0) > 0;

  if (temIngresso) {
    const codigo = gerarCodigoOtp();
    await supabase.from("ticket_recovery_codes").insert({
      cpf,
      email,
      codigo_hash: hashCodigoOtp(codigo),
      expira_em: new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000).toISOString(),
    });
    await enviarCodigoRecuperacaoIngresso({ email, codigo, validadeMinutos: VALIDADE_MINUTOS });
  }

  return respostaGenerica;
}
