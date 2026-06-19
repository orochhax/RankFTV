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

// Busca campeonatos pelo nome para vincular a uma página
export async function searchChampionshipsForLink(
  query: string,
  pageId: string,
): Promise<{ id: string; nome: string; cidade: string; estado: string; data_inicio: string; organizador_id: string }[]> {
  if (!query.trim()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("championships")
    .select("id, nome, cidade, estado, data_inicio, organizador_id")
    .neq("status", "rascunho")
    .ilike("nome", `%${query.trim()}%`)
    .limit(6);
  return data ?? [];
}

// Dono da página envia convite para o dono do campeonato
export async function sendPageChampionshipInvite(
  pageId: string,
  championshipId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: page } = await supabase.from("pages").select("owner_id").eq("id", pageId).single();
  if (!page || page.owner_id !== user.id) return { ok: false, error: "Sem permissão." };

  const { error } = await supabase
    .from("page_championship_invites")
    .insert({ page_id: pageId, championship_id: championshipId, status: "pendente" });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Convite já enviado para esse campeonato." };
    return { ok: false, error: `[${error.code}] ${error.message}` };
  }
  revalidatePath(`/campeonatos/paginas`);
  return { ok: true };
}

// Dono do campeonato aceita ou rejeita o convite
export async function respondPageChampionshipInvite(
  inviteId: string,
  accept: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: invite } = await supabase
    .from("page_championship_invites")
    .select("id, page_id, championship_id, championships(organizador_id)")
    .eq("id", inviteId)
    .single();

  if (!invite) return { ok: false, error: "Convite não encontrado." };
  const champ = invite.championships as unknown as { organizador_id: string } | null;
  if (!champ || champ.organizador_id !== user.id) return { ok: false, error: "Sem permissão." };

  if (accept) {
    await supabase
      .from("championships")
      .update({ page_id: invite.page_id })
      .eq("id", invite.championship_id);
    await supabase
      .from("page_championship_invites")
      .update({ status: "aceito" })
      .eq("id", inviteId);
  } else {
    await supabase
      .from("page_championship_invites")
      .update({ status: "rejeitado" })
      .eq("id", inviteId);
  }

  revalidatePath(`/painel/campeonatos/${invite.championship_id}`);
  return { ok: true };
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
