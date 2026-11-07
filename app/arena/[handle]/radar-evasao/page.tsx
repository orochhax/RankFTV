import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ArenaProFeatureGate } from "@/components/arena/ArenaProFeatureGate";

export const metadata = {
  title: "Radar Anti-Evasão — RankFTV Arena",
  description: "Monitore alunos com faltas consecutivas e recupere matrículas antes do cancelamento.",
};

export default async function RadarEvasaoPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/radar-evasao`);

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
      featureTitle="Radar Anti-Desistência & Evasão de Alunos"
      featureDescription="Identifique automaticamente alunos com mais de 3 faltas consecutivas ou redução súbita de frequência. Envie uma mensagem acolhedora de retorno no WhatsApp com 1 clique antes que o atleta cancele a matrícula."
      icon={Target}
      benefits={[
        "Alertas inteligentes de alunos ausentes há mais de 14 dias",
        "Botão com mensagem personalizada pronta para envio no WhatsApp",
        "Gráfico de taxa de retenção de alunos mês a mês",
        "Prevenção proativa de perda de receita recorrente",
      ]}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-black text-gray-900">Radar Anti-Evasão Ativo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Nenhum aluno em risco crítico de desistência detectado nos últimos 7 dias.
        </p>
      </div>
    </ArenaProFeatureGate>
  );
}
