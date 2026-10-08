import "server-only";

import { redirect } from "next/navigation";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { createClient } from "@/lib/supabase/server";

export async function requirePersonalOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !(await isPerformanceOwner(supabase, user))) redirect("/");

  return user;
}
