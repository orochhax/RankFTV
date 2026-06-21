import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // 1) Fluxo OTP (token_hash) — preferido
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 2) Fluxo PKCE (code) — fallback
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link inválido, expirado ou já usado
  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
