import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoForm } from "@/components/campeonatos/InscricaoForm";
import {
  calcularRatingDupla,
  recomendarCategoria,
  detectarSandbagging,
} from "@/lib/motor-categoria";

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

  // Busca perfil com rating, CPF e tamanho de camisa
  const { data: profile } = await supabase
    .from("profiles")
    .select("cpf, rating, tamanho_camisa, questionario")
    .eq("id", user.id)
    .single();

  // Busca todas as categorias do campeonato para o motor
  const { data: todasCategorias } = await supabase
    .from("championship_categories")
    .select("id, nome, corte_rating_min, corte_rating_max")
    .eq("championship_id", id);

  // ── Motor de categoria ──────────────────────────────────────
  const meuRating = profile?.rating ?? 0;
  const ratingDupla = calcularRatingDupla(meuRating, null); // parceiro ainda não informado
  const categoriaRecomendada = todasCategorias
    ? recomendarCategoria(ratingDupla, todasCategorias)
    : null;

  const categoriaSelecionada = {
    id:               category.id,
    nome:             category.nome,
    corte_rating_min: (todasCategorias?.find((c) => c.id === category.id)?.corte_rating_min) ?? 0,
    corte_rating_max: (todasCategorias?.find((c) => c.id === category.id)?.corte_rating_max) ?? 9999,
  };

  const isSandbagging = meuRating > 0
    ? detectarSandbagging(ratingDupla, categoriaSelecionada)
    : false;

  const isRecomendada = categoriaRecomendada?.id === category.id;
  const semQuestionario = !profile?.questionario;

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

      {/* Banner: sem questionário preenchido */}
      {semQuestionario && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <p className="font-semibold">Seu nível ainda não foi definido</p>
          <p className="mt-0.5 text-amber-700">
            Responda o{" "}
            <Link href="/perfil/questionario" className="underline font-medium">
              questionário de nível
            </Link>{" "}
            para que a plataforma possa indicar a melhor categoria pra você.
          </p>
        </div>
      )}

      {/* Banner: nível acima da categoria escolhida */}
      {isSandbagging && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <p className="font-semibold">Atenção: sua pontuação é superior a esta categoria</p>
          <p className="mt-0.5 text-red-700">
            Com base no seu perfil, a categoria indicada para você é{" "}
            <strong>{categoriaRecomendada?.nome ?? "uma mais alta"}</strong>. Você
            pode continuar mesmo assim — o organizador do evento será avisado e
            decidirá como proceder.
          </p>
        </div>
      )}

      {/* Banner: categoria recomendada */}
      {!semQuestionario && isRecomendada && (
        <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Categoria indicada para sua pontuação ({meuRating} pontos)
        </div>
      )}

      <InscricaoForm
        championshipId={id}
        categoryId={category.id}
        categoriaNome={category.nome}
        valorInscricao={category.valorInscricao}
        cpfSalvo={profile?.cpf ?? null}
        tamanhoSalvo={profile?.tamanho_camisa ?? null}
        ratingDupla={ratingDupla}
        isSandbagging={isSandbagging}
        userId={user.id}
      />
    </div>
  );
}
