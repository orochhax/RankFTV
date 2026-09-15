import { NextResponse } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validaCpfCnpj, idadeEm, soDigitos } from "@/lib/validacao";

type CadastroSyncResult = "ok" | "username_taken";

// Depois que a sessão é confirmada, sincroniza os dados que vieram no
// metadata do signUp (gênero sempre; telefone/CPF-CNPJ/nascimento só quando
// a conta foi criada pelo fluxo "organizar evento sem conta" — ver /cadastro).
// Roda uma vez por confirmação; escrever de novo não tem efeito colateral.
async function sincronizarCadastro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
): Promise<CadastroSyncResult> {
  const meta = user.user_metadata as Record<string, string | undefined>;

  const genero =
    meta.genero === "masculino" || meta.genero === "feminino" || meta.genero === "outro"
      ? meta.genero
      : null;
  const username = (meta.username ?? "").trim().toLowerCase();

  if (genero || /^[a-z0-9_.]{3,30}$/.test(username)) {
    const profileUpdate: { genero?: typeof genero; username?: string } = {};
    if (genero) profileUpdate.genero = genero;
    if (/^[a-z0-9_.]{3,30}$/.test(username)) profileUpdate.username = username;

    const { error } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);
    if (error?.code === "23505") return "username_taken";
    if (error) throw error;
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

  return "ok";
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
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Metadados de cadastro só precisam ser copiados na confirmação inicial.
      // Login por magic link e recuperação não devem regravar o perfil.
      if (type === "signup" && data.user) {
        const result = await sincronizarCadastro(supabase, data.user);
        if (result === "username_taken") {
          return NextResponse.redirect(`${origin}/cadastro/escolher-usuario`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 2) Fluxo PKCE (code) — fallback
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        const result = await sincronizarCadastro(supabase, data.user);
        if (result === "username_taken") {
          return NextResponse.redirect(`${origin}/cadastro/escolher-usuario`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link inválido, expirado ou já usado
  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
