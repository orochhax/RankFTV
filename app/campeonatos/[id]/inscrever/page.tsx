export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoForm } from "@/components/campeonatos/InscricaoForm";
import { resolverPrecos } from "@/lib/lotes";
import type { Genero } from "@/lib/types";

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

  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase
      .from("profiles")
      .select("genero, tamanho_camisa")
      .eq("id", user.id)
      .single(),
    supabase
      .from("profiles_private")
      .select("cpf")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const cpfSalvo = priv?.cpf ?? null;

  // Preço vigente (lote atual, se houver) — sobrepõe o valor "de tabela".
  const precos = await resolverPrecos("category", [category.id], { [category.id]: category.valorInscricao });
  const valorVigente = precos[category.id].valor;

  const meuGenero = (profile?.genero as Genero | null) ?? null;
  const generoCategoria = category.genero;

  // Conflito: "outro" pode tudo; "mista" aceita todos; caso contrário, gênero deve bater
  const generoConflita =
    !!meuGenero &&
    meuGenero !== "outro" &&
    generoCategoria !== "mista" &&
    generoCategoria !== meuGenero;

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

      {/* Aviso suave: gênero não definido */}
      {!meuGenero && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <p className="font-semibold">Seu gênero ainda não foi definido</p>
          <p className="mt-0.5 text-amber-700">
            <Link href="/perfil/questionario" className="underline font-medium">
              Informe seu gênero no perfil
            </Link>{" "}
            para que a plataforma possa validar as categorias corretamente.
          </p>
        </div>
      )}

      {/* Bloqueio duro: conflito de gênero */}
      {generoConflita ? (
        <div className="rounded-2xl bg-red-50 px-5 py-5 text-sm text-red-800 ring-1 ring-red-200 space-y-2">
          <p className="font-semibold text-base">
            Esta categoria é {generoCategoria === "feminino" ? "feminina" : "masculina"}
          </p>
          <p className="text-red-700">
            Seu perfil está cadastrado como{" "}
            <strong>{meuGenero === "feminino" ? "feminino" : "masculino"}</strong>.
            Você não pode se inscrever nesta categoria.
          </p>
          <p className="text-red-700">
            Volte e escolha uma categoria{" "}
            {meuGenero === "feminino" ? "feminina" : "masculina"} ou mista, ou{" "}
            <Link href="/perfil/questionario" className="underline font-medium">
              corrija seu gênero no perfil
            </Link>
            .
          </p>
          <Link
            href={`/campeonatos/${id}`}
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <ChevronLeft className="size-4" /> Voltar ao campeonato
          </Link>
        </div>
      ) : (
        <InscricaoForm
          championshipId={id}
          categoryId={category.id}
          categoriaNome={category.nome}
          valorInscricao={valorVigente}
          cpfSalvo={cpfSalvo}
          tamanhoSalvo={profile?.tamanho_camisa ?? null}
          userId={user.id}
        />
      )}
    </div>
  );
}
