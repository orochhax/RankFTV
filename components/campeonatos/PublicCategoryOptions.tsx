import Link from "next/link";
import { ArrowRight, Check, Clock3, Trophy, Users } from "lucide-react";
import { formatBRL, generoLabel } from "@/lib/format";
import { resolveCategoryPriceComposition } from "@/lib/category-price-display";
import type { GeneroCategoria } from "@/lib/types";

export type PublicCategoryOption = {
  id: string;
  name: string;
  gender: GeneroCategoria;
  price: number;
  soldOut: boolean;
  activeBatchName: string | null;
  activeBatchEndsAt: string | null;
};

export function PublicCategoryOptions({
  championshipId,
  categories,
  isElite,
}: {
  championshipId: string;
  categories: PublicCategoryOption[];
  isElite: boolean;
}) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="public-categories-title">
      <div className="mb-3">
        <h2 id="public-categories-title" className="text-lg font-semibold text-gray-900">Categorias e valores</h2>
        <p className="text-sm text-gray-500">Consulte preço, taxa e disponibilidade antes de informar seus dados.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((category) => {
          const composition = resolveCategoryPriceComposition(category.price, isElite);
          return (
            <article key={category.id} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Trophy className="size-5" /></span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="flex items-center gap-1 text-xs text-gray-500"><Users className="size-3" />{generoLabel(category.gender)}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${category.soldOut ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
                  {category.soldOut ? "Esgotada" : "Disponível"}
                </span>
              </div>

              {category.activeBatchName && (
                <p className="mt-3 flex items-center gap-1 text-xs text-amber-700">
                  <Clock3 className="size-3" />{category.activeBatchName}
                  {category.activeBatchEndsAt ? ` · até ${new Date(`${category.activeBatchEndsAt}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
                </p>
              )}

              <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
                {category.price <= 0 ? (
                  <p className="font-bold text-blue-600">Inscrição grátis</p>
                ) : (
                  <>
                    <div className="flex justify-between gap-3 text-gray-600"><span>Inscrição da dupla</span><span>{formatBRL(composition.basePrice)}</span></div>
                    <div className="mt-1 flex justify-between gap-3 text-gray-600"><span>Taxa de serviço</span><span>{formatBRL(composition.serviceFee)}</span></div>
                    <div className="mt-2 flex justify-between gap-3 border-t border-gray-200 pt-2 font-bold text-gray-900"><span>Total no Pix</span><span>{formatBRL(composition.pixTotal)}</span></div>
                  </>
                )}
              </div>

              {category.soldOut ? (
                <span aria-disabled="true" className="mt-3 flex items-center justify-center rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-400">Sem vagas</span>
              ) : (
                <Link href={`/campeonatos/${championshipId}/comprar?categoria=${encodeURIComponent(category.id)}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  <Check className="size-4" />Escolher categoria <ArrowRight className="size-4" />
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
