"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PresencaState = { error?: string; ok?: boolean };

export async function marcarPresenca(
  classId: string,
  arenaId: string,
): Promise<PresencaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para marcar presença." };

  // Verifica que é aluno ativo desta arena
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!vinculo) return { error: "Você não é aluno ativo desta arena." };

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const { error } = await supabase.from("arena_attendance").insert({
    class_id: classId,
    arena_id: arenaId,
    user_id:  user.id,
    data:     hoje,
  });

  if (error) {
    if (error.code === "23505") return { error: "Presença já marcada nesta aula hoje." };
    return { error: "Erro ao marcar presença." };
  }

  revalidatePath("/arena/presenca");
  return { ok: true };
}
