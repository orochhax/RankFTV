const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
const YOUTUBE_STANDARD_EMBED_ORIGIN = "https://www.youtube.com";

export function createRequestNonce() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function buildContentSecurityPolicy(
  nonce: string,
  options: { development?: boolean } = {}
) {
  const development = options.development ?? false;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_ORIGIN}${
      development ? " 'unsafe-eval'" : ""
    }`,
    // Dynamic React/Recharts style attributes cannot carry a nonce. Keep this
    // narrow exception until those styles are moved to CSS custom properties.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${TURNSTILE_ORIGIN}`,
    `frame-src 'self' ${TURNSTILE_ORIGIN} ${YOUTUBE_EMBED_ORIGIN} ${YOUTUBE_STANDARD_EMBED_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function applyRequestSecurityHeaders(
  headers: Headers,
  values: { csp: string; requestId: string; production?: boolean }
) {
  headers.set("Content-Security-Policy", values.csp);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), browsing-topics=()"
  );
  headers.set("x-request-id", values.requestId);

  if (values.production) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
}
