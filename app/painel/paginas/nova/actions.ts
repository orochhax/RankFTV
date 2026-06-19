"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CriarPaginaState = {
  error?: string;
};

export async function criarPagina(
  _prev: CriarPaginaState,
  formData: FormData,
): Promise<CriarPaginaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const nome = (formData.get("nome") as string)?.trim();
  const handle = (formData.get("handle") as string)?.trim().toLowerCase();
  const descricao = (formData.get("descricao") as string)?.trim() ?? "";
  const bannerFrom = (formData.get("bannerFrom") as string) ?? "from-blue-500";
  const bannerTo = (formData.get("bannerTo") as string) ?? "to-cyan-400";

  if (!nome) return { error: "Dê um nome à página." };
  if (!handle) return { error: "Informe o @handle da página." };
  if (!/^[a-z0-9-]{3,30}$/.test(handle))
    return { error: "Handle pode ter só letras, números e hífens (3–30 caracteres)." };

  // Verifica unicidade global: páginas + perfis de usuário compartilham o mesmo espaço de @
  const [{ count: countPages }, { count: countProfiles }] = await Promise.all([
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("handle", handle),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("username", handle),
  ]);
  if ((countPages ?? 0) > 0 || (countProfiles ?? 0) > 0)
    return { error: "Esse @handle já está em uso. Escolha outro." };

  const bannerUrl = (formData.get("bannerUrl") as string)?.trim() || null;

  const { data: page, error } = await supabase
    .from("pages")
    .insert({
      owner_id: user.id,
      nome,
      handle,
      descricao,
      banner_from: bannerFrom,
      banner_to: bannerTo,
      banner_url: bannerUrl,
    })
    .select("id")
    .single();

  if (error || !page) return { error: "Erro ao criar a página. Tente novamente." };

  redirect(`/painel/paginas/${page.id}`);
}
