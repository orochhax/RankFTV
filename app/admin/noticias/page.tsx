import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, Newspaper, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllNews, formatDataNoticia } from "@/lib/supabase/news";
import { NoticiaForm } from "@/components/admin/NoticiaForm";
import { AdminDeleteNoticia } from "@/components/admin/AdminDeleteNoticia";
import { NoticiasDestaquesEditor } from "@/components/admin/NoticiasDestaquesEditor";

export default async function AdminNoticiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const [noticias, configRow] = await Promise.all([
    getAllNews(),
    supabase.from("platform_config").select("noticias_destaques_ids").eq("id", 1).single(),
  ]);
  const destaquesIds: string[] = (configRow.data?.noticias_destaques_ids as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Painel Admin
      </Link>

      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-bold text-gray-900">Notícias</h1>
        <p className="mt-1 text-sm text-gray-500">
          Os destaques escolhidos aparecem na home (ou as 3 mais recentes, se nenhum for
          escolhido); todas aparecem em /noticias.
        </p>
      </div>

      <NoticiaForm />

      {/* Escolher e ordenar os destaques da home */}
      {noticias.length > 0 && (
        <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <NoticiasDestaquesEditor noticias={noticias} initialDestaques={destaquesIds} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Publicadas ({noticias.length})
        </h2>

        {noticias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
            <Newspaper className="size-6 text-gray-300" />
            <p className="text-sm text-gray-500">Nenhuma notícia publicada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {noticias.map((n) => (
              <li key={n.id} className="flex items-center gap-3 p-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {n.imagem_url ? (
                    <Image src={n.imagem_url} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Newspaper className="size-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{n.titulo}</p>
                  <p className="truncate text-sm text-gray-500">{n.resumo}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDataNoticia(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/admin/noticias/${n.id}/editar`}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  >
                    <Pencil className="size-3.5" /> Editar
                  </Link>
                  <AdminDeleteNoticia id={n.id} titulo={n.titulo} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
