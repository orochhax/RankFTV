import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, BookOpen, ExternalLink, Calendar, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPageChampionships } from "@/lib/supabase/pages";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSeguidores(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

export default async function PaginaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("id, owner_id, nome, handle, descricao, banner_from, banner_to, banner_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!page) notFound();
  if (page.owner_id !== user.id) notFound();

  const [{ count: seguidores }, editions] = await Promise.all([
    supabase
      .from("page_followers")
      .select("id", { count: "exact", head: true })
      .eq("page_id", id),
    getPageChampionships(id),
  ]);

  const STATUS_LABEL: Record<string, string> = {
    inscricoes_abertas: "Inscrições abertas",
    em_andamento: "Em andamento",
    encerrado: "Encerrado",
  };
  const STATUS_COLOR: Record<string, string> = {
    inscricoes_abertas: "bg-green-100 text-green-700",
    em_andamento: "bg-blue-100 text-blue-700",
    encerrado: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-14 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/painel/paginas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Minhas Páginas
          </Link>

          {/* Banner */}
          <div className="relative h-28 w-full overflow-hidden rounded-2xl">
            {(page as unknown as { banner_url?: string | null }).banner_url ? (
              <Image
                src={(page as unknown as { banner_url: string }).banner_url}
                alt={page.nome}
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${page.banner_from} ${page.banner_to}`}>
                <span className="text-5xl font-bold text-white/90">{page.nome.charAt(0)}</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{page.nome}</h1>
            <p className="text-sm text-white/50">@{page.handle}</p>
            {page.descricao && (
              <p className="mt-1 text-sm text-white/70">{page.descricao}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1">
                <Users className="size-4" />
                {formatSeguidores(seguidores ?? 0)} seguidores
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="size-4" />
                {editions.length} edições
              </span>
            </div>
          </div>

          <Link
            href={`/campeonatos/paginas/${page.handle}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
          >
            <ExternalLink className="size-3" />
            Ver página pública
          </Link>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Edições vinculadas</h2>

          {editions.length === 0 ? (
            <div className="rounded-2xl bg-white px-5 py-8 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-500">
                Nenhuma edição ainda. Ao criar ou editar um campeonato, vincule-o a esta página.
              </p>
              <Link
                href="/painel/novo-campeonato"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Criar campeonato
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {editions.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/painel/campeonatos/${e.id}`}
                    className="flex items-start gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-900">{e.nome}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-500"}`}
                        >
                          {STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(e.data_inicio)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {e.cidade}, {e.estado}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
