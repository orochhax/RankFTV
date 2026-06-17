"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RespostasQuestionario = {
  tempo:            "menos_1" | "1_3" | "3_6" | "mais_6";
  nivel:            "recreativo" | "amador" | "competitivo" | "alto_nivel";
  frequencia:       "1x" | "2_3x" | "4_5x" | "todo_dia";
  melhor_resultado: "nunca" | "sem_podio" | "top4" | "campeao";
  categoria_usual:  "nunca" | "D" | "C" | "B" | "A_elite";
};

const PESOS: Record<keyof RespostasQuestionario, Record<string, number>> = {
  tempo:            { menos_1: 0, "1_3": 200, "3_6": 450, mais_6: 700 },
  nivel:            { recreativo: 0, amador: 200, competitivo: 450, alto_nivel: 700 },
  frequencia:       { "1x": 0, "2_3x": 100, "4_5x": 200, todo_dia: 300 },
  melhor_resultado: { nunca: 0, sem_podio: 150, top4: 350, campeao: 600 },
  categoria_usual:  { nunca: 0, D: 50, C: 200, B: 350, A_elite: 500 },
};

export function calcularRating(r: RespostasQuestionario): number {
  const soma =
    (PESOS.tempo[r.tempo]                       ?? 0) +
    (PESOS.nivel[r.nivel]                       ?? 0) +
    (PESOS.frequencia[r.frequencia]             ?? 0) +
    (PESOS.melhor_resultado[r.melhor_resultado] ?? 0) +
    (PESOS.categoria_usual[r.categoria_usual]   ?? 0);
  return 100 + soma; // mínimo 100, máximo ~2900
}

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

  // Valida que todas foram respondidas
  for (const [key, val] of Object.entries(respostas)) {
    if (!val) return { error: `Responda a pergunta sobre ${key}.` };
  }

  const rating = calcularRating(respostas);

  const { error } = await supabase
    .from("profiles")
    .update({ questionario: respostas, rating })
    .eq("id", user.id);

  if (error) return { error: "Erro ao salvar. Tente novamente." };

  redirect("/perfil");
}
