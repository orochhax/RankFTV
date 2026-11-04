import { getEvolutionOwner } from "@/lib/evolution/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getEvolutionOwner())) return new Response("Não autorizado", { status: 401 });
  const video = new URL(request.url).searchParams.get("video");
  if (!video || !/^[A-Za-z0-9_-]+$/.test(video)) return new Response("Thumbnail inválida", { status: 400 });
  try {
    const response = await fetch(`https://i.ytimg.com/vi/${encodeURIComponent(video)}/hqdefault.jpg`, { cache: "force-cache", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return new Response("Thumbnail não encontrada", { status: 404 });
    return new Response(await response.arrayBuffer(), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });
  } catch { return new Response("Thumbnail não encontrada", { status: 404 }); }
}
