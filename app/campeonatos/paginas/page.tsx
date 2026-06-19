import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPages, getFollowedPageIds } from "@/lib/supabase/pages";
import { PageCard } from "@/components/campeonatos/PageCard";

export default async function TodasPaginasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [todasPages, followedPageIds] = await Promise.all([
    getPages(),
    user ? getFollowedPageIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/campeonatos"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-3"
          >
            <ArrowLeft className="size-4" /> Campeonatos
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Páginas</h1>
          <p className="mt-1 text-sm text-white/50">
            Siga uma página e seja notificado quando abrir nova edição.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {todasPages.length === 0 ? (
            <p className="text-gray-500">
              Ainda não há páginas. Organizadores podem criar uma no painel.
            </p>
          ) : (
            <div className="space-y-3">
              {todasPages.map((p) => (
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
