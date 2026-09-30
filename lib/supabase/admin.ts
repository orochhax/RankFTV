import "server-only"; // build quebra se isso for importado por um Client Component
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

// Cliente com service_role — bypassa RLS e tem acesso total ao banco.
// NUNCA importe isso em Client Components ou exponha no browser.
// Só usar em Server Components, Server Actions e Route Handlers.
export function createAdminClient() {
  const config = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error("Supabase secret key is missing");
  return createClient(
    config.url,
    secretKey,
  );
}
