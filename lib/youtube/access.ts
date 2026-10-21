import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { createClient } from "@/lib/supabase/server";

async function resolveYoutubeOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) return null;
  return { supabase, user };
}

export const getYoutubeOwner = cache(resolveYoutubeOwner);

export async function requireYoutubeOwner() {
  const context = await getYoutubeOwner();
  if (!context) redirect("/admin");
  return context;
}

export async function hasYoutubeOwnerAccess() {
  return Boolean(await resolveYoutubeOwner());
}
