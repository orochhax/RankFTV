import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { IngressoAtletaForm, type CategoriaOpcao } from "@/components/campeonatos/IngressoAtletaForm";
import { resolverPrecos, listarLotesComStatus } from "@/lib/lotes";

// Compra de ingresso de atleta (dupla) como visitante, sem conta.
export default async function ComprarAtletaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, cidade, estado, status, is_elite")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();

  const { data: cats } = await supabase
    .from("championship_categories")
    .select("id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max")
    .eq("championship_id", id)
    .order("valor_inscricao", { ascending: true });

  const vendaAberta =
    champ.status === "inscricoes_abertas" || champ.status === "em_andamento";

  // Preço vigente (lote atual, se houver) — sobrepõe o valor "de tabela".
  const categoryIds = (cats ?? []).map((c) => c.id);
  const [precos, lotesPorCategoria] = await Promise.all([
    resolverPrecos(
      "category",
      categoryIds,
      Object.fromEntries((cats ?? []).map((c) => [c.id, Number(c.valor_inscricao)])),
    ),
    listarLotesComStatus("category", categoryIds),
  ]);

  const categorias: CategoriaOpcao[] = (cats ?? []).map((c) => ({
    id:             c.id,
    nome:           c.nome,
    genero:         c.genero,
    valorInscricao: precos[c.id].valor,
    corteRatingMin: Number(c.corte_rating_min ?? 0),
    corteRatingMax: Number(c.corte_rating_max ?? 0),
    lotes:          lotesPorCategoria[c.id] ?? [],
    esgotado:       precos[c.id].esgotado,
  }));

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href={`/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Inscrever minha dupla</h1>
          </div>
          <p className="text-sm text-white/50">
            {champ.nome} — {champ.cidade}/{champ.estado}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          {!vendaAberta ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              As inscrições não estão abertas no momento.
            </p>
          ) : categorias.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              Nenhuma categoria disponível ainda.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Não é necessário ter conta. Selecione a categoria e preencha os dados dos dois atletas.
              </p>
              <IngressoAtletaForm
                championshipId={id}
                categorias={categorias}
                isElite={!!champ.is_elite}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
