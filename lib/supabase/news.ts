import { createClient } from "@/lib/supabase/server";
import type { News } from "@/lib/news-utils";

export type { News } from "@/lib/news-utils";
export { formatDataNoticia } from "@/lib/news-utils";

const COLS = "id, titulo, resumo, conteudo, imagem_url, created_at";

// As N notícias mais recentes (usado na home — mostra 3).
export async function getRecentNews(limit = 3): Promise<News[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as News[];
}

// Uma página de notícias (lista pública /noticias). Retorna itens + total
// pra montar a paginação por bolinhas.
export async function getNewsPage(
  page: number,
  perPage = 10,
): Promise<{ items: News[]; total: number }> {
  const supabase = await createClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count } = await supabase
    .from("news")
    .select(COLS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  return { items: (data ?? []) as News[], total: count ?? 0 };
}

// Todas as notícias (lista do painel admin).
export async function getAllNews(): Promise<News[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(COLS)
    .order("created_at", { ascending: false });
  return (data ?? []) as News[];
}

// Notícias em destaque na home, na ordem exata escolhida pelo admin.
// Ignora ids que não existem mais (notícia excluída).
export async function getDestaqueNews(ids: string[]): Promise<News[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("news").select(COLS).in("id", ids);
  const list = (data ?? []) as News[];
  return ids
    .map((id) => list.find((n) => n.id === id))
    .filter((n): n is News => Boolean(n));
}

export async function getNewsById(id: string): Promise<News | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  return (data as News) ?? null;
}
