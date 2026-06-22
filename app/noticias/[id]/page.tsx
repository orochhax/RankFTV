import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getNewsById, formatDataNoticia } from "@/lib/supabase/news";

export default async function NoticiaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noticia = await getNewsById(id);
  if (!noticia) notFound();

  return (
    <div>
      {/* Imagem hero vertical (ocupa largura total, sem padding) */}
      {noticia.imagem_url && (
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-900">
          <Image
            src={noticia.imagem_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Gradiente + botão voltar sobreposto */}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-4 pt-10">
            <Link
              href="/noticias"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/50"
            >
              <ArrowLeft className="size-4" /> Notícias
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Botão voltar quando não tem imagem */}
        {!noticia.imagem_url && (
          <Link href="/noticias" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" /> Notícias
          </Link>
        )}

        <p className={`text-xs font-medium uppercase tracking-wide text-gray-400 ${noticia.imagem_url ? "" : "mt-4"}`}>
          {formatDataNoticia(noticia.created_at)}
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-gray-900">
          {noticia.titulo}
        </h1>
        <p className="mt-2 text-base text-gray-500">{noticia.resumo}</p>

        <article className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {noticia.conteudo}
        </article>
      </div>
    </div>
  );
}
