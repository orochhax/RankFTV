import { createClient } from "@/lib/supabase/server";

export type Page = {
  id: string;
  ownerId: string;
  nome: string;
  handle: string;
  descricao: string;
  bannerFrom: string;
  bannerTo: string;
  bannerUrl: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type PageWithStats = Page & {
  seguidores: number;
  edicoes: number;
};

type PageRow = {
  id: string;
  owner_id: string;
  nome: string;
  handle: string;
  descricao: string;
  banner_from: string;
  banner_to: string;
  banner_url: string | null;
  avatar_url: string | null;
  created_at: string;
};

function mapPage(row: PageRow): Page {
  return {
    id: row.id,
    ownerId: row.owner_id,
    nome: row.nome,
    handle: row.handle,
    descricao: row.descricao,
    bannerFrom: row.banner_from,
    bannerTo: row.banner_to,
    bannerUrl: row.banner_url ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
  };
}

// Lista pública de páginas com contadores
export async function getPages(): Promise<PageWithStats[]> {
  const supabase = await createClient();

  const { data: pagesData } = await supabase
    .from("pages")
    .select(
      "id, owner_id, nome, handle, descricao, banner_from, banner_to, banner_url, avatar_url, created_at",
    )
    .order("created_at", { ascending: false });

  if (!pagesData || pagesData.length === 0) return [];

  const ids = pagesData.map((p) => p.id);

  // SELECT public — qualquer um pode contar seguidores
  const { data: followersData } = await supabase
    .from("page_followers")
    .select("page_id")
    .in("page_id", ids);

  const { data: editionsData } = await supabase
    .from("championships")
    .select("page_id")
    .in("page_id", ids)
    .neq("status", "rascunho");

  const followerCount: Record<string, number> = {};
  const editionCount: Record<string, number> = {};
  for (const id of ids) {
    followerCount[id] = 0;
    editionCount[id] = 0;
  }
  for (const f of followersData ?? []) {
    if (f.page_id) followerCount[f.page_id] = (followerCount[f.page_id] ?? 0) + 1;
  }
  for (const e of editionsData ?? []) {
    if (e.page_id) editionCount[e.page_id] = (editionCount[e.page_id] ?? 0) + 1;
  }

  return (pagesData as PageRow[]).map((row) => ({
    ...mapPage(row),
    seguidores: followerCount[row.id] ?? 0,
    edicoes: editionCount[row.id] ?? 0,
  }));
}

// Páginas que o usuário logado é dono
export async function getMyPages(userId: string): Promise<PageWithStats[]> {
  const supabase = await createClient();

  const { data: pagesData } = await supabase
    .from("pages")
    .select(
      "id, owner_id, nome, handle, descricao, banner_from, banner_to, banner_url, avatar_url, created_at",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (!pagesData || pagesData.length === 0) return [];

  const ids = pagesData.map((p) => p.id);

  const { data: followersData } = await supabase
    .from("page_followers")
    .select("page_id")
    .in("page_id", ids);

  const { data: editionsData } = await supabase
    .from("championships")
    .select("page_id")
    .in("page_id", ids);

  const followerCount: Record<string, number> = {};
  const editionCount: Record<string, number> = {};
  for (const id of ids) {
    followerCount[id] = 0;
    editionCount[id] = 0;
  }
  for (const f of followersData ?? []) {
    if (f.page_id) followerCount[f.page_id] = (followerCount[f.page_id] ?? 0) + 1;
  }
  for (const e of editionsData ?? []) {
    if (e.page_id) editionCount[e.page_id] = (editionCount[e.page_id] ?? 0) + 1;
  }

  return (pagesData as PageRow[]).map((row) => ({
    ...mapPage(row),
    seguidores: followerCount[row.id] ?? 0,
    edicoes: editionCount[row.id] ?? 0,
  }));
}

// Página pública por handle
export async function getPageByHandle(
  handle: string,
): Promise<PageWithStats | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("pages")
    .select(
      "id, owner_id, nome, handle, descricao, banner_from, banner_to, banner_url, avatar_url, created_at",
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!row) return null;

  const [{ count: followersCount }, { count: editionsCount }] =
    await Promise.all([
      supabase
        .from("page_followers")
        .select("id", { count: "exact", head: true })
        .eq("page_id", row.id),
      supabase
        .from("championships")
        .select("id", { count: "exact", head: true })
        .eq("page_id", row.id)
        .neq("status", "rascunho"),
    ]);

  return {
    ...mapPage(row as PageRow),
    seguidores: followersCount ?? 0,
    edicoes: editionsCount ?? 0,
  };
}

// Edições (campeonatos) de uma página
export async function getPageChampionships(pageId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("championships")
    .select("id, nome, data_inicio, data_fim, cidade, estado, status")
    .eq("page_id", pageId)
    .neq("status", "rascunho")
    .order("data_inicio", { ascending: false });
  return data ?? [];
}

// IDs das páginas que um usuário segue
export async function getFollowedPageIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("page_followers")
    .select("page_id")
    .eq("user_id", userId);
  return data?.map((f) => f.page_id) ?? [];
}

// Verifica se um handle já existe
export async function handleExists(handle: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("handle", handle);
  return (count ?? 0) > 0;
}
