import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applyRequestSecurityHeaders,
  buildContentSecurityPolicy,
  createRequestId,
  createRequestNonce,
} from "@/lib/security-headers";

// Rotas que exigem role admin ou ceo
const ADMIN_ROUTES = ["/admin"];
const PRIVATE_ROBOTS_PREFIXES = [
  "/admin", "/api", "/arena", "/agenda", "/cadastro", "/convite", "/login",
  "/meus-ingressos", "/minhas-compras", "/minhas-inscricoes", "/notificacoes",
  "/painel", "/perfil", "/recuperar-senha", "/staff",
];

function isPrivateTicketPath(pathname: string): boolean {
  return /^\/campeonatos\/[^/]+\/(?:ingresso-atleta\/[^/]+|comprar\/ingresso\/[^/]+|plateia\/ingresso\/[^/]+)$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const development = process.env.NODE_ENV === "development";
  const nonce = createRequestNonce();
  const requestId = createRequestId();
  const csp = buildContentSecurityPolicy(nonce, { development });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("Content-Security-Policy", csp);

  const createNextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  let supabaseResponse = createNextResponse();

  const secure = (response: NextResponse) => {
    applyRequestSecurityHeaders(response.headers, {
      csp,
      requestId,
      production: !development,
    });
    const privateTicket = isPrivateTicketPath(request.nextUrl.pathname);
    if (privateTicket || PRIVATE_ROBOTS_PREFIXES.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    if (privateTicket) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.headers.set("Referrer-Policy", "no-referrer");
    }
    return response;
  };

  const secureRedirect = (url: URL) => {
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    return secure(response);
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = createNextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value)
          );
        },
      },
    }
  );

  // Renova o token — sempre necessário
  let user: { id: string } | null = null;
  try {
    const auth = await supabase.auth.getClaims();
    const subject = auth.data?.claims?.sub;
    user = typeof subject === "string" ? { id: subject } : null;
  } catch {
    // Public pages and security headers remain available during a temporary
    // auth-provider outage. Protected routes still fail closed below.
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Rotas que só admins/CEO acessam
  const needsAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (needsAdmin) {
    if (!user) {
      return secureRedirect(new URL("/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "ceo"].includes(profile.role)) {
      return secureRedirect(new URL("/", request.url));
    }
  }

  // /perfil não é gated aqui — a própria página já faz o redirect("/login")
  // se não tiver usuário. Ter os dois (middleware + página) fazia o token
  // ser validado/renovado duas vezes na mesma requisição, e quando o access
  // token estava expirado, a segunda renovação usava um refresh token que a
  // primeira já tinha rotacionado — falhava e mandava pro login à toa.

  return secure(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
