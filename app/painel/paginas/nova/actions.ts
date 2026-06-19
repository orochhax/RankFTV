"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CriarPaginaState = {
  error?: string;
};

const GRADIENT_OPTIONS = [
  { from: "from-blue-500", to: "to-cyan-400", label: "Azul" },
  { from: "from-emerald-500", to: "to-teal-400", label: "Verde" },
  { from: "from-orange-500", to: "to-amber-400", label: "Laranja" },
  { from: "from-violet-500", to: "to-purple-400", label: "Roxo" },
  { from: "from-rose-500", to: "to-pink-400", label: "Rosa" },
  { from: "from-indigo-500", to: "to-blue-400", label: "Índigo" },
  { from: "from-slate-600", to: "to-slate-400", label: "Cinza" },
] as const;

export { GRADIENT_OPTIONS };

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

  // Verifica unicidade do handle
  const { count } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("handle", handle);
  if ((count ?? 0) > 0) return { error: "Esse @handle já está em uso. Escolha outro." };

  const { data: page, error } = await supabase
    .from("pages")
    .insert({
      owner_id: user.id,
      nome,
      handle,
      descricao,
      banner_from: bannerFrom,
      banner_to: bannerTo,
    })
    .select("id")
    .single();

  if (error || !page) return { error: "Erro ao criar a página. Tente novamente." };

  redirect(`/painel/paginas/${page.id}`);
}
