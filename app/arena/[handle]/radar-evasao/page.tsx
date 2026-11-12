import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArenaProFeatureGate } from "@/components/arena/ArenaProFeatureGate";
import { RadarEvasaoClient } from "@/components/arena/RadarEvasaoClient";
import { getArenaTierId } from "@/lib/arena-subscription";
import { getArenaRadarEvasao } from "@/lib/arena-radar-evasao";

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
  if (arena.dono_id !== user.id) {
    const { data: staff } = await supabase
      .from("arena_staff")
      .select("id")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .eq("papel", "gerente")
      .eq("status", "aceito")
      .maybeSingle();
    if (!staff) redirect("/arena");
  }

  const tierId = await getArenaTierId(supabase, arena.id);
  const report =
    tierId === "pro"
      ? await getArenaRadarEvasao(supabase, arena.id, arena.nome)
      : null;

  return (
    <ArenaProFeatureGate
      tierId={tierId}
      arenaHandle={handle}
      featureTitle="Radar Anti-Desistência & Evasão de Alunos"
      featureDescription="Identifique automaticamente alunos com mais de 3 faltas consecutivas ou redução súbita de frequência. Envie uma mensagem acolhedora de retorno no WhatsApp com 1 clique antes que o atleta cancele a matrícula."
      iconName="target"
      benefits={[
        "Alertas inteligentes de alunos ausentes há mais de 14 dias",
        "Botão com mensagem personalizada pronta para envio no WhatsApp",
        "Gráfico de taxa de retenção de alunos mês a mês",
        "Prevenção proativa de perda de receita recorrente",
      ]}
    >
      {report && <RadarEvasaoClient arenaNome={arena.nome} report={report} />}
    </ArenaProFeatureGate>
  );
}
