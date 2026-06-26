"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AtivarArenaState = { error?: string };

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export async function ativarArena(
  _prev: AtivarArenaState,
  formData: FormData,
): Promise<AtivarArenaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nome     = ((formData.get("nome")     as string) ?? "").trim();
  const cidade   = ((formData.get("cidade")   as string) ?? "").trim();
  const estado   = ((formData.get("estado")   as string) ?? "").trim();
  const descricao = ((formData.get("descricao") as string) ?? "").trim();
  const cpfCnpj  = ((formData.get("cpf_cnpj") as string) ?? "").replace(/\D/g, "");
  const telefone = ((formData.get("telefone") as string) ?? "").replace(/\D/g, "");
  const chavePix = ((formData.get("chave_pix") as string) ?? "").trim();

  if (!nome)    return { error: "Informe o nome da arena." };
  if (!cidade)  return { error: "Informe a cidade." };
  if (!estado)  return { error: "Informe o estado." };
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14))
    return { error: "CPF (11 dígitos) ou CNPJ (14 dígitos) inválido." };
  if (!telefone || telefone.length < 10)
    return { error: "Telefone inválido (com DDD)." };

  // Gera handle a partir do nome; garante unicidade com sufixo numérico
  let handle = slugify(nome);
  const { data: existente } = await supabase
    .from("arenas")
    .select("handle")
    .eq("handle", handle)
    .maybeSingle();
  if (existente) {
    handle = `${handle}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  const { data: arena, error: arenaErr } = await supabase
    .from("arenas")
    .insert({ dono_id: user.id, nome, handle, cidade, estado, descricao: descricao || null })
    .select("id")
    .single();

  if (arenaErr || !arena) return { error: "Erro ao criar a arena. Tente novamente." };

  const { error: accErr } = await supabase
    .from("arena_accounts")
    .insert({
      arena_id:  arena.id,
      user_id:   user.id,
      cpf_cnpj:  cpfCnpj,
      telefone,
      chave_pix: chavePix || null,
      habilitado: true,
    });

  if (accErr) {
    await supabase.from("arenas").delete().eq("id", arena.id);
    return { error: "Erro ao salvar dados financeiros. Tente novamente." };
  }

  redirect(`/arena`);
}
