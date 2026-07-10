import { createClient } from "@/lib/supabase/server";

// ── Conquistas em destaque (card "Conquistas") ────────────────────────────
// As 4 que o usuário escolheu (destaque_ordem 1..4). Se não escolheu
// nenhuma, mostra as 4 mais recentes como padrão.
export type ConquistaDestaque = {
  id: string;
  titulo: string;
  icone: string | null;
};

export async function getConquistasDestaque(
  userId: string
): Promise<ConquistaDestaque[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conquistas")
    .select("id, titulo, icone, destaque_ordem, data_conquistada")
    .eq("user_id", userId);
  if (error || !data) return [];

  const escolhidas = data
    .filter((c) => c.destaque_ordem != null)
    .sort((a, b) => a.destaque_ordem - b.destaque_ordem);

  const lista = escolhidas.length
    ? escolhidas
    : [...data]
        .sort((a, b) =>
          (b.data_conquistada ?? "").localeCompare(a.data_conquistada ?? "")
        )
        .slice(0, 3);

  return lista.slice(0, 3).map((c) => ({
    id: c.id,
    titulo: c.titulo,
    icone: c.icone,
  }));
}
