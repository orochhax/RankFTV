import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { type News, formatDataNoticia } from "@/lib/supabase/news";

// Card de notícia: imagem + título + resumo (2 linhas). Clica e abre a
// página completa. Usado na home e na lista /noticias.
export function NoticiaCard({ noticia }: { noticia: News }) {
  return (
    <Link
      href={`/noticias/${noticia.id}`}
      className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {noticia.imagem_url ? (
          <Image src={noticia.imagem_url} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Newspaper className="size-6 text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{formatDataNoticia(noticia.created_at)}</p>
        <h3 className="mt-0.5 line-clamp-1 font-semibold text-gray-900">{noticia.titulo}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{noticia.resumo}</p>
      </div>
    </Link>
  );
}
