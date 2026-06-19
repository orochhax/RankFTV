"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarPagina(
  pageId: string,
  nome: string,
  descricao: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const { data: page } = await supabase.from("pages").select("owner_id").eq("id", pageId).single();
  if (!page || page.owner_id !== user.id) return { ok: false, error: "Sem permissão" };

  const { error } = await supabase
    .from("pages")
    .update({ nome: nome.trim(), descricao: descricao.trim() })
    .eq("id", pageId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/painel/paginas/${pageId}`);
  revalidatePath(`/painel/paginas/${pageId}/editar`);
  return { ok: true };
}

export async function removerVinculoPagina(
  champId: string,
  pageId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: page } = await supabase.from("pages").select("owner_id").eq("id", pageId).single();
  if (!page || page.owner_id !== user.id) return { ok: false };

  await supabase.from("championships").update({ page_id: null }).eq("id", champId).eq("page_id", pageId);

  revalidatePath(`/painel/paginas/${pageId}/editar`);
  revalidatePath(`/painel/paginas/${pageId}`);
  return { ok: true };
}
