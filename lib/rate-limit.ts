import { createAdminClient } from "@/lib/supabase/admin";
import { reportOperationalEvent } from "@/lib/observability";
import { hashRateLimitKey } from "@/lib/rate-limit-core";

export { getClientIp } from "@/lib/rate-limit-core";

/**
 * A Vercel sobrescreve estes headers na borda. Priorizamos a variante própria,
 * que não é substituída por um proxy colocado na frente da Vercel.
 */
/**
 * Rate limit por chave. Retorna true se a requisicao pode prosseguir.
 * Falha fechada: endpoints publicos com CPF/email nao podem liberar tudo
 * quando a checagem do banco falha ou nao foi instalada.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      // Never persist raw IP, e-mail, CPF or user identifiers in rate_limits.
      p_key: hashRateLimitKey(key),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      await reportOperationalEvent({
        level: "error",
        event: "rate_limit.check_failed",
        message: "Rate-limit check failed closed",
        error,
        alert: true,
      });
      return false;
    }
    return data === true;
  } catch (err) {
    await reportOperationalEvent({
      level: "error",
      event: "rate_limit.exception",
      message: "Rate-limit check raised and failed closed",
      error: err,
      alert: true,
    });
    return false;
  }
}
