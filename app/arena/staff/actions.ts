"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StaffState = { error?: string };

const PAPEIS = ["professor", "gerente"];

async function requireOwnedArena(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  arenaId: string,
) {
  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .eq("dono_id", userId)
    .maybeSingle();
  return arena?.id ?? null;
}

// Só o dono adiciona/remove equipe — evita que um gerente promova outro
// gerente ou remova quem quiser.
export async function adicionarStaff(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const arenaIdRaw = (formData.get("arena_id") as string) ?? "";
  const username    = ((formData.get("username") as string) ?? "").trim().replace(/^@/, "");
  const papelRaw    = (formData.get("papel") as string) ?? "";
  if (!arenaIdRaw || !username) return { error: "Informe o @usuário." };
  if (!PAPEIS.includes(papelRaw)) return { error: "Papel inválido." };

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return { error: "Arena não encontrada." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome")
    .ilike("username", username)
    .maybeSingle();
  if (!perfil) return { error: "Não encontramos esse @usuário." };
  if (perfil.id === user.id) return { error: "Você já é o dono da arena." };

  const { error } = await supabase.from("arena_staff").insert({
    arena_id:   arenaId,
    user_id:    perfil.id,
    invited_by: user.id,
    papel:      papelRaw,
    status:     "aceito",
  });

  if (error) {
    if (error.code === "23505") return { error: `${perfil.nome} já faz parte da equipe.` };
    return { error: "Erro ao adicionar à equipe." };
  }

  revalidatePath("/arena/[handle]", "layout");
  return {};
}

export async function removerStaff(staffId: string, arenaIdRaw: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const arenaId = await requireOwnedArena(supabase, user.id, arenaIdRaw);
  if (!arenaId) return;

  const { data: staffRow } = await supabase
    .from("arena_staff")
    .select("id, user_id")
    .eq("id", staffId)
    .eq("arena_id", arenaId)
    .maybeSingle();
  if (!staffRow) return;

  await supabase.from("arena_staff").delete().eq("id", staffId).eq("arena_id", arenaId);

  // Aulas que tinham esse professor ficam SEM professor designado — nunca
  // apaga a aula nem o histórico de presença já registrado, mas a pessoa
  // removida da equipe imediatamente perde a autorização de finalizar
  // presença/cobrança dessa aula (arena_finalize_attendance também checa
  // professor_id — se não limpar aqui, alguém removido continuaria autorizado).
  await supabase
    .from("arena_classes")
    .update({ professor_id: null })
    .eq("arena_id", arenaId)
    .eq("professor_id", staffRow.user_id);

  revalidatePath("/arena/[handle]", "layout");
}
