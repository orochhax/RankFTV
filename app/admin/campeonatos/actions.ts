"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ChampStatus = "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado";
const STATUS_VALIDOS: ChampStatus[] = [
  "rascunho",
  "inscricoes_abertas",
  "em_andamento",
  "encerrado",
];

async function exigirAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { ok: false as const, error: "Sem permissão." };
  }
  return { ok: true as const };
}

/** Admin muda o status de qualquer campeonato (ex.: voltar pra rascunho). */
export async function updateChampionshipStatus(
  champId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await exigirAdmin();
  if (!auth.ok) return auth;

  if (!STATUS_VALIDOS.includes(status as ChampStatus)) {
    return { ok: false, error: "Status inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("championships")
    .update({ status })
    .eq("id", champId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/campeonatos");
  revalidatePath("/campeonatos");
  revalidatePath(`/campeonatos/${champId}`);
  return { ok: true };
}

/** Admin exclui qualquer campeonato, removendo os registros dependentes. */
export async function deleteChampionship(
  champId: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await exigirAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();

  // Mesma ordem do fluxo do organizador (dependentes antes do pai).
  await admin.from("registrations").delete().eq("championship_id", champId);
  await admin.from("teams").delete().eq("championship_id", champId);
  await admin.from("bracket_matches").delete().eq("championship_id", champId);
  await admin.from("credentials").delete().eq("championship_id", champId);
  await admin.from("shirt_production").delete().eq("championship_id", champId);
  await admin.from("championship_categories").delete().eq("championship_id", champId);
  const { error } = await admin.from("championships").delete().eq("id", champId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/campeonatos");
  revalidatePath("/campeonatos");
  return { ok: true };
}
