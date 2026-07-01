import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Extrai o IP do cliente a partir dos headers (a Vercel seta x-forwarded-for).
 * Pega só o primeiro IP da lista. Cai pra "unknown" se não achar.
 */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Rate limit por chave. Retorna true se a requisição PODE prosseguir,
 * false se estourou o limite. Fail-open: se a checagem der erro (ex.: função
 * ainda não criada no banco), libera — não queremos derrubar o app por causa
 * do rate limiter.
 *
 * @param key            identificador único (ex.: "ingressos:1.2.3.4")
 * @param max            nº máximo de hits dentro da janela
 * @param windowSeconds  tamanho da janela em segundos
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] erro na checagem, liberando:", error.message);
      return true; // fail-open
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit] exceção, liberando:", err);
    return true; // fail-open
  }
}
