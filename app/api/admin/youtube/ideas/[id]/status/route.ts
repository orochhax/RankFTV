import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";

const statusSchema = z.enum([
  "identified", "saved", "researching", "scripting", "ready", "recording", "editing", "published", "discarded",
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = z.object({ status: statusSchema }).safeParse(await request.json().catch(() => null));
  if (!body.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const { data, error } = await createAdminClient().from("yt_ideas").update({
    status: body.data.status,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Falha ao atualizar ideia" }, { status: 500 });
  return data
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Ideia não encontrada" }, { status: 404 });
}
