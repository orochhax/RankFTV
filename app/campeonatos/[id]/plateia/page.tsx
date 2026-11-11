import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { IngressoPlateiaForm } from "@/components/plateia/IngressoPlateiaForm";
import { resolverPrecos } from "@/lib/lotes";

// Compra de ingresso de plateia (visitante, sem conta).
export default async function PlateiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const dbChamp = await getDbChampionshipById(id);
  if (!dbChamp) notFound();
  const champId = dbChamp.id;
  const publicSlug = dbChamp.slug ?? champId;

  const supabase = await createClient();

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, cidade, estado, status, is_elite")
    .eq("id", champId)
    .maybeSingle();
  if (!champ) notFound();

  const { data: tipos } = await supabase
    .from("spectator_ticket_types")
    .select("id, nome, valor")
    .eq("championship_id", champId)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("valor", { ascending: true });

  const vendaAberta = champ.status === "inscricoes_abertas" || champ.status === "em_andamento";
  const tiposRaw = tipos ?? [];

  // Preço vigente (lote atual, se houver) — sobrepõe o valor "de tabela".
  const precos = await resolverPrecos(
    "ticket_type",
    tiposRaw.map((t) => t.id),
    Object.fromEntries(tiposRaw.map((t) => [t.id, Number(t.valor)])),
  );
  const lista = tiposRaw.map((t) => ({
    id:       t.id,
    nome:     t.nome,
    valor:    precos[t.id].valor,
    loteNome: precos[t.id].loteNome,
    esgotado: precos[t.id].esgotado,
  }));

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-brand-dark px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href={`/campeonatos/${publicSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="size-6 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Ingresso de plateia</h1>
          </div>
          <p className="text-sm text-white/50">
            Compre seu ingresso pra assistir ao {champ.nome} — {champ.cidade}/{champ.estado}.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          {!vendaAberta ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              As vendas de ingresso não estão abertas no momento.
            </p>
          ) : lista.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              Ainda não há ingressos de plateia disponíveis pra este evento.
            </p>
          ) : (
            <IngressoPlateiaForm championshipId={champId} tipos={lista} isElite={!!champ.is_elite} />
          )}
        </div>
      </div>
    </div>
  );
}
