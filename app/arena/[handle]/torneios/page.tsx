import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArenaProFeatureGate } from "@/components/arena/ArenaProFeatureGate";

export const metadata = {
  title: "Torneios Internos da Arena — RankFTV",
  description: "Crie copinhas internas e desafios Rei da Praia em 2 minutos com chaveamento automático.",
};

export default async function TorneiosArenaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/torneios`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, dono_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) redirect("/arena");

  // TODO: no futuro ler arena_subscriptions se ativo pro; default "start"
  const tierId = "start";

  return (
    <ArenaProFeatureGate
      tierId={tierId}
      arenaHandle={handle}
      featureTitle="Torneios Internos & Rei da Praia da Arena"
      featureDescription="Engaje seus alunos criando copinhas internas e desafios Rei da Praia aos finais de semana. O RankFTV sorteia as duplas, monta os grupos e chaveamentos automaticamente e atualiza o ranking interno da arena."
      icon={Trophy}
      benefits={[
        "Chaveamento automático e sorteio de duplas balanceadas por nível",
        "Modo Rei da Praia (rodízio individual em quadra com pontuação dinâmica)",
        "Inscrições e pagamentos dos atletas direto pela plataforma",
        "Placar ao vivo interativo compatível com telões e TVs da arena",
      ]}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-black text-gray-900">Torneios Internos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie e crie copinhas internas para os alunos da sua arena.
        </p>
      </div>
    </ArenaProFeatureGate>
  );
}
