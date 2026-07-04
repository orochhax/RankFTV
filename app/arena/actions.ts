"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Notificação in-app (best-effort — nunca bloqueia o fluxo principal).
async function notificar(userId: string, titulo: string, mensagem: string) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: userId,
      championship_id: null,
      tipo: "arena",
      titulo,
      mensagem,
    });
  } catch {
    console.error("[arena] falha ao criar notificação para", userId);
  }
}

export async function aceitarAluno(alunoId: string, arenaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // Verifica que o usuário é dono da arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome")
    .eq("id", arenaId)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  const { data: vinculo, error } = await supabase
    .from("arena_students")
    .update({ status: "ativo", data_entrada: new Date().toISOString().split("T")[0] })
    .eq("id", alunoId)
    .eq("arena_id", arenaId)
    .select("user_id")
    .single();

  if (error || !vinculo) return { error: "Erro ao aceitar aluno." };

  // Avisa o aluno que foi aceito
  await notificar(
    vinculo.user_id,
    "Você foi aceito na arena!",
    `Seu pedido de entrada na ${arena.nome} foi aprovado. Agora você já pode marcar presença nas aulas.`,
  );

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

  // Dados da arena (pra validar e notificar o dono)
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("id", arenaId)
    .maybeSingle();
  if (!arena) return { error: "Arena não encontrada." };

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
    const { error } = await supabase
      .from("arena_students")
      .update({ status: "pendente" })
      .eq("id", existente.id);
    if (error) return { error: "Erro ao enviar o pedido. Tente novamente." };
  } else {
    const { error } = await supabase
      .from("arena_students")
      .insert({ arena_id: arenaId, user_id: user.id });
    if (error) return { error: "Erro ao enviar o pedido. Tente novamente." };
  }

  // Notifica o dono da arena do novo pedido
  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, username")
    .eq("id", user.id)
    .single();
  await notificar(
    arena.dono_id,
    "Novo pedido de entrada na arena",
    `${perfil?.nome ?? "Um atleta"} (@${perfil?.username ?? "?"}) pediu para entrar na ${arena.nome}. Revise em Minha Arena.`,
  );

  revalidatePath("/perfil");
  revalidatePath(`/arena/${arena.handle}`);   // painel do dono
  revalidatePath(`/arenas/${arena.handle}`);  // página pública da arena
  return { ok: true };
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
