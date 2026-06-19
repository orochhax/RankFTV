"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HANDLE_COOLDOWN_DAYS = 20;

export async function alterarHandlePagina(
  pageId: string,
  novoHandle: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const { data: page } = await supabase
    .from("pages")
    .select("owner_id, handle, handle_updated_at")
    .eq("id", pageId)
    .single();

  if (!page || page.owner_id !== user.id) return { ok: false, error: "Sem permissão" };

  const handle = novoHandle.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,30}$/.test(handle))
    return { ok: false, error: "Handle pode ter só letras, números e hífens (3–30 caracteres)." };

  if (handle === page.handle) return { ok: false, error: "Esse já é o @ atual da página." };

  // Verifica cooldown de 20 dias
  if (page.handle_updated_at) {
    const lastChange = new Date(page.handle_updated_at);
    const diffDays = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < HANDLE_COOLDOWN_DAYS) {
      const diasRestantes = Math.ceil(HANDLE_COOLDOWN_DAYS - diffDays);
      return { ok: false, error: `Você só pode mudar o @ novamente em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}.` };
    }
  }

  // Verifica unicidade global
  const [{ count: countPages }, { count: countProfiles }] = await Promise.all([
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("handle", handle).neq("id", pageId),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("username", handle),
  ]);
  if ((countPages ?? 0) > 0 || (countProfiles ?? 0) > 0)
    return { ok: false, error: "Esse @handle já está em uso. Escolha outro." };

  const { error } = await supabase
    .from("pages")
    .update({ handle, handle_updated_at: new Date().toISOString() })
    .eq("id", pageId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/painel/paginas/${pageId}`);
  revalidatePath(`/painel/paginas/${pageId}/editar`);
  return { ok: true };
}

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

export async function excluirPagina(
  pageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const { data: page } = await supabase.from("pages").select("owner_id").eq("id", pageId).single();
  if (!page || page.owner_id !== user.id) return { ok: false, error: "Sem permissão" };

  // Remove vínculos com campeonatos antes de deletar
  await supabase.from("championships").update({ page_id: null }).eq("page_id", pageId);

  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/painel/paginas");
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
