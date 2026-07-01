"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/supabase/roles";

export type CriarNoticiaInput = {
  titulo: string;
  tituloStory?: string;
  tamanhoFonte?: string;
  resumo: string;
  conteudo: string;
  imagemUrl?: string;
};

async function ensureAdmin(): Promise<boolean> {
  const supabase = await createClient();
  return isAdminUser(supabase);
}

export async function criarNoticia(
  input: CriarNoticiaInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin())) return { ok: false, error: "Sem permissão." };

  const titulo = input.titulo?.trim();
  const resumo = input.resumo?.trim();
  const conteudo = input.conteudo?.trim();
  if (!titulo) return { ok: false, error: "Dê um título à notícia." };
  if (!resumo) return { ok: false, error: "Escreva o resumo curto (aparece no card)." };
  if (!conteudo) return { ok: false, error: "Escreva o conteúdo da notícia." };

  const admin = createAdminClient();
  const { error } = await admin.from("news").insert({
    titulo,
    titulo_story: input.tituloStory?.trim() || null,
    tamanho_fonte: input.tamanhoFonte ?? "M",
    resumo,
    conteudo,
    imagem_url: input.imagemUrl?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  return { ok: true };
}

export async function excluirNoticia(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin())) return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();
  const { error } = await admin.from("news").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/noticias");
  revalidatePath("/admin/noticias");
  return { ok: true };
}

export type EditarNoticiaInput = {
  id: string;
  titulo: string;
  tituloStory?: string;
  tamanhoFonte?: string;
  resumo: string;
  conteudo: string;
  imagemUrl?: string;
  removerImagem?: boolean;
};

export async function editarNoticia(
  input: EditarNoticiaInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin())) return { ok: false, error: "Sem permissão." };

  const titulo = input.titulo?.trim();
  const resumo = input.resumo?.trim();
  const conteudo = input.conteudo?.trim();
  if (!titulo) return { ok: false, error: "Dê um título à notícia." };
  if (!resumo) return { ok: false, error: "Escreva o resumo curto (aparece no card)." };
  if (!conteudo) return { ok: false, error: "Escreva o conteúdo da notícia." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("news")
    .update({
      titulo,
      titulo_story: input.tituloStory?.trim() || null,
      tamanho_fonte: input.tamanhoFonte ?? "M",
      resumo,
      conteudo,
      imagem_url: input.removerImagem
        ? null
        : input.imagemUrl?.trim() || undefined,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${input.id}`);
  revalidatePath("/admin/noticias");
  return { ok: true };
}

// Salva (em ordem) as até 3 notícias que aparecem em destaque na home.
export async function salvarNoticiasDestaques(
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!(await ensureAdmin())) return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .update({ noticias_destaques_ids: ids.slice(0, 3) })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/noticias");
  return { ok: true };
}
