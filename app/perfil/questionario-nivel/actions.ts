"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  // O questionário só define o nível autodeclarado inicial. Depois da
  // primeira partida com resultado (rating_history com linha pra esse
  // atleta), o rating vira competitivo/oficial e o questionário deixa de
  // poder sobrescrevê-lo — senão dava pra "resetar" o rating pra sandbaguear
  // categoria depois de já ter jogado.
  const { count: partidasJogadas } = await supabase
    .from("rating_history")
    .select("id", { count: "exact", head: true })
    .eq("atleta_id", user.id);
  const ratingEhCompetitivo = (partidasJogadas ?? 0) > 0;

  const [{ error: ratingError }, { error: questionnaireError }] = await Promise.all([
    ratingEhCompetitivo
      ? Promise.resolve({ error: null })
      : admin.from("profiles").update({ rating }).eq("id", user.id),
    supabase
      .from("profiles_private")
      .upsert(
        { user_id: user.id, questionario: respostas },
        { onConflict: "user_id" },
      ),
  ]);

  if (ratingError || questionnaireError) return { error: "Erro ao salvar. Tente de novo." };

  const redirectParam = formData.get("redirect");
  const redirectTo =
    typeof redirectParam === "string" && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/perfil";

  redirect(redirectTo);
}
