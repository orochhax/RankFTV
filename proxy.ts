import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem role admin ou ceo
const ADMIN_ROUTES = ["/admin"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Renova o token — sempre necessário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas que só admins/CEO acessam
  const needsAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (needsAdmin) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "ceo"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // /perfil não é gated aqui — a própria página já faz o redirect("/login")
  // se não tiver usuário. Ter os dois (middleware + página) fazia o token
  // ser validado/renovado duas vezes na mesma requisição, e quando o access
  // token estava expirado, a segunda renovação usava um refresh token que a
  // primeira já tinha rotacionado — falhava e mandava pro login à toa.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
