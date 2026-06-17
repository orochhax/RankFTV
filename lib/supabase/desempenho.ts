import { createClient } from "@/lib/supabase/server";

// Dados que alimentam o bloco "Meu desempenho" da Home e a página de
// evolução. Ver supabase/perfil_desempenho.sql pro modelo de dados.

// ── Histórico de campeonatos do usuário ───────────────────────────────────
// Vem da view ranking_entries (external_results + atletas + torneios), já
// com a `categoria` em que jogou cada um. Ordenado do mais antigo pro mais
// novo (o gráfico de evolução lê nessa ordem).
export type HistoricoEntry = {
  id: string;
  data: string;
  nome_circuito: string;
  tier: string;
  parceiro_nome: string | null;
  categoria: string | null;
  colocacao: number;
  pontos: number;
};

export async function getHistorico(userId: string): Promise<HistoricoEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranking_entries")
    .select("id, data, nome_circuito, tier, parceiro_nome, categoria, colocacao, pontos")
    .eq("user_id", userId)
    .order("data", { ascending: true });
  if (error || !data) return [];
  return data as HistoricoEntry[];
}

// ── Posição no ranking geral (card "Rank") ────────────────────────────────
// Procura o usuário no ranking_individual (mesma tabela que alimenta /rank)
// pelo @usuário e calcula a posição dele dentro do próprio gênero, usando o
// MESMO critério de ordenação da página /rank (pontos desc, nome asc).
export type RankPosicao = { posicao: number; pontos: number };

export async function getRankPosicao(username: string): Promise<RankPosicao | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranking_individual")
    .select("nome, instagram, genero, pontos");
  if (error || !data) return null;

  const eu = data.find((r) => r.instagram === username);
  if (!eu) return null;

  const ordenado = data
    .filter((r) => r.genero === eu.genero)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome));

  const idx = ordenado.findIndex((r) => r.instagram === username);
  return { posicao: idx + 1, pontos: eu.pontos };
}

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
