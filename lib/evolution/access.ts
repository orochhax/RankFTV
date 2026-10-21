import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { createClient } from "@/lib/supabase/server";

async function resolveEvolutionOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) return null;
  return { supabase, user };
}

export const getEvolutionOwner = cache(resolveEvolutionOwner);

export async function requireEvolutionOwner() {
  const context = await getEvolutionOwner();
  if (!context) redirect("/admin");
  return context;
}
