import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoForm } from "@/components/campeonatos/InscricaoForm";

export default async function InscreverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { id } = await params;
  const { categoria: categoryId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const championship = await getDbChampionshipById(id);
  if (!championship) notFound();

  if (championship.status !== "inscricoes_abertas") {
    return (
      <div className="mx-auto max-w-lg px-6 py-8 text-center">
        <p className="text-gray-500">As inscrições não estão abertas para este campeonato.</p>
        <Link href={`/campeonatos/${id}`} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Voltar ao campeonato
        </Link>
      </div>
    );
  }

  const category = championship.categorias.find((c) => c.id === categoryId);
  if (!category) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("cpf")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-lg space-y-5 px-6 py-8">
      <Link
        href={`/campeonatos/${id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{championship.nome}</h1>
        <p className="text-sm text-gray-500">Inscrição de dupla</p>
      </div>

      <InscricaoForm
        championshipId={id}
        categoryId={category.id}
        categoriaNome={category.nome}
        valorInscricao={category.valorInscricao}
        cpfSalvo={profile?.cpf ?? null}
      />
    </div>
  );
}
