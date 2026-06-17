import { createClient } from "@supabase/supabase-js";

// Cliente com service_role — bypassa RLS e tem acesso total ao banco.
// NUNCA importe isso em Client Components ou exponha no browser.
// Só usar em Server Components, Server Actions e Route Handlers.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
