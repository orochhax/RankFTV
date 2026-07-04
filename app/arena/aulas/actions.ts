"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AulaState = { error?: string };

export async function criarAula(
  _prev: AulaState,
  formData: FormData,
): Promise<AulaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const titulo  = ((formData.get("titulo")  as string) ?? "").trim();
  const horario = ((formData.get("horario") as string) ?? "").trim();
  const diasRaw = formData.getAll("dias_semana") as string[];
  const dias    = diasRaw.map(Number).filter((n) => n >= 0 && n <= 6);

  // Nível opcional — vazio = "todos os níveis" (null no banco)
  const nivelRaw = ((formData.get("nivel") as string) ?? "").trim();
  const NIVEIS   = ["iniciante", "intermediario", "avancado"];
  const nivel    = NIVEIS.includes(nivelRaw) ? nivelRaw : null;

  // Limite de alunos opcional — vazio ou inválido = sem limite (null)
  const maxRaw     = parseInt((formData.get("max_alunos") as string) ?? "", 10);
  const maxAlunos  = Number.isInteger(maxRaw) && maxRaw > 0 ? maxRaw : null;

  if (!titulo) return { error: "Informe o título da aula." };

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) return { error: "Arena não encontrada." };

  const { error } = await supabase.from("arena_classes").insert({
    arena_id:    arena.id,
    titulo,
    horario:     horario || null,
    dias_semana: dias,
    nivel,
    max_alunos:  maxAlunos,
  });

  if (error) return { error: "Erro ao criar a aula." };
  revalidatePath("/arena/aulas");
  return {};
}

export async function removerAula(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("arena_classes")
    .delete()
    .eq("id", id)
    .filter("arena_id", "in", `(SELECT id FROM arenas WHERE dono_id = '${user.id}')`);

  revalidatePath("/arena/aulas");
}
