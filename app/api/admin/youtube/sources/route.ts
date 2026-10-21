import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";
import { youtubeSourceCreateSchema } from "@/lib/youtube/source-management";

const sourceSelect = "id, name, kind, url, category, language, enabled, last_success_at";

export async function POST(request: Request) {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = youtubeSourceCreateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient().from("yt_sources").upsert({
    name: body.data.name,
    kind: body.data.kind,
    url: body.data.url,
    category: "geral",
    language: "pt-BR",
    enabled: true,
    archived_at: null,
    updated_at: now,
  }, { onConflict: "url" }).select(sourceSelect).single();
  if (error) return NextResponse.json({ error: "Não foi possível adicionar a fonte." }, { status: 500 });
  return NextResponse.json({ source: data }, { status: 201 });
}

