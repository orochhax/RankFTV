"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function aceitarAluno(alunoId: string, arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verifica que o usuário é dono da arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  const { error } = await supabase
    .from("arena_students")
    .update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] })
    .eq("id", alunoId)
    .eq("arena_id", arenaId);

  if (error) return { error: "Erro ao aceitar aluno." };

  revalidatePath("/arena");
  return {};
}

export async function recusarAluno(alunoId: string, arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  await supabase
    .from("arena_students")
    .update({ status: "inativo" })
    .eq("id", alunoId)
    .eq("arena_id", arenaId);

  revalidatePath("/arena");
  return {};
}

export async function entrarNaArena(arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para entrar na arena." };

  // Verifica se já é aluno
  const { data: existente } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    if (existente.status === "ativo")    return { error: "Você já é aluno desta arena." };
    if (existente.status === "pendente") return { error: "Seu pedido já está em análise." };
    // inativo: reativar
    await supabase.from("arena_students").update({ status: "pendente" }).eq("id", existente.id);
    revalidatePath("/perfil");
    return {};
  }

  await supabase.from("arena_students").insert({ arena_id: arenaId, user_id: user.id });
  revalidatePath("/perfil");
  return {};
}

export async function entrarComCodigo(arenaId: string, codigo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para entrar na arena." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, invite_code")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };
  if (arena.invite_code?.toUpperCase() !== codigo.toUpperCase())
    return { error: "Código inválido." };

  const { data: existente } = await supabase
    .from("arena_students")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente?.status === "ativo") return { error: "Você já é aluno desta arena." };

  if (existente) {
    await supabase.from("arena_students").update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] }).eq("id", existente.id);
  } else {
    await supabase.from("arena_students").insert({
      arena_id:    arenaId,
      user_id:     user.id,
      status:      "ativo",
      data_entrada: new Date().toISOString().split("T")[0],
    });
  }

  revalidatePath(`/arenas`);
  revalidatePath("/perfil");
  return { ok: true };
}
