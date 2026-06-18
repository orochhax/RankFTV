import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, ChevronLeft } from "lucide-react";
import { BRACKETS, getBracket } from "@/lib/mock/brackets";
import { getChampionshipById } from "@/lib/mock/championships";
import { BracketCategoryView } from "@/components/chaveamento/BracketView";

export async function generateStaticParams() {
  return BRACKETS.map((b) => ({ id: b.championshipId }));
}

export default async function ChaveamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id } = await params;
  const { cat } = await searchParams;

  const championship = getChampionshipById(id);
  if (!championship) notFound();

  const bracket = getBracket(id);
  if (!bracket) notFound();

  const activeCat =
    bracket.categories.find((c) => c.id === cat) ?? bracket.categories[0];

  const finalMatch = activeCat.rounds[activeCat.rounds.length - 1].matches[0];
  const champion =
    finalMatch.winner === "a"
      ? finalMatch.duplaA
      : finalMatch.winner === "b"
      ? finalMatch.duplaB
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <Link
          href={`/campeonatos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="size-4" />
          Voltar para o campeonato
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Trophy className="size-5 text-blue-500" />
          Chaveamento — {championship.nome}
        </h1>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2">
        {bracket.categories.map((c) => (
          <Link
            key={c.id}
            href={`/campeonatos/${id}/chaveamento?cat=${c.id}`}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              c.id === activeCat.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {c.nome}
          </Link>
        ))}
      </div>

      <BracketCategoryView category={activeCat} />
    </div>
  );
}
