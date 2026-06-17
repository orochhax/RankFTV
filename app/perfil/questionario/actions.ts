"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calcularRatingQuestionario,
  type RespostasQuestionario,
} from "@/lib/motor-categoria";

export async function salvarQuestionario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const respostas: RespostasQuestionario = {
    tempo:            formData.get("tempo")            as RespostasQuestionario["tempo"],
    nivel:            formData.get("nivel")            as RespostasQuestionario["nivel"],
    frequencia:       formData.get("frequencia")       as RespostasQuestionario["frequencia"],
    melhor_resultado: formData.get("melhor_resultado") as RespostasQuestionario["melhor_resultado"],
    categoria_usual:  formData.get("categoria_usual")  as RespostasQuestionario["categoria_usual"],
  };

  for (const [key, val] of Object.entries(respostas)) {
    if (!val) return { error: `Responda a pergunta sobre ${key}.` };
  }

  const rating = calcularRatingQuestionario(respostas);

  const { error } = await supabase
    .from("profiles")
    .update({ questionario: respostas, rating })
    .eq("id", user.id);

  if (error) return { error: "Erro ao salvar. Tente novamente." };

  redirect("/perfil");
}
