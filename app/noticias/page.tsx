import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { getNewsPage } from "@/lib/supabase/news";
import { NoticiaCard } from "@/components/home/NoticiaCard";
import { PaginationDots } from "@/components/ui/PaginationDots";

const PER_PAGE = 10;

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, total } = await getNewsPage(page, PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Início
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Notícias</h1>
      <p className="mt-1 text-sm text-gray-500">As novidades do futevôlei e da plataforma.</p>

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-10 text-center ring-1 ring-black/5">
          <Newspaper className="size-7 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhuma notícia publicada ainda.</p>
        </div>
      ) : (
        <>
          {/* Bolinhas em cima */}
          <div className="mt-6">
            <PaginationDots page={page} totalPages={totalPages} basePath="/noticias" />
          </div>

          <div className="mt-6 space-y-3">
            {items.map((n) => (
              <NoticiaCard key={n.id} noticia={n} />
            ))}
          </div>

          {/* Bolinhas embaixo */}
          <div className="mt-6">
            <PaginationDots page={page} totalPages={totalPages} basePath="/noticias" />
          </div>
        </>
      )}
    </div>
  );
}
