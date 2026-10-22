import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { hasYoutubeOwnerAccess } from "@/lib/youtube/access";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function youtubeThumbnail(video: string) {
  try {
    const response = await fetch(`https://i.ytimg.com/vi/${encodeURIComponent(video)}/hqdefault.jpg`, {
      cache: "force-cache",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return new Response("Thumbnail não encontrada", { status: 404 });
    return new Response(await response.arrayBuffer(), {
      headers: { "content-type": response.headers.get("content-type") ?? "image/jpeg", "cache-control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Thumbnail não encontrada", { status: 404 });
  }
}

export async function GET(request: Request) {
  if (!(await hasYoutubeOwnerAccess())) {
    return new Response("Não autorizado", { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  if (params.get("asset") !== "thumbnail") return new Response("Recurso não encontrado", { status: 404 });
  const channel = params.get("channel");
  const video = params.get("video");
  if (!channel || !video || path.basename(channel) !== channel || !/^[A-Za-z0-9_-]+$/.test(video)) {
    return new Response("Thumbnail inválida", { status: 400 });
  }
  const vaultRoot = process.env.ROCHA_VAULT_ROOT ?? "C:\\Users\\SnyX\\Desktop\\Carlos Rocha";
  const thumbnailsRoot = path.join(vaultRoot, "Rocha Tech - YT", "Concorrentes", channel, "Thumbnails");
  try {
    const files = await fs.readdir(thumbnailsRoot, { withFileTypes: true });
    const file = files.find((entry) => entry.isFile() && entry.name.includes(`[${video}]`));
    if (!file) return youtubeThumbnail(video);
    const body = await fs.readFile(path.join(thumbnailsRoot, file.name));
    const extension = path.extname(file.name).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    return new Response(body, { headers: { "content-type": contentType, "cache-control": "private, max-age=86400" } });
  } catch { return youtubeThumbnail(video); }
}

export async function POST() {
  if (!(await hasYoutubeOwnerAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    error: "Pesquisa automática desativada. Atualize o radar pelo procedimento manual do Codex no VS Code.",
  }, { status: 410 });
}
