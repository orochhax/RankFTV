import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNewsById } from "@/lib/supabase/news";
import { EditarNoticiaForm } from "@/components/admin/EditarNoticiaForm";

export default async function EditarNoticiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const noticia = await getNewsById(id);
  if (!noticia) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/noticias"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="size-4" /> Notícias
      </Link>

      <div className="mb-6 mt-3">
        <h1 className="text-2xl font-bold text-gray-900">Editar notícia</h1>
        <p className="mt-1 truncate text-sm text-gray-500">{noticia.titulo}</p>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <EditarNoticiaForm noticia={noticia} />
      </div>
    </div>
  );
}
