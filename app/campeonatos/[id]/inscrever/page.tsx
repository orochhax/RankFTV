export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoForm } from "@/components/campeonatos/InscricaoForm";
import {
  calcularRatingDupla,
  recomendarCategoria,
  statusCategoria,
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

  // Perfil (público) + CPF guardado na tabela privada
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase
      .from("profiles")
      .select("rating, genero, tamanho_camisa, questionario")
      .eq("id", user.id)
      .single(),
    supabase
      .from("profiles_private")
      .select("cpf")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const cpfSalvo = priv?.cpf ?? null;

  // Busca todas as categorias do campeonato para o motor
  const { data: todasCategorias } = await supabase
    .from("championship_categories")
    .select("id, nome, genero, corte_rating_min, corte_rating_max")
    .eq("championship_id", id);

  // ── Motor de categoria ──────────────────────────────────────
  const meuRating = profile?.rating ?? 0;
  const meuGenero = (profile?.genero as "masculino" | "feminino" | null) ?? null;
  const ratingDupla = calcularRatingDupla(meuRating, null); // parceiro ainda não informado
  const categoriaRecomendada = todasCategorias
    ? recomendarCategoria(ratingDupla, todasCategorias, meuGenero)
    : null;

  // Gênero da categoria escolhida — sempre prevalece sobre o nível
  const generoCategoria = category.genero;
  const generoConflita =
    !!meuGenero && generoCategoria !== "mista" && generoCategoria !== meuGenero;

  const categoriaSelecionada = {
    id:               category.id,
    nome:             category.nome,
    corte_rating_min: (todasCategorias?.find((c) => c.id === category.id)?.corte_rating_min) ?? 0,
    corte_rating_max: (todasCategorias?.find((c) => c.id === category.id)?.corte_rating_max) ?? 9999,
  };

  const semQuestionario = !profile?.questionario;

  // Conflito de gênero suprime os banners de nível (o gênero prevalece)
  const status = !semQuestionario && meuRating > 0 && !generoConflita
    ? statusCategoria(ratingDupla, categoriaSelecionada)
    : null;

  const isRecomendada   = status === "recomendada";
  const isSandbagging   = status === "sandbagging";
  const isAcimaDoNivel  = status === "acima_do_nivel";

  // Atleta está abaixo de todas as categorias → a "recomendada" é a própria escolhida
  const recomendadaEhAEscolhida = categoriaRecomendada?.id === category.id;

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

      {/* Banner: categoria de outro gênero (o gênero sempre prevalece) */}
      {generoConflita && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          <p className="font-semibold">
            Esta é uma categoria {generoCategoria === "feminino" ? "feminina" : "masculina"}
          </p>
          <p className="mt-0.5 text-red-700">
            Seu perfil é {meuGenero === "feminino" ? "feminino" : "masculino"}.
            {categoriaRecomendada
              ? <> A categoria indicada para você é <strong>{categoriaRecomendada.nome}</strong>.</>
              : <> Este campeonato não tem categoria do seu gênero.</>}
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

      {/* Banner: categoria acima do nível */}
      {isAcimaDoNivel && (
        <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-800 ring-1 ring-orange-200">
          <p className="font-semibold">Categoria acima do seu nível atual</p>
          <p className="mt-0.5 text-orange-700">
            {recomendadaEhAEscolhida ? (
              <>
                Esta é a categoria mais acessível deste campeonato, mas ainda está
                acima do seu nível atual ({meuRating} pts). Você pode continuar mesmo assim.
              </>
            ) : (
              <>
                Com base no seu perfil ({meuRating} pts), a categoria indicada é{" "}
                <strong>{categoriaRecomendada?.nome ?? "uma mais baixa"}</strong>. Você pode continuar mesmo assim.
              </>
            )}
          </p>
        </div>
      )}

      {/* Banner: categoria recomendada */}
      {isRecomendada && (
        <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Categoria indicada para sua pontuação ({meuRating} pontos)
        </div>
      )}

      <InscricaoForm
        championshipId={id}
        categoryId={category.id}
        categoriaNome={category.nome}
        valorInscricao={category.valorInscricao}
        cpfSalvo={cpfSalvo}
        tamanhoSalvo={profile?.tamanho_camisa ?? null}
        ratingDupla={ratingDupla}
        isSandbagging={isSandbagging}
        userId={user.id}
      />
    </div>
  );
}
