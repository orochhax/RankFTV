import { createClient } from "@/lib/supabase/server";

export type ParaVoceViewerState = {
  isLoggedIn: boolean;
  hasArena: boolean;
};

/** Resolve o estado mínimo de sessão e propriedade de arena para a landing /para-voce. */
export async function loadParaVoceViewerState(): Promise<ParaVoceViewerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isLoggedIn: false, hasArena: false };
  }

  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("dono_id", user.id)
    .limit(1)
    .maybeSingle();

  return { isLoggedIn: true, hasArena: !!arena };
}
