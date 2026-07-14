import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validaCpfCnpj, idadeEm, soDigitos } from "@/lib/validacao";

// Depois que a sessão é confirmada, sincroniza os dados que vieram no
// metadata do signUp (gênero sempre; telefone/CPF-CNPJ/nascimento só quando
// a conta foi criada pelo fluxo "organizar evento sem conta" — ver /cadastro).
// Roda uma vez por confirmação; escrever de novo não tem efeito colateral.
async function sincronizarCadastro(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata as Record<string, string | undefined>;

  if (meta.genero === "masculino" || meta.genero === "feminino" || meta.genero === "outro") {
    await supabase.from("profiles").update({ genero: meta.genero }).eq("id", user.id);
  }

  if (meta.modo === "organizador") {
    const cpfCnpj = soDigitos(meta.cpf_cnpj ?? "");
    const telefone = soDigitos(meta.telefone ?? "");
    const nascimento = meta.data_nascimento ?? "";

    const valido =
      validaCpfCnpj(cpfCnpj) &&
      telefone.length >= 10 &&
      !Number.isNaN(Date.parse(nascimento)) &&
      idadeEm(nascimento) >= 18;

    if (valido) {
      await supabase.from("organizer_accounts").upsert(
        {
          user_id: user.id,
          cpf_cnpj: cpfCnpj,
          telefone,
          data_nascimento: nascimento,
          habilitado: true,
        },
        { onConflict: "user_id" },
      );
    }
  }
}

// Rota chamada pelo link de confirmação de e-mail do Supabase.
// Aceita os dois formatos de link:
//  1. token_hash + type (fluxo OTP) — funciona em QUALQUER dispositivo/navegador,
//     porque não depende de cookie. É o recomendado pra confirmação por e-mail.
//  2. code (fluxo PKCE) — só funciona no mesmo navegador onde a conta foi criada
//     (precisa do cookie code_verifier). Mantido como fallback.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";

  const supabase = await createClient();

  // 1) Fluxo OTP (token_hash) — preferido
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      await sincronizarCadastro(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 2) Fluxo PKCE (code) — fallback
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await sincronizarCadastro(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link inválido, expirado ou já usado
  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
