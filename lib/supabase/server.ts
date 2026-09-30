import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

// Cliente para uso em Server Components, Server Actions e Route Handlers
export async function createClient() {
  const cookieStore = await cookies();
  const config = getSupabasePublicConfig();

  return createServerClient(
    config.url,
    config.publishableKey,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Em Server Components não é possível setar cookies —
            // o middleware cuida da renovação da sessão.
          }
        },
      },
    }
  );
}
