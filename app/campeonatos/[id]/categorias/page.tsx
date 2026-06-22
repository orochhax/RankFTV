import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoButton } from "@/components/campeonatos/InscricaoButton";
import { recomendarCategoria } from "@/lib/motor-categoria";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";
import { formatBRL, generoLabel } from "@/lib/format";

// Categorias e inscrição do atleta. Fica numa página separada (acessada pelo
// botão "Sou atleta" na página do campeonato) pra não mostrar os valores logo
// de cara — o cliente escolhe atleta ou plateia primeiro.
export default async function CategoriasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const championship = await getDbChampionshipById(id);
  if (!championship) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Plano do campeonato (define a taxa que o comprador paga)
  const { data: champExtra } = await supabase
    .from("championships")
    .select("is_elite")
    .eq("id", id)
    .maybeSingle();
  const isElite = !!champExtra?.is_elite;

  // Rating + gênero do atleta (pra recomendar a categoria certa)
  let meuRating = 0;
  let meuGenero: "masculino" | "feminino" | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("rating, genero")
      .eq("id", user.id)
      .single();
    meuRating = p?.rating ?? 0;
    meuGenero = (p?.genero as "masculino" | "feminino" | null) ?? null;
  }

  const categoriasParaMotor = championship.categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    corte_rating_min: c.corteRatingMin,
    corte_rating_max: c.corteRatingMax,
    genero: c.genero,
  }));
  const catRecomendada = meuRating > 0
    ? recomendarCategoria(meuRating, categoriasParaMotor, meuGenero)
    : null;

  const temCategoriaParaMim =
    !meuGenero ||
    championship.categorias.some((c) => c.genero === meuGenero || c.genero === "mista");
  const generoLabelAtleta = meuGenero === "feminino" ? "feminina" : "masculina";

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href={`/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {championship.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Categorias e inscrição</h1>
          </div>
          <p className="text-sm text-white/50">
            Escolha a categoria da sua dupla. A inscrição é feita em dupla — você pode
            convidar o parceiro depois.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {!temCategoriaParaMim && (
            <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <p className="font-semibold">
                Este campeonato não tem categoria {generoLabelAtleta}
              </p>
              <p className="mt-0.5 text-amber-700">
                As categorias disponíveis não correspondem ao seu gênero e não há
                categoria mista. Fale com o organizador se quiser participar.
              </p>
            </div>
          )}

          {championship.categorias.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {championship.categorias.some((c) => c.valorInscricao > 0) && (
                <p className="text-xs text-gray-400">
                  Valores já com a taxa de serviço, no Pix. No cartão a taxa é um pouco maior —
                  você vê o total antes de confirmar.
                </p>
              )}
              {championship.categorias.map((cat) => {
                const isRecomendada = catRecomendada?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl bg-white p-4 ring-1 ${isRecomendada ? "ring-green-400 bg-green-50" : "ring-black/5"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">
                            Categoria {cat.nome} · {generoLabel(cat.genero)}
                          </p>
                          {isRecomendada && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              Recomendada para você
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {cat.corteRatingMin > 0
                            ? `Pontuação mínima ${cat.corteRatingMin}`
                            : "Aberta para todos os níveis"}
                        </p>
                      </div>
                      {(() => {
                        const valor = cat.valorInscricao;
                        if (valor <= 0) {
                          return <span className="shrink-0 font-semibold text-emerald-600">Grátis</span>;
                        }
                        const taxa  = calcularTaxaComprador(valor, "pix", isElite);
                        const total = calcularTotalComprador(valor, "pix", isElite);
                        return (
                          <div className="shrink-0 text-right">
                            <p className="font-semibold text-gray-900">{formatBRL(total)}</p>
                            <p className="text-[11px] leading-tight text-gray-400">
                              {formatBRL(valor)} + {formatBRL(taxa)} taxa
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3">
                      <InscricaoButton
                        categoriaNome={cat.nome}
                        championshipId={championship.id}
                        categoryId={cat.id}
                        status={championship.status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
