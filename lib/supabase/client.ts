import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

// Cliente para uso em Client Components ("use client")
export function createClient() {
  const config = getSupabasePublicConfig();
  return createBrowserClient(
    config.url,
    config.publishableKey,
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  );
}
