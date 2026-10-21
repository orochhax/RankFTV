import { NextResponse } from "next/server";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    error: "Pesquisa automática desativada. Atualize o radar pelo procedimento manual do Codex no VS Code.",
  }, { status: 410 });
}
