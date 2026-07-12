import "server-only";

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function gerarTicketAccessToken(): string {
  return crypto.randomUUID();
}

export function normalizarTicketAccessToken(token: string | null | undefined): string | null {
  const clean = (token ?? "").trim();
  return TOKEN_RE.test(clean) ? clean : null;
}
