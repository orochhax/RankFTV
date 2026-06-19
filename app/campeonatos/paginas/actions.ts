"use server";

import { createClient } from "@/lib/supabase/server";

export async function togglePageFollow(
  pageId: string,
): Promise<{ following: boolean; count: number }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Verifica se já segue
  const { data: existing } = await supabase
    .from("page_followers")
    .select("id")
    .eq("page_id", pageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("page_followers").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("page_followers")
      .insert({ page_id: pageId, user_id: user.id });
  }

  // Conta com SELECT public — não precisa de admin client
  const { count } = await supabase
    .from("page_followers")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);

  return { following: !existing, count: count ?? 0 };
}
