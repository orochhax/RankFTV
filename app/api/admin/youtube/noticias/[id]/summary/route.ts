import { NextResponse } from "next/server";
import { requireYoutubeOwner } from "@/lib/youtube/access";
import { generateYoutubeArticleSummary } from "@/lib/youtube/article-summary";
import { getYoutubeNewsDetail } from "@/lib/youtube/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireYoutubeOwner();
  const { id } = await context.params;
  const data = await getYoutubeNewsDetail(id);
  if (!data.item) return NextResponse.json({ error: "Notícia não encontrada." }, { status: 404 });
  try {
    return NextResponse.json({ summary: await generateYoutubeArticleSummary(data.item) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível gerar o resumo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
