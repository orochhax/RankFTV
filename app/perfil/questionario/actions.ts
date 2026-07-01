"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Genero } from "@/lib/types";

export async function salvarQuestionario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const genero = formData.get("genero") as Genero | null;
  if (genero !== "masculino" && genero !== "feminino" && genero !== "outro") {
    return { error: "Selecione seu gênero." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ genero })
    .eq("id", user.id);

  if (error) return { error: "Erro ao salvar. Tente novamente." };

  revalidatePath("/perfil");
  revalidatePath("/campeonatos", "layout");
  redirect("/perfil");
}
