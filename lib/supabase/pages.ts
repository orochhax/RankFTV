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

// Seguidores de uma página (dado público, como Instagram/YouTube), do mais
// recente pro mais antigo, já com nome/@/foto do perfil.
export type PageFollower = {
  id: string;
  nome: string;
  username: string | null;
  fotoUrl: string | null;
  avatarColor: string;
};

const FOLLOWER_AVATAR_COLORS = [
  "bg-blue-500", "bg-blue-500", "bg-violet-500",
  "bg-orange-500", "bg-rose-500", "bg-teal-500",
];
function followerAvatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return FOLLOWER_AVATAR_COLORS[Math.abs(h) % FOLLOWER_AVATAR_COLORS.length];
}

export async function getPageFollowers(pageId: string): Promise<PageFollower[]> {
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from("page_followers")
    .select("user_id, created_at")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });

  const userIds = [...new Set((follows ?? []).map((f) => f.user_id as string))];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, username, foto_url")
    .in("id", userIds);

  const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Preserva a ordem dos follows e ignora perfis que sumiram.
  return userIds
    .map((uid) => {
      const p = profMap.get(uid);
      if (!p) return null;
      return {
        id: uid,
        nome: p.nome ?? "Atleta",
        username: p.username ?? null,
        fotoUrl: p.foto_url ?? null,
        avatarColor: followerAvatarColor(uid),
      } satisfies PageFollower;
    })
    .filter((f): f is PageFollower => f !== null);
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
