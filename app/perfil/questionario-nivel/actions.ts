"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calcularRatingQuestionario,
  PERGUNTAS_NIVEL,
  type RespostasQuestionario,
} from "@/lib/motor-categoria";

export async function salvarQuestionarioNivel(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw: Record<string, string> = {};
  for (const p of PERGUNTAS_NIVEL) {
    const valor = formData.get(p.key);
    if (typeof valor !== "string" || !valor) {
      return { error: "Responda todas as perguntas." };
    }
    raw[p.key] = valor;
  }
  const respostas = raw as unknown as RespostasQuestionario;
  const rating = calcularRatingQuestionario(respostas);

  const { error } = await supabase
    .from("profiles")
    .update({ questionario: respostas, rating })
    .eq("id", user.id);

  if (error) return { error: "Erro ao salvar. Tente de novo." };

  const redirectParam = formData.get("redirect");
  const redirectTo =
    typeof redirectParam === "string" && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/perfil";

  redirect(redirectTo);
}
