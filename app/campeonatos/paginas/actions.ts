"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SocialLink } from "@/components/paginas/SocialLinksBar";

export async function saveSocialLinks(
  pageId: string,
  links: SocialLink[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: page } = await supabase
    .from("pages")
    .select("owner_id")
    .eq("id", pageId)
    .single();
  if (!page || page.owner_id !== user.id) throw new Error("Sem permissão");

  await supabase.from("pages").update({ social_links: links }).eq("id", pageId);
  revalidatePath(`/campeonatos/paginas/${pageId}`);
}

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
