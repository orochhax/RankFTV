import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Rota de callback chamada pelo link de confirmação de e-mail do Supabase.
// Troca o código temporário por uma sessão válida e redireciona para a home.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Código inválido ou expirado
  return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
}
