import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users, BookOpen, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyPages } from "@/lib/supabase/pages";

function formatSeguidores(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

export default async function MinhasPaginasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pages = await getMyPages(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-14 pt-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Minhas Páginas</h1>
              <p className="mt-1 text-sm text-white/50">
                Agrupe as edições do seu campeonato e notifique seguidores.
              </p>
            </div>
            <Link
              href="/painel/paginas/nova"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Nova página
            </Link>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-black/5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <BookOpen className="size-7 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-900">Você ainda não tem nenhuma página</p>
              <p className="max-w-xs text-sm text-gray-500">
                Crie uma Página pra agrupar todas as edições do seu campeonato e notificar
                seguidores automaticamente.
              </p>
              <Link
                href="/painel/paginas/nova"
                className="mt-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Criar primeira página
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {pages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/painel/paginas/${p.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
                  >
                    {/* Mini-banner */}
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.bannerFrom} ${p.bannerTo}`}
                    >
                      <span className="text-xl font-bold text-white/90">
                        {p.nome.charAt(0)}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{p.nome}</p>
                      <p className="truncate text-sm text-gray-500">@{p.handle}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {formatSeguidores(p.seguidores)} seguidores
                        </span>
                        <span>·</span>
                        <span>{p.edicoes} edições</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-300" />
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
