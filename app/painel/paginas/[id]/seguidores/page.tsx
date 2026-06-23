import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPageFollowers } from "@/lib/supabase/pages";
import { SeguidoresLista } from "@/components/painel/SeguidoresLista";

export const dynamic = "force-dynamic";

export default async function SeguidoresPainelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("id, owner_id, nome")
    .eq("id", id)
    .maybeSingle();

  if (!page) notFound();

  const seguidores = await getPageFollowers(id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href={`/painel/paginas/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="size-4" /> {page.nome}
        </Link>

        <div className="mb-6 mt-3">
          <h1 className="text-2xl font-bold text-gray-900">Seguidores</h1>
          <p className="mt-1 text-sm text-gray-500">
            {seguidores.length}{" "}
            {seguidores.length === 1 ? "pessoa segue" : "pessoas seguem"} esta página.
          </p>
        </div>

        <SeguidoresLista seguidores={seguidores} />
      </div>
    </div>
  );
}
