import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";
import { youtubeSourceUpdateSchema } from "@/lib/youtube/source-management";

const sourceSelect = "id, name, kind, url, category, language, enabled, last_success_at";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = youtubeSourceUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: body.success ? "Fonte inválida" : (body.error.issues[0]?.message ?? "Dados inválidos") }, { status: 400 });
  }
  const { data, error } = await createAdminClient().from("yt_sources").update({
    ...body.data,
    updated_at: new Date().toISOString(),
  }).eq("id", id).is("archived_at", null).select(sourceSelect).maybeSingle();
  if (error?.code === "23505") return NextResponse.json({ error: "Esse link já está cadastrado." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Falha ao atualizar fonte" }, { status: 500 });
  return data
    ? NextResponse.json({ source: data })
    : NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Fonte inválida" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const { data, error } = await createAdminClient().from("yt_sources").update({
    enabled: false,
    archived_at: now,
    updated_at: now,
  }).eq("id", id).is("archived_at", null).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Falha ao remover fonte" }, { status: 500 });
  return data
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
}

