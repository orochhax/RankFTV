import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Extrai o IP do cliente a partir dos headers. A Vercel seta x-forwarded-for.
 * Pega so o primeiro IP da lista. Cai para "unknown" se nao achar.
 */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

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
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] erro na checagem, bloqueando:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[rate-limit] excecao, bloqueando:", err);
    return false;
  }
}
