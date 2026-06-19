import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPageByHandle,
  getPageChampionships,
  getFollowedPageIds,
} from "@/lib/supabase/pages";
import { PagePublicHeader } from "@/components/paginas/PagePublicHeader";
import { SocialLinksBar, type SocialLink } from "@/components/paginas/SocialLinksBar";
import { EtapaAtualCard } from "@/components/paginas/EtapaAtualCard";

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

export default async function PublicPagePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = await getPageByHandle(handle);
  if (!page) notFound();

  const [editions, followedIds, pageRow] = await Promise.all([
    getPageChampionships(page.id),
    user ? getFollowedPageIds(user.id) : Promise.resolve([]),
    supabase.from("pages").select("owner_id, social_links").eq("id", page.id).single(),
  ]);

  const following = followedIds.includes(page.id);
  const isOwner = user?.id === pageRow.data?.owner_id;
  const socialLinks: SocialLink[] = (pageRow.data?.social_links as SocialLink[] | null) ?? [];
  const encerradas = editions.filter((e) => e.status === "encerrado");
  const abertas = editions.filter((e) => e.status !== "encerrado");

  return (
    <div className="min-h-screen">
      {/* Header preto com banner */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/campeonatos/paginas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Páginas
          </Link>

          {/* Banner */}
          <div className="relative h-28 w-full overflow-hidden rounded-2xl">
            {page.bannerUrl ? (
              <Image src={page.bannerUrl} alt={page.nome} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${page.bannerFrom} ${page.bannerTo}`}>
                <span className="text-5xl font-bold text-white/90">{page.nome.charAt(0)}</span>
              </div>
            )}
          </div>

          <PagePublicHeader
            pageId={page.id}
            nome={page.nome}
            handle={page.handle}
            descricao={page.descricao}
            edicoes={page.edicoes}
            userId={user?.id ?? null}
            initialFollowing={following}
            initialSeguidores={page.seguidores}
          />

          <SocialLinksBar
            pageId={page.id}
            initialLinks={socialLinks}
            isOwner={isOwner}
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          <EtapaAtualCard
            pageId={page.id}
            isOwner={isOwner}
            linkedChampionships={editions.map((e) => ({
              id: e.id,
              nome: e.nome,
              cidade: e.cidade,
              estado: e.estado,
              data_inicio: e.data_inicio,
              data_fim: e.data_fim ?? e.data_inicio,
              status: e.status,
            }))}
          />

          {/* Abertas ou em andamento */}
          {abertas.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Próximas edições</h2>
              <ul className="space-y-3">
                {abertas.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/campeonatos/${e.id}`}
                      className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{e.nome}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[e.status] ?? "bg-gray-100 text-gray-500"}`}
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
            </section>
          )}

          {/* Encerradas */}
          {encerradas.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Edições anteriores</h2>
              <ul className="space-y-3">
                {encerradas.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/campeonatos/${e.id}`}
                      className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800">{e.nome}</p>
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
                      <Trophy className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {editions.length === 0 && (
            <p className="text-gray-500">Nenhuma edição publicada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
