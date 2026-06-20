import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPages, getFollowedPageIds } from "@/lib/supabase/pages";
import { PageCard } from "@/components/campeonatos/PageCard";

export default async function TodasPaginasPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [todasPages, followedPageIds] = await Promise.all([
    getPages(),
    user ? getFollowedPageIds(user.id) : Promise.resolve([]),
  ]);

  const termo = busca?.trim().toLowerCase().replace(/^@/, "") ?? "";
  const filtradas = termo
    ? todasPages.filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          p.handle.toLowerCase().includes(termo),
      )
    : todasPages;

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/campeonatos"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Campeonatos
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Páginas</h1>
            <p className="mt-1 text-sm text-white/50">
              Siga uma página e seja notificado quando abrir nova edição.
            </p>
          </div>

          {/* Busca */}
          <form method="GET" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
            <input
              name="busca"
              type="search"
              defaultValue={busca ?? ""}
              placeholder="Buscar por nome ou @handle"
              className="w-full rounded-xl bg-white/10 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/20"
              autoComplete="off"
            />
          </form>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {filtradas.length === 0 ? (
            <p className="text-gray-500">
              {termo
                ? `Nenhuma página encontrada para "${busca}".`
                : "Ainda não há páginas. Organizadores podem criar uma no painel."}
            </p>
          ) : (
            <div className="space-y-3">
              {filtradas.map((p) => (
                <PageCard
                  key={p.id}
                  page={p}
                  initialFollowing={followedPageIds.includes(p.id)}
                  userId={user?.id ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
