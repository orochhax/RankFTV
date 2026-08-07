const SENSITIVE_KEY = /(?:authorization|cookie|password|secret|token|api[_-]?key|cpf|cnpj|email|phone|telefone|whatsapp|pix|card|cartao|cvv|pan|address|endereco)/i;

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted-key]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/((?:chave\s+pix|pix(?:\s+key)?)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/(?<!\d)(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}(?!\d)/g, "[redacted-phone]")
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[redacted-number]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[redacted-document]")
    .slice(0, 2_000);
}

export function sanitizeForLog(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      ...(process.env.NODE_ENV === "development" && value.stack
        ? { stack: sanitizeString(value.stack) }
        : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeForLog(item, key, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 80)) {
      output[childKey] = sanitizeForLog(childValue, childKey, depth + 1);
    }
    return output;
  }
  return sanitizeString(String(value));
}

export function makeOperationalPayload(input: {
  level: "info" | "warn" | "error" | "critical";
  event: string;
  message?: string;
  requestId?: string | null;
  context?: Record<string, unknown>;
  error?: unknown;
}) {
  return sanitizeForLog({
    timestamp: new Date().toISOString(),
    service: "rankftv",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.APP_VERSION ?? "local",
    level: input.level,
    event: input.event,
    message: input.message,
    requestId: input.requestId ?? undefined,
    context: input.context,
    error: input.error,
  }) as Record<string, unknown>;
}
