"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function ativarOrganizador(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const telefone = (formData.get("telefone") as string).replace(/\D/g, "");
  const chavePix = (formData.get("chave_pix") as string).trim();

  if (!telefone || !chavePix) {
    return { error: "Preencha todos os campos." };
  }
  if (telefone.length < 10) {
    return { error: "Telefone inválido. Informe com DDD." };
  }
  if (chavePix.length < 5) {
    return { error: "Chave Pix inválida." };
  }

  const { error: dbError } = await supabase
    .from("organizer_accounts")
    .upsert(
      {
        user_id:   user.id,
        telefone,
        chave_pix: chavePix,
        habilitado: true,
      },
      { onConflict: "user_id" }
    );

  if (dbError) return { error: "Erro ao salvar dados. Tente novamente." };

  redirect("/painel");
}
